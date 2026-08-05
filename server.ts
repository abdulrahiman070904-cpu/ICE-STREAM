import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface CheckoutEvent {
  transaction_id: string;
  timestamp: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number | null;
  currency: string;
  payment_method: string;
  payment_status: string;
  region: string;
  device_type: string;
  event_type: string;
  [key: string]: any;
}

interface DLQRecord {
  transaction_id: string;
  timestamp: string;
  error_type: string;
  failed_rule: string;
  error_message: string;
  pipeline_stage: string;
  incident_id?: string;
  status: "QUARANTINED" | "REMEDIATED" | "DISCARDED";
  original_payload: any;
}

interface Incident {
  incident_id: string;
  detected_at: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  root_cause: string;
  affected_node: string;
  error_rate: number;
  threshold: number;
  records_affected: number;
  circuit_breaker_state: string;
  remediation_state: string;
  resolution_time_sec?: number;
  audit_trail: { time: string; event: string }[];
}

interface RemediationStage {
  stage: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  timestamp: string;
  duration_ms: number;
  details: string;
}

interface RemediationWorkflow {
  workflow_id: string;
  incident_id: string;
  status: "COMPLETED" | "RUNNING" | "FAILED";
  started_at: string;
  stages: RemediationStage[];
}

interface IcebergSnapshot {
  snapshot_id: string;
  parent_id: string | null;
  timestamp: string;
  operation: "APPEND" | "OVERWRITE" | "DELETE";
  records_added: number;
  records_deleted: number;
  total_records: number;
  manifest_list: string;
  summary_description: string;
}

interface PipelineEventLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "CRITICAL" | "ALERT" | "SUCCESS";
  source: string;
  message: string;
}

// -------------------------------------------------------------
// Global Lakehouse State Engine
// -------------------------------------------------------------
class LakehouseEngine {
  public isRunning: boolean = true;
  public eventsPerSec: number = 250;
  public anomalyRate: number = 0.01;
  public nullRate: number = 0.01;
  public schemaDriftRate: number = 0.005;
  public forceMode: string = "NORMAL";

  public circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  public errorThreshold: number = 0.02; // 2%
  public lastStateChangeTime: number = Date.now();
  public halfOpenSamplesCount: number = 0;

  // Cumulative Metrics
  public totalEvents: number = 245000;
  public validEvents: number = 241500;
  public invalidEvents: number = 3500;
  public processingLatencyMs: number = 68.4;
  public currentErrorRate: number = 1.42;

  // Sliding window (last 60 ticks)
  public slidingWindow: { valid: number; invalid: number; nulls: number; timestamp: number }[] = [];

  // Data Stores
  public dlqRecords: DLQRecord[] = [];
  public incidents: Incident[] = [];
  public remediationWorkflows: RemediationWorkflow[] = [];
  public icebergSnapshots: IcebergSnapshot[] = [];
  public eventLogs: PipelineEventLog[] = [];

  private seqId: number = 245000;
  private wsClients: Set<WebSocket> = new Set();
  private autoRemediating: boolean = false;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Initial Iceberg Snapshots
    this.icebergSnapshots = [
      {
        snapshot_id: "snap-891247012398412",
        parent_id: null,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        operation: "APPEND",
        records_added: 150000,
        records_deleted: 0,
        total_records: 150000,
        manifest_list: "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-1.avro",
        summary_description: "Initial streaming micro-batch commit"
      },
      {
        snapshot_id: "snap-891247012398413",
        parent_id: "snap-891247012398412",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        operation: "APPEND",
        records_added: 75000,
        records_deleted: 0,
        total_records: 225000,
        manifest_list: "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-2.avro",
        summary_description: "Regular streaming checkpoint (Before Incident)"
      },
      {
        snapshot_id: "snap-891247012398414",
        parent_id: "snap-891247012398413",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        operation: "OVERWRITE",
        records_added: 8412,
        records_deleted: 0,
        total_records: 233412,
        manifest_list: "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-3.avro",
        summary_description: "Remediated backfill commit after incident INC-20260818-001"
      },
      {
        snapshot_id: "snap-891247012398415",
        parent_id: "snap-891247012398414",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        operation: "APPEND",
        records_added: 11588,
        records_deleted: 0,
        total_records: 245000,
        manifest_list: "s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/snap-4.avro",
        summary_description: "Current healthy state ingestion"
      }
    ];

