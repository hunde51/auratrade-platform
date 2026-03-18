from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.ai import AdminAIUsageResponse
from app.services.admin.ai_service import AdminAIService

router = APIRouter(prefix="/ai-usage", tags=["admin-ai"])


@router.get("", response_model=AdminAIUsageResponse)
async def get_ai_usage(
    _admin: User = Depends(get_current_admin),
    _session: AsyncSession = Depends(get_db_session),
) -> AdminAIUsageResponse:
    return await AdminAIService().get_ai_usage()
