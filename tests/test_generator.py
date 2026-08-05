import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../generator")))
from anomaly_injector import AnomalyInjector
from generator import generate_base_event

def test_generate_base_event():
    event = generate_base_event(1)
    assert event["transaction_id"] == "TXN-0000001"
    assert event["quantity"] > 0
    assert event["unit_price"] > 0
    assert event["currency"] in ["INR", "USD", "EUR", "GBP"]
    assert event["payment_status"] in ["SUCCESS", "PENDING", "FAILED", "REFUNDED"]
    assert round(event["unit_price"] * event["quantity"], 2) == event["total_amount"]

def test_inject_nulls():
    event = generate_base_event(2)
    corrupted = AnomalyInjector.inject_nulls(event)
    # At least one field should be null
    assert any(v is None for v in corrupted.values())

def test_inject_invalid_amount():
    event = generate_base_event(3)
    corrupted = AnomalyInjector.inject_invalid_amount(event)
    is_negative = (corrupted["quantity"] < 0 or corrupted["unit_price"] < 0)
    is_mismatch = (corrupted["total_amount"] == 999999.99)
    assert is_negative or is_mismatch
