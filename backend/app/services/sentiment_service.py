import json
import logging
import random
from datetime import UTC, datetime

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.monitoring import metrics_registry
from app.core.redis import redis_client
from app.models.sentiment import SentimentLabel, SentimentSignal
from app.schemas.sentiment import SentimentResponse, _AIProviderPayload

logger = logging.getLogger(__name__)


class SentimentService:
    """Analyzes finance headlines with external AI providers and caches recent signals."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._provider = settings.ai_provider.lower().strip()

    async def get_sentiments(self, symbols: list[str] | None = None) -> list[SentimentResponse]:
        target_symbols = self._normalize_symbols(symbols or settings.market_default_symbols)
        if not target_symbols:
            return []

        results: list[SentimentResponse] = []
        persisted_signals: list[SentimentSignal] = []
        uncached_responses: list[SentimentResponse] = []

        for symbol in target_symbols:
            cached = await self._from_cache(symbol)
            if cached is not None:
                results.append(cached)
                continue

            news = self._mock_financial_news(symbol)
            sentiment = await self._analyze_symbol(symbol, news)
            results.append(sentiment)
            uncached_responses.append(sentiment)

            persisted_signals.append(
                SentimentSignal(
                    symbol=sentiment.symbol,
                    sentiment=sentiment.sentiment,
                    score=sentiment.score,
                    source=sentiment.source,
                )
            )

            try:
                await self._to_cache(sentiment)
                await self._publish_update(sentiment)
            except Exception:
                logger.exception("ai.sentiment.cache_or_publish.error", extra={"symbol": symbol})

        if persisted_signals:
            try:
                self._session.add_all(persisted_signals)
                await self._session.commit()
                # Keep response timestamps aligned with stored rows.
                for row, response in zip(persisted_signals, uncached_responses, strict=False):
                    if row.created_at is not None:
                        response.created_at = row.created_at
            except Exception:
                await self._session.rollback()
                logger.exception("ai.sentiment.persist.error")

        return results

    async def _analyze_symbol(self, symbol: str, news: str) -> SentimentResponse:
        if not settings.ai_api_key:
            metrics_registry.record_provider_call(service="ai", provider=self._provider, outcome="config_missing")
            return self._fallback(symbol)

        try:
            payload = await self._request_provider(news)
            parsed = _AIProviderPayload.model_validate(payload)
            metrics_registry.record_provider_call(service="ai", provider=self._provider, outcome="success")
            return SentimentResponse(
                symbol=symbol,
                sentiment=parsed.sentiment,
                score=round(parsed.score, 4),
                source=self._provider,
                created_at=datetime.now(UTC),
            )
        except httpx.TimeoutException:
            metrics_registry.record_provider_call(service="ai", provider=self._provider, outcome="timeout")
            logger.exception("ai.sentiment.provider.timeout", extra={"provider": self._provider, "symbol": symbol})
            return self._fallback(symbol)
        except Exception:
            metrics_registry.record_provider_call(service="ai", provider=self._provider, outcome="error")
            logger.exception("ai.sentiment.provider.error", extra={"provider": self._provider, "symbol": symbol})
            return self._fallback(symbol)

    async def _request_provider(self, news: str) -> dict[str, object]:
        if self._provider == "gemini":
            return await self._request_gemini(news)
        if self._provider == "openai":
            return await self._request_openai(news)
        raise ValueError(f"Unsupported AI provider: {self._provider}")

    async def _request_gemini(self, news: str) -> dict[str, object]:
        prompt = self._build_prompt(news)
        url = f"{settings.gemini_base_url}/models/{settings.gemini_model}:generateContent"
        params = {"key": settings.ai_api_key}
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }

        payload = await self._http_post_json(url, params=params, json_body=body)
        candidates = payload.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise ValueError("Gemini response missing candidates")

        content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
        parts = content.get("parts") if isinstance(content, dict) else None
        if not isinstance(parts, list) or not parts:
            raise ValueError("Gemini response missing content parts")

        text = parts[0].get("text") if isinstance(parts[0], dict) else None
        if not isinstance(text, str):
            raise ValueError("Gemini response text is invalid")

        return self._extract_json_dict(text)

    async def _request_openai(self, news: str) -> dict[str, object]:
        prompt = self._build_prompt(news)
        url = f"{settings.openai_base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {settings.ai_api_key}"}
        body = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": "You are a financial sentiment engine."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }

        payload = await self._http_post_json(url, headers=headers, json_body=body)
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ValueError("OpenAI response missing choices")

        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str):
            raise ValueError("OpenAI response content is invalid")

        return self._extract_json_dict(content)

    async def _http_post_json(
        self,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        json_body: dict[str, object],
    ) -> dict[str, object]:
        timeout = httpx.Timeout(settings.ai_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, params=params, json=json_body)
            response.raise_for_status()
            payload = response.json()

        if not isinstance(payload, dict):
            raise ValueError("AI provider returned non-object JSON payload")
        return payload

    async def _from_cache(self, symbol: str) -> SentimentResponse | None:
        raw = await redis_client.get(self._cache_key(symbol))
        if not isinstance(raw, str):
            return None

        try:
            return SentimentResponse.model_validate_json(raw)
        except Exception:
            return None

    async def _to_cache(self, sentiment: SentimentResponse) -> None:
        await redis_client.set(
            name=self._cache_key(sentiment.symbol),
            value=sentiment.model_dump_json(),
            ex=settings.sentiment_cache_ttl_seconds,
        )

    async def _publish_update(self, sentiment: SentimentResponse) -> None:
        await redis_client.publish(settings.redis_channel_sentiment_updates, sentiment.model_dump_json())

    def _fallback(self, symbol: str) -> SentimentResponse:
        metrics_registry.record_provider_call(service="ai", provider="fallback", outcome="fallback")
        sentiment = random.choice([SentimentLabel.BULLISH, SentimentLabel.BEARISH, SentimentLabel.NEUTRAL])
        return SentimentResponse(
            symbol=symbol,
            sentiment=sentiment,
            score=round(random.uniform(0.4, 0.9), 4),
            source="fallback",
            created_at=datetime.now(UTC),
        )

    def _normalize_symbols(self, symbols: list[str]) -> list[str]:
        normalized = [self._normalize_symbol(symbol) for symbol in symbols if symbol]
        deduplicated: list[str] = []
        for symbol in normalized:
            if symbol not in deduplicated:
                deduplicated.append(symbol)
        return deduplicated

    def _normalize_symbol(self, symbol: str) -> str:
        return symbol.strip().upper().replace("/", "")

    def _cache_key(self, symbol: str) -> str:
        return f"sentiment:{symbol}"

    def _mock_financial_news(self, symbol: str) -> str:
        templates = [
            f"{symbol} rises due to strong institutional demand and positive macro signals.",
            f"{symbol} declines after weaker earnings outlook and risk-off sentiment.",
            f"{symbol} remains range-bound as traders await central bank guidance.",
        ]
        return random.choice(templates)

    def _build_prompt(self, news: str) -> str:
        return (
            "Analyze this financial news and return strict JSON with keys sentiment and score. "
            "sentiment must be one of bullish, bearish, neutral. score must be between 0 and 1. "
            f"News: {news}"
        )

    def _extract_json_dict(self, content: str) -> dict[str, object]:
        # Providers can wrap JSON in markdown fences; strip those before parsing.
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()

        payload = json.loads(cleaned)
        if not isinstance(payload, dict):
            raise ValueError("Model output is not a JSON object")
        return payload
