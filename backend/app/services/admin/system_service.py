import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.monitoring import metrics_registry
from app.core.redis import redis_client
from app.schemas.admin.system import AdminSystemResponse
from app.services.websocket_manager import ws_market_manager
from app.tasks.celery_app import celery_app


class AdminSystemService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_system_health(self) -> AdminSystemResponse:
        database_ok = await self._check_database()
        redis_ok = await self._check_redis()
        websocket_connections = await self._get_websocket_connections(redis_ok)
        celery_ok = await self._check_celery_worker()

        api_status = "healthy" if (database_ok and redis_ok) else "degraded"
        database_status = "connected" if database_ok else "disconnected"
        redis_status = "connected" if redis_ok else "disconnected"
        celery_worker_status = "running" if celery_ok else "stopped"

        metrics_registry.set_dependency_status(
            redis_available=redis_ok,
            database_available=database_ok,
            worker_running=celery_ok,
        )
        metrics_registry.set_websocket_connections(websocket_connections)

        return AdminSystemResponse(
            api_status=api_status,
            database_status=database_status,
            redis_status=redis_status,
            websocket_connections=websocket_connections,
            celery_worker_status=celery_worker_status,
        )

    async def broadcast_alert(self, message: str) -> None:
        await redis_client.publish("global_alerts", message)

    async def _check_database(self) -> bool:
        try:
            await self._session.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    async def _check_redis(self) -> bool:
        try:
            await redis_client.ping()
            return True
        except Exception:
            return False

    async def _check_celery_worker(self) -> bool:
        def _inspect_ping() -> bool:
            inspector = celery_app.control.inspect(timeout=1)
            response = inspector.ping()
            return bool(response)

        try:
            return await asyncio.wait_for(asyncio.to_thread(_inspect_ping), timeout=2)
        except Exception:
            return False

    async def _get_websocket_connections(self, redis_ok: bool) -> int:
        if redis_ok:
            try:
                raw = await redis_client.get("ws:connections")
                if raw is not None:
                    return int(raw)
            except Exception:
                pass

        return await ws_market_manager.connection_count()
