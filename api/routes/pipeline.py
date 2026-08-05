from fastapi import APIRouter
from typing import Dict, Any, List
from pydantic import BaseModel
import time

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

class PipelineStatus(BaseModel):
    generator: str
    kafka: str
    flink: str
    quality_engine: str
    iceberg: str
    circuit_breaker: str
    timestamp: float

class PipelineEvent(BaseModel):
    id: str
    timestamp: str
    level: str  # INFO, WARN, CRITICAL, ALERT, SUCCESS
    source: str
    message: str
    details: Dict[str, Any] = {}

@router.get("/status", response_model=PipelineStatus)
def get_pipeline_status():
    return PipelineStatus(
        generator="healthy",
        kafka="healthy",
        flink="healthy",
        quality_engine="healthy",
        iceberg="healthy",
        circuit_breaker="closed",
        timestamp=time.time()
    )

@router.get("/events")
def get_pipeline_events():
    return [
        {
            "id": "EVT-001",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "INFO",
            "source": "kafka-ingestion",
            "message": "Kafka checkout-events ingestion throughput steady at 250 eps"
        },
        {
            "id": "EVT-002",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "INFO",
            "source": "flink-jobmanager",
            "message": "Flink stream checkpoints healthy, checkpoint latency 42ms"
        },
        {
            "id": "EVT-003",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "SUCCESS",
            "source": "iceberg-rest",
            "message": "Committed snapshot to ecommerce.checkout_events (manifest count: 12)"
        }
    ]
