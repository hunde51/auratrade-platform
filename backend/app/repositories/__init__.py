"""Data-access layer package for repository abstractions."""

from app.repositories.transaction import create_transaction, list_transactions_for_wallet
from app.repositories.user import create_user, get_user_by_email
from app.repositories.wallet import (
	create_wallet,
	get_wallet_by_user_id,
	get_wallet_for_update,
	wallet_for_update_query,
)

__all__ = [
	"get_user_by_email",
	"create_user",
	"get_wallet_by_user_id",
	"get_wallet_for_update",
	"create_wallet",
	"wallet_for_update_query",
	"create_transaction",
	"list_transactions_for_wallet",
]
