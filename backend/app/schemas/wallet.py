from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.transaction import TransactionType


class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: Decimal


class TransactionResponse(BaseModel):
    id: int
    transaction_type: TransactionType
    amount: Decimal
    description: str | None
    created_at: str


class WalletMutationRequest(BaseModel):
    amount: Decimal = Field(gt=0)
