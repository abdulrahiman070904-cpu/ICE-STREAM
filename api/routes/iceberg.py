from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/iceberg", tags=["Apache Iceberg Lakehouse"])

class IcebergSnapshot(BaseModel):
    snapshot_id: str
    parent_id: Optional[str]
    timestamp: str
    operation: str
    records_added: int
    records_deleted: int
    total_records: int
    manifest_list: str
    summary_description: str

SAMPLE_SNAPSHOTS = [
    {
        "snapshot_id": "snap-981247012398412",
        "parent_id": None,
        "timestamp": "2026-08-18T15:00:00Z",
        "operation": "APPEND",
        "records_added": 150000,
        "records_deleted": 0,
        "total_records": 150000,
        "manifest_list": "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-1.avro",
        "summary_description": "Initial streaming micro-batch commit"
    },
    {
        "snapshot_id": "snap-981247012398413",
        "parent_id": "snap-981247012398412",
        "timestamp": "2026-08-18T15:15:00Z",
        "operation": "APPEND",
        "records_added": 75000,
        "records_deleted": 0,
        "total_records": 225000,
        "manifest_list": "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-2.avro",
        "summary_description": "Regular streaming checkpoint (Before Incident)"
    },
    {
        "snapshot_id": "snap-981247012398414",
        "parent_id": "snap-981247012398413",
        "timestamp": "2026-08-18T15:30:25Z",
        "operation": "OVERWRITE",
        "records_added": 8412,
        "records_deleted": 0,
        "total_records": 233412,
        "manifest_list": "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-3.avro",
        "summary_description": "Remediated backfill commit after incident INC-20260818-001"
    },
    {
        "snapshot_id": "snap-981247012398415",
        "parent_id": "snap-981247012398414",
        "timestamp": "2026-08-18T15:45:00Z",
        "operation": "APPEND",
        "records_added": 11588,
        "records_deleted": 0,
        "total_records": 245000,
        "manifest_list": "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-4.avro",
        "summary_description": "Current healthy state ingestion"
    }
]

@router.get("/snapshots", response_model=List[IcebergSnapshot])
def list_snapshots():
    return SAMPLE_SNAPSHOTS

@router.get("/time-travel")
def time_travel_query(
    snapshot_id: Optional[str] = Query(None),
    preset: Optional[str] = Query(None)  # "current", "previous", "before_incident", "after_recovery"
):
    target_snap = SAMPLE_SNAPSHOTS[-1]
    if preset == "before_incident":
        target_snap = SAMPLE_SNAPSHOTS[1]
    elif preset == "after_recovery":
        target_snap = SAMPLE_SNAPSHOTS[2]
    elif preset == "previous":
        target_snap = SAMPLE_SNAPSHOTS[-2]
    elif snapshot_id:
        match = [s for s in SAMPLE_SNAPSHOTS if s["snapshot_id"] == snapshot_id]
        if match:
            target_snap = match[0]

    return {
        "query_target": "ecommerce.checkout_events",
        "snapshot_id": target_snap["snapshot_id"],
        "timestamp": target_snap["timestamp"],
        "operation": target_snap["operation"],
        "total_records": target_snap["total_records"],
        "valid_records": int(target_snap["total_records"] * 0.985),
        "invalid_records": int(target_snap["total_records"] * 0.015),
        "manifest_path": target_snap["manifest_list"],
        "sample_records": [
            {
                "transaction_id": "TXN-0010891",
                "timestamp": target_snap["timestamp"],
                "customer_id": "CUS-7781",
                "product_id": "PROD-201",
                "quantity": 2,
                "unit_price": 549.00,
                "total_amount": 1098.00,
                "currency": "INR",
                "payment_status": "SUCCESS",
                "region": "HYDERABAD"
            },
            {
                "transaction_id": "TXN-0010892",
                "timestamp": target_snap["timestamp"],
                "customer_id": "CUS-3920",
                "product_id": "PROD-409",
                "quantity": 1,
                "unit_price": 2499.00,
                "total_amount": 2499.00,
                "currency": "INR",
                "payment_status": "SUCCESS",
                "region": "BANGALORE"
            }
        ]
    }
