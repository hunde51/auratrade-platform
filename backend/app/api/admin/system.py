from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.admin.system import AdminSystemResponse, BroadcastAlertRequest
from app.services.admin.system_service import AdminSystemService

router = APIRouter(tags=["admin-system"])


@router.get("/system", response_model=AdminSystemResponse)
async def get_system_status(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSystemResponse:
    return await AdminSystemService(session).get_system_health()


@router.post("/alerts/broadcast", status_code=status.HTTP_202_ACCEPTED)
async def broadcast_alert(
    payload: BroadcastAlertRequest,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    await AdminSystemService(session).broadcast_alert(payload.message)
    return {"status": "queued"}