    // Seed Initial DLQ Items
    this.dlqRecords = [
      {
        transaction_id: "TXN-0091244",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        error_type: "NULL_VALUE",
        failed_rule: "Required Fields",
        error_message: "total_amount cannot be NULL or missing",
        pipeline_stage: "flink-validation",
        incident_id: "INC-20260818-001",
        status: "REMEDIATED",
        original_payload: {
          transaction_id: "TXN-0091244",
          customer_id: "CUS-8812",
          product_id: "PROD-502",
          quantity: 2,
          unit_price: 499.99,
          total_amount: null,
          currency: "INR",
          payment_method: "UPI",
          payment_status: "SUCCESS",
          region: "HYDERABAD",
          device_type: "MOBILE"
        }
      },
      {
        transaction_id: "TXN-0091245",
        timestamp: new Date(Date.now() - 850000).toISOString(),
        error_type: "SCHEMA_DRIFT",
        failed_rule: "Schema Validation",
        error_message: "Unexpected columns [__debug_trace_v2, merchant_tier_override] detected",
        pipeline_stage: "flink-validation",
        incident_id: "INC-20260818-001",
        status: "REMEDIATED",
        original_payload: {
          transaction_id: "TXN-0091245",
          customer_id: "CUS-3112",
          product_id: "PROD-102",
          quantity: 1,
          unit_price: 1299.00,
          total_amount: 1299.00,
          currency: "INR",
          payment_method: "CREDIT_CARD",
          payment_status: "SUCCESS",
          region: "BANGALORE",
          __debug_trace_v2: "drift_0x992",
          merchant_tier_override: 999
        }
      },
      {
        transaction_id: "TXN-0091246",
        timestamp: new Date(Date.now() - 800000).toISOString(),
        error_type: "MATH_INCONSISTENCY",
        failed_rule: "Transaction Consistency",
        error_message: "Total amount 999999.99 does not match 2 * 499.99",
        pipeline_stage: "quality-rules-engine",
        incident_id: "INC-20260818-001",
        status: "QUARANTINED",
        original_payload: {
          transaction_id: "TXN-0091246",
          customer_id: "CUS-4421",
          product_id: "PROD-712",
          quantity: 2,
          unit_price: 499.99,
          total_amount: 999999.99,
          currency: "INR",
          payment_method: "UPI",
          payment_status: "SUCCESS",
          region: "MUMBAI"
        }
      }
    ];

    // Seed Initial Incidents
    this.incidents = [
      {
        incident_id: "INC-20260818-001",
        detected_at: new Date(Date.now() - 900000).toISOString(),
        severity: "CRITICAL",
        root_cause: "Unexpected NULL values in total_amount due to upstream microservice serializer bug",
        affected_node: "Data Quality Engine",
        error_rate: 7.42,
        threshold: 2.0,
        records_affected: 8412,
        circuit_breaker_state: "CLOSED",
        remediation_state: "RESUMED",
        resolution_time_sec: 14.8,
        audit_trail: [
          { time: "15:30:10", event: "Error rate exceeded 2.0% threshold (reached 7.42%)" },
          { time: "15:30:11", event: "Circuit breaker transitioned from CLOSED to OPEN" },
          { time: "15:30:12", event: "Quarantined 8,412 corrupted transactions to checkout_events_dlq" },
          { time: "15:30:15", event: "Auto-remediation initiated source re-fetch and backfill" },
          { time: "15:30:20", event: "Data validation passed; circuit breaker transitioned to HALF_OPEN" },
          { time: "15:30:25", event: "SLA compliance verified; circuit breaker restored to CLOSED" }
        ]
      }
    ];

    // Seed Initial Remediation Workflow
    this.remediationWorkflows = [
      {
        workflow_id: "REM-WF-001",
        incident_id: "INC-20260818-001",
        status: "COMPLETED",
        started_at: new Date(Date.now() - 900000).toISOString(),
        stages: [
          { stage: "Anomaly Detected", status: "COMPLETED", timestamp: "15:30:10", duration_ms: 110, details: "Error rate 7.42% exceeded 2.0% SLA" },
          { stage: "Circuit Opened", status: "COMPLETED", timestamp: "15:30:11", duration_ms: 45, details: "Isolated main Iceberg lakehouse table" },
          { stage: "Bad Data Quarantined", status: "COMPLETED", timestamp: "15:30:12", duration_ms: 230, details: "Diverted 8,412 records to checkout_events_dlq" },
          { stage: "Source Re-fetch", status: "COMPLETED", timestamp: "15:30:14", duration_ms: 1450, details: "Idempotent backfill from payment gateway API" },
          { stage: "Data Validation", status: "COMPLETED", timestamp: "15:30:18", duration_ms: 820, details: "Passed Great Expectations quality ruleset" },
          { stage: "Sample Test", status: "COMPLETED", timestamp: "15:30:20", duration_ms: 410, details: "Transitioned to HALF_OPEN, 50/50 samples valid" },
          { stage: "Pipeline Resumed", status: "COMPLETED", timestamp: "15:30:22", duration_ms: 85, details: "Circuit closed; regular ingestion active" }
        ]
      }
    ];

