from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.series import AdminTimeSeriesPoint
from app.schemas.admin.trading import AdminOrderItem, AdminPositionItem, AdminTradeItem, AnomaliesResponse
from app.services.admin.trading_service import AdminTradingService

router = APIRouter(tags=["admin-trading"])


@router.get("/trades", response_model=list[AdminTradeItem])
async def get_admin_trades(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminTradeItem]:
    return await AdminTradingService(session).list_trades(page=page, page_size=page_size)


@router.get("/positions", response_model=list[AdminPositionItem])
async def get_admin_positions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPositionItem]:
    return await AdminTradingService(session).list_positions(page=page, page_size=page_size)


@router.get("/orders", response_model=list[AdminOrderItem])
async def get_admin_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminOrderItem]:
    return await AdminTradingService(session).list_orders(page=page, page_size=page_size)


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
