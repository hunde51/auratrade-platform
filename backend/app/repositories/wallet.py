from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet import Wallet


def wallet_for_update_query(user_id: int) -> Select[tuple[Wallet]]:
    return select(Wallet).where(Wallet.user_id == user_id).with_for_update()


async def get_wallet_by_user_id(session: AsyncSession, user_id: int) -> Wallet | None:
    result = await session.execute(select(Wallet).where(Wallet.user_id == user_id))
    return result.scalar_one_or_none()


async def get_wallet_for_update(session: AsyncSession, user_id: int) -> Wallet | None:
    result = await session.execute(wallet_for_update_query(user_id))
    return result.scalar_one_or_none()


async def create_wallet(session: AsyncSession, *, user_id: int, balance: Decimal) -> Wallet:
    wallet = Wallet(user_id=user_id, balance=balance)
    session.add(wallet)
    await session.flush()
    return wallet