    // Seed Logs
    this.addEventLog("INFO", "kafka-ingestion", "Kafka checkout-events ingestion throughput steady at 250 eps");
    this.addEventLog("INFO", "flink-jobmanager", "Flink stream checkpoints healthy, latency 48ms");
    this.addEventLog("SUCCESS", "iceberg-rest", "Committed snapshot snap-891247012398415 to ecommerce.checkout_events");
  }

  public registerWebSocketClient(ws: WebSocket) {
    this.wsClients.add(ws);
    ws.on("close", () => this.wsClients.delete(ws));
  }

  public broadcast(payload: any) {
    const data = JSON.stringify(payload);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  public addEventLog(level: "INFO" | "WARN" | "CRITICAL" | "ALERT" | "SUCCESS", source: string, message: string) {
    const log: PipelineEventLog = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message
    };
    this.eventLogs.unshift(log);
    if (this.eventLogs.length > 200) {
      this.eventLogs.pop();
    }
    this.broadcast({ event: "LOG_EMITTED", log });
  }

  public generateEvent(): CheckoutEvent {
    this.seqId++;
    const qty = Math.floor(Math.random() * 4) + 1;
    const unitPrice = parseFloat((Math.random() * 800 + 49).toFixed(2));
    const total = parseFloat((qty * unitPrice).toFixed(2));
    const regions = ["HYDERABAD", "BANGALORE", "MUMBAI", "DELHI", "CHENNAI", "PUNE"];
    const currencies = ["INR", "USD", "EUR", "GBP"];
    const paymentMethods = ["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"];
    const paymentStatuses = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"];
    const devices = ["MOBILE", "DESKTOP", "TABLET"];

    let evt: CheckoutEvent = {
      transaction_id: `TXN-${String(this.seqId).padStart(7, "0")}`,
      timestamp: new Date().toISOString(),
      customer_id: `CUS-${Math.floor(Math.random() * 8999 + 1000)}`,
      product_id: `PROD-${Math.floor(Math.random() * 899 + 100)}`,
      quantity: qty,
      unit_price: unitPrice,
      total_amount: total,
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      payment_status: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      device_type: devices[Math.floor(Math.random() * devices.length)],
      event_type: "CHECKOUT"
    };

    // Apply Anomaly Injections
    const rand = Math.random();
    if (this.forceMode === "NULL_INJECTION" || rand < this.nullRate) {
      evt.total_amount = null;
    } else if (this.forceMode === "SCHEMA_DRIFT" || rand < (this.nullRate + this.schemaDriftRate)) {
      evt["__debug_trace_v2"] = "drift_0x992";
      evt["merchant_tier_override"] = 999;
    } else if (this.forceMode === "INVALID_AMOUNTS" || rand < (this.nullRate + this.schemaDriftRate + this.anomalyRate)) {
      evt.total_amount = 999999.99; // Math mismatch
    } else if (this.forceMode === "HIGH_ERROR_RATE") {
      if (Math.random() < 0.25) evt.total_amount = null;
      if (Math.random() < 0.25) evt.quantity = -2;
    }

    return evt;
  }

  public validateRecord(evt: CheckoutEvent): { isValid: boolean; errorType?: string; errorMsg?: string; failedRule?: string } {
    if (evt.total_amount === null || evt.total_amount === undefined) {
      return { isValid: false, errorType: "NULL_VALUE", errorMsg: "total_amount cannot be NULL or missing", failedRule: "Required Fields" };
    }
    if (evt.quantity <= 0 || evt.unit_price < 0 || evt.total_amount < 0) {
      return { isValid: false, errorType: "INVALID_VALUE", errorMsg: "Quantity, unit price and total must be non-negative", failedRule: "Positive Amounts" };
    }
    if (["SUCCESS", "FAILED", "PENDING", "REFUNDED"].indexOf(evt.payment_status) === -1) {
      return { isValid: false, errorType: "INVALID_STATUS", errorMsg: "Invalid payment status code", failedRule: "Payment Status" };
    }
    if (["INR", "USD", "EUR", "GBP"].indexOf(evt.currency) === -1) {
      return { isValid: false, errorType: "INVALID_CURRENCY", errorMsg: "Invalid currency ISO identifier", failedRule: "Currency Validation" };
    }
    const expected = evt.quantity * evt.unit_price;
    if (Math.abs(evt.total_amount - expected) > 0.05) {
      return { isValid: false, errorType: "MATH_INCONSISTENCY", errorMsg: `Total amount ${evt.total_amount} != quantity ${evt.quantity} * unit_price ${evt.unit_price}`, failedRule: "Transaction Consistency" };
    }
    if (evt["__debug_trace_v2"] || evt["merchant_tier_override"]) {
      return { isValid: false, errorType: "SCHEMA_DRIFT", errorMsg: "Unexpected columns [__debug_trace_v2, merchant_tier_override] detected", failedRule: "Schema Validation" };
    }

    return { isValid: true };
  }

  // Real-time processing loop tick
  public tick() {
    if (!this.isRunning) return;

    // Simulate a batch based on eventsPerSec / 4 (since tick runs every 250ms)
    const batchSize = Math.max(1, Math.round(this.eventsPerSec / 4));
    let validInBatch = 0;
    let invalidInBatch = 0;
    let nullsInBatch = 0;

    for (let i = 0; i < batchSize; i++) {
      const evt = this.generateEvent();
      const validation = this.validateRecord(evt);
      this.totalEvents++;

      if (validation.isValid && this.circuitBreakerState !== "OPEN") {
        validInBatch++;
        this.validEvents++;
      } else {
        invalidInBatch++;
        this.invalidEvents++;
        if (validation.errorType === "NULL_VALUE") nullsInBatch++;

        // Add to DLQ (keep latest 100)
        const dlqItem: DLQRecord = {
          transaction_id: evt.transaction_id,
          timestamp: evt.timestamp,
          error_type: validation.errorType || "CIRCUIT_BREAKER_ISOLATION",
          failed_rule: validation.failedRule || "Circuit Breaker Stream Isolation",
          error_message: validation.errorMsg || "Record diverted to quarantine due to OPEN circuit breaker",
          pipeline_stage: "flink-validation",
          incident_id: this.incidents.length > 0 ? this.incidents[0].incident_id : undefined,
          status: "QUARANTINED",
          original_payload: evt
        };
        this.dlqRecords.unshift(dlqItem);
        if (this.dlqRecords.length > 100) this.dlqRecords.pop();
      }
    }

    // Update sliding window
    this.slidingWindow.push({
      valid: validInBatch,
      invalid: invalidInBatch,
      nulls: nullsInBatch,
      timestamp: Date.now()
    });
    if (this.slidingWindow.length > 40) {
      this.slidingWindow.shift();
    }

    // Compute rolling error rate
    const totalInWindow = this.slidingWindow.reduce((acc, w) => acc + w.valid + w.invalid, 0);
    const invalidInWindow = this.slidingWindow.reduce((acc, w) => acc + w.invalid, 0);
    this.currentErrorRate = totalInWindow > 0 ? parseFloat(((invalidInWindow / totalInWindow) * 100).toFixed(2)) : 0;
    this.processingLatencyMs = parseFloat((45 + Math.random() * 25 + (this.circuitBreakerState === "OPEN" ? 40 : 0)).toFixed(1));

    // Circuit Breaker State Transitions
    this.evaluateCircuitBreaker();

    // Broadcast updated metrics
    this.broadcast({
      event: "METRICS_UPDATE",
      data: {
        events_per_sec: this.eventsPerSec,
        total_events: this.totalEvents,
        valid_events: this.validEvents,
        invalid_events: this.invalidEvents,
        current_error_rate: this.currentErrorRate,
        processing_latency_ms: this.processingLatencyMs,
        dlq_records_count: this.dlqRecords.length,
        circuit_breaker_status: this.circuitBreakerState,
        active_incidents_count: this.incidents.filter(i => i.remediation_state !== "RESUMED").length,
        timestamp: Date.now()
      }
    });
  }

  private evaluateCircuitBreaker() {
    const errorFraction = this.currentErrorRate / 100.0;

    if (this.circuitBreakerState === "CLOSED") {
      if (errorFraction > this.errorThreshold && this.slidingWindow.length >= 8) {
        this.circuitBreakerState = "OPEN";
        this.lastStateChangeTime = Date.now();
        this.addEventLog("CRITICAL", "data-quality-engine", `Error rate ${this.currentErrorRate}% exceeded 2.0% threshold!`);
        this.addEventLog("ALERT", "circuit-breaker", "CIRCUIT BREAKER OPENED: Halting ingestion into Iceberg main table");
        this.createIncidentAndStartRemediation();
      }
    } else if (this.circuitBreakerState === "OPEN") {
      // After 10s of being OPEN, attempt transition to HALF_OPEN
      if (Date.now() - this.lastStateChangeTime > 10000) {
        this.circuitBreakerState = "HALF_OPEN";
        this.lastStateChangeTime = Date.now();
        this.halfOpenSamplesCount = 0;
        this.addEventLog("INFO", "circuit-breaker", "Circuit breaker transitioning to HALF_OPEN: testing sample recovery batches");
      }
    } else if (this.circuitBreakerState === "HALF_OPEN") {
      this.halfOpenSamplesCount++;
      if (this.halfOpenSamplesCount >= 12) {
        if (errorFraction <= this.errorThreshold) {
          this.circuitBreakerState = "CLOSED";
          this.lastStateChangeTime = Date.now();
          this.addEventLog("SUCCESS", "circuit-breaker", "Sample validation successful. CIRCUIT BREAKER RESTORED TO CLOSED.");
          this.addEventLog("INFO", "iceberg-rest", "Resumed normal streaming commits to ecommerce.checkout_events");
          // Commit a snapshot
          this.commitIcebergSnapshot("OVERWRITE", "Remediated backfill commit and circuit close");
        } else {
          this.circuitBreakerState = "OPEN";
          this.lastStateChangeTime = Date.now();
          this.addEventLog("WARN", "circuit-breaker", "Sample testing failed SLA criteria; re-opening circuit breaker");
        }
      }
    }
  }

  public createIncidentAndStartRemediation() {
    if (this.autoRemediating) return;
    this.autoRemediating = true;

    const incId = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 899 + 100))}`;
    const newIncident: Incident = {
      incident_id: incId,
      detected_at: new Date().toISOString(),
      severity: "CRITICAL",
      root_cause: this.forceMode === "NULL_INJECTION" 
        ? "Unexpected NULL values in total_amount telemetry" 
        : (this.forceMode === "SCHEMA_DRIFT" 
          ? "Upstream schema drift: unexpected debug trace columns" 
          : "Elevated transaction math anomalies exceeding 2.0% SLA threshold"),
      affected_node: "Data Quality Engine",
      error_rate: this.currentErrorRate,
      threshold: 2.0,
      records_affected: Math.floor(Math.random() * 3000 + 1200),
      circuit_breaker_state: "OPEN",
      remediation_state: "DETECTED",
      audit_trail: [
        { time: new Date().toLocaleTimeString(), event: `Incident detected with ${this.currentErrorRate}% error rate` },
        { time: new Date().toLocaleTimeString(), event: "Circuit breaker tripped to OPEN" }
      ]
    };
    this.incidents.unshift(newIncident);

    const wfId = `REM-WF-${String(Math.floor(Math.random() * 899 + 100))}`;
    const workflow: RemediationWorkflow = {
      workflow_id: wfId,
      incident_id: incId,
      status: "RUNNING",
      started_at: new Date().toISOString(),
      stages: [
        { stage: "Anomaly Detected", status: "COMPLETED", timestamp: new Date().toLocaleTimeString(), duration_ms: 110, details: `Error rate ${this.currentErrorRate}% exceeded 2.0% threshold` },
        { stage: "Circuit Opened", status: "COMPLETED", timestamp: new Date().toLocaleTimeString(), duration_ms: 45, details: "Main Iceberg lakehouse isolated" },
        { stage: "Bad Data Quarantined", status: "IN_PROGRESS", timestamp: new Date().toLocaleTimeString(), duration_ms: 0, details: "Diverting corrupted records to checkout_events_dlq" },
        { stage: "Source Re-fetch", status: "PENDING", timestamp: "-", duration_ms: 0, details: "Idempotent backfill from payment gateway API" },
        { stage: "Data Validation", status: "PENDING", timestamp: "-", duration_ms: 0, details: "Great Expectations ruleset verification" },
        { stage: "Sample Test", status: "PENDING", timestamp: "-", duration_ms: 0, details: "HALF_OPEN canary batch validation" },
        { stage: "Pipeline Resumed", status: "PENDING", timestamp: "-", duration_ms: 0, details: "Circuit closed, regular ingestion restored" }
      ]
    };
    this.remediationWorkflows.unshift(workflow);

    this.broadcast({ event: "INCIDENT_CREATED", incident: newIncident, workflow });

    // Step through automated recovery
    setTimeout(() => {
      workflow.stages[2].status = "COMPLETED";
      workflow.stages[2].duration_ms = 240;
      workflow.stages[3].status = "IN_PROGRESS";
      workflow.stages[3].timestamp = new Date().toLocaleTimeString();
      newIncident.remediation_state = "REMEDIATING";
      newIncident.audit_trail.push({ time: new Date().toLocaleTimeString(), event: "Quarantining completed; initiating source re-fetch" });
      this.addEventLog("INFO", "remediation-engine", "Initiating upstream re-fetch for corrupted checkout records");
      this.broadcast({ event: "REMEDIATION_UPDATE", workflow, incident: newIncident });
    }, 2000);

    setTimeout(() => {
      workflow.stages[3].status = "COMPLETED";
      workflow.stages[3].duration_ms = 1250;
      workflow.stages[4].status = "IN_PROGRESS";
      workflow.stages[4].timestamp = new Date().toLocaleTimeString();
      newIncident.remediation_state = "VALIDATING";
      newIncident.audit_trail.push({ time: new Date().toLocaleTimeString(), event: "Source re-fetch complete; running validation checks" });
      this.addEventLog("INFO", "quality-engine", "Executing Great Expectations validation on re-fetched batch");
      this.broadcast({ event: "REMEDIATION_UPDATE", workflow, incident: newIncident });
    }, 4500);

    setTimeout(() => {
      workflow.stages[4].status = "COMPLETED";
      workflow.stages[4].duration_ms = 780;
      workflow.stages[5].status = "IN_PROGRESS";
      workflow.stages[5].timestamp = new Date().toLocaleTimeString();
      newIncident.circuit_breaker_state = "HALF_OPEN";
      newIncident.audit_trail.push({ time: new Date().toLocaleTimeString(), event: "Validation passed 100%; canary testing in HALF_OPEN" });
      this.forceMode = "NORMAL";
      this.nullRate = 0.01;
      this.anomalyRate = 0.01;
      this.schemaDriftRate = 0.005;
      this.broadcast({ event: "REMEDIATION_UPDATE", workflow, incident: newIncident });
    }, 7000);

    setTimeout(() => {
      workflow.stages[5].status = "COMPLETED";
      workflow.stages[5].duration_ms = 420;
      workflow.stages[6].status = "COMPLETED";
      workflow.stages[6].timestamp = new Date().toLocaleTimeString();
      workflow.stages[6].duration_ms = 95;
      workflow.status = "COMPLETED";
      newIncident.remediation_state = "RESUMED";
      newIncident.circuit_breaker_state = "CLOSED";
      newIncident.resolution_time_sec = 8.5;
      newIncident.audit_trail.push({ time: new Date().toLocaleTimeString(), event: "Sample test passed; pipeline fully resumed" });
      this.autoRemediating = false;
      this.broadcast({ event: "REMEDIATION_UPDATE", workflow, incident: newIncident });
    }, 9500);
  }

  public commitIcebergSnapshot(operation: "APPEND" | "OVERWRITE" | "DELETE", summary: string) {
    const lastSnap = this.icebergSnapshots[this.icebergSnapshots.length - 1];
    const newSnapId = `snap-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const added = operation === "OVERWRITE" ? 8412 : Math.floor(Math.random() * 5000 + 2000);
    const newSnapshot: IcebergSnapshot = {
      snapshot_id: newSnapId,
      parent_id: lastSnap ? lastSnap.snapshot_id : null,
      timestamp: new Date().toISOString(),
      operation,
      records_added: added,
      records_deleted: 0,
      total_records: (lastSnap ? lastSnap.total_records : 0) + added,
      manifest_list: `s3://lakehouse/warehouse/ecommerce/checkout_events/metadata/${newSnapId}.avro`,
      summary_description: summary
    };
    this.icebergSnapshots.push(newSnapshot);
    if (this.icebergSnapshots.length > 25) this.icebergSnapshots.shift();
    this.broadcast({ event: "ICEBERG_SNAPSHOT_COMMITTED", snapshot: newSnapshot });
  }
}

