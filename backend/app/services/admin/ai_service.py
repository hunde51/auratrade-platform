from app.core.redis import redis_client
from app.schemas.admin.ai import AdminAIUsageResponse


class AdminAIService:
    async def get_ai_usage(self) -> AdminAIUsageResponse:
        usage = await self._read_usage_counters()
        return AdminAIUsageResponse(
            total_requests=usage["total_requests"],
            success_count=usage["success_count"],
            failure_count=usage["failure_count"],
            fallback_count=usage["fallback_count"],
        )

    async def _read_usage_counters(self) -> dict[str, int]:
        try:
            requests, success, failures, fallback = await redis_client.mget(
                "ai:requests",
                "ai:success",
                "ai:failures",
                "ai:fallback",
            )
        except Exception:
            return {
                "total_requests": 0,
                "success_count": 0,
                "failure_count": 0,
                "fallback_count": 0,
            }

        return {
            "total_requests": self._to_int(requests),
            "success_count": self._to_int(success),
            "failure_count": self._to_int(failures),
            "fallback_count": self._to_int(fallback),
        }

    def _to_int(self, value: str | None) -> int:
        if value is None:
            return 0
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0
