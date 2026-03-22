from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import JSON, Boolean, DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AlertConditionType(str, Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_DROP = "percent_drop"


class AlertActionType(str, Enum):
    NOTIFY = "notify"
    PLACE_ORDER = "place_order"


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    condition_type: Mapped[AlertConditionType] = mapped_column(
        SqlEnum(
            AlertConditionType,
            name="alert_condition_type",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    threshold: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    window_minutes: Mapped[int] = mapped_column(default=15)

    action_type: Mapped[AlertActionType] = mapped_column(
        SqlEnum(
            AlertActionType,
            name="alert_action_type",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    action_payload: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    cooldown_seconds: Mapped[int] = mapped_column(default=120)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="alert_rules")
    trigger_events = relationship("AlertTriggerEvent", back_populates="rule", cascade="all, delete-orphan")
