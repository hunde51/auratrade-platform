from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AdminStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    total_users: int = Field(ge=0)
    active_users: int = Field(ge=0)
    total_trades: int = Field(ge=0)
    total_volume: Decimal = Field(ge=0)
    total_positions: int = Field(ge=0)
    system_liquidity: Decimal = Field(ge=0)
