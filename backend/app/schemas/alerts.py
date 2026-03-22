from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.alert_rule import AlertActionType, AlertConditionType
from app.models.order import OrderSide, OrderType


class AlertRuleCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str = Field(min_length=1, max_length=50)
    condition_type: AlertConditionType
    threshold: Decimal = Field(gt=0)
    window_minutes: int = Field(default=15, ge=1, le=1440)
    action_type: AlertActionType
    action_payload: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    cooldown_seconds: int = Field(default=120, ge=10, le=86_400)


class AlertRuleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    symbol: str | None = Field(default=None, min_length=1, max_length=50)
    condition_type: AlertConditionType | None = None
    threshold: Decimal | None = Field(default=None, gt=0)
    window_minutes: int | None = Field(default=None, ge=1, le=1440)
    action_type: AlertActionType | None = None
    action_payload: dict[str, Any] | None = None
    enabled: bool | None = None
    cooldown_seconds: int | None = Field(default=None, ge=10, le=86_400)


class AlertRuleToggleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    enabled: bool


class AlertRuleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    user_id: int
    symbol: str
    condition_type: AlertConditionType
    threshold: Decimal
    window_minutes: int
    action_type: AlertActionType
    action_payload: dict[str, Any]
    enabled: bool
    cooldown_seconds: int
    last_triggered_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AlertTriggerEventResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    rule_id: int
    user_id: int
    action_type: str
    status: str
    details: dict[str, Any]
    triggered_at: datetime


class AlertRulesListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    items: list[AlertRuleResponse]
    recent_events: list[AlertTriggerEventResponse]


class AlertOrderPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    side: OrderSide
    order_type: OrderType
    quantity: Decimal = Field(gt=0)
    price: Decimal | None = Field(default=None, gt=0)
