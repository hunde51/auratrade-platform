from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


NotificationEventType = Literal[
    "trade_confirmed",
    "wallet_updated",
    "order_filled",
    "price_alert",
]


class NotificationEvent(BaseModel):
    """Canonical event contract shared by publishers and websocket clients."""

    model_config = ConfigDict(extra="forbid", strict=True)

    event_type: NotificationEventType
    user_id: int = Field(gt=0)
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
