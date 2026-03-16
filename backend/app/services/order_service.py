from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import redis_client
from app.models.order import Order, OrderStatus
from app.repositories.order_repository import create_order, list_orders_for_user
from app.repositories.position_repository import list_positions_for_user
from app.repositories.trade_repository import list_trades_for_user
from app.schemas.market import MarketQuote
from app.schemas.order import CreateOrderRequest
from app.services.trading_engine import execute_order


def _normalize_symbol(symbol: str) -> str:
    cleaned = symbol.strip().upper().replace("/", "")
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid symbol")
    return cleaned


def _validate_order_payload(payload: CreateOrderRequest) -> None:
    if payload.order_type.value == "limit" and payload.price is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Limit orders require price")
    if payload.order_type.value == "market" and payload.price is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Market orders cannot include price")


async def _get_market_price(symbol: str) -> Decimal:
    raw = await redis_client.get(f"{settings.market_cache_prefix}:{symbol}")
    if raw is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Market price unavailable")

    try:
        quote = MarketQuote.model_validate_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid market data cached") from exc

    return Decimal(str(quote.price))


async def place_order(session: AsyncSession, *, user_id: int, payload: CreateOrderRequest) -> tuple[Order, str]:
    try:
        _validate_order_payload(payload)

        symbol = _normalize_symbol(payload.symbol)
        market_price = await _get_market_price(symbol)

        order = await create_order(
            session,
            user_id=user_id,
            symbol=symbol,
            order_type=payload.order_type,
            side=payload.side,
            quantity=payload.quantity,
            price=payload.price,
            status=OrderStatus.PENDING,
        )

        executed_order, trade, _wallet = await execute_order(session, order=order, market_price=market_price)
        await session.commit()

        if trade is None:
            return executed_order, "pending"
        return executed_order, "filled"
    except Exception:
        await session.rollback()
        raise


async def get_user_orders(session: AsyncSession, *, user_id: int) -> list[Order]:
    return await list_orders_for_user(session, user_id)


async def get_user_positions(session: AsyncSession, *, user_id: int):
    return await list_positions_for_user(session, user_id)


async def get_user_trades(session: AsyncSession, *, user_id: int):
    return await list_trades_for_user(session, user_id)
