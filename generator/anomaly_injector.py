import random
from typing import Dict, Any

class AnomalyInjector:
    """
    Injects realistic telemetry data quality anomalies:
    - NULL injection in critical fields
    - Schema drift (renamed columns, unexpected fields, missing columns)
    - Value violations (negative quantities, negative prices, mismatching totals)
    - Enum invalidation (unsupported currencies, invalid payment statuses)
    """

    @staticmethod
    def inject_nulls(data: Dict[str, Any]) -> Dict[str, Any]:
        corrupted = dict(data)
        target_field = random.choice([
            "total_amount", "customer_id", "product_id", 
            "quantity", "currency", "payment_status", "region"
        ])
        corrupted[target_field] = None
        return corrupted

    @staticmethod
    def inject_schema_drift(data: Dict[str, Any]) -> Dict[str, Any]:
        corrupted = dict(data)
        drift_type = random.choice(["rename_field", "new_field", "drop_field", "type_drift"])
        
        if drift_type == "rename_field":
            # Rename total_amount to amount_total or cust_id
            if "total_amount" in corrupted:
                corrupted["amount_total"] = corrupted.pop("total_amount")
        elif drift_type == "new_field":
            # Add unexpected upstream payload field
            corrupted["__debug_trace_v2"] = "drift_0x992"
            corrupted["merchant_tier_override"] = 999
        elif drift_type == "drop_field":
            # Missing essential column
            if "customer_id" in corrupted:
                del corrupted["customer_id"]
        elif drift_type == "type_drift":
            # total_amount as string instead of numeric float
            corrupted["total_amount"] = "NaN_OVERFLOW"
            
        return corrupted

    @staticmethod
    def inject_invalid_amount(data: Dict[str, Any]) -> Dict[str, Any]:
        corrupted = dict(data)
        violation_type = random.choice(["negative_quantity", "negative_price", "mismatched_math"])
        
        if violation_type == "negative_quantity":
            corrupted["quantity"] = -1 * random.randint(1, 10)
        elif violation_type == "negative_price":
            corrupted["unit_price"] = -499.99
            corrupted["total_amount"] = -499.99
        elif violation_type == "mismatched_math":
            # Math mismatch: 2 items at 500 should be 1000, inject 999999
            corrupted["total_amount"] = 999999.99
            
        return corrupted

    @staticmethod
    def inject_invalid_enums(data: Dict[str, Any]) -> Dict[str, Any]:
        corrupted = dict(data)
        if random.random() < 0.5:
            corrupted["currency"] = "BITCOIN_INVALID"
        else:
            corrupted["payment_status"] = "UNCONFIRMED_VAGUE_STATUS"
        return corrupted
