from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    result = await session.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(session: AsyncSession, *, email: str, username: str, password_hash: str) -> User:
    user = User(email=email, username=username, password_hash=password_hash, role=UserRole.USER, is_active=True)
    session.add(user)
    await session.flush()
    return user
