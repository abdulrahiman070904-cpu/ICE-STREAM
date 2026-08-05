from fastapi import APIRouter
from pydantic import BaseModel
import time

router = APIRouter(prefix="/health", tags=["Health"])

class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    timestamp: float
    version: str = "1.0.0"

START_TIME = time.time()

@router.get("", response_model=HealthResponse)
def get_health():
    return HealthResponse(
        status="healthy",
        uptime_seconds=round(time.time() - START_TIME, 2),
        timestamp=time.time()
    )
