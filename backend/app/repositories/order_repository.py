from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderSide, OrderStatus, OrderType


async def create_order(
    session: AsyncSession,
    *,
    user_id: int,
    symbol: str,
    order_type: OrderType,
    side: OrderSide,
    quantity,
    price,
    status: OrderStatus,
) -> Order:
    order = Order(
        user_id=user_id,
        symbol=symbol,
        order_type=order_type,
        side=side,
        quantity=quantity,
        price=price,
        status=status,
    )
    session.add(order)
    await session.flush()
    return order


async def update_order_status(session: AsyncSession, order: Order, status: OrderStatus) -> None:
    order.status = status
    await session.flush()


async def list_orders_for_user(session: AsyncSession, user_id: int) -> list[Order]:
    result = await session.execute(
        select(Order).where(Order.user_id == user_id).order_by(desc(Order.created_at), desc(Order.id))
    )
    return list(result.scalars().all())
