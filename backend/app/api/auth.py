from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse, UserWithNestedOrders, UserWithOrdersResponse
from app.schemas.order import OrderResponse
from app.services.rate_limit_service import rate_limit_service
from app.services.auth_service import login_user as login_user_service
from app.services.auth_service import register_user as register_user_service
from app.services.auth_service import serialize_user
from app.services.order_service import get_user_orders
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def _request_client_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for", "")
    return f"{host}|{forwarded}"


async def _enforce_auth_rate_limit(*, request: Request, scope: str, subject: str, limit: int) -> None:
    result = await rate_limit_service.check(
        scope=scope,
        subject=f"{_request_client_key(request)}|{subject}",
        limit=limit,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )
    if result.allowed:
        return

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many {scope} attempts. Try again in {result.retry_after_seconds}s",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    await _enforce_auth_rate_limit(
        request=request,
        scope="register",
        subject=f"email:{payload.email}",
        limit=settings.auth_rate_limit_register_attempts,
    )
    return await register_user_service(session, payload)


@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    await _enforce_auth_rate_limit(
        request=request,
        scope="login",
        subject=f"email:{payload.email}",
        limit=settings.auth_rate_limit_login_attempts,
    )
    return await login_user_service(session, payload)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return serialize_user(current_user)


@router.get("/me/orders", response_model=UserWithOrdersResponse)
async def get_me_with_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UserWithOrdersResponse:
    orders = await get_user_orders(session, user_id=current_user.id)
    user_payload = serialize_user(current_user)
    return UserWithOrdersResponse(
        user=UserWithNestedOrders(
            **user_payload.model_dump(),
            orders=[
                OrderResponse(
                    id=order.id,
                    user_id=order.user_id,
                    symbol=order.symbol,
                    order_type=order.order_type,
                    side=order.side,
                    price=order.price,
                    quantity=order.quantity,
                    status=order.status,
                    created_at=order.created_at,
                )
                for order in orders
            ],
        )
    )

