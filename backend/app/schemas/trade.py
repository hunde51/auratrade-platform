from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.order import OrderSide


class TradeResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    symbol: str
    price: Decimal
    quantity: Decimal
    side: OrderSide
    executed_at: datetime
