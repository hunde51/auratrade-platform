from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.alerts import (
    AlertRuleCreateRequest,
    AlertRuleResponse,
    AlertRulesListResponse,
    AlertRuleToggleRequest,
    AlertRuleUpdateRequest,
)
from app.services.alert_rule_service import AlertRuleService

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertRulesListResponse)
async def list_alert_rules(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AlertRulesListResponse:
    return await AlertRuleService(session, current_user).list_rules()


@router.post("", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    payload: AlertRuleCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AlertRuleResponse:
    return await AlertRuleService(session, current_user).create_rule(payload)


@router.patch("/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    rule_id: int,
    payload: AlertRuleUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AlertRuleResponse:
    return await AlertRuleService(session, current_user).update_rule(rule_id, payload)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await AlertRuleService(session, current_user).delete_rule(rule_id)


@router.post("/{rule_id}/toggle", response_model=AlertRuleResponse)
async def toggle_alert_rule(
    rule_id: int,
    payload: AlertRuleToggleRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AlertRuleResponse:
    return await AlertRuleService(session, current_user).toggle_rule(rule_id, payload.enabled)
