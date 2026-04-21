import uuid
from decimal import Decimal

from pydantic import BaseModel, field_serializer

from app.schemas.common import MoneyModel


class TopUpRequest(MoneyModel):
    amount: Decimal


class TransferCreate(MoneyModel):
    receiver_id: uuid.UUID
    amount: Decimal
    description: str | None = None


class TransactionHistoryItem(BaseModel):
    id: uuid.UUID
    type: str
    amount: Decimal
    counterpart: str | None = None
    counterpartId: uuid.UUID | None = None
    label: str | None = None
    date: str

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class BalanceResponse(BaseModel):
    balance: Decimal

    @field_serializer("balance")
    def serialize_balance(self, value: Decimal) -> float:
        return float(value)
