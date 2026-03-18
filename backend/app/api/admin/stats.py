from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.stats import AdminStatsResponse
from app.services.admin.stats_service import AdminStatsService

router = APIRouter(prefix="/stats", tags=["admin-stats"])


@router.get("", response_model=AdminStatsResponse)
async def get_admin_stats(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminStatsResponse:
    return await AdminStatsService(session).get_stats()
