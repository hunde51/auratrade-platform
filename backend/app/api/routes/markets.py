from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.analytics import CandlePoint
from app.schemas.market import MarketListResponse, MarketQuote
from app.services.analytics_service import AnalyticsService
from app.services.market_data_service import market_data_service

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("", response_model=MarketListResponse)
async def list_markets(symbols: list[str] | None = Query(default=None)) -> MarketListResponse:
    quotes = await market_data_service.get_markets(symbols)
    return MarketListResponse(items=quotes)


@router.get("/{symbol}", response_model=MarketQuote)
async def get_market(symbol: str) -> MarketQuote:
    quote = await market_data_service.get_market(symbol)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market symbol not found")
    return quote


@router.get("/{symbol}/candles", response_model=list[CandlePoint])
async def get_market_candles(
    symbol: str,
    points: int = Query(default=72, ge=12, le=240),
) -> list[CandlePoint]:
    service = AnalyticsService(session=None)  # type: ignore[arg-type]
    candles = await service.get_candles(symbol, points=points)
    if not candles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market symbol not found")
    return candles
