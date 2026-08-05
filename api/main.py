from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from routes import health, pipeline, metrics, incidents, dlq, remediation, iceberg, simulation
from websocket.manager import manager
import asyncio
import time
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("icestream-api")

app = FastAPI(
    title="IceStream Observability API",
    description="Real-time Lakehouse Observability, Data Quality & Automated Remediation API",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route routers
app.include_router(health.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(dlq.router, prefix="/api")
app.include_router(remediation.router, prefix="/api")
app.include_router(iceberg.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_text(json.dumps({
            "event": "CONNECTED",
            "timestamp": time.time(),
            "message": "Connected to IceStream Real-Time Lakehouse Telemetry Stream"
        }))
        while True:
            data = await websocket.receive_text()
            # Echo or process incoming commands if any
            logger.info(f"Received WS payload: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
