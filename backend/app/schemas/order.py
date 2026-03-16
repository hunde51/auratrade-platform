from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.order import OrderSide, OrderStatus, OrderType


class CreateOrderRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=50)
    side: OrderSide
    order_type: OrderType
    quantity: Decimal = Field(gt=0)
    price: Decimal | None = Field(default=None, gt=0)


class OrderResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    order_type: OrderType
    side: OrderSide
    price: Decimal | None
    quantity: Decimal
    status: OrderStatus
    created_at: datetime
