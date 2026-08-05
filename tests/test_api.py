import pytest
import sys
import os
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../api")))
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_pipeline_status():
    res = client.get("/api/pipeline/status")
    assert res.status_code == 200
    data = res.json()
    assert data["circuit_breaker"] == "closed"
    assert data["kafka"] == "healthy"

def test_metrics():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "events_per_sec" in data
    assert "circuit_breaker_status" in data

def test_iceberg_snapshots():
    res = client.get("/api/iceberg/snapshots")
    assert res.status_code == 200
    assert len(res.json()) > 0
