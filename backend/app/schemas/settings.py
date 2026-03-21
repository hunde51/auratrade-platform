from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class UserSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    username: str
    email: str
    default_order_type: str
    default_order_quantity: Decimal = Field(gt=0)

    notify_trade_confirmations: bool
    notify_wallet_updates: bool
    notify_order_status_changes: bool
    notify_price_alerts: bool

    preferred_symbols: list[str]
    preferred_timeframe: str


class UpdateUserSettingsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    username: str | None = Field(default=None, min_length=3, max_length=100)
    default_order_type: str | None = Field(default=None, pattern="^(market|limit)$")
    default_order_quantity: Decimal | None = Field(default=None, gt=0)

    notify_trade_confirmations: bool | None = None
    notify_wallet_updates: bool | None = None
    notify_order_status_changes: bool | None = None
    notify_price_alerts: bool | None = None

    preferred_symbols: list[str] | None = None
    preferred_timeframe: str | None = Field(default=None, pattern="^(1h|4h|1d|1w)$")


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)
