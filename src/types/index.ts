export type NodeStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "PAUSED" | "RECOVERING";

export interface PipelineHealthStatus {
  generator: NodeStatus;
  kafka: NodeStatus;
  flink: NodeStatus;
  quality_engine: NodeStatus;
  iceberg: NodeStatus;
  circuit_breaker: "CLOSED" | "OPEN" | "HALF_OPEN";
  remediation?: NodeStatus;
  timestamp: number;
}

export interface MetricData {
  events_per_sec: number;
  total_events: number;
  valid_events: number;
  invalid_events: number;
  current_error_rate: number;
  processing_latency_ms: number;
  dlq_records_count: number;
  circuit_breaker_status: "CLOSED" | "OPEN" | "HALF_OPEN";
  active_incidents_count: number;
  timestamp: number;
}

export interface QualityRule {
  id: string;
  name: string;
  status: "PASS" | "WARNING" | "CRITICAL";
  failure_rate: number;
}

export interface QualitySummary {
  quality_score: number;
  rules: QualityRule[];
  timestamp: number;
}

export interface DLQRecord {
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

export interface Incident {
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

export interface RemediationStage {
  stage: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  timestamp: string;
  duration_ms: number;
  details: string;
}

export interface RemediationWorkflow {
  workflow_id: string;
  incident_id: string;
  status: "COMPLETED" | "RUNNING" | "FAILED";
  started_at: string;
  stages: RemediationStage[];
}

export interface IcebergSnapshot {
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

export interface TimeTravelResult {
  query_target: string;
  snapshot_id: string;
  parent_id: string | null;
  timestamp: string;
  operation: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  manifest_path: string;
  summary_description: string;
  sample_records: any[];
}

export interface EventLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "CRITICAL" | "ALERT" | "SUCCESS";
  source: string;
  message: string;
}

export interface SimulationConfig {
  is_running: boolean;
  events_per_second: number;
  anomaly_rate: number;
  null_rate: number;
  schema_drift_rate: number;
  force_mode: string;
  circuit_breaker_status: string;
}
