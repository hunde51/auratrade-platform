from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.models.alert_rule import AlertActionType, AlertConditionType, AlertRule
from app.models.user import User
from app.services.alert_rule_service import AlertRuleEvaluator, AlertRuleService


class DummySession:
    pass


class StubRedisForHistory:
    async def zrangebyscore(self, *args, **kwargs):  # noqa: ARG002
        # baseline 100.0 at window start
        return ["100.0:1700000000"]


class StubRedisRateLimit:
    def __init__(self) -> None:
        self.value = 0

    async def incr(self, key: str):  # noqa: ARG002
        self.value += 1
        return self.value

    async def expire(self, key: str, ttl: int):  # noqa: ARG002
        return True


@pytest.mark.asyncio
async def test_condition_met_price_above() -> None:
    evaluator = AlertRuleEvaluator()
    rule = AlertRule(
        user_id=1,
        symbol="BTCUSD",
        condition_type=AlertConditionType.PRICE_ABOVE,
        threshold=60000,
        window_minutes=15,
        action_type=AlertActionType.NOTIFY,
        action_payload={},
        enabled=True,
        cooldown_seconds=60,
    )

    met = await evaluator._condition_met(rule, current_price=61000, now=datetime.now(UTC))
    assert met is True


@pytest.mark.asyncio
async def test_condition_met_percent_drop(monkeypatch: pytest.MonkeyPatch) -> None:
    evaluator = AlertRuleEvaluator()
    rule = AlertRule(
        user_id=1,
        symbol="BTCUSD",
        condition_type=AlertConditionType.PERCENT_DROP,
        threshold=3,
        window_minutes=15,
        action_type=AlertActionType.NOTIFY,
        action_payload={},
        enabled=True,
        cooldown_seconds=60,
    )

    monkeypatch.setattr("app.services.alert_rule_service.redis_client", StubRedisForHistory())

    # baseline is 100.0 from stub; 96.5 is 3.5% drop
    met = await evaluator._condition_met(rule, current_price=96.5, now=datetime.now(UTC))
    assert met is True


@pytest.mark.asyncio
async def test_passes_cooldown_blocks_recent_trigger() -> None:
    evaluator = AlertRuleEvaluator()
    rule = AlertRule(
        user_id=1,
        symbol="BTCUSD",
        condition_type=AlertConditionType.PRICE_BELOW,
        threshold=50000,
        window_minutes=15,
        action_type=AlertActionType.NOTIFY,
        action_payload={},
        enabled=True,
        cooldown_seconds=120,
        last_triggered_at=datetime.now(UTC) - timedelta(seconds=30),
    )

    allowed = await evaluator._passes_cooldown(rule, now=datetime.now(UTC))
    assert allowed is False


@pytest.mark.asyncio
async def test_auto_order_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    evaluator = AlertRuleEvaluator()
    stub_redis = StubRedisRateLimit()
    monkeypatch.setattr("app.services.alert_rule_service.redis_client", stub_redis)

    results = []
    for _ in range(7):
        results.append(await evaluator._passes_auto_order_rate_limit(user_id=9))

    assert results[:5] == [True, True, True, True, True]
    assert results[5:] == [False, False]


def test_validated_action_payload_market_order_rejects_price() -> None:
    service = AlertRuleService(DummySession(), User(id=1, email="u@test.com", username="u_test", password_hash="x"))

    with pytest.raises(HTTPException):
        service._validated_action_payload(
            AlertActionType.PLACE_ORDER,
            {"side": "buy", "order_type": "market", "quantity": 1, "price": 100},
        )


def test_validated_action_payload_notify_returns_empty() -> None:
    service = AlertRuleService(DummySession(), User(id=1, email="u@test.com", username="u_test", password_hash="x"))
    output = service._validated_action_payload(AlertActionType.NOTIFY, {"ignored": True})
    assert output == {}



