from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.services.auth_service import login_user as login_user_service
from app.services.auth_service import register_user as register_user_service
from app.services.auth_service import serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    return await register_user_service(session, payload)


@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    return await login_user_service(session, payload)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return serialize_user(current_user)
