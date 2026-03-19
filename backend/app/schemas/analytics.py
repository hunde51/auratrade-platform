from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CandlePoint(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    time: int
    open: float = Field(ge=0)
    high: float = Field(ge=0)
    low: float = Field(ge=0)
    close: float = Field(ge=0)
    volume: float = Field(ge=0)


class VolatilityPrediction(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str
    current_volatility: float = Field(ge=0, le=100)
    predicted_volatility: float = Field(ge=0, le=100)
    direction: str
    confidence: float = Field(ge=0, le=100)


class AIInsightItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    title: str
    summary: str
    sentiment: str
    confidence: float = Field(ge=0, le=100)
    timestamp: datetime


class NewsItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    title: str
    source: str
    sentiment: str
    timestamp: datetime


class TimeSeriesPoint(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    label: str
    value: int = Field(ge=0)


class SignalLevels(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    support: float = Field(ge=0)
    resistance: float = Field(ge=0)


class SignalIndicatorSet(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    sma_fast: float
    sma_slow: float
    rsi_14: float = Field(ge=0, le=100)


class SignalItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str
    timeframe: str
    trend: str
    confidence: float = Field(ge=0, le=100)
    indicators: SignalIndicatorSet
    levels: SignalLevels
    generated_at: datetime
