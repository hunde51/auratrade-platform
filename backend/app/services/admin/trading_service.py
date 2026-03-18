from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.position import Position
from app.models.trade import Trade
from app.schemas.admin.trading import (
    AdminOrderItem,
    AdminPositionItem,
    AdminTradeItem,
    AnomaliesResponse,
)
from app.schemas.admin.series import AdminTimeSeriesPoint


class AdminTradingService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_trades(self, *, page: int, page_size: int) -> list[AdminTradeItem]:
        offset = (page - 1) * page_size
        result = await self._session.execute(
            select(Trade).order_by(desc(Trade.executed_at), desc(Trade.id)).offset(offset).limit(page_size)
        )
        rows = list(result.scalars().all())
        return [
            AdminTradeItem(
                id=trade.id,
                user_id=trade.user_id,
                symbol=trade.symbol,
                side=trade.side,
                price=trade.price,
                quantity=trade.quantity,
                timestamp=trade.executed_at,
            )
            for trade in rows
        ]

    async def list_positions(self, *, page: int, page_size: int) -> list[AdminPositionItem]:
        offset = (page - 1) * page_size
        result = await self._session.execute(
            select(Position)
            .where(Position.quantity > 0)
            .order_by(desc(Position.updated_at), desc(Position.id))
            .offset(offset)
            .limit(page_size)
        )
        rows = list(result.scalars().all())
        return [
            AdminPositionItem(
                id=position.id,
                user_id=position.user_id,
                symbol=position.symbol,
                quantity=position.quantity,
                average_price=position.average_price,
                updated_at=position.updated_at,
            )
            for position in rows
        ]

    async def list_orders(self, *, page: int, page_size: int) -> list[AdminOrderItem]:
        offset = (page - 1) * page_size
        result = await self._session.execute(
            select(Order).order_by(desc(Order.created_at), desc(Order.id)).offset(offset).limit(page_size)
        )
        rows = list(result.scalars().all())
        return [
            AdminOrderItem(
                id=order.id,
                user_id=order.user_id,
                symbol=order.symbol,
                order_type=order.order_type,
                side=order.side,
                quantity=order.quantity,
                price=order.price,
                status=order.status,
                created_at=order.created_at,
            )
            for order in rows
        ]

    async def list_anomalies(self) -> AnomaliesResponse:
        now = datetime.now(UTC)
        horizon = now - timedelta(hours=1)

        result = await self._session.execute(
            select(Trade).where(Trade.executed_at >= horizon).order_by(desc(Trade.executed_at), desc(Trade.id))
        )
        trades = list(result.scalars().all())

        trades_per_user: defaultdict[int, int] = defaultdict(int)
        pnl_per_user: defaultdict[int, Decimal] = defaultdict(lambda: Decimal("0"))

        # Rough realized-PnL proxy per user from sell minus buy notionals in the recent window.
        for trade in trades:
            trades_per_user[trade.user_id] += 1
            notional = Decimal(trade.price) * Decimal(trade.quantity)
            if trade.side.value == "sell":
                pnl_per_user[trade.user_id] += notional
            else:
                pnl_per_user[trade.user_id] -= notional

        anomalies = []
        for user_id, count in trades_per_user.items():
            if count >= 20:
                anomalies.append({"user_id": user_id, "reason": "Overtrading detected (>=20 trades in 1h)"})

        for user_id, pnl in pnl_per_user.items():
            if pnl <= Decimal("-5000"):
                anomalies.append({"user_id": user_id, "reason": "Large recent notional loss proxy detected"})

        return AnomaliesResponse(items=anomalies)

    async def trade_series(self, *, days: int = 7) -> list[AdminTimeSeriesPoint]:
        horizon = datetime.now(UTC) - timedelta(days=max(1, min(days, 60)))

        stmt = (
            select(func.date_trunc("day", Trade.executed_at).label("bucket"), func.count(Trade.id).label("count"))
            .where(Trade.executed_at >= horizon)
            .group_by("bucket")
            .order_by("bucket")
        )
        result = await self._session.execute(stmt)

        return [
            AdminTimeSeriesPoint(label=row.bucket.strftime("%a"), value=int(row.count))
            for row in result.all()
            if row.bucket is not None
        ]
