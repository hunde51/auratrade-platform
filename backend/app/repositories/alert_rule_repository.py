from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_rule import AlertRule
from app.models.alert_trigger_event import AlertTriggerEvent


async def create_alert_rule(session: AsyncSession, *, rule: AlertRule) -> AlertRule:
    session.add(rule)
    await session.flush()
    return rule


async def get_alert_rule_for_user(session: AsyncSession, *, user_id: int, rule_id: int, for_update: bool = False) -> AlertRule | None:
    stmt = select(AlertRule).where(AlertRule.user_id == user_id, AlertRule.id == rule_id)
    if for_update:
        stmt = stmt.with_for_update()
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_alert_rules_for_user(session: AsyncSession, *, user_id: int) -> list[AlertRule]:
    result = await session.execute(
        select(AlertRule).where(AlertRule.user_id == user_id).order_by(desc(AlertRule.updated_at), desc(AlertRule.id))
    )
    return list(result.scalars().all())


async def list_enabled_alert_rules_for_symbols(session: AsyncSession, *, symbols: list[str]) -> list[AlertRule]:
    if not symbols:
        return []
    result = await session.execute(
        select(AlertRule)
        .where(AlertRule.enabled.is_(True), AlertRule.symbol.in_(symbols))
        .order_by(AlertRule.id.asc())
    )
    return list(result.scalars().all())


async def count_enabled_alert_rules_for_user(session: AsyncSession, *, user_id: int) -> int:
    result = await session.execute(
        select(func.count(AlertRule.id)).where(AlertRule.user_id == user_id, AlertRule.enabled.is_(True))
    )
    return int(result.scalar_one())


async def delete_alert_rule(session: AsyncSession, *, rule: AlertRule) -> None:
    await session.delete(rule)
    await session.flush()


async def create_trigger_event(session: AsyncSession, *, event: AlertTriggerEvent) -> AlertTriggerEvent:
    session.add(event)
    await session.flush()
    return event


async def list_recent_trigger_events_for_user(session: AsyncSession, *, user_id: int, limit: int = 20) -> list[AlertTriggerEvent]:
    result = await session.execute(
        select(AlertTriggerEvent)
        .where(AlertTriggerEvent.user_id == user_id)
        .order_by(desc(AlertTriggerEvent.triggered_at), desc(AlertTriggerEvent.id))
        .limit(limit)
    )
    return list(result.scalars().all())
