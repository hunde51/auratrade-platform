from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import settings
from app.core.database import check_database_connection, close_database_engine
from app.core.redis import check_redis_connection, close_redis_connection
from app.websocket import ws_manager


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        await check_database_connection()
    except SQLAlchemyError as exc:
        raise RuntimeError(f"Startup failed: database unavailable ({exc})") from exc

    try:
        await check_redis_connection()
    except RedisError as exc:
        raise RuntimeError(f"Startup failed: redis unavailable ({exc})") from exc

    yield

    await close_redis_connection()
    await close_database_engine()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AuraTrade backend running", "env": settings.app_env}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    channel = "echo"
    await ws_manager.connect(channel, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await ws_manager.broadcast(channel, message)
    except WebSocketDisconnect:
        ws_manager.disconnect(channel, websocket)