import {
  PipelineHealthStatus,
  MetricData,
  QualitySummary,
  Incident,
  DLQRecord,
  RemediationWorkflow,
  IcebergSnapshot,
  TimeTravelResult,
  EventLog,
  SimulationConfig
} from "../types";

const BASE_URL = "/api";

export const api = {
  async getHealth(): Promise<{ status: string; uptime_seconds: number }> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return res.json();
  },

  async getPipelineStatus(): Promise<PipelineHealthStatus> {
    const res = await fetch(`${BASE_URL}/pipeline/status`);
    if (!res.ok) throw new Error("Failed to fetch pipeline status");
    return res.json();
  },

  async getMetrics(): Promise<MetricData> {
    const res = await fetch(`${BASE_URL}/metrics`);
    if (!res.ok) throw new Error("Failed to fetch metrics");
    return res.json();
  },

  async getQuality(): Promise<QualitySummary> {
    const res = await fetch(`${BASE_URL}/quality`);
    if (!res.ok) throw new Error("Failed to fetch quality data");
    return res.json();
  },

  async getIncidents(): Promise<Incident[]> {
    const res = await fetch(`${BASE_URL}/incidents`);
    if (!res.ok) throw new Error("Failed to fetch incidents");
    return res.json();
  },

  async getIncident(id: string): Promise<Incident> {
    const res = await fetch(`${BASE_URL}/incidents/${id}`);
    if (!res.ok) throw new Error("Failed to fetch incident");
    return res.json();
  },

  async getDLQ(params?: { error_type?: string; status?: string }): Promise<DLQRecord[]> {
    const query = new URLSearchParams();
    if (params?.error_type) query.append("error_type", params.error_type);
    if (params?.status) query.append("status", params.status);
    const res = await fetch(`${BASE_URL}/dlq?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch DLQ records");
    return res.json();
  },

  async getRemediation(): Promise<RemediationWorkflow[]> {
    const res = await fetch(`${BASE_URL}/remediation`);
    if (!res.ok) throw new Error("Failed to fetch remediation workflows");
    return res.json();
  },

  async getPipelineEvents(): Promise<EventLog[]> {
    const res = await fetch(`${BASE_URL}/pipeline/events`);
    if (!res.ok) throw new Error("Failed to fetch pipeline events");
    return res.json();
  },

  async getIcebergSnapshots(): Promise<IcebergSnapshot[]> {
    const res = await fetch(`${BASE_URL}/iceberg/snapshots`);
    if (!res.ok) throw new Error("Failed to fetch Iceberg snapshots");
    return res.json();
  },

  async getTimeTravel(params: { snapshot_id?: string; preset?: string }): Promise<TimeTravelResult> {
    const query = new URLSearchParams();
    if (params.snapshot_id) query.append("snapshot_id", params.snapshot_id);
    if (params.preset) query.append("preset", params.preset);
    const res = await fetch(`${BASE_URL}/iceberg/time-travel?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch time travel state");
    return res.json();
  },

  async getSimulationConfig(): Promise<SimulationConfig> {
    const res = await fetch(`${BASE_URL}/simulation/config`);
    if (!res.ok) throw new Error("Failed to fetch simulation config");
    return res.json();
  },

  async updateSimulationConfig(data: Partial<SimulationConfig>): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async startGenerator(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/start`, { method: "POST" });
    return res.json();
  },

  async stopGenerator(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/stop`, { method: "POST" });
    return res.json();
  },

  async injectNull(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/anomaly/null`, { method: "POST" });
    return res.json();
  },

  async injectSchemaDrift(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/anomaly/schema_drift`, { method: "POST" });
    return res.json();
  },

  async injectInvalidAmounts(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/anomaly/invalid_amounts`, { method: "POST" });
    return res.json();
  },

  async injectHighErrorRate(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/anomaly/high_error_rate`, { method: "POST" });
    return res.json();
  },

  async triggerCircuitBreaker(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/circuit_breaker/trigger`, { method: "POST" });
    return res.json();
  },

  async resetCircuitBreaker(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/circuit_breaker/reset`, { method: "POST" });
    return res.json();
  },

  async triggerRemediation(): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulation/remediation/trigger`, { method: "POST" });
    return res.json();
  }
};
