from fastapi import FastAPI
from fastapi import WebSocket, WebSocketDisconnect

from app.api.router import api_router
from app.core.config import settings


app = FastAPI(title=settings.app_name)
app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AuraTrade backend running"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(message)
    except WebSocketDisconnect:
        return