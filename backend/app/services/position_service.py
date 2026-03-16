from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import OrderSide
from app.models.position import Position
from app.repositories.position_repository import create_position, get_position_for_update


async def apply_trade_to_position(
    session: AsyncSession,
    *,
    user_id: int,
    symbol: str,
    side: OrderSide,
    quantity: Decimal,
    execution_price: Decimal,
) -> Position:
    """Apply executed trade to position with row-level lock safety."""
    position = await get_position_for_update(session, user_id, symbol)

    if position is None:
        if side == OrderSide.SELL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot sell a symbol without an existing position",
            )
        return await create_position(
            session,
            user_id=user_id,
            symbol=symbol,
            quantity=quantity,
            average_price=execution_price,
        )

    if side == OrderSide.BUY:
        total_cost = (position.quantity * position.average_price) + (quantity * execution_price)
        next_quantity = position.quantity + quantity
        if next_quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resulting position quantity")
        position.average_price = total_cost / next_quantity
        position.quantity = next_quantity
    else:
        if quantity > position.quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient position quantity")
        position.quantity = position.quantity - quantity
        if position.quantity == 0:
            position.average_price = Decimal("0")

    await session.flush()
    await session.refresh(position)
    return position
