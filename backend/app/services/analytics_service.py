from datetime import UTC, datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analytics import AIInsightItem, CandlePoint, NewsItem, SignalIndicatorSet, SignalItem, SignalLevels, VolatilityPrediction
from app.services.market_data_service import market_data_service
from app.services.sentiment_service import SentimentService


class AnalyticsService:
    """Provides lightweight charting and AI dashboard data from backend APIs."""

    def __init__(self, session: Optional[AsyncSession]) -> None:
        self._session = session

    async def get_candles(self, symbol: str, points: int = 72, timeframe: str = "4h") -> list[CandlePoint]:
        return await market_data_service.get_historical_candles(symbol, timeframe=timeframe, points=points)

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

    async def get_signals(
        self,
        *,
        symbols: list[str] | None = None,
        timeframe: str = "4h",
        points: int = 120,
    ) -> list[SignalItem]:
        target_symbols = symbols or ["BTCUSD", "ETHUSD"]
        results: list[SignalItem] = []

        for symbol in target_symbols:
            candles = await self.get_candles(symbol=symbol, points=points, timeframe=timeframe)
            if len(candles) < 20:
                continue

            closes = [c.close for c in candles]
            highs = [c.high for c in candles]
            lows = [c.low for c in candles]

            sma_fast = self._sma(closes, period=9)
            sma_slow = self._sma(closes, period=21)
            rsi_14 = self._rsi(closes, period=14)

            trend = "neutral"
            confidence = 55.0
            if sma_fast > sma_slow and rsi_14 >= 52:
                trend = "bullish"
                confidence = min(95.0, 60 + (sma_fast - sma_slow) / max(sma_slow, 1e-9) * 1000)
            elif sma_fast < sma_slow and rsi_14 <= 48:
                trend = "bearish"
                confidence = min(95.0, 60 + (sma_slow - sma_fast) / max(sma_slow, 1e-9) * 1000)

            recent_window = candles[-20:]
            support = min(item.low for item in recent_window)
            resistance = max(item.high for item in recent_window)

            results.append(
                SignalItem(
                    symbol=symbol,
                    timeframe=timeframe,
                    trend=trend,
                    confidence=round(confidence, 2),
                    indicators=SignalIndicatorSet(
                        sma_fast=round(sma_fast, 4),
                        sma_slow=round(sma_slow, 4),
                        rsi_14=round(rsi_14, 2),
                    ),
                    levels=SignalLevels(support=round(support, 4), resistance=round(resistance, 4)),
                    generated_at=datetime.now(UTC),
                )
            )

        return results

    def _sma(self, values: list[float], *, period: int) -> float:
        if len(values) < period:
            return values[-1]
        window = values[-period:]
        return sum(window) / period

    def _rsi(self, values: list[float], *, period: int = 14) -> float:
        if len(values) <= period:
            return 50.0

        gains = 0.0
        losses = 0.0
        for idx in range(len(values) - period, len(values)):
            change = values[idx] - values[idx - 1]
            if change >= 0:
                gains += change
            else:
                losses += abs(change)

        avg_gain = gains / period
        avg_loss = losses / period
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
