from fastapi import APIRouter

from app.api.admin import router as admin_api_router
from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.orders import router as orders_router
from app.api.routes.markets import router as markets_router
from app.api.settings import router as settings_router
from app.api.wallet import router as wallet_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(markets_router)
api_router.include_router(wallet_router)
api_router.include_router(settings_router)
api_router.include_router(orders_router)
api_router.include_router(ai_router)
api_router.include_router(admin_api_router)
