from fastapi import APIRouter

from app.api.admin.ai import router as ai_router
from app.api.admin.stats import router as stats_router
from app.api.admin.system import router as system_router
from app.api.admin.trading import router as trading_router
from app.api.admin.users import router as users_router

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(users_router)
router.include_router(stats_router)
router.include_router(trading_router)
router.include_router(system_router)
router.include_router(ai_router)

__all__ = ["router"]
