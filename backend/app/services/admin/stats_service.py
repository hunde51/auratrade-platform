from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import redis_client
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.admin.stats import AdminStatsResponse


class AdminStatsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_stats(self) -> AdminStatsResponse:
        cached = await self._from_cache()
        if cached is not None:
            return cached

        total_users = await self._scalar_int(select(func.count(User.id)))
        active_users = await self._scalar_int(select(func.count(func.distinct(Trade.user_id))).where(Trade.executed_at >= func.now() - func.make_interval(hours=24)))
        total_trades = await self._scalar_int(select(func.count(Trade.id)))
        total_positions = await self._scalar_int(select(func.count(Position.id)))

        total_volume = await self._scalar_decimal(select(func.coalesce(func.sum(Trade.price * Trade.quantity), 0)))
        system_liquidity = await self._scalar_decimal(select(func.coalesce(func.sum(Wallet.balance), 0)))

        stats = AdminStatsResponse(
            total_users=total_users,
            active_users=active_users,
            total_trades=total_trades,
            total_volume=total_volume,
            total_positions=total_positions,
            system_liquidity=system_liquidity,
        )
        await self._to_cache(stats)
        return stats

    async def _from_cache(self) -> AdminStatsResponse | None:
        try:
            raw = await redis_client.get("admin:stats")
        except Exception:
            return None

        if not isinstance(raw, str):
            return None

        try:
            return AdminStatsResponse.model_validate_json(raw)
        except Exception:
            return None

    async def _to_cache(self, stats: AdminStatsResponse) -> None:
        try:
            await redis_client.set("admin:stats", stats.model_dump_json(), ex=45)
        except Exception:
            return

    async def _scalar_int(self, statement) -> int:
        value = await self._session.scalar(statement)
        return int(value or 0)

    async def _scalar_decimal(self, statement) -> Decimal:
        value = await self._session.scalar(statement)
        if value is None:
            return Decimal("0")
        return Decimal(value)
