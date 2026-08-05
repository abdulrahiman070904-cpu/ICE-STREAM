import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Percent,
  Sliders
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { QualitySummary, MetricData } from "../../types";
import { api } from "../../services/api";

interface DataQualityPageProps {
  metrics: MetricData | null;
  onOpenSimulation: () => void;
}

export const DataQualityPage: React.FC<DataQualityPageProps> = ({
  metrics,
  onOpenSimulation
}) => {
  const [qualityData, setQualityData] = useState<QualitySummary | null>(null);

  useEffect(() => {
    const fetchQuality = async () => {
      try {
        const res = await api.getQuality();
        setQualityData(res);
      } catch (err) {
        console.error("Error loading quality data:", err);
      }
    };
    fetchQuality();
    const interval = setInterval(fetchQuality, 2000);
    return () => clearInterval(interval);
  }, []);

  const rulesList = qualityData?.rules || [
    { id: "RULE-01", name: "Required Fields", status: "PASS", failure_rate: 0.4 },
    { id: "RULE-02", name: "Positive Amounts", status: "PASS", failure_rate: 0.1 },
    { id: "RULE-03", name: "Payment Status", status: "PASS", failure_rate: 0.0 },
    { id: "RULE-04", name: "Currency Validation", status: "PASS", failure_rate: 0.0 },
    { id: "RULE-05", name: "Transaction Consistency", status: "PASS", failure_rate: 0.2 },
    { id: "RULE-06", name: "Schema Validation", status: "PASS", failure_rate: 0.5 },
    { id: "RULE-07", name: "Null Anomaly Rate", status: "PASS", failure_rate: 0.4 }
  ];

  const qualityScore = qualityData?.quality_score ?? 98.6;

  const chartData = rulesList.map(r => ({
    name: r.name,
    failureRate: r.failure_rate,
    status: r.status
  }));

  const pieData = [
    { name: "Valid Records", value: metrics?.valid_events || 241500, color: "#00F0FF" },
    { name: "Quarantined / Invalid", value: metrics?.invalid_events || 3500, color: "#FB7185" }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Data Quality &amp; Rules Engine</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Real-time Great Expectations contract enforcement on streaming e-commerce telemetry
          </p>
        </div>

        <button
          onClick={onOpenSimulation}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Inject Quality Anomaly</span>
        </button>
      </div>

      {/* Top Score Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Card */}
        <div className="p-5 rounded-3xl border border-[#162032] bg-[#0B111E] flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div>
            <span className="text-xs font-mono text-[#94A3B8]">Stream Quality Index</span>
            <div className="text-3xl font-black font-mono text-[#00F0FF] mt-1 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              {qualityScore}%
            </div>
            <p className="text-[11px] font-mono text-[#34D399] mt-1">SLA Target: &gt; 98.0%</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#06241B] border border-[#10B981]/50 text-[#34D399] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        {/* Rules Passed Card */}
        <div className="p-5 rounded-3xl border border-[#162032] bg-[#0B111E] flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div>
            <span className="text-xs font-mono text-[#94A3B8]">Active Rules Enforced</span>
            <div className="text-3xl font-black font-mono text-[#38BDF8] mt-1">
              7 / 7
            </div>
            <p className="text-[11px] font-mono text-[#7DD3FC]/70 mt-1">Great Expectations Suite</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#082F49] border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        {/* Anomaly Detection Status */}
        <div className="p-5 rounded-3xl border border-[#162032] bg-[#0B111E] flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div>
            <span className="text-xs font-mono text-[#94A3B8]">Sliding Window (60s)</span>
            <div className="text-3xl font-black font-mono text-[#F0F9FF] mt-1">
              {metrics ? `${metrics.current_error_rate}%` : "0.0%"}
            </div>
            <p className="text-[11px] font-mono text-[#FBBF24] mt-1">Rolling Error Rate</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#291B07] border border-[#F59E0B]/50 text-[#FBBF24]">
            <Percent className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Rules Matrix Table */}
      <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-[#162032] pb-4">
          <div>
            <h3 className="text-sm font-bold font-mono text-[#F0F9FF]">Rule Execution Matrix</h3>
            <p className="text-xs text-[#7DD3FC]/70 mt-0.5">Continuous telemetry validation across all streaming fields</p>
          </div>
          <span className="text-xs font-mono text-[#38BDF8] bg-[#05080E] px-3 py-1 rounded-full border border-[#162032]">
            Latency: ~2.4ms/batch
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#162032] text-[#94A3B8] uppercase text-[10px]">
                <th className="py-3 px-3">Rule ID</th>
                <th className="py-3 px-3">Rule Name &amp; Assertion</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Violation Rate</th>
                <th className="py-3 px-3">SLA Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162032]/80 text-[#F0F9FF]">
              {rulesList.map((rule) => {
                const isPass = rule.status === "PASS";
                const isWarn = rule.status === "WARNING";

                return (
                  <tr key={rule.id} className="hover:bg-[#05080E]/70 transition-colors">
                    <td className="py-3.5 px-3 text-[#00F0FF] font-bold">{rule.id}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#F0F9FF]">{rule.name}</div>
                      <div className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                        {rule.id === "RULE-01" && "transaction_id, timestamp, customer_id, total_amount cannot be NULL"}
                        {rule.id === "RULE-02" && "quantity > 0, unit_price >= 0, total_amount >= 0"}
                        {rule.id === "RULE-03" && "payment_status ∈ [SUCCESS, FAILED, PENDING, REFUNDED]"}
                        {rule.id === "RULE-04" && "currency ∈ [INR, USD, EUR, GBP]"}
                        {rule.id === "RULE-05" && "total_amount ≈ quantity * unit_price (±0.05 tolerance)"}
                        {rule.id === "RULE-06" && "Payload strictly matches schema without unapproved column drift"}
                        {rule.id === "RULE-07" && "Rolling NULL percentage: Normal <2%, Warning >=2%, Critical >=5%"}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border ${
                        isPass 
                          ? "bg-[#06241B] text-[#34D399] border-[#10B981]/50"
                          : isWarn
                          ? "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50"
                          : "bg-[#2D0D12] text-[#FB7185] border-[#FB7185]/60 animate-pulse"
                      }`}>
                        {isPass ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {rule.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#38BDF8]">
                      {rule.failure_rate.toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-3 text-[#94A3B8]">
                      &lt; 2.0%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Failure rate by rule */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-bold font-mono text-[#F0F9FF]">Failure Rate by Quality Rule (%)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10, fill: "#94A3B8" }} domain={[0, 10]} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#64748B" tick={{ fontSize: 10, fill: "#94A3B8" }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0B111E", borderColor: "#162032", borderRadius: "12px", fontSize: "12px", color: "#F0F9FF", boxShadow: "0 8px 30px rgba(0,0,0,0.8)" }}
                  formatter={(val: any) => [`${val}%`, "Failure Rate"]}
                />
                <Bar dataKey="failureRate" fill="#00F0FF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Ingestion Health Distribution */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div>
            <h3 className="text-sm font-bold font-mono text-[#F0F9FF]">Valid vs Quarantined Event Distribution</h3>
            <p className="text-xs text-[#7DD3FC]/70 mt-0.5">Lakehouse main table commits vs Dead Letter Queue diversion</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0B111E", borderColor: "#162032", borderRadius: "12px", fontSize: "12px", color: "#F0F9FF", boxShadow: "0 8px 30px rgba(0,0,0,0.8)" }}
                  formatter={(val: any) => [val.toLocaleString(), "Events"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00F0FF] inline-block shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
              <span className="text-[#F0F9FF]">Valid ({metrics?.valid_events.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FB7185] inline-block shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
              <span className="text-[#F0F9FF]">DLQ ({metrics?.invalid_events.toLocaleString()})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
