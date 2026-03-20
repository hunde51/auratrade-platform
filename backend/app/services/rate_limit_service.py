from dataclasses import dataclass
import hashlib

from app.core.config import settings
from app.core.redis import redis_client


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after_seconds: int


class RateLimitService:
    """Redis-backed fixed-window rate limiter with fail-open semantics."""

    async def check(self, *, scope: str, subject: str, limit: int, window_seconds: int) -> RateLimitResult:
        safe_limit = max(1, int(limit))
        safe_window = max(1, int(window_seconds))
        key = self._key(scope=scope, subject=subject)

        try:
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, safe_window)
            ttl = await redis_client.ttl(key)
        except Exception:
            # Keep auth flow available if Redis is degraded.
            return RateLimitResult(allowed=True, remaining=safe_limit - 1, retry_after_seconds=0)

        retry_after = ttl if isinstance(ttl, int) and ttl > 0 else safe_window
        remaining = max(0, safe_limit - int(count))
        return RateLimitResult(
            allowed=int(count) <= safe_limit,
            remaining=remaining,
            retry_after_seconds=retry_after,
        )

    def _key(self, *, scope: str, subject: str) -> str:
        digest = hashlib.sha256(subject.strip().lower().encode("utf-8")).hexdigest()[:20]
        return f"ratelimit:{scope}:{digest}"


rate_limit_service = RateLimitService()
