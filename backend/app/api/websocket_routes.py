import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth import decode_access_token
from app.websocket.websocket_manager import ws_user_manager

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


async def _authenticate_websocket(websocket: WebSocket) -> int | None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    payload = decode_access_token(token)
    subject = payload.get("sub") if payload else None
    if subject is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User.id).where(User.id == user_id))
        if result.scalar_one_or_none() is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None

    return user_id


@router.websocket("/ws/user")
async def user_websocket_endpoint(websocket: WebSocket) -> None:
    """Authenticated user websocket endpoint for personal notifications."""
    user_id = await _authenticate_websocket(websocket)
    if user_id is None:
        return

    await ws_user_manager.connect(user_id, websocket)
    logger.info("websocket.user.connected", extra={"user_id": user_id})

    try:
        while True:
            # Keep the connection alive and detect disconnects from the client side.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("websocket.user.disconnected", extra={"user_id": user_id})
    except Exception:
        logger.exception("websocket.user.error", extra={"user_id": user_id})
    finally:
        await ws_user_manager.disconnect(user_id)
