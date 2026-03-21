from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_settings import UserSettings
from app.repositories.user import get_user_by_username
from app.repositories.user_settings import create_user_settings, get_user_settings
from app.schemas.settings import ChangePasswordRequest, UpdateUserSettingsRequest, UserSettingsResponse
from app.services.auth import hash_password, verify_password


def _normalize_username(username: str) -> str:
    return "".join(ch for ch in username.strip().lower().replace(" ", "_") if ch.isalnum() or ch == "_")


class UserSettingsService:
    def __init__(self, session: AsyncSession, user: User) -> None:
        self._session = session
        self._user = user

    async def get_settings(self) -> UserSettingsResponse:
        settings, created = await self._get_or_create_settings()
        if created:
            await self._session.commit()
            await self._session.refresh(settings)
        return self._to_response(settings)

    async def update_settings(self, payload: UpdateUserSettingsRequest) -> UserSettingsResponse:
        settings, _created = await self._get_or_create_settings(for_update=True)

        if payload.username is not None:
            normalized = _normalize_username(payload.username)
            if len(normalized) < 3:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 valid characters")

            existing = await get_user_by_username(self._session, normalized)
            if existing is not None and existing.id != self._user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already registered")
            self._user.username = normalized

        if payload.default_order_type is not None:
            settings.default_order_type = payload.default_order_type
        if payload.default_order_quantity is not None:
            settings.default_order_quantity = Decimal(payload.default_order_quantity)

        if payload.notify_trade_confirmations is not None:
            settings.notify_trade_confirmations = payload.notify_trade_confirmations
        if payload.notify_wallet_updates is not None:
            settings.notify_wallet_updates = payload.notify_wallet_updates
        if payload.notify_order_status_changes is not None:
            settings.notify_order_status_changes = payload.notify_order_status_changes
        if payload.notify_price_alerts is not None:
            settings.notify_price_alerts = payload.notify_price_alerts

        if payload.preferred_symbols is not None:
            normalized = []
            for symbol in payload.preferred_symbols:
                cleaned = symbol.strip().upper().replace("/", "")
                if cleaned and cleaned not in normalized:
                    normalized.append(cleaned)
            settings.preferred_symbols = normalized[:20]

        if payload.preferred_timeframe is not None:
            settings.preferred_timeframe = payload.preferred_timeframe

        await self._session.commit()
        await self._session.refresh(self._user)
        await self._session.refresh(settings)
        return self._to_response(settings)

    async def change_password(self, payload: ChangePasswordRequest) -> None:
        if not verify_password(payload.current_password, self._user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

        if payload.current_password == payload.new_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

        self._user.password_hash = hash_password(payload.new_password)
        await self._session.commit()

    async def _get_or_create_settings(self, *, for_update: bool = False) -> tuple[UserSettings, bool]:
        settings = await get_user_settings(self._session, self._user.id, for_update=for_update)
        if settings is not None:
            return settings, False

        settings = await create_user_settings(self._session, user_id=self._user.id)
        await self._session.flush()
        return settings, True

    def _to_response(self, settings: UserSettings) -> UserSettingsResponse:
        return UserSettingsResponse(
            username=self._user.username,
            email=self._user.email,
            default_order_type=settings.default_order_type,
            default_order_quantity=settings.default_order_quantity,
            notify_trade_confirmations=settings.notify_trade_confirmations,
            notify_wallet_updates=settings.notify_wallet_updates,
            notify_order_status_changes=settings.notify_order_status_changes,
            notify_price_alerts=settings.notify_price_alerts,
            preferred_symbols=list(settings.preferred_symbols or []),
            preferred_timeframe=settings.preferred_timeframe,
        )
