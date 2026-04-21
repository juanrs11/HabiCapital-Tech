import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.recurring import Frequency
from app.schemas.common import MoneyModel


class RecurringCreate(MoneyModel):
    to_user_id: uuid.UUID
    amount: Decimal
    label: str
    frequency: Frequency
    start_date: datetime


class RecurringRead(BaseModel):
    id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    to_name: str
    amount: Decimal
    label: str
    frequency: Frequency
    next_run_at: datetime
    active: bool
    created_at: datetime


class RecurringTickResponse(BaseModel):
    executed: int
    skipped: int
