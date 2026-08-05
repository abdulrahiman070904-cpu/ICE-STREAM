from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, StringType, IntegerType, FloatType, TimestampType, LongType
)

# Iceberg Table Schema: checkout_events (Main Lakehouse Table)
CHECKOUT_EVENTS_SCHEMA = Schema(
    NestedField(field_id=1, name="transaction_id", field_type=StringType(), required=True),
    NestedField(field_id=2, name="timestamp", field_type=StringType(), required=True),
    NestedField(field_id=3, name="customer_id", field_type=StringType(), required=True),
    NestedField(field_id=4, name="product_id", field_type=StringType(), required=True),
    NestedField(field_id=5, name="quantity", field_type=IntegerType(), required=True),
    NestedField(field_id=6, name="unit_price", field_type=FloatType(), required=True),
    NestedField(field_id=7, name="total_amount", field_type=FloatType(), required=True),
    NestedField(field_id=8, name="currency", field_type=StringType(), required=True),
    NestedField(field_id=9, name="payment_method", field_type=StringType(), required=True),
    NestedField(field_id=10, name="payment_status", field_type=StringType(), required=True),
    NestedField(field_id=11, name="region", field_type=StringType(), required=True),
    NestedField(field_id=12, name="device_type", field_type=StringType(), required=True),
    NestedField(field_id=13, name="event_type", field_type=StringType(), required=True),
)

# Iceberg Table Schema: checkout_events_dlq (Dead Letter Queue & Quarantine Table)
CHECKOUT_EVENTS_DLQ_SCHEMA = Schema(
    NestedField(field_id=1, name="transaction_id", field_type=StringType(), required=True),
    NestedField(field_id=2, name="original_payload", field_type=StringType(), required=True),
    NestedField(field_id=3, name="error_type", field_type=StringType(), required=True),
    NestedField(field_id=4, name="error_message", field_type=StringType(), required=True),
    NestedField(field_id=5, name="failed_rule", field_type=StringType(), required=True),
    NestedField(field_id=6, name="detected_at", field_type=StringType(), required=True),
    NestedField(field_id=7, name="source", field_type=StringType(), required=True),
    NestedField(field_id=8, name="pipeline_stage", field_type=StringType(), required=True),
    NestedField(field_id=9, name="incident_id", field_type=StringType(), required=False),
)

# Iceberg Table Schema: quality_metrics
QUALITY_METRICS_SCHEMA = Schema(
    NestedField(field_id=1, name="metric_id", field_type=StringType(), required=True),
    NestedField(field_id=2, name="timestamp", field_type=StringType(), required=True),
    NestedField(field_id=3, name="events_processed", field_type=LongType(), required=True),
    NestedField(field_id=4, name="events_valid", field_type=LongType(), required=True),
    NestedField(field_id=5, name="events_invalid", field_type=LongType(), required=True),
    NestedField(field_id=6, name="error_rate", field_type=FloatType(), required=True),
    NestedField(field_id=7, name="null_rate", field_type=FloatType(), required=True),
    NestedField(field_id=8, name="latency_ms", field_type=FloatType(), required=True),
)
