from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_settings import UserSettings


async def get_user_settings(session: AsyncSession, user_id: int, *, for_update: bool = False) -> UserSettings | None:
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    if for_update:
        stmt = stmt.with_for_update()
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_user_settings(session: AsyncSession, *, user_id: int) -> UserSettings:
    settings = UserSettings(user_id=user_id)
    session.add(settings)
    await session.flush()
    return settings
