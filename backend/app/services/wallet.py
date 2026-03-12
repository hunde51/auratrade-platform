from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType
from app.models.wallet import Wallet


def wallet_for_update_query(user_id: int) -> Select[tuple[Wallet]]:
    return select(Wallet).where(Wallet.user_id == user_id).with_for_update()


async def apply_wallet_transaction(
    session: AsyncSession,
    *,
    user_id: int,
    amount: Decimal,
    transaction_type: TransactionType,
    description: str | None = None,
) -> Wallet:
    result = await session.execute(wallet_for_update_query(user_id))
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    next_balance = wallet.balance + amount
    if next_balance < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance")

    wallet.balance = next_balance
    session.add(
        Transaction(
            wallet_id=wallet.id,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
        )
    )
    await session.flush()
    await session.refresh(wallet)
    return wallet
