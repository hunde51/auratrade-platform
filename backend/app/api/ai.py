from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.analytics import AIInsightItem, NewsItem, VolatilityPrediction
from app.schemas.coach import CoachResponse
from app.schemas.sentiment import SentimentResponse
from app.services.analytics_service import AnalyticsService
from app.services.trading_coach_service import TradingCoachService
from app.services.sentiment_service import SentimentService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/sentiment", response_model=list[SentimentResponse])
async def get_sentiment(
    symbol: list[str] | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[SentimentResponse]:
    service = SentimentService(session)
    return await service.get_sentiments(symbol)


@router.get("/coach", response_model=CoachResponse)
async def get_coach(
    user_id: int = Query(..., ge=1),
    session: AsyncSession = Depends(get_db_session),
) -> CoachResponse:
    service = TradingCoachService(session)
    return await service.get_coaching(user_id)


@router.get("/volatility", response_model=list[VolatilityPrediction])
async def get_volatility(
    symbol: list[str] | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[VolatilityPrediction]:
    service = AnalyticsService(session)
    return await service.get_volatility(symbol)


@router.get("/insights", response_model=list[AIInsightItem])
async def get_insights(session: AsyncSession = Depends(get_db_session)) -> list[AIInsightItem]:
    service = AnalyticsService(session)
    return await service.get_insights()


@router.get("/news", response_model=list[NewsItem])
async def get_news(session: AsyncSession = Depends(get_db_session)) -> list[NewsItem]:
    service = AnalyticsService(session)
    return await service.get_news()
