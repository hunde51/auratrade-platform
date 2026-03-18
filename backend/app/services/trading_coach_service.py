import json
import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import redis_client
from app.models.order import OrderSide
from app.models.position import Position
from app.models.trade import Trade
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.schemas.coach import CoachResponse

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class _ClosedTradeResult:
    pnl: Decimal
    pnl_ratio: Decimal


@dataclass(slots=True)
class _CoachMetrics:
    total_trades: int
    win_count: int
    loss_count: int
    win_rate: float
    average_profit_loss: float
    consecutive_losses: int


class TradingCoachService:
    """Provides lightweight behavior coaching from historical user activity."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._provider = settings.ai_provider.lower().strip()

    async def get_coaching(self, user_id: int) -> CoachResponse:
        cached = await self._from_cache(user_id)
        if cached is not None:
            return cached

        trades = await self._get_trades(user_id)
        positions = await self._get_positions(user_id)
        transactions = await self._get_transactions(user_id)

        metrics, closed_results = self._compute_metrics(trades)
        patterns = self._detect_patterns(trades, closed_results)
        summary = self._build_summary(metrics, positions, transactions, patterns)

        advice, source = await self._generate_advice(summary, metrics, patterns)
        response = CoachResponse(
            user_id=user_id,
            win_rate=round(metrics.win_rate, 4),
            total_trades=metrics.total_trades,
            advice=advice,
            source=source,
        )

        await self._to_cache(response)
        return response

    async def _get_trades(self, user_id: int) -> list[Trade]:
        result = await self._session.execute(
            select(Trade).where(Trade.user_id == user_id).order_by(Trade.executed_at.asc(), Trade.id.asc())
        )
        return list(result.scalars().all())

    async def _get_positions(self, user_id: int) -> list[Position]:
        result = await self._session.execute(
            select(Position).where(Position.user_id == user_id).order_by(Position.updated_at.desc(), Position.id.desc())
        )
        return list(result.scalars().all())

    async def _get_transactions(self, user_id: int) -> list[Transaction]:
        result = await self._session.execute(
            select(Transaction)
            .join(Wallet, Wallet.id == Transaction.wallet_id)
            .where(Wallet.user_id == user_id)
            .order_by(Transaction.created_at.asc(), Transaction.id.asc())
        )
        return list(result.scalars().all())

    def _compute_metrics(self, trades: list[Trade]) -> tuple[_CoachMetrics, list[_ClosedTradeResult]]:
        if not trades:
            return (
                _CoachMetrics(
                    total_trades=0,
                    win_count=0,
                    loss_count=0,
                    win_rate=0.0,
                    average_profit_loss=0.0,
                    consecutive_losses=0,
                ),
                [],
            )

        inventory_qty: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        inventory_cost: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        closed_results: list[_ClosedTradeResult] = []

        for trade in trades:
            symbol = trade.symbol.strip().upper()
            quantity = Decimal(trade.quantity)
            price = Decimal(trade.price)

            if trade.side == OrderSide.BUY:
                inventory_qty[symbol] += quantity
                inventory_cost[symbol] += price * quantity
                continue

            if trade.side != OrderSide.SELL:
                continue

            held_qty = inventory_qty[symbol]
            if held_qty <= 0:
                continue

            closed_qty = min(held_qty, quantity)
            if closed_qty <= 0:
                continue

            avg_cost = inventory_cost[symbol] / held_qty
            cost_basis = avg_cost * closed_qty
            proceeds = price * closed_qty
            pnl = proceeds - cost_basis
            pnl_ratio = (pnl / cost_basis) if cost_basis > 0 else Decimal("0")
            closed_results.append(_ClosedTradeResult(pnl=pnl, pnl_ratio=pnl_ratio))

            inventory_qty[symbol] = held_qty - closed_qty
            inventory_cost[symbol] = max(Decimal("0"), inventory_cost[symbol] - cost_basis)

        win_count = sum(1 for result in closed_results if result.pnl > 0)
        loss_count = sum(1 for result in closed_results if result.pnl < 0)
        closed_total = len(closed_results)
        avg_pl = (sum((result.pnl for result in closed_results), Decimal("0")) / closed_total) if closed_total else Decimal("0")

        trailing_losses = 0
        for result in reversed(closed_results):
            if result.pnl < 0:
                trailing_losses += 1
                continue
            break

        win_rate = (win_count / closed_total) if closed_total else 0.0
        metrics = _CoachMetrics(
            total_trades=len(trades),
            win_count=win_count,
            loss_count=loss_count,
            win_rate=win_rate,
            average_profit_loss=float(avg_pl),
            consecutive_losses=trailing_losses,
        )
        return metrics, closed_results

    def _detect_patterns(self, trades: list[Trade], closed_results: list[_ClosedTradeResult]) -> list[str]:
        patterns: list[str] = []

        if self._is_overtrading(trades):
            patterns.append("overtrading")

        trailing_losses = 0
        for result in reversed(closed_results):
            if result.pnl < 0:
                trailing_losses += 1
                continue
            break
        if trailing_losses >= 3:
            patterns.append("loss_streak")

        winning_trades = [result for result in closed_results if result.pnl > 0]
        early_exit_wins = [result for result in winning_trades if result.pnl_ratio <= Decimal("0.003")]
        if winning_trades and len(early_exit_wins) >= 3 and (len(early_exit_wins) / len(winning_trades)) >= 0.5:
            patterns.append("early_exit")

        return patterns

    def _is_overtrading(self, trades: list[Trade]) -> bool:
        if len(trades) < 6:
            return False

        now = datetime.now(UTC)
        last_15m = now - timedelta(minutes=15)
        last_hour = now - timedelta(hours=1)

        count_15m = 0
        count_1h = 0
        for trade in trades:
            trade_time = trade.executed_at
            if trade_time is None:
                continue
            if trade_time.tzinfo is None:
                trade_time = trade_time.replace(tzinfo=UTC)

            if trade_time >= last_15m:
                count_15m += 1
            if trade_time >= last_hour:
                count_1h += 1

        return count_15m >= 6 or count_1h >= 12

    def _build_summary(
        self,
        metrics: _CoachMetrics,
        positions: list[Position],
        transactions: list[Transaction],
        patterns: list[str],
    ) -> str:
        pattern_text = ", ".join(patterns) if patterns else "none"
        return (
            f"total_trades={metrics.total_trades}; wins={metrics.win_count}; losses={metrics.loss_count}; "
            f"win_rate={metrics.win_rate:.2f}; avg_profit_loss={metrics.average_profit_loss:.2f}; "
            f"consecutive_losses={metrics.consecutive_losses}; open_positions={len(positions)}; "
            f"wallet_transactions={len(transactions)}; patterns={pattern_text}"
        )

    async def _generate_advice(
        self,
        summary: str,
        metrics: _CoachMetrics,
        patterns: list[str],
    ) -> tuple[str, str]:
        if not settings.ai_api_key:
            await self._increment_usage("fallback_used")
            return self._rule_based_advice(metrics, patterns), "fallback"

        await self._increment_usage("total_requests")

        try:
            if self._provider == "gemini":
                advice = await self._request_gemini(summary)
            elif self._provider == "openai":
                advice = await self._request_openai(summary)
            else:
                raise ValueError(f"Unsupported AI provider: {self._provider}")

            await self._increment_usage("successful")
            return advice, self._provider
        except Exception:
            logger.exception("ai.coach.provider.error", extra={"provider": self._provider})
            await self._increment_usage("failed")
            await self._increment_usage("fallback_used")
            return self._rule_based_advice(metrics, patterns), "fallback"

    async def _request_gemini(self, summary: str) -> str:
        url = f"{settings.gemini_base_url}/models/{settings.gemini_model}:generateContent"
        params = {"key": settings.ai_api_key}
        body = {
            "contents": [{"parts": [{"text": self._build_prompt(summary)}]}],
            "generationConfig": {"temperature": 0.2},
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

        return self._sanitize_advice(text)

    async def _request_openai(self, summary: str) -> str:
        url = f"{settings.openai_base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {settings.ai_api_key}"}
        body = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": "You are a concise trading coach."},
                {"role": "user", "content": self._build_prompt(summary)},
            ],
            "temperature": 0.2,
        }

        payload = await self._http_post_json(url, headers=headers, json_body=body)
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ValueError("OpenAI response missing choices")

        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str):
            raise ValueError("OpenAI response content is invalid")

        return self._sanitize_advice(content)

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

    async def _from_cache(self, user_id: int) -> CoachResponse | None:
        try:
            raw = await redis_client.get(self._cache_key(user_id))
        except Exception:
            logger.exception("ai.coach.cache.read.error", extra={"user_id": user_id})
            return None

        if not isinstance(raw, str):
            return None

        try:
            return CoachResponse.model_validate_json(raw)
        except Exception:
            return None

    async def _to_cache(self, response: CoachResponse) -> None:
        ttl = getattr(settings, "coach_cache_ttl_seconds", 60)
        try:
            await redis_client.set(name=self._cache_key(response.user_id), value=response.model_dump_json(), ex=ttl)
        except Exception:
            logger.exception("ai.coach.cache.write.error", extra={"user_id": response.user_id})

    async def _increment_usage(self, field: str) -> None:
        try:
            await redis_client.hincrby("ai:usage", field, 1)
            if field == "total_requests":
                await redis_client.incr("ai:requests")
            elif field == "successful":
                await redis_client.incr("ai:success")
            elif field == "failed":
                await redis_client.incr("ai:failures")
            elif field == "fallback_used":
                await redis_client.incr("ai:fallback")
        except Exception:
            logger.exception("ai.coach.usage_counter.error", extra={"field": field})

    def _cache_key(self, user_id: int) -> str:
        return f"coach:{user_id}"

    def _build_prompt(self, summary: str) -> str:
        return (
            "Analyze this trading behavior and give short advice. "
            "Return 1-2 sentences of coaching advice. "
            f"Trades: {summary}"
        )

    def _sanitize_advice(self, text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
            # If model returned a JSON object with an advice field, unwrap it.
            with_json = cleaned.strip()
            if with_json.startswith("{") and with_json.endswith("}"):
                with_json_payload = json.loads(with_json)
                advice = with_json_payload.get("advice") if isinstance(with_json_payload, dict) else None
                if isinstance(advice, str) and advice.strip():
                    cleaned = advice.strip()

        if len(cleaned) > 400:
            cleaned = cleaned[:397].rstrip() + "..."

        sentences = [segment.strip() for segment in cleaned.replace("\n", " ").split(".") if segment.strip()]
        if len(sentences) > 2:
            cleaned = ". ".join(sentences[:2]) + "."

        return cleaned or "Keep your risk small and review your strategy before increasing size."

    def _rule_based_advice(self, metrics: _CoachMetrics, patterns: list[str]) -> str:
        messages: list[str] = []

        if "overtrading" in patterns:
            messages.append("You are overtrading. Reduce frequency and wait for clearer setups.")
        if "loss_streak" in patterns:
            messages.append("You have a loss streak. Decrease position size and tighten risk limits.")
        if "early_exit" in patterns:
            messages.append("You close winning trades too early. Let strong winners run with a trailing stop.")

        if not messages and metrics.total_trades == 0:
            messages.append("Not enough trading history yet. Focus on consistent entries and risk limits.")
        elif not messages and metrics.win_rate < 0.45:
            messages.append("Your win rate is under pressure. Review entries and avoid forcing marginal trades.")
        elif not messages:
            messages.append("Performance looks stable. Keep disciplined risk management and trade selection.")

        if len(messages) > 2:
            messages = messages[:2]

        return " ".join(messages)
