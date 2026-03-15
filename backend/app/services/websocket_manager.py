import asyncio
import json
import logging
from collections import defaultdict

from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Tracks websocket connections and symbol subscriptions at scale."""

    def __init__(self) -> None:
        self._channel_connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._socket_channels: dict[WebSocket, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()

    async def subscribe(self, websocket: WebSocket, channel: str) -> None:
        normalized_channel = self._normalize_channel(channel)
        async with self._lock:
            self._channel_connections[normalized_channel].add(websocket)
            self._socket_channels[websocket].add(normalized_channel)

    async def unsubscribe(self, websocket: WebSocket, channel: str) -> None:
        normalized_channel = self._normalize_channel(channel)
        async with self._lock:
            sockets = self._channel_connections.get(normalized_channel)
            if sockets is not None:
                sockets.discard(websocket)
                if not sockets:
                    self._channel_connections.pop(normalized_channel, None)

            channels = self._socket_channels.get(websocket)
            if channels is not None:
                channels.discard(normalized_channel)
                if not channels:
                    self._socket_channels.pop(websocket, None)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            channels = set(self._socket_channels.get(websocket, set()))
            for channel in channels:
                sockets = self._channel_connections.get(channel)
                if sockets is not None:
                    sockets.discard(websocket)
                    if not sockets:
                        self._channel_connections.pop(channel, None)
            self._socket_channels.pop(websocket, None)

    async def broadcast(self, channel: str, message: str) -> None:
        normalized_channel = self._normalize_channel(channel)
        async with self._lock:
            recipients = tuple(self._channel_connections.get(normalized_channel, set()))

        if not recipients:
            return

        send_tasks = [self._safe_send_text(websocket, message, normalized_channel) for websocket in recipients]
        await asyncio.gather(*send_tasks)

    async def handle_subscribe_message(self, websocket: WebSocket, message: str) -> None:
        try:
            payload = json.loads(message)
        except json.JSONDecodeError:
            return

        action = payload.get("action")
        symbol = payload.get("symbol")
        if not isinstance(action, str) or not isinstance(symbol, str):
            return

        symbol_key = self._normalize_symbol(symbol)
        symbol_channel = self.symbol_channel(symbol_key)

        if action == "subscribe":
            await self.subscribe(websocket, symbol_channel)
        elif action == "unsubscribe":
            await self.unsubscribe(websocket, symbol_channel)

    def symbol_channel(self, symbol: str) -> str:
        return f"markets:{self._normalize_symbol(symbol)}"

    async def _safe_send_text(self, websocket: WebSocket, message: str, channel: str) -> None:
        try:
            await websocket.send_text(message)
        except Exception:
            logger.exception("websocket.broadcast.error", extra={"channel": channel})
            await self.disconnect(websocket)

    def _normalize_channel(self, channel: str) -> str:
        return channel.strip().lower()

    def _normalize_symbol(self, symbol: str) -> str:
        return symbol.strip().upper().replace("/", "")


ws_market_manager = WebSocketManager()
