"""phase4 trading engine

Revision ID: 0003_phase4_trading_engine
Revises: 0002_phase2_auth_wallets
Create Date: 2026-03-16 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0003_phase4_trading_engine"
down_revision = "0002_phase2_auth_wallets"
branch_labels = None
depends_on = None


order_type_enum = postgresql.ENUM("market", "limit", name="order_type", create_type=False)
order_side_enum = postgresql.ENUM("buy", "sell", name="order_side", create_type=False)
order_status_enum = postgresql.ENUM("pending", "filled", "cancelled", name="order_status", create_type=False)


def upgrade() -> None:
    order_type_enum.create(op.get_bind(), checkfirst=True)
    order_side_enum.create(op.get_bind(), checkfirst=True)
    order_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("order_type", order_type_enum, nullable=False),
        sa.Column("side", order_side_enum, nullable=False),
        sa.Column("price", sa.Numeric(18, 6), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("status", order_status_enum, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"], unique=False)
    op.create_index("ix_orders_symbol", "orders", ["symbol"], unique=False)

    op.create_table(
        "trades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("price", sa.Numeric(18, 6), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("side", order_side_enum, nullable=False),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trades_order_id", "trades", ["order_id"], unique=False)
    op.create_index("ix_trades_user_id", "trades", ["user_id"], unique=False)
    op.create_index("ix_trades_symbol", "trades", ["symbol"], unique=False)

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("average_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "symbol", name="uq_positions_user_symbol"),
    )
    op.create_index("ix_positions_user_id", "positions", ["user_id"], unique=False)
    op.create_index("ix_positions_symbol", "positions", ["symbol"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_positions_symbol", table_name="positions")
    op.drop_index("ix_positions_user_id", table_name="positions")
    op.drop_table("positions")

    op.drop_index("ix_trades_symbol", table_name="trades")
    op.drop_index("ix_trades_user_id", table_name="trades")
    op.drop_index("ix_trades_order_id", table_name="trades")
    op.drop_table("trades")

    op.drop_index("ix_orders_symbol", table_name="orders")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_table("orders")

    order_status_enum.drop(op.get_bind(), checkfirst=True)
    order_side_enum.drop(op.get_bind(), checkfirst=True)
    order_type_enum.drop(op.get_bind(), checkfirst=True)
