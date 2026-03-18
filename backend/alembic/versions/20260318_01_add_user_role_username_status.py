"""add user role, username and status columns

Revision ID: 20260318_01
Revises:
Create Date: 2026-03-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260318_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


user_role_enum = sa.Enum("user", "admin", name="user_role")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)

    op.add_column("users", sa.Column("username", sa.String(length=100), nullable=True))
    op.add_column(
        "users",
        sa.Column("role", user_role_enum, nullable=False, server_default="user"),
    )
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))

    op.execute(
        """
        WITH base AS (
            SELECT
                id,
                split_part(email, '@', 1) AS base_username,
                row_number() OVER (PARTITION BY split_part(email, '@', 1) ORDER BY id) AS seq
            FROM users
            WHERE username IS NULL
        )
        UPDATE users
        SET username = CASE
            WHEN base.seq = 1 THEN base.base_username
            ELSE base.base_username || '_' || users.id::text
        END
        FROM base
        WHERE users.id = base.id
        """
    )

    op.alter_column("users", "username", existing_type=sa.String(length=100), nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "is_active")
    op.drop_column("users", "role")
    op.drop_column("users", "username")

    bind = op.get_bind()
    user_role_enum.drop(bind, checkfirst=True)
