from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class CheckoutEvent(BaseModel):
    transaction_id: str
    timestamp: str
    customer_id: str
    product_id: str
    quantity: int
    unit_price: float
    total_amount: float
    currency: Literal["INR", "USD", "EUR", "GBP"]
    payment_method: Literal["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"]
    payment_status: Literal["SUCCESS", "FAILED", "PENDING", "REFUNDED"]
    region: Literal["HYDERABAD", "BANGALORE", "MUMBAI", "DELHI", "CHENNAI", "PUNE"]
    device_type: Literal["MOBILE", "DESKTOP", "TABLET"]
    event_type: Literal["CHECKOUT"] = "CHECKOUT"

class AnomalyConfig(BaseModel):
    events_per_second: int = 250
    anomaly_rate: float = 0.01
    schema_drift_rate: float = 0.005
    null_rate: float = 0.01
    force_anomaly_type: Optional[str] = None
    is_running: bool = True
