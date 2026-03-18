from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.transaction import TransactionType
from app.models.user import User
from app.repositories.transaction import create_transaction
from app.repositories.user import create_user, get_user_by_email, get_user_by_username
from app.repositories.wallet import create_wallet
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.services.auth import create_access_token, hash_password, verify_password


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_username(username: str) -> str:
    return "".join(ch for ch in username.strip().lower().replace(" ", "_") if ch.isalnum() or ch == "_")


async def register_user(session: AsyncSession, payload: RegisterRequest) -> AuthResponse:
    email = normalize_email(payload.email)
    username = normalize_username(payload.username)
    if len(username) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 valid characters")

    existing_username = await get_user_by_username(session, username)
    if existing_username is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already registered")

    existing_user = await get_user_by_email(session, email)
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    initial_balance = Decimal(str(settings.initial_paper_balance)).quantize(Decimal("0.01"))
    try:
        user = await create_user(session, email=email, username=username, password_hash=hash_password(payload.password))
        wallet = await create_wallet(session, user_id=user.id, balance=initial_balance)
        await create_transaction(
            session,
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEPOSIT,
            amount=initial_balance,
            description="Initial paper balance",
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration conflict, try another email") from exc
    except Exception:
        await session.rollback()
        raise

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


async def login_user(session: AsyncSession, payload: LoginRequest) -> AuthResponse:
    email = normalize_email(payload.email)
    user = await get_user_by_email(session, email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role.value,
        is_active=user.is_active,
    )
