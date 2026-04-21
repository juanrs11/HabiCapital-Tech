import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import async_session_factory, get_session
from app.models.recurring import Frequency, RecurringPayment
from app.models.user import User
from app.schemas.recurring import RecurringCreate, RecurringRead, RecurringTickResponse
from app.services.transfer_service import execute_transfer
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.post("", response_model=RecurringRead, status_code=status.HTTP_201_CREATED)
async def create_recurring(
    payload: RecurringCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RecurringRead:
    if payload.to_user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Self-transfer is not allowed")
    receiver = await session.get(User, payload.to_user_id)
    if receiver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    # Normalizar a naive UTC para que coincida con TIMESTAMP WITHOUT TIME ZONE
    start = payload.start_date
    if start.tzinfo is not None:
        start = start.astimezone(timezone.utc).replace(tzinfo=None)

    payment = RecurringPayment(
        from_user_id=current_user.id,
        to_user_id=payload.to_user_id,
        amount=payload.amount,
        label=payload.label,
        frequency=payload.frequency,
        next_run_at=start,  # ← usar start normalizado
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    return RecurringRead(
        id=payment.id,
        from_user_id=payment.from_user_id,
        to_user_id=payment.to_user_id,
        to_name=receiver.name,
        amount=payment.amount,
        label=payment.label,
        frequency=payment.frequency,
        next_run_at=payment.next_run_at,
        active=payment.active,
        created_at=payment.created_at,
    )

@router.get("", response_model=list[RecurringRead])
async def list_recurring(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[RecurringRead]:
    result = await session.execute(
        select(RecurringPayment, User.name)
        .join(User, RecurringPayment.to_user_id == User.id)
        .where(RecurringPayment.from_user_id == current_user.id, RecurringPayment.active.is_(True))
        .order_by(RecurringPayment.next_run_at.asc())
    )
    return [
        RecurringRead(
            id=payment.id,
            from_user_id=payment.from_user_id,
            to_user_id=payment.to_user_id,
            to_name=to_name,
            amount=payment.amount,
            label=payment.label,
            frequency=payment.frequency,
            next_run_at=payment.next_run_at,
            active=payment.active,
            created_at=payment.created_at,
        )
        for payment, to_name in result.all()
    ]


@router.delete("/{payment_id}")
async def cancel_recurring(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    payment = await session.get(RecurringPayment, payment_id)
    if payment is None or payment.from_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring payment not found")
    payment.active = False
    await session.commit()
    return {"status": "ok"}


@router.post("/tick", response_model=RecurringTickResponse)
async def tick_recurring() -> RecurringTickResponse:
    now = datetime.utcnow()  # naive UTC — consistente con la columna
    async with async_session_factory() as session:
        result = await session.execute(
            select(RecurringPayment.id).where(
                RecurringPayment.active.is_(True),
                RecurringPayment.next_run_at <= now,
            )
        )
        due_ids = list(result.scalars().all())
    executed = 0
    skipped = 0
    for payment_id in due_ids:
        async with async_session_factory() as session:
            try:
                payment = await session.get(RecurringPayment, payment_id, with_for_update=True)
                now = datetime.utcnow()  # refrescar por si el loop tarda
                if payment is None or not payment.active or payment.next_run_at > now:
                    skipped += 1
                    continue
                await execute_transfer(session, payment.from_user_id, payment.to_user_id, payment.amount, payment.label)
                payment.next_run_at = payment.next_run_at + (
                    timedelta(days=7) if payment.frequency == Frequency.weekly else timedelta(days=30)
                )
                await session.commit()
                executed += 1
            except HTTPException as exc:
                await session.rollback()
                skipped += 1
    return RecurringTickResponse(executed=executed, skipped=skipped)