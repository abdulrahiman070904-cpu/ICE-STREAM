# IceStream Architecture & Design Specification

## System Overview
IceStream is a real-time data quality and lakehouse observability platform for mission-critical e-commerce checkout telemetry streams.

```
                    ┌───────────────────────────┐
                    │ Python Transaction Gen    │
                    │ (250 - 1000+ events/sec)  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Apache Kafka Broker       │
                    │ Topics: checkout-events   │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Apache Flink Engine       │
                    │ Stream Quality Processor  │
                    └─────────────┬─────────────┘
                                  │
               ┌──────────────────┴──────────────────┐
               ▼                                     ▼
     ┌───────────────────────┐            ┌───────────────────────┐
     │ Data Quality Rules    │            │ Valid Records Stream  │
     │ 7 Comprehensive Rules │            │ (SLA Verified)        │
     └─────────┬─────────────┘            └──────────┬────────────┘
               │                                     │
               ▼                                     ▼
     ┌───────────────────────┐            ┌───────────────────────┐
     │ Stream Circuit Breaker│            │ Apache Iceberg Table  │
     │ CLOSED/OPEN/HALF_OPEN │            │ ecommerce.checkout    │
     └─────────┬─────────────┘            └───────────────────────┘
               │
       ┌───────┴───────────────┐
       ▼                       ▼
┌──────────────┐      ┌─────────────────────────┐
│ Dead Letter  │      │ Automated Remediation   │
│ Queue (DLQ)  │      │ Source Re-fetch & Repair│
└──────────────┘      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │ Real-time WebSockets    │
                      └────────────┬────────────┘
                                   │
                                   ▼
                      ┌─────────────────────────┐
                      │ React Lineage & Control │
                      │ Observability Dashboard │
                      └─────────────────────────┘
```

## Core Processing Components

1. **Transaction Generator**: Simulates realistic multi-region checkout transactions with controlled injection of NULL fields, schema drifts, invalid totals, and negative values.
2. **Apache Kafka**: KRaft-based event distribution broker maintaining raw, valid, invalid, DLQ, and remediation topics.
3. **Apache Flink Job**: Streaming ingestion engine deserializing payloads, validating data types, calculating processing latency, and enforcing circuit breaker state.
4. **Data Quality Engine**: Evaluates 7 formal Great Expectations rules including required fields, positive bounds, status enums, currency validation, math consistency, schema drift, and sliding null anomaly rates.
5. **Circuit Breaker**: Trips to `OPEN` when error rates exceed the 2% threshold, isolating downstream Iceberg tables and routing corrupt records to DLQ. Transitions to `HALF_OPEN` to test sample recovery batches before restoring to `CLOSED`.
6. **Dead Letter Queue (DLQ)**: Quarantines records with full diagnostic metadata, root cause diagnostics, and original payload audit history.
7. **Automated Remediation Engine**: Automatically orchestrates the multi-phase lifecycle (`DETECTED -> QUARANTINED -> REMEDIATING -> VALIDATING -> RECOVERED -> RESUMED`).
8. **Apache Iceberg Lakehouse**: Manages snapshot metadata, partition manifests, and ACID commits on MinIO object storage with time-travel query support.
9. **FastAPI & Express WebSocket Bridge**: Provides real-time bidirectional telemetry updates to the frontend.
10. **React Lineage Dashboard**: Visualizes the entire system DAG using React Flow, Recharts metrics, and chaos simulation controls.
