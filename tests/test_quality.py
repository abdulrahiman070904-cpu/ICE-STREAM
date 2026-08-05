import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../flink/jobs")))
from quality_processor import QualityProcessor

def test_valid_record():
    record = {
        "transaction_id": "TXN-100",
        "timestamp": "2026-08-18T15:30:00Z",
        "customer_id": "CUS-1",
        "product_id": "PROD-1",
        "quantity": 2,
        "unit_price": 500.0,
        "total_amount": 1000.0,
        "currency": "INR",
        "payment_status": "SUCCESS",
        "region": "HYDERABAD",
        "payment_method": "UPI",
        "device_type": "MOBILE",
        "event_type": "CHECKOUT"
    }
    is_valid, err_type, err_msg = QualityProcessor.validate_record(record)
    assert is_valid is True
    assert err_type is None

def test_null_detection():
    record = {
        "transaction_id": "TXN-101",
        "timestamp": "2026-08-18T15:30:00Z",
        "customer_id": "CUS-1",
        "product_id": "PROD-1",
        "quantity": 2,
        "unit_price": 500.0,
        "total_amount": None,  # NULL
        "currency": "INR",
        "payment_status": "SUCCESS",
        "region": "HYDERABAD"
    }
    is_valid, err_type, err_msg = QualityProcessor.validate_record(record)
    assert is_valid is False
    assert err_type == "NULL_VALUE"

def test_invalid_math_consistency():
    record = {
        "transaction_id": "TXN-102",
        "timestamp": "2026-08-18T15:30:00Z",
        "customer_id": "CUS-1",
        "product_id": "PROD-1",
        "quantity": 2,
        "unit_price": 500.0,
        "total_amount": 9999.0,  # Math mismatch
        "currency": "INR",
        "payment_status": "SUCCESS",
        "region": "HYDERABAD"
    }
    is_valid, err_type, err_msg = QualityProcessor.validate_record(record)
    assert is_valid is False
    assert err_type == "MATH_INCONSISTENCY"
