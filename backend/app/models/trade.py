from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.order import OrderSide


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    side: Mapped[OrderSide] = mapped_column(
        SqlEnum(OrderSide, name="order_side", values_callable=lambda enum_cls: [member.value for member in enum_cls])
    )
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="trades")
    user = relationship("User", back_populates="trades")
