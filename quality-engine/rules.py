from typing import Dict, Any, List, Tuple
from pydantic import BaseModel

class RuleResult(BaseModel):
    rule_id: str
    rule_name: str
    status: str  # PASS, WARNING, CRITICAL
    description: str
    passed_count: int = 0
    failed_count: int = 0
    failure_percentage: float = 0.0

class QualityRulesEngine:
    """
    Data Quality Rules Execution Engine:
    Rule 1 — Required fields (cannot be NULL)
    Rule 2 — Positive values (quantity > 0, unit_price >= 0, total_amount >= 0)
    Rule 3 — Valid payment status (SUCCESS, FAILED, PENDING, REFUNDED)
    Rule 4 — Valid currency (INR, USD, EUR, GBP)
    Rule 5 — Transaction consistency (total_amount ≈ quantity * unit_price)
    Rule 6 — Schema validation (missing/new/renamed columns)
    Rule 7 — Null anomaly (Rolling NULL percentage < 2% Normal, >= 2% Warning, >= 5% Critical)
    """

    REQUIRED_FIELDS = [
        "transaction_id", "timestamp", "customer_id", "product_id",
        "quantity", "unit_price", "total_amount", "currency",
        "payment_status", "region"
    ]
    VALID_STATUSES = {"SUCCESS", "FAILED", "PENDING", "REFUNDED"}
    VALID_CURRENCIES = {"INR", "USD", "EUR", "GBP"}

    @classmethod
    def evaluate_batch(cls, records: List[Dict[str, Any]]) -> Dict[str, RuleResult]:
        total = len(records)
        if total == 0:
            return {}

        results = {
            "required_fields": RuleResult(
                rule_id="RULE-01",
                rule_name="Required Fields",
                status="PASS",
                description="Checks that all required telemetry fields are populated and non-null"
            ),
            "positive_amounts": RuleResult(
                rule_id="RULE-02",
                rule_name="Positive Amounts",
                status="PASS",
                description="Checks quantity > 0, unit_price >= 0, and total_amount >= 0"
            ),
            "payment_status": RuleResult(
                rule_id="RULE-03",
                rule_name="Payment Status",
                status="PASS",
                description="Validates status against SUCCESS, FAILED, PENDING, REFUNDED"
            ),
            "currency_validation": RuleResult(
                rule_id="RULE-04",
                rule_name="Currency Validation",
                status="PASS",
                description="Validates currency against allowed ISO codes (INR, USD, EUR, GBP)"
            ),
            "math_consistency": RuleResult(
                rule_id="RULE-05",
                rule_name="Transaction Consistency",
                status="PASS",
                description="Validates total_amount ≈ quantity * unit_price with tolerance"
            ),
            "schema_validation": RuleResult(
                rule_id="RULE-06",
                rule_name="Schema Validation",
                status="PASS",
                description="Ensures expected fields exist without unknown drift or column corruption"
            ),
            "null_anomaly": RuleResult(
                rule_id="RULE-07",
                rule_name="Null Anomaly Rate",
                status="PASS",
                description="Rolling NULL anomaly monitor (Warning >= 2%, Critical >= 5%)"
            ),
        }

        for r in records:
            # Check 1: Required
            has_null = any(r.get(f) is None for f in cls.REQUIRED_FIELDS)
            if has_null:
                results["required_fields"].failed_count += 1
                results["null_anomaly"].failed_count += 1
            else:
                results["required_fields"].passed_count += 1
                results["null_anomaly"].passed_count += 1

            # Check 2: Positive
            try:
                qty = int(r.get("quantity", 0))
                price = float(r.get("unit_price", 0.0))
                total_amt = float(r.get("total_amount", 0.0))
                if qty > 0 and price >= 0 and total_amt >= 0:
                    results["positive_amounts"].passed_count += 1
                else:
                    results["positive_amounts"].failed_count += 1
            except Exception:
                results["positive_amounts"].failed_count += 1

            # Check 3: Payment status
            if str(r.get("payment_status")).upper() in cls.VALID_STATUSES:
                results["payment_status"].passed_count += 1
            else:
                results["payment_status"].failed_count += 1

            # Check 4: Currency
            if str(r.get("currency")).upper() in cls.VALID_CURRENCIES:
                results["currency_validation"].passed_count += 1
            else:
                results["currency_validation"].failed_count += 1

            # Check 5: Math
            try:
                expected = float(r.get("quantity", 0)) * float(r.get("unit_price", 0.0))
                actual = float(r.get("total_amount", 0.0))
                if abs(actual - expected) <= 0.05:
                    results["math_consistency"].passed_count += 1
                else:
                    results["math_consistency"].failed_count += 1
            except Exception:
                results["math_consistency"].failed_count += 1

            # Check 6: Schema drift
            unexpected = set(r.keys()) - set(cls.REQUIRED_FIELDS) - {"payment_method", "device_type", "event_type"}
            missing = set(cls.REQUIRED_FIELDS) - set(r.keys())
            if unexpected or missing:
                results["schema_validation"].failed_count += 1
            else:
                results["schema_validation"].passed_count += 1

        # Calculate percentages and statuses
        for k, v in results.items():
            fail_pct = (v.failed_count / total) * 100.0 if total > 0 else 0.0
            v.failure_percentage = round(fail_pct, 2)
            if k == "null_anomaly":
                if fail_pct >= 5.0:
                    v.status = "CRITICAL"
                elif fail_pct >= 2.0:
                    v.status = "WARNING"
                else:
                    v.status = "PASS"
            else:
                if fail_pct >= 5.0:
                    v.status = "CRITICAL"
                elif fail_pct >= 1.0:
                    v.status = "WARNING"
                else:
                    v.status = "PASS"

        return results
