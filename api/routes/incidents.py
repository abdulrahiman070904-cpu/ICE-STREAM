from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import time

router = APIRouter(prefix="/incidents", tags=["Incidents"])

class Incident(BaseModel):
    incident_id: str
    detected_at: str
    severity: str  # CRITICAL, WARNING, INFO
    root_cause: str
    affected_node: str
    error_rate: float
    threshold: float
    records_affected: int
    circuit_breaker_state: str
    remediation_state: str
    resolution_time_sec: Optional[float] = None
    audit_trail: List[Dict[str, Any]] = []

INCIDENTS_DB = [
    {
        "incident_id": "INC-20260818-001",
        "detected_at": "2026-08-18T15:30:10Z",
        "severity": "CRITICAL",
        "root_cause": "Unexpected NULL values in total_amount due to upstream microservice serializer bug",
        "affected_node": "Data Quality Engine",
        "error_rate": 7.42,
        "threshold": 2.0,
        "records_affected": 8412,
        "circuit_breaker_state": "CLOSED",
        "remediation_state": "RESUMED",
        "resolution_time_sec": 14.8,
        "audit_trail": [
            {"time": "15:30:10", "event": "Error rate exceeded 2.0% threshold (reached 7.42%)"},
            {"time": "15:30:11", "event": "Circuit breaker transitioned from CLOSED to OPEN"},
            {"time": "15:30:12", "event": "Quarantined 8,412 corrupted transactions to checkout_events_dlq"},
            {"time": "15:30:15", "event": "Auto-remediation initiated source re-fetch and backfill"},
            {"time": "15:30:20", "event": "Data validation passed; circuit breaker transitioned to HALF_OPEN"},
            {"time": "15:30:25", "event": "SLA compliance verified; circuit breaker restored to CLOSED"}
        ]
    }
]

@router.get("", response_model=List[Incident])
def list_incidents():
    return INCIDENTS_DB

@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: str):
    for inc in INCIDENTS_DB:
        if inc["incident_id"] == incident_id:
            return inc
    raise HTTPException(status_code=404, detail="Incident not found")
