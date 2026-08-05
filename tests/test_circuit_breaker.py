import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../flink/jobs")))
from circuit_breaker import StreamCircuitBreaker

def test_circuit_breaker_normal():
    cb = StreamCircuitBreaker(error_threshold=0.02)
    # 1000 events, 5 invalid (0.5% error rate)
    status = cb.evaluate_metrics(total=1000, invalid=5)
    assert cb.state == "CLOSED"
    assert cb.is_accepting_main_traffic() is True

def test_circuit_breaker_trip():
    cb = StreamCircuitBreaker(error_threshold=0.02)
    # 100 events, 10 invalid (10% error rate)
    status = cb.evaluate_metrics(total=100, invalid=10)
    assert status == "TRIPPED_OPEN"
    assert cb.state == "OPEN"
    assert cb.is_accepting_main_traffic() is False
