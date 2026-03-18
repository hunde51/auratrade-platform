from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.common import PaginatedUsersResponse
from app.schemas.admin.users import (
    AdminUserDetailsResponse,
    ResetWalletRequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)
from app.services.admin.user_service import AdminUserService

router = APIRouter(prefix="/users", tags=["admin-users"])


@router.get("", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedUsersResponse:
    return await AdminUserService(session).list_users(page=page, page_size=page_size)


@router.get("/{user_id}", response_model=AdminUserDetailsResponse)
async def get_user(
    user_id: int,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailsResponse:
    return await AdminUserService(session).get_user_details(user_id)


@router.patch("/{user_id}/role", response_model=AdminUserDetailsResponse)
async def patch_user_role(
    user_id: int,
    payload: UpdateUserRoleRequest,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailsResponse:
    return await AdminUserService(session).update_user_role(user_id, payload.role)


@router.patch("/{user_id}/status", response_model=AdminUserDetailsResponse)
async def patch_user_status(
    user_id: int,
    payload: UpdateUserStatusRequest,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailsResponse:
    return await AdminUserService(session).update_user_status(user_id, payload.is_active)


@router.post("/{user_id}/reset-wallet", response_model=AdminUserDetailsResponse)
async def reset_wallet(
    user_id: int,
    payload: ResetWalletRequest,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailsResponse:
    return await AdminUserService(session).reset_wallet_balance(user_id, payload.balance)
