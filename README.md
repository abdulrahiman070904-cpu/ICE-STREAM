# IceStream — Real-Time Lakehouse Observability Platform

IceStream is a production-style, real-time data quality and lakehouse observability platform for monitoring high-volume e-commerce checkout telemetry. It features streaming ingestion via Kafka, real-time quality validation via Flink and Great Expectations, an automated Circuit Breaker, Dead Letter Queue (DLQ) quarantine, self-healing automated remediation, and historical Time-Travel queries on Apache Iceberg tables.

---

## 🏛 Architecture

```text
                    ┌──────────────────────┐
                    │ Transaction Generator│
                    │       Python         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Apache Kafka    │
                    │   checkout-events   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Apache Flink     │
                    │ Stream Processing     │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌────────────────┐          ┌──────────────────┐
        │ Data Quality   │          │ Valid Transactions│
        │ Rules Engine   │          │                  │
        └───────┬────────┘          └────────┬─────────┘
                │                            │
                ▼                            ▼
       ┌─────────────────┐         ┌──────────────────┐
       │ Circuit Breaker │         │ Apache Iceberg   │
       └────────┬────────┘         │ Main Table       │
                │                  └──────────────────┘
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐ ┌──────────────────┐
│ Dead Letter   │ │ Automatic        │
│ Queue /       │ │ Remediation      │
│ Quarantine    │ │ / Re-fetch       │
└───────────────┘ └──────────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ WebSocket Server │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ React Dashboard  │
                │ Data Lineage UI  │
                └──────────────────┘
```

---

## 🛠 Technology Stack

- **Data Streaming & Processing**: Apache Kafka (KRaft mode), Apache Flink 1.18, Python 3.11
- **Lakehouse & Object Storage**: Apache Iceberg, Iceberg REST Catalog, MinIO (S3 compatible)
- **Data Quality & Anomaly Detection**: Great Expectations, Rolling 60s Anomaly Engine, Stream Circuit Breaker
- **Backend & APIs**: FastAPI, WebSockets, Express/Node.js full-stack proxy
- **Frontend Dashboard**: React 19, TypeScript, Vite, React Flow, Recharts, Tailwind CSS
- **Infrastructure & Orchestration**: Docker, Docker Compose, Makefile

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker Engine 24.0+ & Docker Compose v2+
- Node.js 18+ (for local frontend development)
- Python 3.11+

### 2. Start all services
```bash
# Clone the repository and configure environment variables
cp .env.example .env

# Build and launch all containers
docker compose up --build
```

### 3. Access Services
- **React Observability Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Kafka UI Console**: [http://localhost:8080](http://localhost:8080)
- **Flink JobManager UI**: [http://localhost:8081](http://localhost:8081)
- **MinIO Object Console**: [http://localhost:9001](http://localhost:9001) (User: `admin`, Pass: `password123`)

---

## 🧪 Demonstration Scenario (Chaos & Auto-Remediation)

1. Open the **Dashboard** at `http://localhost:3000` to observe the healthy pipeline in real-time.
2. Navigate to **Simulation / Chaos Controls**.
3. Click **Inject NULL Values** (or slide error rate > 2%).
4. Observe the **Data Quality Engine** detect the anomaly (`NULL rate > 5%`).
5. Watch the **Circuit Breaker** automatically trip from `CLOSED` to `OPEN`.
6. Notice corrupt transactions routed to **Dead Letter Queue (DLQ)**.
7. An **Incident** is automatically created with full root-cause analysis.
8. The **Automated Remediation Engine** engages (`QUARANTINED` → `REMEDIATING` → `VALIDATING` → `RECOVERED` → `RESUMED`).
9. Circuit breaker transitions `OPEN` → `HALF_OPEN` → `CLOSED` once validation passes.
10. Navigate to **Iceberg Snapshots** to perform **Time-Travel** comparisons before, during, and after incident resolution.

---

## 📜 Testing

```bash
# Run unit and integration tests
pytest tests/ -v
```
