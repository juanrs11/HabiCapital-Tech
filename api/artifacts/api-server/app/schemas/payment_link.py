import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import MoneyModel


class PaymentLinkCreate(MoneyModel):
    amount: Decimal
    description: str | None = None


class PaymentLinkRead(BaseModel):
    id: uuid.UUID
    token: str
    creator_id: uuid.UUID
    amount: Decimal
    description: str | None
    pay_count: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicPaymentLink(BaseModel):
    creator_name: str
    amount: Decimal
    description: str | None


class PaymentLinkPayResponse(BaseModel):
    balance: Decimal
