"""
Seed script: creates an admin user and a regular user.

Usage:
    python -m app.seed           # skip if already exists
    python -m app.seed --reset   # delete existing seed accounts first, then recreate
"""
import asyncio
import logging
import sys
from decimal import Decimal

from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.transaction import TransactionType
from app.models.user import UserRole
from app.repositories.transaction import create_transaction
from app.repositories.user import create_user, get_user_by_email, get_user_by_username
from app.repositories.user_settings import create_user_settings
from app.repositories.wallet import create_wallet
from app.services.auth import hash_password

logger = logging.getLogger(__name__)

SEEDS = [
    {
        "email": settings.seed_admin_email,
        "username": "admin",
        "password": settings.seed_admin_password,
        "role": UserRole.ADMIN,
    },
    {
        "email": settings.seed_user_email,
        "username": "demouser",
        "password": settings.seed_user_password,
        "role": UserRole.USER,
    },
]


async def seed(reset: bool = False) -> None:
    async with AsyncSessionLocal() as session:
        if reset:
            emails = [s["email"] for s in SEEDS]
            usernames = [s["username"] for s in SEEDS]
            await session.execute(
                text("DELETE FROM users WHERE email = ANY(:e) OR username = ANY(:u)"),
                {"e": emails, "u": usernames},
            )
            await session.commit()
            print("[seed] existing seed accounts removed")

        balance = Decimal(str(settings.initial_paper_balance)).quantize(Decimal("0.01"))

        for seed_data in SEEDS:
            if await get_user_by_email(session, seed_data["email"]) or \
               await get_user_by_username(session, seed_data["username"]):
                print(f"[seed] already exists: {seed_data['email']}")
                continue

            user = await create_user(
                session,
                email=seed_data["email"],
                username=seed_data["username"],
                password_hash=hash_password(seed_data["password"]),
            )
            user.role = seed_data["role"]
            await create_user_settings(session, user_id=user.id)
            wallet = await create_wallet(session, user_id=user.id, balance=balance)
            await create_transaction(
                session,
                wallet_id=wallet.id,
                transaction_type=TransactionType.DEPOSIT,
                amount=balance,
                description="Initial paper balance",
            )
            await session.commit()
            print(f"[seed] created {seed_data['role'].value}: {seed_data['email']}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    asyncio.run(seed(reset="--reset" in sys.argv))
