"""phase8 password change daily limit

Revision ID: 0006_pwd_change_daily_limit
Revises: 0005_phase8_user_settings
Create Date: 2026-03-21 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "0006_pwd_change_daily_limit"
down_revision = "0005_phase8_user_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("last_password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "last_password_changed_at")
