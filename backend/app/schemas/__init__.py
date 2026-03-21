"""Pydantic request/response schemas package."""

from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.schemas.admin import AdminAIUsageResponse, AdminStatsResponse, AdminSystemResponse
from app.schemas.coach import CoachResponse
from app.schemas.market import MarketListResponse, MarketQuote, MarketSnapshotEvent, TickerUpdateEvent
from app.schemas.notification import NotificationEvent, NotificationEventType
from app.schemas.order import CreateOrderRequest, OrderResponse
from app.schemas.position import PositionResponse
from app.schemas.sentiment import SentimentResponse
from app.schemas.settings import ChangePasswordRequest, UpdateUserSettingsRequest, UserSettingsResponse
from app.schemas.trade import TradeResponse
from app.schemas.wallet import TransactionResponse, WalletMutationRequest, WalletResponse

__all__ = [
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
    "UserResponse",
    "AdminStatsResponse",
    "AdminSystemResponse",
    "AdminAIUsageResponse",
    "CoachResponse",
    "WalletResponse",
    "TransactionResponse",
    "WalletMutationRequest",
    "MarketListResponse",
    "MarketQuote",
    "MarketSnapshotEvent",
    "TickerUpdateEvent",
    "NotificationEvent",
    "NotificationEventType",
    "CreateOrderRequest",
    "OrderResponse",
    "TradeResponse",
    "PositionResponse",
    "SentimentResponse",
    "UserSettingsResponse",
    "UpdateUserSettingsRequest",
    "ChangePasswordRequest",
]
