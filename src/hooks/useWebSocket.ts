import { useState, useEffect, useRef, useCallback } from "react";
import { MetricData, EventLog, Incident, RemediationWorkflow, IcebergSnapshot } from "../types";

export interface WebSocketState {
  isConnected: boolean;
  lastMessage: any;
  liveMetrics: MetricData | null;
  recentLogs: EventLog[];
  activeIncident: Incident | null;
  activeWorkflow: RemediationWorkflow | null;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<MetricData | null>(null);
  const [recentLogs, setRecentLogs] = useState<EventLog[]>([]);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<RemediationWorkflow | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<IcebergSnapshot | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "METRICS_UPDATE") {
            setLiveMetrics(payload.data);
          } else if (payload.event === "LOG_EMITTED") {
            setRecentLogs((prev) => [payload.log, ...prev.slice(0, 100)]);
          } else if (payload.event === "INCIDENT_CREATED") {
            setActiveIncident(payload.incident);
            setActiveWorkflow(payload.workflow);
          } else if (payload.event === "REMEDIATION_UPDATE") {
            setActiveWorkflow(payload.workflow);
            if (payload.incident) setActiveIncident(payload.incident);
          } else if (payload.event === "ICEBERG_SNAPSHOT_COMMITTED") {
            setLatestSnapshot(payload.snapshot);
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return {
    isConnected,
    liveMetrics,
    recentLogs,
    activeIncident,
    activeWorkflow,
    latestSnapshot
  };
}
