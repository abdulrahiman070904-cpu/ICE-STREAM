import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Inbox,
  ArrowUpRight,
  Layers,
  ArrowRight,
  Sparkles,
  Database,
  Radio
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { MetricData, PipelineHealthStatus, Incident } from "../../types";
import { ICESTREAM_LOGO } from "../../assets/logo";

interface HomeOverviewProps {
  metrics: MetricData | null;
  pipelineStatus: PipelineHealthStatus | null;
  activeIncident: Incident | null;
  onNavigate: (tab: any) => void;
  onInjectAnomaly: () => void;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  metrics,
  activeIncident,
  onNavigate,
  onInjectAnomaly
}) => {
  const [chartHistory, setChartHistory] = useState<any[]>([]);

  // Collect historical ticks for the live streaming charts
  useEffect(() => {
    if (!metrics) return;
    const timeLabel = new Date(metrics.timestamp).toLocaleTimeString();
    setChartHistory((prev) => {
      const updated = [
        ...prev,
        {
          time: timeLabel,
          eventsPerSec: metrics.events_per_sec,
          errorRate: metrics.current_error_rate,
          valid: metrics.valid_events % 1000,
          invalid: metrics.invalid_events % 1000,
          latency: metrics.processing_latency_ms
        }
      ];
      return updated.slice(-25); // Keep last 25 ticks
    });
  }, [metrics]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  const circuitState = metrics?.circuit_breaker_status || "CLOSED";
  const errorRate = metrics?.current_error_rate ?? 0;
  const isBreakerOpen = circuitState === "OPEN";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Stream Hero & Logo Banner */}
      <div className="relative overflow-hidden p-6 rounded-3xl border border-[#162032] bg-gradient-to-r from-[#070B14] via-[#0B1426] to-[#070B14] shadow-[0_4px_30px_rgba(0,240,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#00F0FF]/50 bg-[#0B1220] p-0.5 shadow-[0_0_25px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
            <img
              src={ICESTREAM_LOGO}
              alt="IceStream Lakehouse Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[#67E8F9]/40 pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight bg-gradient-to-r from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8] bg-clip-text text-transparent">
                IceStream Real-Time Lakehouse
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0284C7]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] font-bold font-mono shadow-[0_0_10px_rgba(0,240,255,0.25)]">
                <Radio className="w-3 h-3 text-[#00F0FF] animate-pulse" /> LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-[#7DD3FC]/80 mt-1 max-w-2xl leading-relaxed">
              Continuous validation, Flink circuit breaking, and Apache Iceberg ACID isolation across distributed Kafka telemetry partitions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate("simulation")}
            className="px-4 py-2 rounded-xl bg-[#0284C7]/20 hover:bg-[#0284C7]/35 border border-[#38BDF8]/40 text-[#67E8F9] text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.15)] cursor-pointer"
          >
            Chaos Studio
          </button>
          <button
            onClick={() => onNavigate("lineage")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] text-xs font-mono font-black shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Live DAG &rarr;
          </button>
        </div>
      </div>

      {/* Alert Banner if Circuit Breaker is OPEN or active incident */}
      {isBreakerOpen && (
        <div className="p-4 rounded-2xl border border-[#E11D48]/60 bg-[#2D0D12] text-[#FB7185] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E11D48]/20 text-[#FB7185]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-sm text-[#FB7185]">CIRCUIT BREAKER ACTIVATED (OPEN)</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#05080E] text-[#FB7185] font-mono border border-[#E11D48]/50">
                  Error Rate: {errorRate}% &gt; SLA 2.0%
                </span>
              </div>
              <p className="text-xs text-[#FB7185]/90 mt-0.5">
                Downstream ingestion to Apache Iceberg is currently isolated. Corrupted records diverted to DLQ. Automated remediation in progress.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate("remediation")}
              className="px-3.5 py-1.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <span>View Self-Healing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 8 Top-Level KPI Cards in Jet Black and Icy Blue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Events/sec */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#00F0FF]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] group">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Throughput Rate</span>
            <div className="w-8 h-8 rounded-xl bg-[#0284C7]/20 border border-[#00F0FF]/30 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <Activity className="w-4 h-4 text-[#00F0FF]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#F0F9FF] group-hover:text-[#00F0FF] transition-colors">
              {metrics ? `${metrics.events_per_sec.toLocaleString()} eps` : "-- eps"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1 font-mono">
              <span className="text-[#34D399] font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> Live
              </span>
              <span>Kafka partitions</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Total Events */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#38BDF8]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] group">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Total Ingested</span>
            <div className="w-8 h-8 rounded-xl bg-[#0E2442] border border-[#38BDF8]/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#38BDF8]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#F0F9FF]">
              {metrics ? formatNumber(metrics.total_events) : "--"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Telemetry events stream</p>
          </div>
        </div>

        {/* KPI 3: Valid Events */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#10B981]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] group">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Valid Events</span>
            <div className="w-8 h-8 rounded-xl bg-[#06241B] border border-[#10B981]/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#34D399]">
              {metrics ? formatNumber(metrics.valid_events) : "--"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Committed to Iceberg ACID</p>
          </div>
        </div>

        {/* KPI 4: Invalid Events */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#FB7185]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] group">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Invalid Events</span>
            <div className="w-8 h-8 rounded-xl bg-[#2D0D12] border border-[#FB7185]/30 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-[#FB7185]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#FB7185]">
              {metrics ? formatNumber(metrics.invalid_events) : "--"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Quarantined from lakehouse</p>
          </div>
        </div>

        {/* KPI 5: Current Error Rate */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#00F0FF]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Error Rate (SLA &lt; 2%)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${errorRate > 2 ? "bg-[#2D0D12] border border-[#FB7185]/40" : "bg-[#0B1C33] border border-[#38BDF8]/40"}`}>
              <AlertOctagon className={`w-4 h-4 ${errorRate > 2 ? "text-[#FB7185]" : "text-[#38BDF8]"}`} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${errorRate > 2 ? "text-[#FB7185]" : "text-[#00F0FF]"}`}>
              {metrics ? `${metrics.current_error_rate}%` : "--%"}
            </div>
            <div className="w-full bg-[#05080E] h-2 rounded-full mt-2 overflow-hidden border border-[#162032]">
              <div 
                className={`h-full transition-all duration-300 ${errorRate > 2 ? "bg-[#FB7185]" : "bg-gradient-to-r from-[#0284C7] to-[#00F0FF]"}`}
                style={{ width: `${Math.min(100, (errorRate / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 6: Processing Latency */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#38BDF8]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>Stream Latency</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B1C33] border border-[#38BDF8]/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#38BDF8]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#F0F9FF]">
              {metrics ? `${metrics.processing_latency_ms} ms` : "-- ms"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Kafka &rarr; Flink latency</p>
          </div>
        </div>

        {/* KPI 7: DLQ Records */}
        <div className="p-5 rounded-2xl border border-[#162032] bg-[#0B111E] hover:border-[#FBBF24]/40 transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between text-[#7DD3FC]/70 text-xs font-medium">
            <span>DLQ Records</span>
            <div className="w-8 h-8 rounded-xl bg-[#291B07] border border-[#F59E0B]/30 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-[#FBBF24]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#FBBF24]">
              {metrics ? formatNumber(metrics.dlq_records_count) : "--"}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Quarantined for replay</p>
          </div>
        </div>

        {/* KPI 8: Circuit Breaker Status */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
          circuitState === "CLOSED"
            ? "border-[#10B981]/50 bg-[#06241B]"
            : circuitState === "HALF_OPEN"
            ? "border-[#F59E0B]/50 bg-[#291B07]"
            : "border-[#FB7185]/50 bg-[#2D0D12]"
        }`}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-[#F0F9FF] font-bold font-mono">Circuit Breaker</span>
            {circuitState === "CLOSED" ? (
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#FB7185]" />
            )}
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono uppercase tracking-wide ${
              circuitState === "CLOSED" ? "text-[#34D399]" : circuitState === "HALF_OPEN" ? "text-[#FBBF24]" : "text-[#FB7185]"
            }`}>
              {circuitState}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">
              {circuitState === "CLOSED" ? "Nominal Ingestion" : circuitState === "HALF_OPEN" ? "Testing Recovery Batch" : "Main Table Isolated"}
            </p>
          </div>
        </div>
      </div>

      {/* Streaming Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Error Rate vs SLA Limit (2%) */}
        <div className="p-6 rounded-2xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Stream Error Rate vs SLA Limit</h3>
              <p className="text-xs text-[#7DD3FC]/70">Automatic Circuit Breaker trips at &gt;2.0% threshold</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#00F0FF] font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.6)] inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1.5 text-[#FB7185] font-bold">
                <span className="w-2.5 h-0.5 bg-[#FB7185] inline-block" /> 2.0% SLA
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis domain={[0, 15]} stroke="#475569" tick={{ fontSize: 10, fill: "#94A3B8" }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#070B14", borderColor: "#0284C7", borderRadius: "12px", fontSize: "12px", color: "#F0F9FF", boxShadow: "0 0 15px rgba(0,240,255,0.2)" }}
                  formatter={(val: any) => [`${val}%`, "Error Rate"]}
                />
                <ReferenceLine y={2.0} stroke="#FB7185" strokeDasharray="4 4" label={{ value: "SLA (2%)", fill: "#FB7185", fontSize: 10, position: "insideTopRight" }} />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#00F0FF"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Throughput vs Stream Latency */}
        <div className="p-6 rounded-2xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Throughput &amp; End-to-End Latency</h3>
              <p className="text-xs text-[#7DD3FC]/70">Live Flink stream ingestion latency over time</p>
            </div>
            <div className="text-xs font-mono text-[#7DD3FC]">
              Avg: <span className="text-[#00F0FF] font-bold">{metrics?.processing_latency_ms || 45}ms</span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: "#94A3B8" }} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#070B14", borderColor: "#0284C7", borderRadius: "12px", fontSize: "12px", color: "#F0F9FF", boxShadow: "0 0 15px rgba(0,240,255,0.2)" }}
                  formatter={(val: any) => [`${val} ms`, "Latency"]}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#38BDF8"
                  fillOpacity={1}
                  fill="url(#latencyGrad)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Navigation / Architectural Actions Panel */}
      <div className="p-6 rounded-2xl border border-[#162032] bg-[#0B111E] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-[#F0F9FF] font-mono">Full Real-Time Lakehouse Lineage &amp; Chaos Studio</h4>
          <p className="text-xs text-[#94A3B8]">
            Inspect live React Flow DAG node statuses, explore Great Expectations rules, perform Apache Iceberg Time-Travel, or simulate telemetry anomalies.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate("lineage")}
            className="px-4 py-2 rounded-xl bg-[#05080E] hover:bg-[#132238] text-[#E2F1FD] text-xs font-mono font-semibold border border-[#162032] hover:border-[#38BDF8]/50 transition-all cursor-pointer shadow-xs"
          >
            Explore Pipeline DAG
          </button>
          <button
            onClick={() => onNavigate("quality")}
            className="px-4 py-2 rounded-xl bg-[#05080E] hover:bg-[#132238] text-[#E2F1FD] text-xs font-mono font-semibold border border-[#162032] hover:border-[#38BDF8]/50 transition-all cursor-pointer shadow-xs"
          >
            Data Quality Rules
          </button>
          <button
            onClick={() => onNavigate("snapshots")}
            className="px-4 py-2 rounded-xl bg-[#05080E] hover:bg-[#132238] text-[#E2F1FD] text-xs font-mono font-semibold border border-[#162032] hover:border-[#38BDF8]/50 transition-all cursor-pointer shadow-xs"
          >
            Iceberg Time-Travel
          </button>
          <button
            onClick={onInjectAnomaly}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] text-xs font-mono font-black shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Chaos Injection Panel
          </button>
        </div>
      </div>
    </div>
  );
};

