from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderSide, OrderStatus, OrderType


class AdminTradeItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    user_id: int
    symbol: str
    side: OrderSide
    price: Decimal
    quantity: Decimal
    timestamp: datetime


class AdminPositionItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    user_id: int
    symbol: str
    quantity: Decimal
    average_price: Decimal
    updated_at: datetime


class AdminOrderItem(BaseModel):
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


class AnomalyItem(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    user_id: int
    reason: str


class AnomaliesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    items: list[AnomalyItem]
