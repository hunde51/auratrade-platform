from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.user import User
from app.schemas.order import CreateOrderRequest, OrderResponse
from app.schemas.position import PositionResponse
from app.schemas.trade import TradeResponse
from app.services.order_service import get_user_orders, get_user_positions, get_user_trades, place_order

router = APIRouter(tags=["trading"])


@router.post("/orders", response_model=OrderResponse)
async def create_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> OrderResponse:
    order, _result = await place_order(session, user_id=current_user.id, payload=payload)
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        symbol=order.symbol,
        order_type=order.order_type,
        side=order.side,
        price=order.price,
        quantity=order.quantity,
        status=order.status,
        created_at=order.created_at,
    )


@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[OrderResponse]:
    orders = await get_user_orders(session, user_id=current_user.id)
    return [
        OrderResponse(
            id=order.id,
            user_id=order.user_id,
            symbol=order.symbol,
            order_type=order.order_type,
            side=order.side,
            price=order.price,
            quantity=order.quantity,
            status=order.status,
            created_at=order.created_at,
        )
        for order in orders
    ]


@router.get("/positions", response_model=list[PositionResponse])
async def list_positions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[PositionResponse]:
    positions = await get_user_positions(session, user_id=current_user.id)
    return [
        PositionResponse(
            id=position.id,
            user_id=position.user_id,
            symbol=position.symbol,
            quantity=position.quantity,
            average_price=position.average_price,
            updated_at=position.updated_at,
        )
        for position in positions
    ]


@router.get("/trades", response_model=list[TradeResponse])
async def list_trades(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[TradeResponse]:
    trades = await get_user_trades(session, user_id=current_user.id)
    return [
        TradeResponse(
            id=trade.id,
            order_id=trade.order_id,
            user_id=trade.user_id,
            symbol=trade.symbol,
            price=trade.price,
            quantity=trade.quantity,
            side=trade.side,
            executed_at=trade.executed_at,
        )
        for trade in trades
    ]
