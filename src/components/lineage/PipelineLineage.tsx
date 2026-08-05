import React, { useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  Handle
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Inbox,
  RefreshCw,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Info
} from "lucide-react";
import { PipelineHealthStatus, MetricData } from "../../types";

interface PipelineLineageProps {
  pipelineStatus: PipelineHealthStatus | null;
  metrics: MetricData | null;
  onNavigate: (tab: any) => void;
}

// Custom Node Component with Jet Black & Icy Blue palette
const CustomPipelineNode = ({ data }: { data: any }) => {
  const status = data.status || "HEALTHY";
  const isSelected = data.isSelected;

  const statusConfig = {
    HEALTHY: {
      border: "border-[#10B981]/60",
      bg: "bg-[#0B111E]",
      badgeBg: "bg-[#06241B] text-[#34D399] border-[#10B981]/50",
      icon: CheckCircle2
    },
    WARNING: {
      border: "border-[#F59E0B]/60",
      bg: "bg-[#0B111E]",
      badgeBg: "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50",
      icon: AlertTriangle
    },
    CRITICAL: {
      border: "border-[#FB7185]/70",
      bg: "bg-[#2D0D12]",
      badgeBg: "bg-[#05080E] text-[#FB7185] border-[#FB7185]/60",
      icon: XCircle
    },
    PAUSED: {
      border: "border-[#475569]/60",
      bg: "bg-[#090E17]",
      badgeBg: "bg-[#1E293B] text-[#94A3B8] border-[#475569]/50",
      icon: Info
    },
    RECOVERING: {
      border: "border-[#00F0FF]/60",
      bg: "bg-[#0B111E]",
      badgeBg: "bg-[#082F49] text-[#67E8F9] border-[#00F0FF]/50",
      icon: RefreshCw
    }
  }[status as keyof typeof statusConfig] || {
    border: "border-[#162032]",
    bg: "bg-[#0B111E]",
    badgeBg: "bg-[#090E17] text-[#94A3B8] border-[#162032]",
    icon: Info
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`px-4 py-3 rounded-2xl border-2 ${statusConfig.border} ${statusConfig.bg} shadow-[0_4px_20px_rgba(0,0,0,0.6)] w-64 transition-all ${
        isSelected ? "ring-2 ring-[#00F0FF] ring-offset-2 ring-offset-[#05080E] shadow-[0_0_20px_rgba(0,240,255,0.3)]" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-[#00F0FF] border-2 border-[#05080E]" />
      
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#0F172A] text-[#38BDF8] border border-[#162032]">
            {data.icon}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F0F9FF] tracking-tight">{data.label}</h4>
            <p className="text-[10px] text-[#7DD3FC]/70 font-mono">{data.subLabel}</p>
          </div>
        </div>

        <span className={`text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border ${statusConfig.badgeBg} flex items-center gap-1`}>
          <StatusIcon className="w-2.5 h-2.5" />
          {status}
        </span>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#162032] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
        <span>{data.metricLabel}:</span>
        <span className="text-[#00F0FF] font-bold">{data.metricValue}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-[#00F0FF] border-2 border-[#05080E]" />
    </div>
  );
};

export const PipelineLineage: React.FC<PipelineLineageProps> = ({
  pipelineStatus,
  metrics,
  onNavigate
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>("quality_engine");

  const nodeTypes = useMemo(() => ({ custom: CustomPipelineNode }), []);

  const circuitState = metrics?.circuit_breaker_status || "CLOSED";
  const isBreakerOpen = circuitState === "OPEN";

  // Build DAG Nodes based on live state
  const nodes: Node[] = useMemo(() => {
    return [
      {
        id: "generator",
        type: "custom",
        position: { x: 300, y: 30 },
        data: {
          label: "Transaction Generator",
          subLabel: "Python Microservice",
          status: pipelineStatus?.generator || "HEALTHY",
          metricLabel: "Traffic Out",
          metricValue: `${metrics?.events_per_sec || 250} eps`,
          icon: <Activity className="w-4 h-4 text-[#38BDF8]" />,
          isSelected: selectedNode === "generator",
          description: "Generates realistic e-commerce checkout telemetry events with controllable chaos injectors."
        }
      },
      {
        id: "kafka",
        type: "custom",
        position: { x: 300, y: 150 },
        data: {
          label: "Apache Kafka",
          subLabel: "checkout-events",
          status: pipelineStatus?.kafka || "HEALTHY",
          metricLabel: "Partitions / Lag",
          metricValue: "3 / 0 ms",
          icon: <Server className="w-4 h-4 text-[#67E8F9]" />,
          isSelected: selectedNode === "kafka",
          description: "KRaft cluster maintaining high-throughput ingestion topics and consumer groups."
        }
      },
      {
        id: "flink",
        type: "custom",
        position: { x: 300, y: 270 },
        data: {
          label: "Apache Flink",
          subLabel: "Stream Processor",
          status: pipelineStatus?.flink || (isBreakerOpen ? "CRITICAL" : "HEALTHY"),
          metricLabel: "Checkpoints",
          metricValue: `${metrics?.processing_latency_ms || 48} ms`,
          icon: <Zap className="w-4 h-4 text-[#00F0FF]" />,
          isSelected: selectedNode === "flink",
          description: "Real-time streaming pipeline validating schema, deserializing JSON, and enforcing circuit breaker routing."
        }
      },
      {
        id: "quality_engine",
        type: "custom",
        position: { x: 140, y: 400 },
        data: {
          label: "Data Quality Engine",
          subLabel: "Great Expectations Rules",
          status: pipelineStatus?.quality_engine || (isBreakerOpen ? "CRITICAL" : "HEALTHY"),
          metricLabel: "Error Rate",
          metricValue: `${metrics?.current_error_rate || 0}%`,
          icon: <CheckCircle2 className="w-4 h-4 text-[#34D399]" />,
          isSelected: selectedNode === "quality_engine",
          description: "Continuous rolling 60s window evaluator executing 7 validation rules against every record."
        }
      },
      {
        id: "circuit_breaker",
        type: "custom",
        position: { x: 460, y: 400 },
        data: {
          label: "Circuit Breaker",
          subLabel: "State Machine",
          status: circuitState === "CLOSED" ? "HEALTHY" : (circuitState === "HALF_OPEN" ? "WARNING" : "CRITICAL"),
          metricLabel: "State / SLA",
          metricValue: `${circuitState} (<2%)`,
          icon: circuitState === "CLOSED" ? <ShieldCheck className="w-4 h-4 text-[#34D399]" /> : <ShieldAlert className="w-4 h-4 text-[#FB7185]" />,
          isSelected: selectedNode === "circuit_breaker",
          description: "Safety switch that automatically isolates downstream lakehouse storage when anomaly rates exceed 2%."
        }
      },
      {
        id: "iceberg_main",
        type: "custom",
        position: { x: 140, y: 540 },
        data: {
          label: "Apache Iceberg",
          subLabel: "ecommerce.checkout_events",
          status: isBreakerOpen ? "PAUSED" : "HEALTHY",
          metricLabel: "Valid Records",
          metricValue: `${metrics?.valid_events?.toLocaleString() || 0}`,
          icon: <Database className="w-4 h-4 text-[#38BDF8]" />,
          isSelected: selectedNode === "iceberg_main",
          description: "ACID Lakehouse table on MinIO S3 object storage with snapshot commits and time-travel capability."
        }
      },
      {
        id: "dlq_quarantine",
        type: "custom",
        position: { x: 460, y: 540 },
        data: {
          label: "Dead Letter Queue (DLQ)",
          subLabel: "checkout_events_dlq",
          status: (metrics?.dlq_records_count || 0) > 0 ? "WARNING" : "HEALTHY",
          metricLabel: "Quarantined",
          metricValue: `${metrics?.dlq_records_count || 0} records`,
          icon: <Inbox className="w-4 h-4 text-[#FBBF24]" />,
          isSelected: selectedNode === "dlq_quarantine",
          description: "Quarantine table holding invalid, corrupted, or isolated transactions with full diagnostic metadata."
        }
      },
      {
        id: "analytics",
        type: "custom",
        position: { x: 140, y: 670 },
        data: {
          label: "Downstream Analytics",
          subLabel: "Trino / Superset",
          status: isBreakerOpen ? "PAUSED" : "HEALTHY",
          metricLabel: "Consumers",
          metricValue: "Active",
          icon: <BarChart3 className="w-4 h-4 text-[#7DD3FC]" />,
          isSelected: selectedNode === "analytics",
          description: "Clean analytical queries querying trusted lakehouse snapshots."
        }
      },
      {
        id: "remediation",
        type: "custom",
        position: { x: 460, y: 670 },
        data: {
          label: "Automated Remediation",
          subLabel: "Source Re-fetch & Repair",
          status: isBreakerOpen ? "RECOVERING" : "HEALTHY",
          metricLabel: "Workflow",
          metricValue: isBreakerOpen ? "In Progress" : "Standby",
          icon: <RefreshCw className="w-4 h-4 text-[#00F0FF]" />,
          isSelected: selectedNode === "remediation",
          description: "Self-healing orchestrator performing idempotent backfills, batch repair, and canary verification."
        }
      }
    ];
  }, [pipelineStatus, metrics, selectedNode, circuitState, isBreakerOpen]);

  // Edges connecting the DAG nodes with Jet Black & Icy Blue
  const edges: Edge[] = useMemo(() => {
    return [
      {
        id: "e-gen-kafka",
        source: "generator",
        target: "kafka",
        animated: true,
        style: { stroke: "#00F0FF", strokeWidth: 2 }
      },
      {
        id: "e-kafka-flink",
        source: "kafka",
        target: "flink",
        animated: true,
        style: { stroke: "#00F0FF", strokeWidth: 2 }
      },
      {
        id: "e-flink-quality",
        source: "flink",
        target: "quality_engine",
        animated: true,
        style: { stroke: "#34D399", strokeWidth: 2 }
      },
      {
        id: "e-flink-circuit",
        source: "flink",
        target: "circuit_breaker",
        animated: isBreakerOpen,
        style: { stroke: isBreakerOpen ? "#FB7185" : "#38BDF8", strokeWidth: isBreakerOpen ? 3 : 1.5 }
      },
      {
        id: "e-quality-iceberg",
        source: "quality_engine",
        target: "iceberg_main",
        animated: !isBreakerOpen,
        style: { stroke: isBreakerOpen ? "#475569" : "#38BDF8", strokeWidth: 2, strokeDasharray: isBreakerOpen ? "5,5" : undefined }
      },
      {
        id: "e-circuit-dlq",
        source: "circuit_breaker",
        target: "dlq_quarantine",
        animated: isBreakerOpen,
        style: { stroke: isBreakerOpen ? "#FB7185" : "#F59E0B", strokeWidth: 2 }
      },
      {
        id: "e-iceberg-analytics",
        source: "iceberg_main",
        target: "analytics",
        animated: !isBreakerOpen,
        style: { stroke: isBreakerOpen ? "#475569" : "#67E8F9", strokeWidth: 2 }
      },
      {
        id: "e-dlq-remediation",
        source: "dlq_quarantine",
        target: "remediation",
        animated: isBreakerOpen,
        style: { stroke: "#00F0FF", strokeWidth: 2 }
      }
    ];
  }, [isBreakerOpen]);

  const activeNodeData = nodes.find(n => n.id === selectedNode)?.data;

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Data Pipeline Lineage DAG</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Real-time interactive topology mapping event streams from Generator → Kafka → Flink → Quality Engine → Iceberg &amp; DLQ
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8] bg-[#0B111E] px-4 py-2 rounded-full border border-[#162032] shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Healthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block shadow-[0_0_6px_rgba(245,158,11,0.8)]" /> Warning</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FB7185] inline-block animate-pulse shadow-[0_0_6px_rgba(251,113,133,0.8)]" /> Critical</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#64748B] inline-block" /> Paused</span>
        </div>
      </div>

      {/* Main Flow Canvas & Inspector Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* React Flow Graph Area */}
        <div className="xl:col-span-3 h-[680px] rounded-3xl border border-[#162032] bg-[#05080E] overflow-hidden relative shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node.id)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
          >
            <Background color="#162032" gap={20} size={1} />
            <Controls className="bg-[#0B111E] border-[#162032] text-[#38BDF8] fill-[#38BDF8]" />
            <MiniMap 
              nodeColor={(n) => {
                if (n.data?.status === "CRITICAL") return "#FB7185";
                if (n.data?.status === "WARNING") return "#F59E0B";
                if (n.data?.status === "HEALTHY") return "#10B981";
                return "#64748B";
              }}
              maskColor="rgba(5, 8, 14, 0.8)"
              className="bg-[#0B111E] border-[#162032] rounded-xl overflow-hidden shadow-lg"
            />
          </ReactFlow>
        </div>

        {/* Node Detail & Telemetry Inspector */}
        <div className="xl:col-span-1 rounded-3xl border border-[#162032] bg-[#0B111E] p-6 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="space-y-4">
            <div className="border-b border-[#162032] pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#38BDF8] font-bold">
                Node Inspector
              </span>
              <h3 className="text-base font-bold text-[#F0F9FF] mt-1 font-mono">{activeNodeData?.label || "Select a node"}</h3>
              <p className="text-xs text-[#67E8F9] font-mono">{activeNodeData?.subLabel}</p>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {activeNodeData?.description || "Click any node in the topology graph to view real-time latency, error counts, consumer group offsets, and health diagnostics."}
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#05080E] border border-[#162032] text-xs font-mono space-y-2 shadow-inner">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Current State:</span>
                  <span className="font-bold text-[#F0F9FF]">{activeNodeData?.status}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Throughput / Metric:</span>
                  <span className="font-bold text-[#00F0FF]">{activeNodeData?.metricValue}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>SLA Status:</span>
                  <span className="font-bold text-[#34D399]">Compliant</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#162032] space-y-2">
            <button
              onClick={() => {
                if (selectedNode === "quality_engine") onNavigate("quality");
                else if (selectedNode === "dlq_quarantine") onNavigate("dlq");
                else if (selectedNode === "iceberg_main") onNavigate("snapshots");
                else if (selectedNode === "remediation") onNavigate("remediation");
                else onNavigate("dashboard");
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] text-xs font-mono font-black shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Dedicated View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

