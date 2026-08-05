from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/simulation", tags=["Chaos & Simulation Controls"])

class SimulationConfig(BaseModel):
    is_running: bool = True
    events_per_second: int = 250
    anomaly_rate: float = 0.01
    null_rate: float = 0.01
    schema_drift_rate: float = 0.005
    force_mode: Optional[str] = "NORMAL"

STATE = SimulationConfig()

@router.get("/config")
def get_sim_config():
    return STATE

@router.post("/start")
def start_generator():
    STATE.is_running = True
    return {"status": "started", "config": STATE}

@router.post("/stop")
def stop_generator():
    STATE.is_running = False
    return {"status": "stopped", "config": STATE}

@router.post("/anomaly/null")
def inject_null():
    STATE.force_mode = "NULL_INJECTION"
    STATE.null_rate = 0.08
    return {"status": "injected_nulls", "null_rate": 0.08}

@router.post("/anomaly/schema_drift")
def inject_schema_drift():
    STATE.force_mode = "SCHEMA_DRIFT"
    STATE.schema_drift_rate = 0.07
    return {"status": "injected_schema_drift", "schema_drift_rate": 0.07}

@router.post("/anomaly/invalid_amounts")
def inject_invalid_amounts():
    STATE.force_mode = "INVALID_AMOUNTS"
    STATE.anomaly_rate = 0.08
    return {"status": "injected_invalid_amounts", "anomaly_rate": 0.08}

@router.post("/anomaly/high_error_rate")
def inject_high_error_rate():
    STATE.force_mode = "HIGH_ERROR_RATE"
    STATE.anomaly_rate = 0.12
    return {"status": "injected_high_error_rate", "anomaly_rate": 0.12}

@router.post("/circuit_breaker/trigger")
def trigger_circuit_breaker():
    return {"status": "circuit_breaker_tripped", "state": "OPEN"}

@router.post("/circuit_breaker/reset")
def reset_circuit_breaker():
    STATE.force_mode = "NORMAL"
    STATE.null_rate = 0.01
    STATE.anomaly_rate = 0.01
    STATE.schema_drift_rate = 0.005
    return {"status": "circuit_breaker_reset", "state": "CLOSED"}
