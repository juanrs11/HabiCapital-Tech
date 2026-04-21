import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_serializer

from app.schemas.common import MoneyModel


class GroupCreate(BaseModel):
    name: str


class MemberAdd(BaseModel):
    user_id: uuid.UUID


class ExpenseCreate(MoneyModel):
    paid_by: uuid.UUID
    total_amount: Decimal
    description: str | None = None


class SettleRequest(BaseModel):
    debtor_id: uuid.UUID
    creditor_id: uuid.UUID


class GroupRead(BaseModel):
    id: uuid.UUID
    name: str
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupExpenseRead(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    paid_by: uuid.UUID
    total_amount: Decimal
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("total_amount")
    def serialize_total_amount(self, value: Decimal) -> float:
        return float(value)


class PairBalance(BaseModel):
    debtor_id: uuid.UUID
    debtor_name: str
    creditor_id: uuid.UUID
    creditor_name: str
    amount: Decimal

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class GroupDetailMember(BaseModel):
    userId: uuid.UUID
    name: str
    balance: Decimal

    @field_serializer("balance")
    def serialize_balance(self, value: Decimal) -> float:
        return float(value)


class GroupDetailExpense(BaseModel):
    id: uuid.UUID
    description: str | None
    amount: Decimal
    paidByUserId: uuid.UUID
    paidByName: str
    splitAmong: list[uuid.UUID]
    date: str

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class GroupDetail(BaseModel):
    id: uuid.UUID
    name: str
    members: list[GroupDetailMember]
    expenses: list[GroupDetailExpense]
