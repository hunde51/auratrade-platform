from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PositionResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    quantity: Decimal
    average_price: Decimal
    updated_at: datetime
