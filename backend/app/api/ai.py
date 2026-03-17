from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.sentiment import SentimentResponse
from app.services.sentiment_service import SentimentService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/sentiment", response_model=list[SentimentResponse])
async def get_sentiment(
    symbol: list[str] | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[SentimentResponse]:
    service = SentimentService(session)
    return await service.get_sentiments(symbol)
