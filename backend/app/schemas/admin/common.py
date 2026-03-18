from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AdminUserListItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    username: str
    role: str
    wallet_balance: Decimal = Field(ge=0)
    created_at: datetime


class PaginatedUsersResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    items: list[AdminUserListItem]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=200)
    total: int = Field(ge=0)
