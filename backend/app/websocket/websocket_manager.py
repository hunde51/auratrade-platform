import asyncio
import logging

from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages active user websocket connections and targeted notifications."""

    def __init__(self) -> None:
        self._connections: dict[int, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()

        previous_socket: WebSocket | None = None
        async with self._lock:
            previous_socket = self._connections.get(user_id)
            self._connections[user_id] = websocket

        if previous_socket is not None and previous_socket is not websocket:
            try:
                await previous_socket.close(code=1000)
            except Exception:
                logger.exception("websocket.user.close_previous.error", extra={"user_id": user_id})

    async def disconnect(self, user_id: int) -> None:
        async with self._lock:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict[str, object]) -> bool:
        async with self._lock:
            websocket = self._connections.get(user_id)

        if websocket is None:
            return False

        try:
            await websocket.send_json(message)
            return True
        except Exception:
            logger.exception("websocket.user.send.error", extra={"user_id": user_id})
            await self.disconnect(user_id)
            return False


ws_user_manager = WebSocketManager()
