from decimal import Decimal

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType


async def create_transaction(
    session: AsyncSession,
    *,
    wallet_id: int,
    transaction_type: TransactionType,
    amount: Decimal,
    description: str | None = None,
) -> Transaction:
    transaction = Transaction(
        wallet_id=wallet_id,
        transaction_type=transaction_type,
        amount=amount,
        description=description,
    )
    session.add(transaction)
    await session.flush()
    return transaction


async def list_transactions_for_wallet(session: AsyncSession, wallet_id: int) -> list[Transaction]:
    result = await session.execute(
        select(Transaction)
        .where(Transaction.wallet_id == wallet_id)
        .order_by(desc(Transaction.created_at), desc(Transaction.id))
    )
    return list(result.scalars().all())
