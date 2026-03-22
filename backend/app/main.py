import asyncio
import contextlib
import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError
from time import perf_counter

from app.api.router import api_router
from app.api.websocket_routes import router as websocket_router
from app.core.config import settings
from app.core.database import check_database_connection, close_database_engine
from app.core.logging import configure_logging
from app.core.monitoring import metrics_registry
from app.core.request_context import set_request_id
from app.core.redis import check_redis_connection, close_redis_connection, redis_client
from app.schemas.market import MarketQuote, MarketSnapshotEvent, TickerUpdateEvent
from app.services.alert_rule_service import alert_rule_evaluator
from app.services.market_data_service import market_data_service
from app.services.notification_service import notification_service
from app.services.websocket_manager import ws_market_manager

configure_logging()
logger = logging.getLogger(__name__)


def _validate_runtime_security_config() -> None:
    env = settings.app_env.strip().lower()
    secret = settings.jwt_secret_key.strip()
    weak_default = secret == "change-me-in-production"
    too_short = len(secret) < 32

    if env in {"production", "prod"} and settings.enforce_strong_jwt_secret_in_production:
        if weak_default or too_short:
            raise RuntimeError(
                "Startup failed: insecure JWT secret for production. "
                "Set a strong jwt_secret_key (min 32 chars, non-default)."
            )

    if weak_default or too_short:
        logger.warning("security.jwt_secret.weak", extra={"env": env})


async def publish_market_updates() -> None:
    """Scheduled job that refreshes provider data and publishes it to Redis channels."""
    quotes = await market_data_service.poll_and_publish()
    await alert_rule_evaluator.evaluate_quotes([(quote.symbol, float(quote.price)) for quote in quotes])


async def sync_ws_connection_count() -> None:
    try:
        count = await ws_market_manager.connection_count()
        metrics_registry.set_websocket_connections(count)
        await redis_client.set("ws:connections", count)
    except Exception:
        logger.exception("websocket.connection_count.sync.error")


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
    _validate_runtime_security_config()

    try:
        await check_database_connection()
        await check_redis_connection()
    except SQLAlchemyError as exc:
        raise RuntimeError(f"Startup failed: database unavailable ({exc})") from exc
    except RedisError as exc:
        raise RuntimeError(f"Startup failed: redis unavailable ({exc})") from exc

    metrics_registry.set_dependency_status(redis_available=True, database_available=True, worker_running=False)
    await redis_client.set("ws:connections", 0)

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
    await notification_service.start()

    logger.info("app.startup.complete")
    yield

    scheduler.shutdown(wait=False)
    redis_listener_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await redis_listener_task
    await notification_service.stop()

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
app.include_router(websocket_router)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    incoming = request.headers.get("x-request-id", "").strip()
    request_id = incoming or str(uuid.uuid4())
    set_request_id(request_id)

    response = await call_next(request)
    response.headers.setdefault("X-Request-ID", request_id)
    return response


@app.middleware("http")
async def metrics_middleware(request: Request, call_next) -> Response:
    start = perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        latency = perf_counter() - start
        metrics_registry.record_http_request(
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            latency_seconds=latency,
        )


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

    # FastAPI docs use external JS/CSS assets; keep a stricter CSP for API routes.
    if request.url.path in {"/docs", "/redoc", "/openapi.json"}:
        docs_csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://cdn.jsdelivr.net https://unpkg.com; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = docs_csp
    else:
        response.headers.setdefault("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';")
    return response


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AuraTrade backend running", "env": settings.app_env}


@app.get("/metrics", include_in_schema=False)
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(content=metrics_registry.render_prometheus())


@app.websocket("/ws/markets")
async def markets_websocket_endpoint(websocket: WebSocket) -> None:
    """Clients can subscribe by query param or by sending {"action": "subscribe", "symbol": "BTCUSD"}."""
    await ws_market_manager.connect(websocket)
    await ws_market_manager.subscribe(websocket, "markets")
    await sync_ws_connection_count()

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
        pass
    except Exception:
        logger.exception("websocket.markets.error")
    finally:
        await ws_market_manager.disconnect(websocket)
        await sync_ws_connection_count()
