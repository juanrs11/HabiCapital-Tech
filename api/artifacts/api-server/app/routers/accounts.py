from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select

from app.auth import get_current_user
from app.db import get_session
from app.models.transaction import TransactionType
from app.models.user import User
from app.schemas.transaction import BalanceResponse, TopUpRequest
from app.schemas.user import UserRead
from app.services.transfer_service import execute_transfer

router = APIRouter(tags=["accounts"])


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/accounts/topup", response_model=BalanceResponse)
async def top_up(
    payload: TopUpRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BalanceResponse:
    try:
        await execute_transfer(
            session=session,
            sender_id=None,
            receiver_id=current_user.id,
            amount=payload.amount,
            description="Top up",
            transaction_type=TransactionType.top_up,
        )
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    await session.refresh(current_user)
    return BalanceResponse(balance=current_user.balance)

@router.get("/users", response_model=list[UserRead])
async def list_users(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[User]:
    result = await session.execute(
        select(User).where(User.id != current_user.id).order_by(User.name.asc())
    )
    return list(result.scalars().all())
