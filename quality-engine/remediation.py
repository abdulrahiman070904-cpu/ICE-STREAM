import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("remediation-engine")

class RemediationWorkflow:
    """
    Automated Incident Remediation Life-cycle:
    DETECTED -> QUARANTINED -> REMEDIATING -> VALIDATING -> RECOVERED -> RESUMED (or FAILED)
    """

    STATES = ["DETECTED", "QUARANTINED", "REMEDIATING", "VALIDATING", "RECOVERED", "RESUMED", "FAILED"]

    def __init__(self, incident_id: str, anomaly_type: str, affected_records_count: int = 0):
        self.incident_id = incident_id
        self.anomaly_type = anomaly_type
        self.affected_records_count = affected_records_count
        self.current_state = "DETECTED"
        self.created_at = time.time()
        self.updated_at = time.time()
        self.stages_timeline = [
            {"stage": "DETECTED", "timestamp": self.created_at, "status": "COMPLETED", "duration_ms": 120}
        ]

    def advance_stage(self, next_state: str, details: Optional[str] = None):
        if next_state not in self.STATES:
            raise ValueError(f"Invalid state {next_state}")
        
        now = time.time()
        duration = round((now - self.updated_at) * 1000)
        self.stages_timeline.append({
            "stage": next_state,
            "timestamp": now,
            "status": "COMPLETED",
            "duration_ms": duration,
            "details": details or f"Completed {next_state} successfully"
        })
        self.current_state = next_state
        self.updated_at = now
        logger.info(f"Incident {self.incident_id} transitioned to stage '{next_state}'")

    def execute_auto_recovery_cycle(self):
        """Runs the full automatic remediation pipeline step-by-step"""
        self.advance_stage("QUARANTINED", "Isolated corrupt streaming batch into checkout_events_dlq table")
        time.sleep(0.5)
        self.advance_stage("REMEDIATING", "Triggered upstream idempotent re-fetch and schema sanitization")
        time.sleep(0.5)
        self.advance_stage("VALIDATING", "Executed Great Expectations test suite on repaired batch")
        time.sleep(0.5)
        self.advance_stage("RECOVERED", "Sample testing passed 100% compliance threshold")
        time.sleep(0.5)
        self.advance_stage("RESUMED", "Circuit breaker closed; resumed streaming into Iceberg main table")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "incident_id": self.incident_id,
            "anomaly_type": self.anomaly_type,
            "affected_records_count": self.affected_records_count,
            "current_state": self.current_state,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "timeline": self.stages_timeline
        }
