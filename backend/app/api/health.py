from fastapi import APIRouter, HTTPException, status
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import check_database_connection
from app.core.redis import check_redis_connection

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> dict[str, str]:
    return await readiness_check()


@router.get("/live")
async def liveness_check() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/ready")
async def readiness_check() -> dict[str, str]:
    try:
        await check_database_connection()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"database unavailable: {exc}",
        ) from exc

    try:
        await check_redis_connection()
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"redis unavailable: {exc}",
        ) from exc

    return {"status": "ok"}
