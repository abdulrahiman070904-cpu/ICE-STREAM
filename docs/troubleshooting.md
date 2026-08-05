# IceStream Troubleshooting & Operation Guide

## Common Issues and Solutions

### 1. Kafka Connection Timeout
**Symptom**: Services report `NoBrokersAvailable` or `ConnectionRefusedError`.
**Fix**: Ensure the Kafka container is healthy via `docker compose ps`. Wait for `kafka-init` to finish provisioning topics.

### 2. MinIO S3 Lakehouse Bucket Missing
**Symptom**: Iceberg REST catalog reports `NoSuchBucket: lakehouse`.
**Fix**: Run `docker compose up minio-init` to auto-create the default bucket and policies.

### 3. Flink TaskManager Memory Allocation
**Symptom**: Task slots exhausted or `OutOfMemoryError`.
**Fix**: Increase `taskmanager.numberOfTaskSlots: 4` in `flink/config/flink-conf.yaml`.

### 4. Circuit Breaker Stuck in OPEN State
**Symptom**: Circuit breaker remains OPEN and does not auto-recover.
**Fix**: In the UI, navigate to "Chaos Control" and click **Trigger Auto-Recovery** or send `POST /api/simulation/circuit_breaker/reset`.
