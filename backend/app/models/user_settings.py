from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)

    default_order_type: Mapped[str] = mapped_column(String(20), default="market")
    default_order_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("1"))

    notify_trade_confirmations: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_wallet_updates: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_order_status_changes: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_price_alerts: Mapped[bool] = mapped_column(Boolean, default=True)

    preferred_symbols: Mapped[list[str]] = mapped_column(JSON, default=list)
    preferred_timeframe: Mapped[str] = mapped_column(String(5), default="4h")
    last_password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="settings")
