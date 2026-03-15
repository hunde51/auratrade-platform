from datetime import UTC, datetime

import pytest

from app.schemas.market import MarketQuote
from app.services.market_data_service import MarketDataService


class StubRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.published: list[tuple[str, str]] = []

    def pipeline(self, transaction: bool = False):
        return self

    def set(self, name: str, value: str, ex: int) -> None:  # noqa: ARG002
        self.store[name] = value

    async def execute(self) -> None:
        return None

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self.store.get(key) for key in keys]

    async def publish(self, channel: str, payload: str) -> None:
        self.published.append((channel, payload))


@pytest.mark.asyncio
async def test_get_market_uses_cached_quote(monkeypatch: pytest.MonkeyPatch) -> None:
    service = MarketDataService()
    fake_redis = StubRedis()

    quote = MarketQuote(
        symbol="BTCUSD",
        price=50000.0,
        volume=100.0,
        change_percent=1.2,
        source="test",
        timestamp=datetime.now(UTC),
    )
    fake_redis.store["market_prices:BTCUSD"] = quote.model_dump_json()

    monkeypatch.setattr("app.services.market_data_service.redis_client", fake_redis)

    loaded = await service.get_market("BTCUSD")
    assert loaded is not None
    assert loaded.symbol == "BTCUSD"
    assert loaded.price == 50000.0


@pytest.mark.asyncio
async def test_fallback_quote_when_providers_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    service = MarketDataService()
    fake_redis = StubRedis()

    async def no_provider(_symbol: str):
        return None

    monkeypatch.setattr("app.services.market_data_service.redis_client", fake_redis)
    monkeypatch.setattr(service, "_fetch_from_alpaca", no_provider)
    monkeypatch.setattr(service, "_fetch_from_polygon", no_provider)
    monkeypatch.setattr(service, "_fetch_from_alpha_vantage", no_provider)

    quotes = await service.poll_and_publish(["BTCUSD"])

    assert len(quotes) == 1
    assert quotes[0].symbol == "BTCUSD"
    assert quotes[0].source == "fallback"
    assert fake_redis.published
