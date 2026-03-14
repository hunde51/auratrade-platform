from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.transaction import TransactionType
from app.models.user import User
from app.repositories.transaction import create_transaction
from app.repositories.user import create_user, get_user_by_email
from app.repositories.wallet import create_wallet
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.services.auth import create_access_token, hash_password, verify_password


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def register_user(session: AsyncSession, payload: RegisterRequest) -> AuthResponse:
    email = normalize_email(payload.email)
    existing_user = await get_user_by_email(session, email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    initial_balance = Decimal(str(settings.initial_paper_balance)).quantize(Decimal("0.01"))
    user = await create_user(session, email=email, password_hash=hash_password(payload.password))
    wallet = await create_wallet(session, user_id=user.id, balance=initial_balance)
    await create_transaction(
        session,
        wallet_id=wallet.id,
        transaction_type=TransactionType.DEPOSIT,
        amount=initial_balance,
        description="Initial paper balance",
    )
    await session.commit()

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


async def login_user(session: AsyncSession, payload: LoginRequest) -> AuthResponse:
    email = normalize_email(payload.email)
    user = await get_user_by_email(session, email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


def serialize_user(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email)
