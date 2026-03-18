from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderSide, OrderStatus, OrderType


class AdminWalletSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    wallet_id: int
    balance: Decimal


class AdminTradeSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    symbol: str
    side: OrderSide
    price: Decimal
    quantity: Decimal
    executed_at: datetime


class AdminPositionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    symbol: str
    quantity: Decimal
    average_price: Decimal
    updated_at: datetime


class AdminUserDetailsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: datetime
    wallet: AdminWalletSummary | None
    recent_trades: list[AdminTradeSummary]
    positions: list[AdminPositionSummary]


class UpdateUserRoleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    role: str = Field(pattern="^(user|admin)$")


class UpdateUserStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    is_active: bool


class ResetWalletRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    balance: Decimal = Field(ge=0)


class AdminOrderSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    user_id: int
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: Decimal
    price: Decimal | None
    status: OrderStatus
    created_at: datetime
