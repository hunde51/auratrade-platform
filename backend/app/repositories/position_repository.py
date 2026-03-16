from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position


async def get_position_for_update(session: AsyncSession, user_id: int, symbol: str) -> Position | None:
    result = await session.execute(
        select(Position)
        .where(Position.user_id == user_id, Position.symbol == symbol)
        .with_for_update()
    )
    return result.scalar_one_or_none()


async def create_position(session: AsyncSession, *, user_id: int, symbol: str, quantity, average_price) -> Position:
    position = Position(user_id=user_id, symbol=symbol, quantity=quantity, average_price=average_price)
    session.add(position)
    await session.flush()
    return position


async def list_positions_for_user(session: AsyncSession, user_id: int) -> list[Position]:
    result = await session.execute(
        select(Position)
        .where(Position.user_id == user_id)
        .order_by(desc(Position.updated_at), desc(Position.id))
    )
    return list(result.scalars().all())
