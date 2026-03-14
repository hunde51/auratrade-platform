import redis.asyncio as redis

from app.core.config import settings


redis_client = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)


async def check_redis_connection() -> None:
    """Raise if redis is unreachable."""
    await redis_client.ping()


async def close_redis_connection() -> None:
    await redis_client.aclose()
