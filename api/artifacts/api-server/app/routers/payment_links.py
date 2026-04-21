import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models.payment_link import PaymentLink
from app.models.user import User
from app.schemas.payment_link import PaymentLinkCreate, PaymentLinkPayResponse, PaymentLinkRead, PublicPaymentLink
from app.services.transfer_service import execute_transfer

router = APIRouter(prefix="/payment-links", tags=["payment-links"])


@router.post("", response_model=PaymentLinkRead, status_code=status.HTTP_201_CREATED)
async def create_payment_link(
    payload: PaymentLinkCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PaymentLink:
    link = PaymentLink(
        token=secrets.token_urlsafe(8),
        creator_id=current_user.id,
        amount=payload.amount,
        description=payload.description,
    )
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return link


@router.get("", response_model=list[PaymentLinkRead])
async def list_payment_links(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PaymentLink]:
    result = await session.execute(
        select(PaymentLink).where(PaymentLink.creator_id == current_user.id).order_by(PaymentLink.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{token}", response_model=PublicPaymentLink)
async def get_payment_link(token: str, session: AsyncSession = Depends(get_session)) -> PublicPaymentLink:
    result = await session.execute(
        select(PaymentLink, User.name)
        .join(User, PaymentLink.creator_id == User.id)
        .where(PaymentLink.token == token, PaymentLink.active.is_(True))
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment link not found")
    link, creator_name = row
    return PublicPaymentLink(creator_name=creator_name, amount=link.amount, description=link.description)


@router.post("/{token}/pay", response_model=PaymentLinkPayResponse)
async def pay_payment_link(
    token: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PaymentLinkPayResponse:
    result = await session.execute(select(PaymentLink).where(PaymentLink.token == token, PaymentLink.active.is_(True)).with_for_update())
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment link not found")
    if link.creator_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Self-transfer is not allowed")
    try:
        await execute_transfer(session, current_user.id, link.creator_id, link.amount, link.description)
        link.pay_count += 1
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    await session.refresh(current_user)
    return PaymentLinkPayResponse(balance=current_user.balance)
