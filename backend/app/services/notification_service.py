import asyncio
import contextlib
import logging

from app.core.config import settings
from app.core.redis import redis_client
from app.schemas.notification import NotificationEvent
from app.websocket.websocket_manager import ws_user_manager

logger = logging.getLogger(__name__)


class NotificationService:
    """Consumes Redis user-event channels and forwards events over user websockets."""

    def __init__(self) -> None:
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._task = asyncio.create_task(self._run(), name="notification-service")

    async def stop(self) -> None:
        if self._task is None:
            return

        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run(self) -> None:
        pubsub = redis_client.pubsub()
        channels = (
            settings.redis_channel_alerts,
            settings.redis_channel_trades,
            settings.redis_channel_wallets,
        )

        try:
            await pubsub.subscribe(*channels)
            logger.info("notification.redis.listener.started", extra={"channels": channels})

            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if not message or "data" not in message:
                    await asyncio.sleep(0.05)
                    continue

                raw_data = message.get("data")
                if not isinstance(raw_data, str):
                    logger.warning("notification.event.invalid_payload_type")
                    continue

                try:
                    event = NotificationEvent.model_validate_json(raw_data)
                except Exception:
                    logger.exception("notification.event.invalid_payload")
                    continue

                delivered = await ws_user_manager.send_to_user(event.user_id, event.model_dump(mode="json"))
                logger.info(
                    "notification.event.dispatched",
                    extra={
                        "event_type": event.event_type,
                        "user_id": event.user_id,
                        "delivered": delivered,
                    },
                )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("notification.redis.listener.error")
        finally:
            with contextlib.suppress(Exception):
                await pubsub.unsubscribe(*channels)
                await pubsub.close()
            logger.info("notification.redis.listener.stopped")


notification_service = NotificationService()
