from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.transaction import BalanceResponse, TransactionHistoryItem, TransferCreate
from app.services.transfer_service import execute_transfer

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("", response_model=BalanceResponse)
async def create_transfer(
    payload: TransferCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BalanceResponse:
    try:
        await execute_transfer(
            session=session,
            sender_id=current_user.id,
            receiver_id=payload.receiver_id,
            amount=payload.amount,
            description=payload.description,
        )
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    await session.refresh(current_user)
    return BalanceResponse(balance=current_user.balance)


def iso_z(value) -> str:
    return value.isoformat().replace("+00:00", "Z") + ("Z" if value.tzinfo is None else "")


@router.get("/history", response_model=list[TransactionHistoryItem], response_model_exclude_none=True)
async def history(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[TransactionHistoryItem]:
    result = await session.execute(
        select(Transaction)
        .where(or_(Transaction.sender_id == current_user.id, Transaction.receiver_id == current_user.id))
        .order_by(Transaction.created_at.desc())
    )
    transactions = list(result.scalars().all())
    counterpart_ids = {
        transaction.receiver_id if transaction.sender_id == current_user.id else transaction.sender_id
        for transaction in transactions
        if transaction.type == TransactionType.transfer
    }
    counterpart_ids.discard(None)
    users: dict = {}
    if counterpart_ids:
        users_result = await session.execute(select(User).where(User.id.in_(counterpart_ids)))
        users = {user.id: user for user in users_result.scalars().all()}

    items: list[TransactionHistoryItem] = []
    for transaction in transactions:
        if transaction.type == TransactionType.top_up:
            items.append(
                TransactionHistoryItem(
                    id=transaction.id,
                    type="topup",
                    amount=transaction.amount,
                    label=transaction.description,
                    date=iso_z(transaction.created_at),
                )
            )
            continue
        is_sent = transaction.sender_id == current_user.id
        counterpart_id = transaction.receiver_id if is_sent else transaction.sender_id
        counterpart = users.get(counterpart_id)
        items.append(
            TransactionHistoryItem(
                id=transaction.id,
                type="sent" if is_sent else "received",
                amount=transaction.amount,
                counterpart=counterpart.name if counterpart else None,
                counterpartId=counterpart_id,
                label=transaction.description,
                date=iso_z(transaction.created_at),
            )
        )
    return items


@router.get("/tags", response_model=list[str])
async def tags(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    result = await session.execute(
        select(Transaction.description)
        .where(or_(Transaction.sender_id == current_user.id, Transaction.receiver_id == current_user.id))
        .where(Transaction.description.is_not(None))
        .distinct()
        .order_by(Transaction.description.asc())
    )
    return [value for value in result.scalars().all() if value]
