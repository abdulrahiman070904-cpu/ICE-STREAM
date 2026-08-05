from fastapi import APIRouter
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/remediation", tags=["Automatic Remediation"])

class RemediationStage(BaseModel):
    stage: str
    status: str
    timestamp: str
    duration_ms: int
    details: str

class RemediationWorkflowResponse(BaseModel):
    workflow_id: str
    incident_id: str
    status: str
    stages: List[RemediationStage]

@router.get("", response_model=List[RemediationWorkflowResponse])
def get_remediation_workflows():
    return [
        {
            "workflow_id": "REM-WF-001",
            "incident_id": "INC-20260818-001",
            "status": "COMPLETED",
            "stages": [
                {"stage": "Anomaly Detected", "status": "COMPLETED", "timestamp": "15:30:10", "duration_ms": 110, "details": "Error rate 7.42% exceeded 2.0% SLA"},
                {"stage": "Circuit Opened", "status": "COMPLETED", "timestamp": "15:30:11", "duration_ms": 45, "details": "Isolated main Iceberg lakehouse table"},
                {"stage": "Bad Data Quarantined", "status": "COMPLETED", "timestamp": "15:30:12", "duration_ms": 230, "details": "Diverted 8,412 records to checkout_events_dlq"},
                {"stage": "Source Re-fetch", "status": "COMPLETED", "timestamp": "15:30:14", "duration_ms": 1450, "details": "Idempotent backfill from payment gateway API"},
                {"stage": "Data Validation", "status": "COMPLETED", "timestamp": "15:30:18", "duration_ms": 820, "details": "Passed Great Expectations quality ruleset"},
                {"stage": "Sample Test", "status": "COMPLETED", "timestamp": "15:30:20", "duration_ms": 410, "details": "Transitioned to HALF_OPEN, 50/50 samples valid"},
                {"stage": "Pipeline Resumed", "status": "COMPLETED", "timestamp": "15:30:22", "duration_ms": 85, "details": "Circuit closed; regular ingestion active"}
            ]
        }
    ]
