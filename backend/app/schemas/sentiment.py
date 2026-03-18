from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.sentiment import SentimentLabel


class SentimentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str
    sentiment: SentimentLabel
    score: float = Field(ge=0, le=1)
    source: str
    created_at: datetime | None = None


class _AIProviderPayload(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=False)

    sentiment: SentimentLabel
    score: float = Field(ge=0, le=1)
