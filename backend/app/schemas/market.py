from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MarketQuote(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str
    price: float = Field(ge=0)
    volume: float = Field(ge=0)
    change_percent: float | None = None
    source: str
    timestamp: datetime


class MarketListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    items: list[MarketQuote]


class MarketSnapshotEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    type: Literal["market_snapshot"] = "market_snapshot"
    quotes: list[MarketQuote]
    timestamp: datetime


class TickerUpdateEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    type: Literal["ticker_update"] = "ticker_update"
    quote: MarketQuote
    timestamp: datetime
