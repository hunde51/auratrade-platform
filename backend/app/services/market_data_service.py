import asyncio
import json
import logging
import random
from dataclasses import dataclass
from datetime import UTC, datetime
from math import ceil

import httpx

from app.core.config import settings
from app.core.redis import redis_client
from app.events.event_publisher import event_publisher
from app.schemas.analytics import CandlePoint
from app.schemas.market import MarketQuote, MarketSnapshotEvent, TickerUpdateEvent
from app.websocket.websocket_manager import ws_user_manager

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProviderResult:
    quote: MarketQuote
    provider: str


class MarketDataService:
    """Pulls quotes from external providers, normalizes them, and publishes updates."""

    def __init__(self) -> None:
        self._fallback_prices: dict[str, tuple[float, float]] = {
            "AAPL": (180.0, 1_500_000.0),
            "MSFT": (410.0, 1_100_000.0),
            "TSLA": (245.0, 2_400_000.0),
            "BTCUSD": (68000.0, 12_300.0),
            "ETHUSD": (3600.0, 44_000.0),
        }
        self._coingecko_coin_id_map: dict[str, str] = {
            "BTCUSD": "bitcoin",
            "ETHUSD": "ethereum",
            "SOLUSD": "solana",
        }

    async def poll_and_publish(self, symbols: list[str] | None = None) -> list[MarketQuote]:
        target_symbols = self._normalize_symbols(symbols or settings.market_default_symbols)
        previous_quotes = await self._load_cached_quotes(target_symbols)
        quote_tasks = [self._fetch_symbol_quote(symbol) for symbol in target_symbols]
        quotes = [quote for quote in await asyncio.gather(*quote_tasks) if quote is not None]
        if not quotes:
            return []

        await asyncio.gather(
            self._cache_quotes(quotes),
            self._publish_quotes(quotes),
            self._publish_price_alerts(quotes, previous_quotes),
        )
        logger.info("market.poll.completed", extra={"symbols": [q.symbol for q in quotes], "count": len(quotes)})
        return quotes

    async def _publish_price_alerts(self, quotes: list[MarketQuote], previous_quotes: dict[str, MarketQuote]) -> None:
        threshold = max(0.1, float(settings.price_alert_threshold_percent))
        connected_users = await ws_user_manager.connected_user_ids()
        if not connected_users:
            return

        for quote in quotes:
            change_percent = quote.change_percent
            if change_percent is None:
                prev = previous_quotes.get(quote.symbol)
                if prev is None or prev.price <= 0:
                    continue
                change_percent = ((quote.price - prev.price) / prev.price) * 100

            if abs(change_percent) < threshold:
                continue

            cooldown_key = f"price_alert:cooldown:{quote.symbol}"
            should_emit = await redis_client.set(
                name=cooldown_key,
                value=str(datetime.now(UTC).timestamp()),
                ex=settings.price_alert_cooldown_seconds,
                nx=True,
            )
            if not should_emit:
                continue

            direction = "up" if change_percent >= 0 else "down"
            payload = {
                "symbol": quote.symbol,
                "price": str(quote.price),
                "change_percent": round(float(change_percent), 4),
                "direction": direction,
                "source": quote.source,
            }
            for user_id in connected_users:
                await event_publisher.publish_price_alert(user_id, payload)

    async def get_markets(self, symbols: list[str] | None = None) -> list[MarketQuote]:
        target_symbols = self._normalize_symbols(symbols or settings.market_default_symbols)
        cached = await self._load_cached_quotes(target_symbols)
        if len(cached) == len(target_symbols):
            return [cached[s] for s in target_symbols if s in cached]

        refreshed = await self.poll_and_publish(target_symbols)
        mapping = {quote.symbol: quote for quote in refreshed}
        return [mapping[s] for s in target_symbols if s in mapping]

    async def get_market(self, symbol: str) -> MarketQuote | None:
        symbol_key = self._normalize_symbol(symbol)
        cached = await self._load_cached_quotes([symbol_key])
        if symbol_key in cached:
            return cached[symbol_key]

        refreshed = await self.poll_and_publish([symbol_key])
        return refreshed[0] if refreshed else None

    async def get_historical_candles(
        self,
        symbol: str,
        *,
        timeframe: str = "4h",
        points: int = 72,
    ) -> list[CandlePoint]:
        symbol_key = self._normalize_symbol(symbol)
        timeframe_key = self._normalize_timeframe(timeframe)
        bounded_points = max(12, min(points, 240))

        cache_key = f"ohlc:{symbol_key}:{timeframe_key}:{bounded_points}"
        cached = await redis_client.get(cache_key)
        if isinstance(cached, str):
            try:
                payload = json.loads(cached)
                if isinstance(payload, list):
                    return [CandlePoint.model_validate(item) for item in payload]
            except Exception:
                logger.exception("market.ohlc.cache.parse.error", extra={"symbol": symbol_key, "timeframe": timeframe_key})

        candles = await self._fetch_historical_from_provider(symbol_key, timeframe_key, bounded_points)
        if not candles:
            return []

        try:
            serializable = [item.model_dump(mode="json") for item in candles]
            await redis_client.set(cache_key, json.dumps(serializable), ex=settings.market_ohlc_cache_ttl_seconds)
        except Exception:
            logger.exception("market.ohlc.cache.write.error", extra={"symbol": symbol_key, "timeframe": timeframe_key})

        return candles

    async def _fetch_symbol_quote(self, symbol: str) -> MarketQuote | None:
        provider_chain = [
            ("coingecko", self._fetch_from_coingecko),
            ("coinbase", self._fetch_from_coinbase),
            ("alpaca_crypto", self._fetch_from_alpaca_crypto),
            ("alpaca", self._fetch_from_alpaca),
            ("polygon", self._fetch_from_polygon),
            ("alpha_vantage", self._fetch_from_alpha_vantage),
        ]

        for provider_name, provider_fn in provider_chain:
            result = await self._retry_provider_call(provider_name, symbol, provider_fn)
            if result is not None:
                return result.quote

        # Fallback keeps websocket and API live when providers are unavailable.
        fallback = self._fallback_quote(symbol)
        logger.warning("market.provider.fallback", extra={"symbol": symbol})
        return fallback

    async def _retry_provider_call(
        self,
        provider_name: str,
        symbol: str,
        provider_fn,
    ) -> ProviderResult | None:
        for attempt in range(1, settings.market_max_retries + 1):
            try:
                quote = await provider_fn(symbol)
                if quote is None:
                    return None
                logger.info(
                    "market.provider.success",
                    extra={"provider": provider_name, "symbol": symbol, "attempt": attempt},
                )
                return ProviderResult(quote=quote, provider=provider_name)
            except Exception:
                if attempt == settings.market_max_retries:
                    logger.exception(
                        "market.provider.error",
                        extra={"provider": provider_name, "symbol": symbol, "attempt": attempt},
                    )
                    return None
                backoff = settings.market_retry_base_seconds * (2 ** (attempt - 1))
                await asyncio.sleep(backoff)
        return None

    async def _fetch_from_alpaca(self, symbol: str) -> MarketQuote | None:
        if not settings.alpaca_api_key or not settings.alpaca_api_secret:
            return None

        url = f"{settings.alpaca_base_url}/v2/stocks/{symbol}/quotes/latest"
        headers = {
            "APCA-API-KEY-ID": settings.alpaca_api_key,
            "APCA-API-SECRET-KEY": settings.alpaca_api_secret,
        }
        data = await self._http_get_json(url, headers=headers)
        quote = data.get("quote") if isinstance(data, dict) else None
        if not isinstance(quote, dict):
            return None

        bid = quote.get("bp")
        ask = quote.get("ap")
        size = quote.get("as")
        if not isinstance(bid, (int, float)) and not isinstance(ask, (int, float)):
            return None

        if isinstance(bid, (int, float)) and isinstance(ask, (int, float)):
            price = (float(bid) + float(ask)) / 2
        else:
            price = float(bid if isinstance(bid, (int, float)) else ask)

        volume = float(size) if isinstance(size, (int, float)) else 0.0
        return self._build_quote(symbol=symbol, price=price, volume=volume, source="alpaca")

    async def _fetch_from_alpaca_crypto(self, symbol: str) -> MarketQuote | None:
        if not settings.alpaca_api_key or not settings.alpaca_api_secret:
            return None

        symbol_map = {
            "BTCUSD": "BTC/USD",
            "ETHUSD": "ETH/USD",
            "SOLUSD": "SOL/USD",
        }
        alpaca_symbol = symbol_map.get(symbol)
        if alpaca_symbol is None:
            return None

        url = f"{settings.alpaca_base_url}/v1beta3/crypto/us/latest/quotes"
        headers = {
            "APCA-API-KEY-ID": settings.alpaca_api_key,
            "APCA-API-SECRET-KEY": settings.alpaca_api_secret,
        }
        params = {"symbols": alpaca_symbol}

        data = await self._http_get_json(url, headers=headers, params=params)
        quotes = data.get("quotes") if isinstance(data, dict) else None
        quote = quotes.get(alpaca_symbol) if isinstance(quotes, dict) else None
        if not isinstance(quote, dict):
            return None

        bid = quote.get("bp")
        ask = quote.get("ap")
        if not isinstance(bid, (int, float)) and not isinstance(ask, (int, float)):
            return None

        if isinstance(bid, (int, float)) and isinstance(ask, (int, float)):
            price = (float(bid) + float(ask)) / 2
        else:
            price = float(bid if isinstance(bid, (int, float)) else ask)

        return self._build_quote(symbol=symbol, price=price, volume=0.0, source="alpaca_crypto")

    async def _fetch_historical_from_provider(self, symbol: str, timeframe: str, points: int) -> list[CandlePoint]:
        try:
            coingecko = await self._fetch_ohlc_from_coingecko(symbol, timeframe=timeframe, points=points)
            if coingecko:
                return coingecko
        except Exception:
            logger.exception(
                "market.ohlc.provider.error",
                extra={"provider": "coingecko", "symbol": symbol, "timeframe": timeframe},
            )

        # Keep service resilient if provider bars are unavailable.
        quote = await self.get_market(symbol)
        if quote is None:
            return []
        return self._synthetic_from_last_price(quote.price, points=points, step_seconds=self._timeframe_step_seconds(timeframe))

    async def _fetch_ohlc_from_coingecko(self, symbol: str, *, timeframe: str, points: int) -> list[CandlePoint]:
        coin_id = self._coingecko_coin_id_map.get(symbol)
        if coin_id is None:
            return []

        step_seconds = self._timeframe_step_seconds(timeframe)
        days = max(1, ceil(points * step_seconds / 86_400))
        days = min(days, 365)

        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
        params = {
            "vs_currency": "usd",
            "days": str(days),
        }

        timeout = httpx.Timeout(settings.market_api_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()

        if not isinstance(payload, list):
            return []

        candles: list[CandlePoint] = []
        for row in payload[-points:]:
            if not isinstance(row, list) or len(row) < 5:
                continue
            ts_ms, open_price, high_price, low_price, close_price = row[:5]
            if not all(isinstance(value, (int, float)) for value in [ts_ms, open_price, high_price, low_price, close_price]):
                continue
            candles.append(
                CandlePoint(
                    time=int(ts_ms // 1000),
                    open=float(open_price),
                    high=float(high_price),
                    low=float(low_price),
                    close=float(close_price),
                    volume=0.0,
                )
            )

        return candles

    async def _fetch_from_polygon(self, symbol: str) -> MarketQuote | None:
        if not settings.polygon_api_key:
            return None

        url = f"{settings.polygon_base_url}/v2/last/trade/{symbol}"
        params = {"apiKey": settings.polygon_api_key}
        data = await self._http_get_json(url, params=params)
        result = data.get("results") if isinstance(data, dict) else None
        if not isinstance(result, dict):
            return None

        price = result.get("p")
        size = result.get("s")
        if not isinstance(price, (int, float)):
            return None

        volume = float(size) if isinstance(size, (int, float)) else 0.0
        return self._build_quote(symbol=symbol, price=float(price), volume=volume, source="polygon")

    async def _fetch_from_alpha_vantage(self, symbol: str) -> MarketQuote | None:
        if not settings.alpha_vantage_api_key:
            return None

        url = f"{settings.alpha_vantage_base_url}/query"
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": settings.alpha_vantage_api_key,
        }
        data = await self._http_get_json(url, params=params)
        quote = data.get("Global Quote") if isinstance(data, dict) else None
        if not isinstance(quote, dict):
            return None

        price_raw = quote.get("05. price")
        vol_raw = quote.get("06. volume")
        change_raw = quote.get("10. change percent")

        try:
            price = float(price_raw)
        except (TypeError, ValueError):
            return None

        try:
            volume = float(vol_raw) if vol_raw is not None else 0.0
        except (TypeError, ValueError):
            volume = 0.0

        change_percent: float | None = None
        if isinstance(change_raw, str):
            try:
                change_percent = float(change_raw.replace("%", "").strip())
            except ValueError:
                change_percent = None

        return self._build_quote(
            symbol=symbol,
            price=price,
            volume=volume,
            source="alpha_vantage",
            change_percent=change_percent,
        )

    async def _fetch_from_coingecko(self, symbol: str) -> MarketQuote | None:
        symbol_map = {
            "BTCUSD": "bitcoin",
            "ETHUSD": "ethereum",
        }
        coin_id = symbol_map.get(symbol)
        if coin_id is None:
            return None

        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_vol": "true",
            "include_24hr_change": "true",
        }

        data = await self._http_get_json(url, params=params)
        coin_data = data.get(coin_id) if isinstance(data, dict) else None
        if not isinstance(coin_data, dict):
            return None

        price = coin_data.get("usd")
        if not isinstance(price, (int, float)):
            return None

        volume_raw = coin_data.get("usd_24h_vol")
        change_raw = coin_data.get("usd_24h_change")

        volume = float(volume_raw) if isinstance(volume_raw, (int, float)) else 0.0
        change_percent = float(change_raw) if isinstance(change_raw, (int, float)) else None

        return self._build_quote(
            symbol=symbol,
            price=float(price),
            volume=volume,
            source="coingecko",
            change_percent=change_percent,
        )

    async def _fetch_from_coinbase(self, symbol: str) -> MarketQuote | None:
        product_map = {
            "BTCUSD": "BTC-USD",
            "ETHUSD": "ETH-USD",
            "SOLUSD": "SOL-USD",
        }
        product = product_map.get(symbol)
        if product is None:
            return None

        url = f"https://api.exchange.coinbase.com/products/{product}/ticker"
        timeout = httpx.Timeout(settings.market_api_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            payload = response.json()

        if not isinstance(payload, dict):
            return None

        try:
            price = float(payload.get("price"))
        except (TypeError, ValueError):
            return None

        try:
            volume = float(payload.get("volume"))
        except (TypeError, ValueError):
            volume = 0.0

        return self._build_quote(symbol=symbol, price=price, volume=volume, source="coinbase")

    async def _http_get_json(
        self,
        url: str,
        *,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
    ) -> dict:
        timeout = httpx.Timeout(settings.market_api_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Provider response is not a JSON object")
            return payload

    async def _cache_quotes(self, quotes: list[MarketQuote]) -> None:
        pipe = redis_client.pipeline(transaction=False)
        for quote in quotes:
            key = self._cache_key(quote.symbol)
            pipe.set(name=key, value=quote.model_dump_json(), ex=settings.market_cache_ttl_seconds)
        await pipe.execute()

    async def _load_cached_quotes(self, symbols: list[str]) -> dict[str, MarketQuote]:
        keys = [self._cache_key(symbol) for symbol in symbols]
        raw_values = await redis_client.mget(keys)

        items: dict[str, MarketQuote] = {}
        for symbol, raw in zip(symbols, raw_values, strict=False):
            if not isinstance(raw, str):
                continue
            try:
                items[symbol] = MarketQuote.model_validate_json(raw)
            except ValueError:
                continue
        return items

    async def _publish_quotes(self, quotes: list[MarketQuote]) -> None:
        now = datetime.now(UTC)
        snapshot_event = MarketSnapshotEvent(quotes=quotes, timestamp=now)
        await redis_client.publish(settings.redis_channel_market_prices, snapshot_event.model_dump_json())

        publish_tasks = []
        for quote in quotes:
            ticker_event = TickerUpdateEvent(quote=quote, timestamp=now)
            publish_tasks.append(redis_client.publish(settings.redis_channel_ticker_updates, ticker_event.model_dump_json()))
        if publish_tasks:
            await asyncio.gather(*publish_tasks)

    def _build_quote(
        self,
        *,
        symbol: str,
        price: float,
        volume: float,
        source: str,
        change_percent: float | None = None,
    ) -> MarketQuote:
        return MarketQuote(
            symbol=self._normalize_symbol(symbol),
            price=round(float(price), 6),
            volume=round(float(volume), 6),
            change_percent=None if change_percent is None else round(float(change_percent), 6),
            source=source,
            timestamp=datetime.now(UTC),
        )

    def _fallback_quote(self, symbol: str) -> MarketQuote:
        base_price, base_volume = self._fallback_prices.get(symbol, (100.0, 1000.0))
        # Keep fallback movement conservative so UI does not show unrealistic spikes.
        if symbol in {"BTCUSD", "ETHUSD", "SOLUSD"}:
            pct = random.uniform(-0.0005, 0.0005)
        elif symbol in {"AAPL", "MSFT", "TSLA", "GOOGL", "AMZN"}:
            pct = random.uniform(-0.0008, 0.0008)
        else:
            pct = random.uniform(-0.0012, 0.0012)

        volume_pct = random.uniform(-0.02, 0.02)

        price = max(base_price * (1 + pct), 0.0001)
        volume = max(base_volume * (1 + volume_pct), 0.0)
        self._fallback_prices[symbol] = (price, volume)
        return self._build_quote(symbol=symbol, price=price, volume=volume, source="fallback", change_percent=pct * 100)

    def _synthetic_from_last_price(self, base: float, *, points: int, step_seconds: int) -> list[CandlePoint]:
        now = int(datetime.now(UTC).timestamp())
        candles: list[CandlePoint] = []
        price = base

        for idx in range(points):
            drift = random.uniform(-0.0025, 0.0025)
            open_price = price
            close_price = max(0.0001, open_price * (1 + drift))
            wick_scale = open_price * random.uniform(0.0005, 0.003)
            high = max(open_price, close_price) + wick_scale
            low = max(0.0001, min(open_price, close_price) - wick_scale)
            candles.append(
                CandlePoint(
                    time=now - (points - idx) * step_seconds,
                    open=round(open_price, 6),
                    high=round(high, 6),
                    low=round(low, 6),
                    close=round(close_price, 6),
                    volume=float(max(0.0, random.uniform(300.0, 5000.0))),
                )
            )
            price = close_price

        return candles

    def _normalize_symbols(self, symbols: list[str]) -> list[str]:
        normalized = [self._normalize_symbol(symbol) for symbol in symbols if symbol]
        deduplicated: list[str] = []
        for symbol in normalized:
            if symbol not in deduplicated:
                deduplicated.append(symbol)
        return deduplicated

    def _normalize_symbol(self, symbol: str) -> str:
        return symbol.strip().upper().replace("/", "")

    def _normalize_timeframe(self, timeframe: str) -> str:
        value = timeframe.strip().lower()
        if value not in {"1h", "4h", "1d", "1w"}:
            return "4h"
        return value

    def _timeframe_step_seconds(self, timeframe: str) -> int:
        normalized = self._normalize_timeframe(timeframe)
        if normalized == "1h":
            return 3600
        if normalized == "4h":
            return 4 * 3600
        if normalized == "1d":
            return 24 * 3600
        return 7 * 24 * 3600

    def _cache_key(self, symbol: str) -> str:
        return f"{settings.market_cache_prefix}:{symbol}"


market_data_service = MarketDataService()
