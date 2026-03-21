from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.settings import ChangePasswordRequest, UpdateUserSettingsRequest, UserSettingsResponse
from app.services.settings_service import UserSettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UserSettingsResponse:
    return await UserSettingsService(session, current_user).get_settings()


@router.patch("", response_model=UserSettingsResponse)
async def patch_settings(
    payload: UpdateUserSettingsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> UserSettingsResponse:
    return await UserSettingsService(session, current_user).update_settings(payload)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await UserSettingsService(session, current_user).change_password(payload)
