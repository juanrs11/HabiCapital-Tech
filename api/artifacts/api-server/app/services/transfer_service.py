import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType
from app.models.user import User

TWOPLACES = Decimal("0.01")


def normalize_amount(amount: Decimal) -> Decimal:
    value = amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    if value <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be greater than zero")
    return value


async def execute_transfer(
    session: AsyncSession,
    sender_id: uuid.UUID | None,
    receiver_id: uuid.UUID,
    amount: Decimal,
    description: str | None = None,
    transaction_type: TransactionType = TransactionType.transfer,
) -> Transaction:
    amount = normalize_amount(amount)
    if sender_id is not None and sender_id == receiver_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Self-transfer is not allowed")

    ids = [receiver_id] if sender_id is None else sorted([sender_id, receiver_id], key=str)
    result = await session.execute(select(User).where(User.id.in_(ids)).with_for_update())
    users = {user.id: user for user in result.scalars().all()}

    receiver = users.get(receiver_id)
    if receiver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    sender = None
    if sender_id is not None:
        sender = users.get(sender_id)
        if sender is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sender not found")
        if sender.balance < amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient funds")
        sender.balance = sender.balance - amount

    receiver.balance = receiver.balance + amount
    transaction = Transaction(
        sender_id=sender_id,
        receiver_id=receiver_id,
        amount=amount,
        type=transaction_type,
        description=description,
    )
    session.add(transaction)
    await session.flush()
    return transaction
