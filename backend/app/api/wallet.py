from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.models.wallet import Wallet
from app.services.wallet import apply_wallet_transaction

router = APIRouter(tags=["wallet"])


class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal


class TransactionResponse(BaseModel):
    id: int
    transaction_type: TransactionType
    amount: Decimal
    description: str | None
    created_at: str


class WalletMutationRequest(BaseModel):
    amount: Decimal = Field(gt=0)


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WalletResponse:
    result = await session.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    return WalletResponse(id=wallet.id, user_id=wallet.user_id, balance=wallet.balance)


@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[TransactionResponse]:
    wallet_result = await session.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_result.scalar_one_or_none()
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    tx_result = await session.execute(
        select(Transaction)
        .where(Transaction.wallet_id == wallet.id)
        .order_by(desc(Transaction.created_at), desc(Transaction.id))
    )
    transactions = tx_result.scalars().all()
    return [
        TransactionResponse(
            id=tx.id,
            transaction_type=tx.transaction_type,
            amount=tx.amount,
            description=tx.description,
            created_at=tx.created_at.isoformat(),
        )
        for tx in transactions
    ]


@router.post("/wallet/deposit", response_model=WalletResponse)
async def deposit_to_wallet(
    payload: WalletMutationRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WalletResponse:
    wallet = await apply_wallet_transaction(
        session,
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type=TransactionType.DEPOSIT,
        description="Manual deposit",
    )
    await session.commit()
    return WalletResponse(id=wallet.id, user_id=wallet.user_id, balance=wallet.balance)


@router.post("/wallet/withdraw", response_model=WalletResponse)
async def withdraw_from_wallet(
    payload: WalletMutationRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WalletResponse:
    wallet = await apply_wallet_transaction(
        session,
        user_id=current_user.id,
        amount=payload.amount * Decimal("-1"),
        transaction_type=TransactionType.WITHDRAW,
        description="Manual withdrawal",
    )
    await session.commit()
    return WalletResponse(id=wallet.id, user_id=wallet.user_id, balance=wallet.balance)
