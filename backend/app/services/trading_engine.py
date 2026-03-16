from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderSide, OrderStatus, OrderType
from app.models.trade import Trade
from app.models.transaction import TransactionType
from app.models.wallet import Wallet
from app.repositories.order_repository import update_order_status
from app.repositories.trade_repository import create_trade
from app.repositories.transaction import create_transaction
from app.repositories.wallet import get_wallet_for_update
from app.services.position_service import apply_trade_to_position


def _should_fill_limit_order(side: OrderSide, limit_price: Decimal, market_price: Decimal) -> bool:
    if side == OrderSide.BUY:
        return market_price <= limit_price
    return market_price >= limit_price


async def execute_order(
    session: AsyncSession,
    *,
    order: Order,
    market_price: Decimal,
) -> tuple[Order, Trade | None, Wallet]:
    """Execute order atomically: wallet lock -> trade -> position -> transaction."""
    if order.order_type == OrderType.LIMIT and order.price is not None:
        if not _should_fill_limit_order(order.side, order.price, market_price):
            await update_order_status(session, order, OrderStatus.PENDING)
            wallet = await get_wallet_for_update(session, order.user_id)
            if wallet is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")
            return order, None, wallet

    execution_price = market_price
    wallet = await get_wallet_for_update(session, order.user_id)
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

    notional = execution_price * order.quantity

    if order.side == OrderSide.BUY:
        if wallet.balance < notional:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient balance")
        wallet.balance = wallet.balance - notional
        tx_amount = Decimal("-1") * notional
        tx_desc = f"Trade buy {order.quantity} {order.symbol} @ {execution_price}"
    else:
        wallet.balance = wallet.balance + notional
        tx_amount = notional
        tx_desc = f"Trade sell {order.quantity} {order.symbol} @ {execution_price}"

    trade = await create_trade(
        session,
        order_id=order.id,
        user_id=order.user_id,
        symbol=order.symbol,
        price=execution_price,
        quantity=order.quantity,
        side=order.side,
    )
    await apply_trade_to_position(
        session,
        user_id=order.user_id,
        symbol=order.symbol,
        side=order.side,
        quantity=order.quantity,
        execution_price=execution_price,
    )
    await create_transaction(
        session,
        wallet_id=wallet.id,
        transaction_type=TransactionType.TRADE,
        amount=tx_amount,
        description=tx_desc,
    )

    await update_order_status(session, order, OrderStatus.FILLED)
    await session.flush()
    await session.refresh(wallet)
    return order, trade, wallet
