from collections import defaultdict

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        channel_connections = self._connections.get(channel)
        if channel_connections is None:
            return

        channel_connections.discard(websocket)
        if not channel_connections:
            self._connections.pop(channel, None)

    async def broadcast(self, channel: str, message: str) -> None:
        for websocket in tuple(self._connections.get(channel, set())):
            await websocket.send_text(message)


ws_manager = WebSocketManager()
