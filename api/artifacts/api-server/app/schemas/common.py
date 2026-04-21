from decimal import Decimal, ROUND_HALF_UP

from pydantic import BaseModel, field_validator


TWOPLACES = Decimal("0.01")


def normalize_money(value: Decimal) -> Decimal:
    if value <= Decimal("0.00"):
        raise ValueError("Amount must be greater than zero")
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


class MoneyModel(BaseModel):
    @field_validator("amount", "total_amount", mode="after", check_fields=False)
    @classmethod
    def validate_money(cls, value: Decimal) -> Decimal:
        return normalize_money(value)
