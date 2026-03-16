from decimal import Decimal
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.events.event_publisher import event_publisher
from app.models.transaction import TransactionType
from app.models.user import User
from app.schemas.wallet import TransactionResponse, WalletMutationRequest, WalletResponse
from app.services.wallet import apply_wallet_transaction, get_user_transactions, get_user_wallet

router = APIRouter(tags=["wallet"])
logger = logging.getLogger(__name__)


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WalletResponse:
    wallet = await get_user_wallet(session, current_user.id)

    return WalletResponse(id=wallet.id, user_id=wallet.user_id, balance=wallet.balance)


@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[TransactionResponse]:
    transactions = await get_user_transactions(session, current_user.id)
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

    try:
        await event_publisher.publish_wallet_updated(
            current_user.id,
            {
                "wallet_id": wallet.id,
                "balance": str(wallet.balance),
                "reason": "deposit",
                "amount": str(payload.amount),
            },
        )
    except Exception:
        logger.exception("notification.publish.wallet_deposit.error", extra={"user_id": current_user.id})

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

    try:
        await event_publisher.publish_wallet_updated(
            current_user.id,
            {
                "wallet_id": wallet.id,
                "balance": str(wallet.balance),
                "reason": "withdraw",
                "amount": str(payload.amount),
            },
        )
    except Exception:
        logger.exception("notification.publish.wallet_withdraw.error", extra={"user_id": current_user.id})

    return WalletResponse(id=wallet.id, user_id=wallet.user_id, balance=wallet.balance)
