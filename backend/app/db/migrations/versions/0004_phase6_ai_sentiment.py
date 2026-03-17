"""phase6 ai sentiment intelligence

Revision ID: 0004_phase6_ai_sentiment
Revises: 0003_phase4_trading_engine
Create Date: 2026-03-17 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_phase6_ai_sentiment"
down_revision = "0003_phase4_trading_engine"
branch_labels = None
depends_on = None


sentiment_label_enum = postgresql.ENUM("bullish", "bearish", "neutral", name="sentiment_label", create_type=False)


def upgrade() -> None:
    sentiment_label_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "sentiment_signals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("sentiment", sentiment_label_enum, nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sentiment_signals_symbol", "sentiment_signals", ["symbol"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sentiment_signals_symbol", table_name="sentiment_signals")
    op.drop_table("sentiment_signals")
    sentiment_label_enum.drop(op.get_bind(), checkfirst=True)
