# IceStream REST & WebSocket API Documentation

## Base URL
`/api` (or `http://localhost:8000/api`)

## OpenAPI Swagger UI
Available at `http://localhost:8000/docs`

## Endpoints

### 1. Health
`GET /api/health`
- Returns container health, uptime seconds, and timestamp.

### 2. Pipeline Lineage & Status
`GET /api/pipeline/status`
- Returns health status for each pipeline component: `generator`, `kafka`, `flink`, `quality_engine`, `iceberg`, and `circuit_breaker`.

`GET /api/pipeline/events`
- Returns recent streaming pipeline log events.

### 3. Real-Time Metrics & Quality
`GET /api/metrics`
- Returns events/sec, total events, valid events, invalid events, error rate, latency, and circuit breaker status.

`GET /api/quality`
- Returns overall quality compliance score and breakdown across all 7 data quality rules.

### 4. Incidents
`GET /api/incidents`
- Lists all active and resolved data quality incidents.

`GET /api/incidents/{incident_id}`
- Returns full details, root cause, error rates, and audit logs for a specific incident.

### 5. Dead Letter Queue
`GET /api/dlq?error_type=NULL_VALUE&status=QUARANTINED`
- Queries quarantined records in the Iceberg DLQ table.

### 6. Remediation Workflows
`GET /api/remediation`
- Returns active and completed automated remediation workflow lifecycles with timing breakdown.

### 7. Apache Iceberg & Time Travel
`GET /api/iceberg/snapshots`
- Returns committed table snapshots and sequence manifests.

`GET /api/iceberg/time-travel?preset=before_incident`
- Returns table state at a specific historical commit snapshot.

### 8. Chaos & Simulation Controls
`POST /api/simulation/start`
`POST /api/simulation/stop`
`POST /api/simulation/anomaly/null`
`POST /api/simulation/anomaly/schema_drift`
`POST /api/simulation/anomaly/invalid_amounts`
`POST /api/simulation/anomaly/high_error_rate`
`POST /api/simulation/circuit_breaker/trigger`
`POST /api/simulation/circuit_breaker/reset`

### 9. WebSocket Telemetry Stream
`ws://localhost:3000/ws` (or `ws://localhost:8000/ws`)
- Real-time event stream broadcasting metrics ticks, anomaly notifications, circuit breaker state changes, DLQ alerts, and remediation stage transitions.
