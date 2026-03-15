import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.api.router import api_router
from app.core.config import settings
from app.core.database import check_database_connection, close_database_engine
from app.core.logging import configure_logging
from app.core.redis import check_redis_connection, close_redis_connection, redis_client
from app.schemas.market import MarketQuote, MarketSnapshotEvent, TickerUpdateEvent
from app.services.market_data_service import market_data_service
from app.services.websocket_manager import ws_market_manager

configure_logging()
logger = logging.getLogger(__name__)


async def publish_market_updates() -> None:
    """Scheduled job that refreshes provider data and publishes it to Redis channels."""
    await market_data_service.poll_and_publish()


async def redis_market_broadcast_loop() -> None:
    """Consumes Redis pub/sub ticker events and forwards them to subscribed websocket clients."""
    pubsub = redis_client.pubsub()
    try:
        await pubsub.subscribe(settings.redis_channel_ticker_updates)
        logger.info("market.redis.listener.started")

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if not message or "data" not in message:
                await asyncio.sleep(0.05)
                continue

            data = message.get("data")
            if not isinstance(data, str):
                continue

            await ws_market_manager.broadcast("markets", data)

            with contextlib.suppress(ValueError, TypeError):
                event = TickerUpdateEvent.model_validate_json(data)
                await ws_market_manager.broadcast(ws_market_manager.symbol_channel(event.quote.symbol), data)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("market.redis.listener.error")
    finally:
        with contextlib.suppress(Exception):
            await pubsub.unsubscribe(settings.redis_channel_ticker_updates)
            await pubsub.close()
        logger.info("market.redis.listener.stopped")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        await check_database_connection()
        await check_redis_connection()
    except SQLAlchemyError as exc:
        raise RuntimeError(f"Startup failed: database unavailable ({exc})") from exc
    except RedisError as exc:
        raise RuntimeError(f"Startup failed: redis unavailable ({exc})") from exc

    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        publish_market_updates,
        trigger=IntervalTrigger(seconds=settings.market_poll_interval_seconds),
        id="market_poll_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()

    redis_listener_task = asyncio.create_task(redis_market_broadcast_loop())

    logger.info("app.startup.complete")
    yield

    scheduler.shutdown(wait=False)
    redis_listener_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await redis_listener_task

    await close_redis_connection()
    await close_database_engine()
    logger.info("app.shutdown.complete")


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


@app.websocket("/ws/markets")
async def markets_websocket_endpoint(websocket: WebSocket) -> None:
    """Clients can subscribe by query param or by sending {"action": "subscribe", "symbol": "BTCUSD"}."""
    await ws_market_manager.connect(websocket)
    await ws_market_manager.subscribe(websocket, "markets")

    query_symbols = websocket.query_params.getlist("symbol")
    csv_symbols = websocket.query_params.get("symbols")
    if csv_symbols:
        query_symbols.extend(item.strip() for item in csv_symbols.split(",") if item.strip())

    subscribed_symbols = {symbol.strip().upper().replace("/", "") for symbol in query_symbols if symbol}
    for symbol in subscribed_symbols:
        await ws_market_manager.subscribe(websocket, ws_market_manager.symbol_channel(symbol))

    snapshot_quotes: list[MarketQuote] = (
        await market_data_service.get_markets(sorted(subscribed_symbols))
        if subscribed_symbols
        else await market_data_service.get_markets()
    )
    snapshot = MarketSnapshotEvent(quotes=snapshot_quotes, timestamp=datetime.now(UTC))
    await websocket.send_text(snapshot.model_dump_json())

    try:
        while True:
            message = await websocket.receive_text()
            await ws_market_manager.handle_subscribe_message(websocket, message)
    except WebSocketDisconnect:
        await ws_market_manager.disconnect(websocket)
    except Exception:
        logger.exception("websocket.markets.error")
        await ws_market_manager.disconnect(websocket)
