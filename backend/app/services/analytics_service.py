import math
from datetime import UTC, datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analytics import AIInsightItem, CandlePoint, NewsItem, VolatilityPrediction
from app.services.market_data_service import market_data_service
from app.services.sentiment_service import SentimentService


class AnalyticsService:
    """Provides lightweight charting and AI dashboard data from backend APIs."""

    def __init__(self, session: Optional[AsyncSession]) -> None:
        self._session = session

    async def get_candles(self, symbol: str, points: int = 72) -> list[CandlePoint]:
        market = await market_data_service.get_market(symbol)
        if market is None:
            return []

        base = market.price
        now = int(datetime.now(UTC).timestamp())
        total_points = max(12, min(points, 240))

        candles: list[CandlePoint] = []
        for idx in range(total_points):
            step = total_points - idx
            wave = math.sin(step / 6) * base * 0.01
            open_price = base + wave
            close = open_price + math.cos(step / 5) * base * 0.002
            high = max(open_price, close) + base * 0.0015
            low = max(0.0001, min(open_price, close) - base * 0.0015)

            candles.append(
                CandlePoint(
                    time=now - step * 3600,
                    open=round(open_price, 6),
                    high=round(high, 6),
                    low=round(low, 6),
                    close=round(close, 6),
                    volume=float(1000 + step * 10),
                )
            )

        return candles

    async def get_volatility(self, symbols: list[str] | None = None) -> list[VolatilityPrediction]:
        quotes = await market_data_service.get_markets(symbols)
        results: list[VolatilityPrediction] = []

        for quote in quotes[:8]:
            change_percent = quote.change_percent or 0
            current_volatility = min(99.0, max(5.0, abs(change_percent) * 6))
            predicted_volatility = min(
                99.0,
                max(5.0, current_volatility + (4 if change_percent >= 0 else -3)),
            )
            direction = "stable"
            if predicted_volatility > current_volatility:
                direction = "increasing"
            elif predicted_volatility < current_volatility:
                direction = "decreasing"

            results.append(
                VolatilityPrediction(
                    symbol=quote.symbol,
                    current_volatility=round(current_volatility, 2),
                    predicted_volatility=round(predicted_volatility, 2),
                    direction=direction,
                    confidence=65,
                )
            )

        return results

    async def get_insights(self) -> list[AIInsightItem]:
        if self._session is None:
            sentiments = []
        else:
            sentiments = await SentimentService(self._session).get_sentiments()
        sentiment_label = sentiments[0].sentiment.value if sentiments else "neutral"

        quotes = await market_data_service.get_markets()
        now = datetime.now(UTC)

        insights: list[AIInsightItem] = []
        for index, quote in enumerate(quotes[:4], start=1):
            insights.append(
                AIInsightItem(
                    id=str(index),
                    title=f"{quote.symbol} momentum signal",
                    summary=(
                        f"Market sentiment is {sentiment_label}. "
                        f"{quote.symbol} moved {quote.change_percent or 0:.2f}% with price near {quote.price:.2f}."
                    ),
                    sentiment=sentiment_label,
                    confidence=min(95.0, 60 + index * 5),
                    timestamp=now - timedelta(minutes=index * 15),
                )
            )

        return insights

    async def get_news(self) -> list[NewsItem]:
        quotes = await market_data_service.get_markets()
        now = datetime.now(UTC)

        news: list[NewsItem] = []
        for index, quote in enumerate(quotes[:6], start=1):
            pct = quote.change_percent or 0
            sentiment = "neutral"
            if pct > 0:
                sentiment = "positive"
            elif pct < 0:
                sentiment = "negative"

            direction = "up" if pct >= 0 else "down"
            news.append(
                NewsItem(
                    id=str(index),
                    title=f"{quote.symbol} ticks {direction} {abs(pct):.2f}% in latest session",
                    source="AuraTrade Feed",
                    sentiment=sentiment,
                    timestamp=now - timedelta(minutes=index * 10),
                )
            )

        return news
