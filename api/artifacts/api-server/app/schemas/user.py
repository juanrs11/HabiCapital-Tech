import uuid
from decimal import Decimal

from pydantic import BaseModel, EmailStr, field_serializer


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: "UserRead"


class UserRead(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    balance: Decimal

    model_config = {"from_attributes": True}

    @field_serializer("balance")
    def serialize_balance(self, value: Decimal) -> float:
        return float(value)
