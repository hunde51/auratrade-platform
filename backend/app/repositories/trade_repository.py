from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import OrderSide
from app.models.trade import Trade


async def create_trade(
    session: AsyncSession,
    *,
    order_id: int,
    user_id: int,
    symbol: str,
    price,
    quantity,
    side: OrderSide,
) -> Trade:
    trade = Trade(
        order_id=order_id,
        user_id=user_id,
        symbol=symbol,
        price=price,
        quantity=quantity,
        side=side,
    )
    session.add(trade)
    await session.flush()
    return trade


async def list_trades_for_user(session: AsyncSession, user_id: int) -> list[Trade]:
    result = await session.execute(
        select(Trade).where(Trade.user_id == user_id).order_by(desc(Trade.executed_at), desc(Trade.id))
    )
    return list(result.scalars().all())
