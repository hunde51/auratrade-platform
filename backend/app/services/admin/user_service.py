from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import Position
from app.models.trade import Trade
from app.models.transaction import TransactionType
from app.models.user import User, UserRole
from app.models.wallet import Wallet
from app.repositories.transaction import create_transaction
from app.schemas.admin.common import AdminUserListItem, PaginatedUsersResponse
from app.schemas.admin.users import (
    AdminPositionSummary,
    AdminTradeSummary,
    AdminUserDetailsResponse,
    AdminWalletSummary,
)


class AdminUserService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_users(self, *, page: int, page_size: int) -> PaginatedUsersResponse:
        offset = (page - 1) * page_size

        total = await self._session.scalar(select(func.count(User.id)))
        result = await self._session.execute(
            select(User, Wallet)
            .outerjoin(Wallet, Wallet.user_id == User.id)
            .order_by(desc(User.created_at), desc(User.id))
            .offset(offset)
            .limit(page_size)
        )

        items = [
            AdminUserListItem(
                id=user.id,
                username=user.username,
                role=user.role,
                wallet_balance=(wallet.balance if wallet else Decimal("0")),
                created_at=user.created_at,
            )
            for user, wallet in result.all()
        ]
        return PaginatedUsersResponse(items=items, page=page, page_size=page_size, total=int(total or 0))

    async def get_user_details(self, user_id: int) -> AdminUserDetailsResponse:
        user = await self._session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        wallet_result = await self._session.execute(select(Wallet).where(Wallet.user_id == user_id))
        wallet = wallet_result.scalar_one_or_none()

        trade_result = await self._session.execute(
            select(Trade)
            .where(Trade.user_id == user_id)
            .order_by(desc(Trade.executed_at), desc(Trade.id))
            .limit(20)
        )
        position_result = await self._session.execute(
            select(Position).where(Position.user_id == user_id).order_by(desc(Position.updated_at), desc(Position.id))
        )

        recent_trades = [
            AdminTradeSummary(
                id=trade.id,
                symbol=trade.symbol,
                side=trade.side,
                price=trade.price,
                quantity=trade.quantity,
                executed_at=trade.executed_at,
            )
            for trade in trade_result.scalars().all()
        ]
        positions = [
            AdminPositionSummary(
                id=position.id,
                symbol=position.symbol,
                quantity=position.quantity,
                average_price=position.average_price,
                updated_at=position.updated_at,
            )
            for position in position_result.scalars().all()
        ]

        wallet_summary = AdminWalletSummary(wallet_id=wallet.id, balance=wallet.balance) if wallet else None

        return AdminUserDetailsResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            wallet=wallet_summary,
            recent_trades=recent_trades,
            positions=positions,
        )

    async def update_user_role(self, user_id: int, role: str) -> AdminUserDetailsResponse:
        user = await self._session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.role = UserRole(role)
        await self._session.commit()
        await self._session.refresh(user)
        return await self.get_user_details(user.id)

    async def update_user_status(self, user_id: int, is_active: bool) -> AdminUserDetailsResponse:
        user = await self._session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.is_active = is_active
        await self._session.commit()
        await self._session.refresh(user)
        return await self.get_user_details(user.id)

    async def reset_wallet_balance(self, user_id: int, balance: Decimal) -> AdminUserDetailsResponse:
        wallet_result = await self._session.execute(select(Wallet).where(Wallet.user_id == user_id))
        wallet = wallet_result.scalar_one_or_none()
        if wallet is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")

        delta = balance - wallet.balance
        wallet.balance = balance

        if delta != 0:
            txn_type = TransactionType.DEPOSIT if delta > 0 else TransactionType.WITHDRAW
            await create_transaction(
                self._session,
                wallet_id=wallet.id,
                transaction_type=txn_type,
                amount=abs(delta),
                description="Admin wallet reset",
            )

        await self._session.commit()
        return await self.get_user_details(user_id)
