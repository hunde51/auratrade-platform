import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.redis import redis_client
from app.events.event_publisher import event_publisher
from app.models.alert_rule import AlertActionType, AlertConditionType, AlertRule
from app.models.alert_trigger_event import AlertTriggerEvent
from app.models.order import OrderType
from app.models.user import User
from app.repositories.alert_rule_repository import (
    count_enabled_alert_rules_for_user,
    create_alert_rule,
    create_trigger_event,
    delete_alert_rule,
    get_alert_rule_for_user,
    list_alert_rules_for_user,
    list_enabled_alert_rules_for_symbols,
    list_recent_trigger_events_for_user,
)
from app.schemas.alerts import (
    AlertOrderPayload,
    AlertRuleCreateRequest,
    AlertRuleResponse,
    AlertRulesListResponse,
    AlertRuleUpdateRequest,
    AlertTriggerEventResponse,
)
from app.schemas.order import CreateOrderRequest
from app.services.order_service import place_order

logger = logging.getLogger(__name__)

MAX_ENABLED_RULES_PER_USER = 20
MAX_AUTO_ORDER_ACTIONS_PER_MINUTE = 5
DEFAULT_HISTORY_RETENTION_SECONDS = 24 * 60 * 60


class AlertRuleService:
    def __init__(self, session: AsyncSession, user: User) -> None:
        self._session = session
        self._user = user

    async def list_rules(self) -> AlertRulesListResponse:
        rules = await list_alert_rules_for_user(self._session, user_id=self._user.id)
        events = await list_recent_trigger_events_for_user(self._session, user_id=self._user.id, limit=20)
        return AlertRulesListResponse(
            items=[self._to_rule_response(rule) for rule in rules],
            recent_events=[self._to_event_response(event) for event in events],
        )

    async def create_rule(self, payload: AlertRuleCreateRequest) -> AlertRuleResponse:
        symbol = self._normalize_symbol(payload.symbol)
        action_payload = self._validated_action_payload(payload.action_type, payload.action_payload)

        if payload.enabled:
            await self._enforce_enabled_limit()

        rule = AlertRule(
            user_id=self._user.id,
            symbol=symbol,
            condition_type=payload.condition_type,
            threshold=Decimal(payload.threshold),
            window_minutes=payload.window_minutes,
            action_type=payload.action_type,
            action_payload=action_payload,
            enabled=payload.enabled,
            cooldown_seconds=payload.cooldown_seconds,
        )

        await create_alert_rule(self._session, rule=rule)
        await self._session.commit()
        await self._session.refresh(rule)
        return self._to_rule_response(rule)

    async def update_rule(self, rule_id: int, payload: AlertRuleUpdateRequest) -> AlertRuleResponse:
        rule = await get_alert_rule_for_user(self._session, user_id=self._user.id, rule_id=rule_id, for_update=True)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")

        if payload.enabled is not None and payload.enabled and not rule.enabled:
            await self._enforce_enabled_limit()

        if payload.symbol is not None:
            rule.symbol = self._normalize_symbol(payload.symbol)
        if payload.condition_type is not None:
            rule.condition_type = payload.condition_type
        if payload.threshold is not None:
            rule.threshold = Decimal(payload.threshold)
        if payload.window_minutes is not None:
            rule.window_minutes = payload.window_minutes
        if payload.action_type is not None:
            rule.action_type = payload.action_type
            rule.action_payload = self._validated_action_payload(rule.action_type, payload.action_payload or rule.action_payload)
        elif payload.action_payload is not None:
            rule.action_payload = self._validated_action_payload(rule.action_type, payload.action_payload)

        if payload.enabled is not None:
            rule.enabled = payload.enabled
        if payload.cooldown_seconds is not None:
            rule.cooldown_seconds = payload.cooldown_seconds

        await self._session.commit()
        await self._session.refresh(rule)
        return self._to_rule_response(rule)

    async def toggle_rule(self, rule_id: int, enabled: bool) -> AlertRuleResponse:
        rule = await get_alert_rule_for_user(self._session, user_id=self._user.id, rule_id=rule_id, for_update=True)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")

        if enabled and not rule.enabled:
            await self._enforce_enabled_limit()

        rule.enabled = enabled
        await self._session.commit()
        await self._session.refresh(rule)
        return self._to_rule_response(rule)

    async def delete_rule(self, rule_id: int) -> None:
        rule = await get_alert_rule_for_user(self._session, user_id=self._user.id, rule_id=rule_id, for_update=True)
        if rule is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
        await delete_alert_rule(self._session, rule=rule)
        await self._session.commit()

    async def _enforce_enabled_limit(self) -> None:
        enabled_count = await count_enabled_alert_rules_for_user(self._session, user_id=self._user.id)
        if enabled_count >= MAX_ENABLED_RULES_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum enabled rules reached ({MAX_ENABLED_RULES_PER_USER})",
            )

    def _normalize_symbol(self, symbol: str) -> str:
        cleaned = symbol.strip().upper().replace("/", "")
        if not cleaned:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid symbol")
        return cleaned

    def _validated_action_payload(self, action_type: AlertActionType, action_payload: dict[str, object]) -> dict[str, object]:
        if action_type == AlertActionType.NOTIFY:
            return {}

        try:
            parsed = AlertOrderPayload.model_validate(action_payload)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid place_order action payload") from exc

        if parsed.order_type == OrderType.MARKET and parsed.price is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Market order action cannot include price")
        if parsed.order_type == OrderType.LIMIT and parsed.price is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Limit order action requires price")
        return parsed.model_dump(mode="json")

    def _to_rule_response(self, rule: AlertRule) -> AlertRuleResponse:
        return AlertRuleResponse(
            id=rule.id,
            user_id=rule.user_id,
            symbol=rule.symbol,
            condition_type=rule.condition_type,
            threshold=rule.threshold,
            window_minutes=rule.window_minutes,
            action_type=rule.action_type,
            action_payload=rule.action_payload or {},
            enabled=rule.enabled,
            cooldown_seconds=rule.cooldown_seconds,
            last_triggered_at=rule.last_triggered_at,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )

    def _to_event_response(self, event: AlertTriggerEvent) -> AlertTriggerEventResponse:
        return AlertTriggerEventResponse(
            id=event.id,
            rule_id=event.rule_id,
            user_id=event.user_id,
            action_type=event.action_type,
            status=event.status,
            details=event.details or {},
            triggered_at=event.triggered_at,
        )


