from fastapi import APIRouter
from typing import Dict, Any, List
from pydantic import BaseModel
import time

router = APIRouter(tags=["Metrics & Quality"])

class MetricsResponse(BaseModel):
    events_per_sec: float
    total_events: int
    valid_events: int
    invalid_events: int
    current_error_rate: float
    processing_latency_ms: float
    dlq_records_count: int
    circuit_breaker_status: str
    active_incidents_count: int
    timestamp: float

@router.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    return MetricsResponse(
        events_per_sec=250.0,
        total_events=245000,
        valid_events=241500,
        invalid_events=3500,
        current_error_rate=1.42,
        processing_latency_ms=68.4,
        dlq_records_count=3500,
        circuit_breaker_status="CLOSED",
        active_incidents_count=0,
        timestamp=time.time()
    )

@router.get("/quality")
def get_quality_summary():
    return {
        "quality_score": 98.58,
        "rules": [
            {"id": "RULE-01", "name": "Required Fields", "status": "PASS", "failure_rate": 0.4},
            {"id": "RULE-02", "name": "Positive Amounts", "status": "PASS", "failure_rate": 0.1},
            {"id": "RULE-03", "name": "Payment Status", "status": "PASS", "failure_rate": 0.0},
            {"id": "RULE-04", "name": "Currency Validation", "status": "PASS", "failure_rate": 0.0},
            {"id": "RULE-05", "name": "Transaction Consistency", "status": "PASS", "failure_rate": 0.2},
            {"id": "RULE-06", "name": "Schema Validation", "status": "PASS", "failure_rate": 0.5},
            {"id": "RULE-07", "name": "Null Rate", "status": "PASS", "failure_rate": 0.4}
        ]
    }
