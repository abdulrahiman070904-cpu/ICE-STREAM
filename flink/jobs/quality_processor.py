import json
from typing import Tuple, Dict, Any, Optional

class QualityProcessor:
    REQUIRED_FIELDS = [
        "transaction_id", "timestamp", "customer_id", "product_id",
        "quantity", "unit_price", "total_amount", "currency",
        "payment_status", "region"
    ]
    ALLOWED_CURRENCIES = {"INR", "USD", "EUR", "GBP"}
    ALLOWED_STATUSES = {"SUCCESS", "FAILED", "PENDING", "REFUNDED"}

    @classmethod
    def validate_record(cls, record: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates an incoming checkout telemetry record.
        Returns: (is_valid, error_type, error_message)
        """
        # Rule 1: Required Fields
        for field in cls.REQUIRED_FIELDS:
            if field not in record or record[field] is None:
                return False, "NULL_VALUE", f"Required field '{field}' is missing or NULL"

        # Rule 2: Positive numeric values
        try:
            quantity = int(record["quantity"])
            unit_price = float(record["unit_price"])
            total_amount = float(record["total_amount"])
        except (ValueError, TypeError):
            return False, "TYPE_ERROR", "Numeric conversion failed for quantity/price/amount"

        if quantity <= 0:
            return False, "INVALID_VALUE", f"Quantity must be > 0, got {quantity}"
        if unit_price < 0:
            return False, "INVALID_VALUE", f"Unit price must be >= 0, got {unit_price}"
        if total_amount < 0:
            return False, "INVALID_VALUE", f"Total amount must be >= 0, got {total_amount}"

        # Rule 3: Valid payment status
        if str(record["payment_status"]).upper() not in cls.ALLOWED_STATUSES:
            return False, "INVALID_STATUS", f"Invalid payment status '{record.get('payment_status')}'"

        # Rule 4: Valid currency
        if str(record["currency"]).upper() not in cls.ALLOWED_CURRENCIES:
            return False, "INVALID_CURRENCY", f"Invalid currency '{record.get('currency')}'"

        # Rule 5: Math Consistency Check (total ≈ quantity * unit_price within 0.05 tolerance)
        expected_total = quantity * unit_price
        if abs(total_amount - expected_total) > 0.05:
            return False, "MATH_INCONSISTENCY", f"Math mismatch: total {total_amount} != quantity {quantity} * unit_price {unit_price}"

        # Rule 6: Schema Drift & Unexpected Columns
        unexpected = set(record.keys()) - set(cls.REQUIRED_FIELDS) - {"payment_method", "device_type", "event_type"}
        if unexpected:
            return False, "SCHEMA_DRIFT", f"Unexpected schema fields detected: {list(unexpected)}"

        return True, None, None
