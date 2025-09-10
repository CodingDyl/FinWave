from pydantic import BaseModel, Field, field_validator, ConfigDict, conint, constr
from typing import Literal,Optional, Dict

class PayoutDestination(BaseModel):
    type: Literal["bank_account", "mobile_money"] = Field(
        description="Where to route the payout"
    )
    last4: constr(min_length=4, max_length=4) = Field(
        description="Last 4 digits for display/logging"
    )

    model_config = ConfigDict(json_schema_extra={
        "examples": [
            {"type": "bank_account", "last4": "1234"},
            {"type": "mobile_money", "last4": "9988"},
        ]
    })

class PayoutIn(BaseModel):
    amount: conint(ge=1) = Field(description="Amount in minor units (e.g. cents)")
    currency: constr(to_upper=True, min_length=3, max_length=3) = Field(
        description="ISO-4217 currency code"
    )
    destination: PayoutDestination
    metadata: Optional[Dict[str, str]] = Field(
        default=None, description="Optional key/value pairs for your own tracking"
    )

    model_config = ConfigDict(json_schema_extra={
        "examples": [
            {
                "amount": 1000,
                "currency": "ZAR",
                "destination": {"type": "bank_account", "last4": "1234"},
                "metadata": {"order_id": "ORD-1001"},
            }
        ]
    })


class PayoutCreate(BaseModel):
    amount: int = Field(..., gt=0)  # minor units
    currency: str = Field(..., min_length=3, max_length=3)
    destination: PayoutDestination

    @field_validator("currency")
    @classmethod
    def _upper_iso(cls, v: str) -> str:
        v = v.upper()
        if not v.isalpha() or len(v) != 3:
            raise ValueError("invalid currency code")
        return v

class PayoutOut(BaseModel):
    id: str
    status: Literal["pending", "processing", "succeeded", "failed"]
    amount: int
    currency: str
    destination: PayoutDestination
    created_at: str
    idempotency_key: str

    model_config = ConfigDict(json_schema_extra={
        "examples": [
            {
                "id": "po_01JVABCDXYZ",
                "status": "pending",
                "amount": 1000,
                "currency": "ZAR",
                "destination": {"type": "bank_account", "last4": "1234"},
                "created_at": "2025-09-10T15:10:22.123Z",
                "idempotency_key": "abc-123",
            }
        ]
    })

class PayoutList(BaseModel):
    items: list[PayoutOut]

class ApiError(BaseModel):
    error: Dict[str, str]

    model_config = ConfigDict(json_schema_extra={
        "examples": [
            {"error": {"code": "bad_request", "message": "Invalid currency 'ZZZ'."}},
            {"error": {"code": "unauthorized", "message": "Login required."}},
            {"error": {"code": "conflict", "message": "Idempotency conflict."}},
            {"error": {"code": "rate_limited", "message": "Too many requests."}},
            {"error": {"code": "internal_error", "message": "Unexpected error."}},
        ]
    })