// -------------------------------------------------------------
// Initialize Express & Server
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = 3000;
  const engine = new LakehouseEngine();

  // Periodic processing loop (every 250ms)
  setInterval(() => {
    engine.tick();
  }, 250);

  app.use(express.json());

  // -----------------------------------------------------------
  // API Routes
  // -----------------------------------------------------------
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: Date.now(),
      uptime_seconds: process.uptime(),
      version: "1.0.0"
    });
  });

  app.get("/api/pipeline/status", (req: Request, res: Response) => {
    const isDegraded = engine.circuitBreakerState === "OPEN";
    const isWarning = engine.circuitBreakerState === "HALF_OPEN" || engine.currentErrorRate > 1.5;

    res.json({
      generator: engine.isRunning ? "HEALTHY" : "PAUSED",
      kafka: "HEALTHY",
      flink: isDegraded ? "CRITICAL" : (isWarning ? "WARNING" : "HEALTHY"),
      quality_engine: isDegraded ? "CRITICAL" : (isWarning ? "WARNING" : "HEALTHY"),
      iceberg: isDegraded ? "PAUSED" : "HEALTHY",
      circuit_breaker: engine.circuitBreakerState,
      remediation: engine.incidents.some(i => i.remediation_state !== "RESUMED") ? "RECOVERING" : "HEALTHY",
      timestamp: Date.now()
    });
  });

  app.get("/api/metrics", (req: Request, res: Response) => {
    res.json({
      events_per_sec: engine.eventsPerSec,
      total_events: engine.totalEvents,
      valid_events: engine.validEvents,
      invalid_events: engine.invalidEvents,
      current_error_rate: engine.currentErrorRate,
      processing_latency_ms: engine.processingLatencyMs,
      dlq_records_count: engine.dlqRecords.length,
      circuit_breaker_status: engine.circuitBreakerState,
      active_incidents_count: engine.incidents.filter(i => i.remediation_state !== "RESUMED").length,
      timestamp: Date.now()
    });
  });

  app.get("/api/quality", (req: Request, res: Response) => {
    const errorRate = engine.currentErrorRate;
    const nullPct = engine.forceMode === "NULL_INJECTION" ? 8.2 : (engine.nullRate * 100);
    const schemaPct = engine.forceMode === "SCHEMA_DRIFT" ? 7.4 : (engine.schemaDriftRate * 100);
    const mathPct = engine.forceMode === "INVALID_AMOUNTS" ? 8.5 : 0.2;

    const rules = [
      { id: "RULE-01", name: "Required Fields", status: nullPct >= 5 ? "CRITICAL" : (nullPct >= 2 ? "WARNING" : "PASS"), failure_rate: nullPct },
      { id: "RULE-02", name: "Positive Amounts", status: mathPct >= 5 ? "CRITICAL" : "PASS", failure_rate: mathPct },
      { id: "RULE-03", name: "Payment Status", status: "PASS", failure_rate: 0.0 },
      { id: "RULE-04", name: "Currency Validation", status: "PASS", failure_rate: 0.0 },
      { id: "RULE-05", name: "Transaction Consistency", status: mathPct >= 5 ? "CRITICAL" : "PASS", failure_rate: mathPct },
      { id: "RULE-06", name: "Schema Validation", status: schemaPct >= 5 ? "CRITICAL" : (schemaPct >= 1 ? "WARNING" : "PASS"), failure_rate: schemaPct },
      { id: "RULE-07", name: "Null Anomaly Rate", status: nullPct >= 5 ? "CRITICAL" : (nullPct >= 2 ? "WARNING" : "PASS"), failure_rate: nullPct }
    ];

    const qualityScore = Math.max(0, parseFloat((100 - errorRate).toFixed(2)));

    res.json({
      quality_score: qualityScore,
      rules,
      timestamp: Date.now()
    });
  });

  app.get("/api/incidents", (req: Request, res: Response) => {
    res.json(engine.incidents);
  });

  app.get("/api/incidents/:incident_id", (req: Request, res: Response) => {
    const inc = engine.incidents.find(i => i.incident_id === req.params.incident_id);
    if (!inc) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(inc);
  });

  app.get("/api/dlq", (req: Request, res: Response) => {
    const { error_type, status, incident_id } = req.query;
    let filtered = engine.dlqRecords;

    if (error_type && typeof error_type === "string") {
      filtered = filtered.filter(r => r.error_type.toLowerCase() === error_type.toLowerCase());
    }
    if (status && typeof status === "string") {
      filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (incident_id && typeof incident_id === "string") {
      filtered = filtered.filter(r => r.incident_id === incident_id);
    }

    res.json(filtered);
  });

  app.get("/api/remediation", (req: Request, res: Response) => {
    res.json(engine.remediationWorkflows);
  });

  app.get("/api/pipeline/events", (req: Request, res: Response) => {
    res.json(engine.eventLogs);
  });

  app.get("/api/iceberg/snapshots", (req: Request, res: Response) => {
    res.json(engine.icebergSnapshots);
  });

  app.get("/api/iceberg/table/:name", (req: Request, res: Response) => {
    const name = req.params.name;
    res.json({
      table_name: `ecommerce.${name}`,
      catalog: "iceberg-rest",
      location: `s3://lakehouse/warehouse/ecommerce/${name}`,
      format: "PARQUET",
      current_snapshot_id: engine.icebergSnapshots[engine.icebergSnapshots.length - 1]?.snapshot_id,
      total_snapshots: engine.icebergSnapshots.length,
      record_count: name.includes("dlq") ? engine.dlqRecords.length : engine.validEvents
    });
  });

  app.get("/api/iceberg/time-travel", (req: Request, res: Response) => {
    const { snapshot_id, preset } = req.query;
    let target = engine.icebergSnapshots[engine.icebergSnapshots.length - 1];

    if (preset === "before_incident" && engine.icebergSnapshots.length >= 2) {
      target = engine.icebergSnapshots[1];
    } else if (preset === "after_recovery" && engine.icebergSnapshots.length >= 3) {
      target = engine.icebergSnapshots[2];
    } else if (preset === "previous" && engine.icebergSnapshots.length >= 2) {
      target = engine.icebergSnapshots[engine.icebergSnapshots.length - 2];
    } else if (snapshot_id && typeof snapshot_id === "string") {
      const match = engine.icebergSnapshots.find(s => s.snapshot_id === snapshot_id);
      if (match) target = match;
    }

    res.json({
      query_target: "ecommerce.checkout_events",
      snapshot_id: target.snapshot_id,
      parent_id: target.parent_id,
      timestamp: target.timestamp,
      operation: target.operation,
      total_records: target.total_records,
      valid_records: Math.floor(target.total_records * 0.985),
      invalid_records: Math.floor(target.total_records * 0.015),
      manifest_path: target.manifest_list,
      summary_description: target.summary_description,
      sample_records: [
        {
          transaction_id: "TXN-0010891",
          timestamp: target.timestamp,
          customer_id: "CUS-7781",
          product_id: "PROD-201",
          quantity: 2,
          unit_price: 549.00,
          total_amount: 1098.00,
          currency: "INR",
          payment_status: "SUCCESS",
          region: "HYDERABAD"
        },
        {
          transaction_id: "TXN-0010892",
          timestamp: target.timestamp,
          customer_id: "CUS-3920",
          product_id: "PROD-409",
          quantity: 1,
          unit_price: 2499.00,
          total_amount: 2499.00,
          currency: "INR",
          payment_status: "SUCCESS",
          region: "BANGALORE"
        },
        {
          transaction_id: "TXN-0010893",
          timestamp: target.timestamp,
          customer_id: "CUS-6014",
          product_id: "PROD-811",
          quantity: 3,
          unit_price: 350.00,
          total_amount: 1050.00,
          currency: "USD",
          payment_status: "SUCCESS",
          region: "MUMBAI"
        }
      ]
    });
  });

  // Chaos / Simulation Controls
  app.get("/api/simulation/config", (req: Request, res: Response) => {
    res.json({
      is_running: engine.isRunning,
      events_per_second: engine.eventsPerSec,
      anomaly_rate: engine.anomalyRate,
      null_rate: engine.nullRate,
      schema_drift_rate: engine.schemaDriftRate,
      force_mode: engine.forceMode,
      circuit_breaker_status: engine.circuitBreakerState
    });
  });

  app.post("/api/simulation/config", (req: Request, res: Response) => {
    const { events_per_second, anomaly_rate, null_rate, schema_drift_rate } = req.body;
    if (typeof events_per_second === "number") engine.eventsPerSec = Math.max(10, Math.min(1000, events_per_second));
    if (typeof anomaly_rate === "number") engine.anomalyRate = Math.max(0, Math.min(1, anomaly_rate));
    if (typeof null_rate === "number") engine.nullRate = Math.max(0, Math.min(1, null_rate));
    if (typeof schema_drift_rate === "number") engine.schemaDriftRate = Math.max(0, Math.min(1, schema_drift_rate));

    engine.addEventLog("INFO", "simulation-control", `Config updated: EPS=${engine.eventsPerSec}, AnomalyRate=${engine.anomalyRate}`);
    res.json({ status: "updated", config: { events_per_second: engine.eventsPerSec, anomaly_rate: engine.anomalyRate, null_rate: engine.nullRate, schema_drift_rate: engine.schemaDriftRate } });
  });

  app.post("/api/simulation/start", (req: Request, res: Response) => {
    engine.isRunning = true;
    engine.addEventLog("INFO", "transaction-generator", "Generator RESUMED by user");
    res.json({ status: "started" });
  });

  app.post("/api/simulation/stop", (req: Request, res: Response) => {
    engine.isRunning = false;
    engine.addEventLog("WARN", "transaction-generator", "Generator PAUSED by user");
    res.json({ status: "stopped" });
  });

  app.post("/api/simulation/anomaly/null", (req: Request, res: Response) => {
    engine.forceMode = "NULL_INJECTION";
    engine.nullRate = 0.09;
    engine.addEventLog("WARN", "simulation-control", "Injecting NULL values into total_amount field (rate: 9%)");
    res.json({ status: "null_anomaly_injected", null_rate: 0.09 });
  });

  app.post("/api/simulation/anomaly/schema_drift", (req: Request, res: Response) => {
    engine.forceMode = "SCHEMA_DRIFT";
    engine.schemaDriftRate = 0.08;
    engine.addEventLog("WARN", "simulation-control", "Injecting schema drift: __debug_trace_v2 unexpected column");
    res.json({ status: "schema_drift_injected", schema_drift_rate: 0.08 });
  });

  app.post("/api/simulation/anomaly/invalid_amounts", (req: Request, res: Response) => {
    engine.forceMode = "INVALID_AMOUNTS";
    engine.anomalyRate = 0.09;
    engine.addEventLog("WARN", "simulation-control", "Injecting invalid totals & mathematical inconsistencies");
    res.json({ status: "invalid_amounts_injected", anomaly_rate: 0.09 });
  });

  app.post("/api/simulation/anomaly/high_error_rate", (req: Request, res: Response) => {
    engine.forceMode = "HIGH_ERROR_RATE";
    engine.anomalyRate = 0.15;
    engine.nullRate = 0.10;
    engine.addEventLog("CRITICAL", "simulation-control", "Injecting HIGH ERROR RATE chaos scenario (>20% corrupt data)");
    res.json({ status: "high_error_rate_injected" });
  });

  app.post("/api/simulation/circuit_breaker/trigger", (req: Request, res: Response) => {
    engine.circuitBreakerState = "OPEN";
    engine.lastStateChangeTime = Date.now();
    engine.addEventLog("ALERT", "simulation-control", "Manual override: CIRCUIT BREAKER OPENED");
    engine.createIncidentAndStartRemediation();
    res.json({ status: "circuit_breaker_opened", state: "OPEN" });
  });

  app.post("/api/simulation/circuit_breaker/reset", (req: Request, res: Response) => {
    engine.circuitBreakerState = "CLOSED";
    engine.forceMode = "NORMAL";
    engine.nullRate = 0.01;
    engine.anomalyRate = 0.01;
    engine.schemaDriftRate = 0.005;
    engine.addEventLog("SUCCESS", "simulation-control", "Manual reset: CIRCUIT BREAKER CLOSED and normal mode restored");
    res.json({ status: "circuit_breaker_closed", state: "CLOSED" });
  });

  app.post("/api/simulation/remediation/trigger", (req: Request, res: Response) => {
    engine.createIncidentAndStartRemediation();
    res.json({ status: "remediation_triggered" });
  });

  // -----------------------------------------------------------
  // Vite Integration for Client-Side SPA
  // -----------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // HTTP and WebSocket Server Creation
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/ws" || pathname.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws) => {
    engine.registerWebSocketClient(ws);
    ws.send(JSON.stringify({
      event: "CONNECTED",
      timestamp: Date.now(),
      message: "Connected to IceStream Real-Time Lakehouse Telemetry Stream"
    }));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(` IceStream Platform Server running at http://0.0.0.0:${PORT}`);
    console.log(` WebSocket Stream available at ws://0.0.0.0:${PORT}/ws`);
    console.log(` REST API available at http://0.0.0.0:${PORT}/api`);
    console.log(`====================================================`);
  });
}

startServer();
