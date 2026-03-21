"""phase8 user settings

Revision ID: 0005_phase8_user_settings
Revises: 0004_phase6_ai_sentiment
Create Date: 2026-03-21 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "0005_phase8_user_settings"
down_revision = "0004_phase6_ai_sentiment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("default_order_type", sa.String(length=20), nullable=False, server_default="market"),
        sa.Column("default_order_quantity", sa.Numeric(18, 6), nullable=False, server_default="1"),
        sa.Column("notify_trade_confirmations", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_wallet_updates", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_order_status_changes", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notify_price_alerts", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("preferred_symbols", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("preferred_timeframe", sa.String(length=5), nullable=False, server_default="4h"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_settings_user_id", "user_settings", ["user_id"], unique=True)

    op.execute(
        """
        INSERT INTO user_settings (
            user_id,
            default_order_type,
            default_order_quantity,
            notify_trade_confirmations,
            notify_wallet_updates,
            notify_order_status_changes,
            notify_price_alerts,
            preferred_symbols,
            preferred_timeframe
        )
        SELECT
            u.id,
            'market',
            1,
            true,
            true,
            true,
            true,
            '[]'::json,
            '4h'
        FROM users u
        LEFT JOIN user_settings s ON s.user_id = u.id
        WHERE s.user_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_settings_user_id", table_name="user_settings")
    op.drop_table("user_settings")
