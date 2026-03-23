"""alert rules mvp

Revision ID: 0007_alert_rules_mvp
Revises: 0006_pwd_change_daily_limit
Create Date: 2026-03-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0007_alert_rules_mvp"
down_revision: str | None = "0006_pwd_change_daily_limit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


alert_condition_type = sa.Enum("price_above", "price_below", "percent_drop", name="alert_condition_type")
alert_action_type = sa.Enum("notify", "place_order", name="alert_action_type")

alert_condition_type_existing = postgresql.ENUM(
    "price_above",
    "price_below",
    "percent_drop",
    name="alert_condition_type",
    create_type=False,
)
alert_action_type_existing = postgresql.ENUM(
    "notify",
    "place_order",
    name="alert_action_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    alert_condition_type.create(bind, checkfirst=True)
    alert_action_type.create(bind, checkfirst=True)

    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("condition_type", alert_condition_type_existing, nullable=False),
        sa.Column("threshold", sa.Numeric(18, 6), nullable=False),
        sa.Column("window_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("action_type", alert_action_type_existing, nullable=False),
        sa.Column("action_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("cooldown_seconds", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_alert_rules_user_id", "alert_rules", ["user_id"], unique=False)
    op.create_index("ix_alert_rules_symbol", "alert_rules", ["symbol"], unique=False)

    op.create_table(
        "alert_trigger_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="success"),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_alert_trigger_events_rule_id", "alert_trigger_events", ["rule_id"], unique=False)
    op.create_index("ix_alert_trigger_events_user_id", "alert_trigger_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_alert_trigger_events_user_id", table_name="alert_trigger_events")
    op.drop_index("ix_alert_trigger_events_rule_id", table_name="alert_trigger_events")
    op.drop_table("alert_trigger_events")

    op.drop_index("ix_alert_rules_symbol", table_name="alert_rules")
    op.drop_index("ix_alert_rules_user_id", table_name="alert_rules")
    op.drop_table("alert_rules")

    bind = op.get_bind()
    alert_action_type.drop(bind, checkfirst=True)
    alert_condition_type.drop(bind, checkfirst=True)
