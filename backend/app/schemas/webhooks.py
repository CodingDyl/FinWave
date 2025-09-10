from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any

class WebhookEventIn(BaseModel):
    # The *raw* event body is signed externally; the server receives this parsed form.
    type: str = Field(description="Event type, e.g. payout.succeeded")
    data: Dict[str, Any] = Field(description="Provider payload")

    model_config = ConfigDict(json_schema_extra={
        "examples": [
            {
                "type": "payout.succeeded",
                "data": {
                    "payout_id": "po_01JVABCDXYZ",
                    "amount": 1000,
                    "currency": "ZAR",
                    "status": "succeeded",
                },
            }
        ]
    })

class WebhookAck(BaseModel):
    received: bool = True

    model_config = ConfigDict(json_schema_extra={
        "examples": [{"received": True}]
    })
