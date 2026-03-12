from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db_session
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    email = payload.email.strip().lower()
    existing_user = await session.execute(select(User).where(User.email == email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    initial_balance = Decimal(str(settings.initial_paper_balance)).quantize(Decimal("0.01"))
    user = User(email=email, password_hash=hash_password(payload.password))
    session.add(user)
    await session.flush()

    wallet = Wallet(user_id=user.id, balance=initial_balance)
    session.add(wallet)
    await session.flush()

    session.add(
        Transaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEPOSIT,
            amount=initial_balance,
            description="Initial paper balance",
        )
    )
    await session.commit()

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    email = payload.email.strip().lower()
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user.id, email=current_user.email)
