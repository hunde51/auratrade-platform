"""phase2 auth wallets

Revision ID: 0002_phase2_auth_wallets
Revises: 0001_phase1_init
Create Date: 2026-03-12 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_phase2_auth_wallets"
down_revision = "0001_phase1_init"
branch_labels = None
depends_on = None


transaction_type = postgresql.ENUM("deposit", "withdraw", "trade", name="transaction_type", create_type=False)


def upgrade() -> None:
    transaction_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "wallets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("balance", sa.Numeric(18, 2), nullable=False, server_default="0.00"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_wallets_user_id", "wallets", ["user_id"], unique=True)

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wallet_id", sa.Integer(), sa.ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_type", transaction_type, nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transactions_wallet_id", "transactions", ["wallet_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_wallet_id", table_name="transactions")
    op.drop_table("transactions")
    op.drop_index("ix_wallets_user_id", table_name="wallets")
    op.drop_table("wallets")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    transaction_type.drop(op.get_bind(), checkfirst=True)
