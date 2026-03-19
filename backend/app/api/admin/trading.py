from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.series import AdminTimeSeriesPoint
from app.schemas.admin.trading import (
    AnomaliesResponse,
    PaginatedAdminOrdersResponse,
    PaginatedAdminPositionsResponse,
    PaginatedAdminTradesResponse,
)
from app.services.admin.trading_service import AdminTradingService

router = APIRouter(tags=["admin-trading"])


@router.get("/trades", response_model=PaginatedAdminTradesResponse)
async def get_admin_trades(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedAdminTradesResponse:
    items, total = await AdminTradingService(session).list_trades(page=page, page_size=page_size)
    return PaginatedAdminTradesResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/positions", response_model=PaginatedAdminPositionsResponse)
async def get_admin_positions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedAdminPositionsResponse:
    items, total = await AdminTradingService(session).list_positions(page=page, page_size=page_size)
    return PaginatedAdminPositionsResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/orders", response_model=PaginatedAdminOrdersResponse)
async def get_admin_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaginatedAdminOrdersResponse:
    items, total = await AdminTradingService(session).list_orders(page=page, page_size=page_size)
    return PaginatedAdminOrdersResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/alerts/anomalies", response_model=AnomaliesResponse)
async def get_anomalies(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AnomaliesResponse:
    return await AdminTradingService(session).list_anomalies()


@router.get("/trades/series", response_model=list[AdminTimeSeriesPoint])
async def get_trade_series(
    days: int = Query(default=7, ge=1, le=60),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminTimeSeriesPoint]:
    return await AdminTradingService(session).trade_series(days=days)
