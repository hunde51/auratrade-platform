import logging

from app.core.config import settings
from app.core.redis import redis_client
from app.schemas.notification import NotificationEvent

logger = logging.getLogger(__name__)


class EventPublisher:
    """Publishes normalized user events to Redis Pub/Sub channels."""

    async def publish(self, channel: str, event: NotificationEvent) -> None:
        payload = event.model_dump_json()
        await redis_client.publish(channel, payload)
        logger.info(
            "notification.event.published",
            extra={"channel": channel, "event_type": event.event_type, "user_id": event.user_id},
        )

    async def publish_trade_confirmed(self, user_id: int, data: dict[str, object]) -> None:
        await self.publish(
            settings.redis_channel_trades,
            NotificationEvent(event_type="trade_confirmed", user_id=user_id, data=data),
        )

    async def publish_order_filled(self, user_id: int, data: dict[str, object]) -> None:
        await self.publish(
            settings.redis_channel_trades,
            NotificationEvent(event_type="order_filled", user_id=user_id, data=data),
        )

    async def publish_wallet_updated(self, user_id: int, data: dict[str, object]) -> None:
        await self.publish(
            settings.redis_channel_wallets,
            NotificationEvent(event_type="wallet_updated", user_id=user_id, data=data),
        )

    async def publish_price_alert(self, user_id: int, data: dict[str, object]) -> None:
        await self.publish(
            settings.redis_channel_alerts,
            NotificationEvent(event_type="price_alert", user_id=user_id, data=data),
        )


event_publisher = EventPublisher()
