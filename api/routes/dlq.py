from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import time

router = APIRouter(prefix="/dlq", tags=["Dead Letter Queue"])

class DLQRecord(BaseModel):
    transaction_id: str
    timestamp: str
    error_type: str
    failed_rule: str
    error_message: str
    pipeline_stage: str
    incident_id: Optional[str]
    status: str  # QUARANTINED, REMEDIATED, DISCARDED
    original_payload: Dict[str, Any]

SAMPLE_DLQ: List[Dict[str, Any]] = [
    {
        "transaction_id": "TXN-0091244",
        "timestamp": "2026-08-18T15:30:11Z",
        "error_type": "NULL_VALUE",
        "failed_rule": "Required Fields",
        "error_message": "total_amount cannot be NULL or missing",
        "pipeline_stage": "flink-validation",
        "incident_id": "INC-20260818-001",
        "status": "REMEDIATED",
        "original_payload": {
            "transaction_id": "TXN-0091244",
            "customer_id": "CUS-8812",
            "product_id": "PROD-502",
            "quantity": 2,
            "unit_price": 499.99,
            "total_amount": None,
            "currency": "INR",
            "payment_method": "UPI",
            "payment_status": "SUCCESS",
            "region": "HYDERABAD",
            "device_type": "MOBILE"
        }
    },
    {
        "transaction_id": "TXN-0091245",
        "timestamp": "2026-08-18T15:30:12Z",
        "error_type": "SCHEMA_DRIFT",
        "failed_rule": "Schema Validation",
        "error_message": "Unexpected columns [__debug_trace_v2, merchant_tier_override] detected",
        "pipeline_stage": "flink-validation",
        "incident_id": "INC-20260818-001",
        "status": "REMEDIATED",
        "original_payload": {
            "transaction_id": "TXN-0091245",
            "customer_id": "CUS-3112",
            "product_id": "PROD-102",
            "quantity": 1,
            "unit_price": 1299.00,
            "total_amount": 1299.00,
            "currency": "INR",
            "payment_method": "CREDIT_CARD",
            "payment_status": "SUCCESS",
            "region": "BANGALORE",
            "__debug_trace_v2": "drift_0x992",
            "merchant_tier_override": 999
        }
    },
    {
        "transaction_id": "TXN-0091246",
        "timestamp": "2026-08-18T15:30:12Z",
        "error_type": "MATH_INCONSISTENCY",
        "failed_rule": "Transaction Consistency",
        "error_message": "Total amount 999999.99 does not match 2 * 499.99",
        "pipeline_stage": "quality-rules-engine",
        "incident_id": "INC-20260818-001",
        "status": "QUARANTINED",
        "original_payload": {
            "transaction_id": "TXN-0091246",
            "customer_id": "CUS-4421",
            "product_id": "PROD-712",
            "quantity": 2,
            "unit_price": 499.99,
            "total_amount": 999999.99,
            "currency": "INR",
            "payment_method": "UPI",
            "payment_status": "SUCCESS",
            "region": "MUMBAI"
        }
    }
]

@router.get("", response_model=List[DLQRecord])
def list_dlq(
    error_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    results = SAMPLE_DLQ
    if error_type:
        results = [r for r in results if r["error_type"].lower() == error_type.lower()]
    if status:
        results = [r for r in results if r["status"].lower() == status.lower()]
    return results