class AlertRuleEvaluator:
    async def evaluate_quotes(self, quotes: list[tuple[str, float]]) -> None:
        if not quotes:
            return

        symbols = [symbol for symbol, _price in quotes]
        quote_map = {symbol: float(price) for symbol, price in quotes}

        await self._record_price_history(quotes)

        async with AsyncSessionLocal() as session:
            rules = await list_enabled_alert_rules_for_symbols(session, symbols=symbols)
            if not rules:
                await session.commit()
                return

            now = datetime.now(UTC)
            for rule in rules:
                try:
                    current_price = quote_map.get(rule.symbol)
                    if current_price is None:
                        continue
                    if not await self._passes_cooldown(rule, now):
                        continue
                    if not await self._condition_met(rule, current_price, now):
                        continue

                    if rule.action_type == AlertActionType.NOTIFY:
                        await self._execute_notify(rule, current_price)
                    else:
                        await self._execute_auto_order(session, rule, current_price)

                    rule.last_triggered_at = now
                    await create_trigger_event(
                        session,
                        event=AlertTriggerEvent(
                            rule_id=rule.id,
                            user_id=rule.user_id,
                            action_type=rule.action_type.value,
                            status="success",
                            details={"symbol": rule.symbol, "price": current_price},
                        ),
                    )
                except Exception as exc:
                    logger.exception("alerts.evaluator.rule.error", extra={"rule_id": rule.id})
                    await create_trigger_event(
                        session,
                        event=AlertTriggerEvent(
                            rule_id=rule.id,
                            user_id=rule.user_id,
                            action_type=rule.action_type.value,
                            status="error",
                            details={"error": str(exc)},
                        ),
                    )

            await session.commit()

    async def _record_price_history(self, quotes: list[tuple[str, float]]) -> None:
        now_ts = int(datetime.now(UTC).timestamp())
        retention_from_config = max(3600, int(settings.price_alert_cooldown_seconds) * 10)
        retention_seconds = max(DEFAULT_HISTORY_RETENTION_SECONDS, retention_from_config)
        min_score = now_ts - retention_seconds
        for symbol, price in quotes:
            key = f"alerts:price_history:{symbol}"
            try:
                await redis_client.zadd(key, {f"{price:.10f}:{now_ts}": now_ts})
                await redis_client.zremrangebyscore(key, 0, min_score)
                await redis_client.expire(key, retention_seconds)
            except Exception:
                logger.exception("alerts.price_history.write.error", extra={"symbol": symbol})

    async def _passes_cooldown(self, rule: AlertRule, now: datetime) -> bool:
        if rule.last_triggered_at is None:
            return True
        last = rule.last_triggered_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=UTC)
        return now >= last + timedelta(seconds=rule.cooldown_seconds)

    async def _condition_met(self, rule: AlertRule, current_price: float, now: datetime) -> bool:
        threshold = float(rule.threshold)

        if rule.condition_type == AlertConditionType.PRICE_ABOVE:
            return current_price >= threshold
        if rule.condition_type == AlertConditionType.PRICE_BELOW:
            return current_price <= threshold

        # Percent drop within rule.window_minutes.
        window_start = int((now - timedelta(minutes=rule.window_minutes)).timestamp())
        key = f"alerts:price_history:{rule.symbol}"
        try:
            samples = await redis_client.zrangebyscore(key, window_start, int(now.timestamp()), start=0, num=1)
        except Exception:
            logger.exception("alerts.price_history.read.error", extra={"symbol": rule.symbol})
            return False

        if not samples:
            return False

        baseline_raw = samples[0]
        if isinstance(baseline_raw, bytes):
            baseline_raw = baseline_raw.decode("utf-8")
        if not isinstance(baseline_raw, str) or ":" not in baseline_raw:
            return False

        try:
            baseline = float(baseline_raw.split(":", 1)[0])
        except ValueError:
            return False

        if baseline <= 0:
            return False

        drop_percent = ((baseline - current_price) / baseline) * 100
        return drop_percent >= threshold

    async def _execute_notify(self, rule: AlertRule, current_price: float) -> None:
        await event_publisher.publish_price_alert(
            rule.user_id,
            {
                "symbol": rule.symbol,
                "price": current_price,
                "condition_type": rule.condition_type.value,
                "threshold": float(rule.threshold),
                "source": "alert_rule",
            },
        )

    async def _execute_auto_order(self, session: AsyncSession, rule: AlertRule, current_price: float) -> None:
        if not await self._passes_auto_order_rate_limit(rule.user_id):
            raise RuntimeError("Auto-order rate limit exceeded")

        payload = AlertOrderPayload.model_validate(rule.action_payload or {})
        order_payload = CreateOrderRequest(
            symbol=rule.symbol,
            side=payload.side,
            order_type=payload.order_type,
            quantity=payload.quantity,
            price=payload.price if payload.order_type == OrderType.LIMIT else None,
        )
        await place_order(session, user_id=rule.user_id, payload=order_payload)

    async def _passes_auto_order_rate_limit(self, user_id: int) -> bool:
        key = f"alerts:auto_order:limit:{user_id}"
        try:
            current = await redis_client.incr(key)
            if current == 1:
                await redis_client.expire(key, 60)
            return current <= MAX_AUTO_ORDER_ACTIONS_PER_MINUTE
        except Exception:
            logger.exception("alerts.auto_order.rate_limit.error", extra={"user_id": user_id})
            return False


alert_rule_evaluator = AlertRuleEvaluator()
