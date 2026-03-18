from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.schemas.admin.series import AdminTimeSeriesPoint
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


@router.get("/user-growth", response_model=list[AdminTimeSeriesPoint])
async def get_user_growth(
    months: int = Query(default=6, ge=1, le=24),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminTimeSeriesPoint]:
    return await AdminStatsService(session).user_growth(months=months)
