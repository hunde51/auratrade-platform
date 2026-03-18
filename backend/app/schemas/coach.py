from pydantic import BaseModel, ConfigDict, Field


class CoachResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    user_id: int
    win_rate: float = Field(ge=0, le=1)
    total_trades: int = Field(ge=0)
    advice: str = Field(min_length=1, max_length=400)
    source: str = Field(min_length=1, max_length=50)
