from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType
from app.models.wallet import Wallet
from app.repositories.transaction import create_transaction, list_transactions_for_wallet
from app.repositories.wallet import get_wallet_by_user_id, get_wallet_for_update


async def get_user_wallet(session: AsyncSession, user_id: int) -> Wallet:
    wallet = await get_wallet_by_user_id(session, user_id)
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")
    return wallet


async def get_user_transactions(session: AsyncSession, user_id: int) -> list[Transaction]:
    wallet = await get_user_wallet(session, user_id)
    return await list_transactions_for_wallet(session, wallet.id)


async def apply_wallet_transaction(
    session: AsyncSession,
    *,
    user_id: int,
    amount: Decimal,
    transaction_type: TransactionType,
    description: str | None = None,
) -> Wallet:
    wallet = await get_wallet_for_update(session, user_id)
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    next_balance = wallet.balance + amount
    if next_balance < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance")

    wallet.balance = next_balance
    await create_transaction(
        session,
        wallet_id=wallet.id,
        transaction_type=transaction_type,
        amount=amount,
        description=description,
    )
    await session.flush()
    await session.refresh(wallet)
    return wallet
