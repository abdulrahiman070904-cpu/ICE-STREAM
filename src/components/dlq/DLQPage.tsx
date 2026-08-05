import React, { useState, useEffect } from "react";
import {
  Inbox,
  Search,
  Eye,
  X,
  Copy,
  Check
} from "lucide-react";
import { DLQRecord } from "../../types";
import { api } from "../../services/api";

export const DLQPage: React.FC = () => {
  const [records, setRecords] = useState<DLQRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DLQRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  const fetchDLQ = async () => {
    try {
      const data = await api.getDLQ();
      setRecords(data);
    } catch (e) {
      console.error("Error fetching DLQ records:", e);
    }
  };

  useEffect(() => {
    fetchDLQ();
    const interval = setInterval(fetchDLQ, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.error_message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || r.error_type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === "ALL" || r.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCopyJson = () => {
    if (!selectedRecord) return;
    navigator.clipboard.writeText(JSON.stringify(selectedRecord.original_payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Dead Letter Queue (DLQ) &amp; Quarantine</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Quarantined Iceberg table (`checkout_events_dlq`) holding telemetry records that violated data quality rules
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-[#0B111E] px-4 py-2 rounded-full border border-[#162032] text-[#94A3B8] shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
          <Inbox className="w-3.5 h-3.5 text-[#FBBF24]" />
          <span>Total Quarantined: <strong className="text-[#00F0FF]">{records.length}</strong></span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl border border-[#162032] bg-[#0B111E] flex flex-wrap items-center gap-3 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by Transaction ID or error message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#05080E] border border-[#162032] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F0F9FF] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] font-mono shadow-inner"
          />
        </div>

        {/* Error Type Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#94A3B8]">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#05080E] border border-[#162032] text-[#F0F9FF] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="ALL">All Types</option>
            <option value="NULL_VALUE">NULL_VALUE</option>
            <option value="SCHEMA_DRIFT">SCHEMA_DRIFT</option>
            <option value="MATH_INCONSISTENCY">MATH_INCONSISTENCY</option>
            <option value="INVALID_VALUE">INVALID_VALUE</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#94A3B8]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#05080E] border border-[#162032] text-[#F0F9FF] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="QUARANTINED">QUARANTINED</option>
            <option value="REMEDIATED">REMEDIATED</option>
            <option value="DISCARDED">DISCARDED</option>
          </select>
        </div>
      </div>

      {/* DLQ Table */}
      <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#162032] text-[#94A3B8] uppercase text-[10px]">
                <th className="py-3 px-3">Transaction ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Error Type</th>
                <th className="py-3 px-3">Failed Rule</th>
                <th className="py-3 px-3">Error Message</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162032]/80 text-[#F0F9FF]">
              {filtered.map((rec) => (
                <tr key={rec.transaction_id} className="hover:bg-[#05080E]/70 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-[#00F0FF]">{rec.transaction_id}</td>
                  <td className="py-3.5 px-3 text-[#94A3B8] text-[11px]">{new Date(rec.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-1 rounded-full bg-[#2D0D12] text-[#FB7185] border border-[#FB7185]/60 text-[10px] font-bold">
                      {rec.error_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#F0F9FF] font-semibold">{rec.failed_rule}</td>
                  <td className="py-3.5 px-3 text-[#94A3B8] max-w-xs truncate" title={rec.error_message}>
                    {rec.error_message}
                  </td>
                  <td className="py-3.5 px-3 text-[#7DD3FC]/80">{rec.pipeline_stage}</td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      rec.status === "REMEDIATED" 
                        ? "bg-[#06241B] text-[#34D399] border-[#10B981]/50"
                        : "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50"
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="p-2 rounded-xl bg-[#05080E] hover:bg-[#0F172A] text-[#00F0FF] border border-[#162032] transition-colors cursor-pointer hover:border-[#00F0FF]/50"
                      title="Inspect Original Corrupted Payload"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8] font-mono">
                    No dead letter queue records match the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#05080E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#162032] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.9)]">
            <div className="p-5 border-b border-[#162032] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-sm text-[#F0F9FF]">{selectedRecord.transaction_id}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#2D0D12] text-[#FB7185] border border-[#FB7185]/60 font-bold">
                  {selectedRecord.error_type}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#F0F9FF] hover:bg-[#05080E] transition-colors cursor-pointer border border-transparent hover:border-[#162032]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-4 rounded-2xl bg-[#05080E] border border-[#162032] text-xs font-mono space-y-1.5">
                <div className="text-[#FB7185] font-bold">{selectedRecord.failed_rule}</div>
                <div className="text-[#F0F9FF]">{selectedRecord.error_message}</div>
                <div className="text-[11px] text-[#94A3B8] pt-1">
                  Detected in stage: <span className="text-[#38BDF8]">{selectedRecord.pipeline_stage}</span> | Incident: <span className="text-[#FBBF24]">{selectedRecord.incident_id || "None"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Original Ingested Payload JSON</span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] text-[#00F0FF] hover:text-[#38BDF8] font-bold cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Payload"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-[#05080E] border border-[#162032] text-xs font-mono text-[#38BDF8] overflow-x-auto shadow-inner">
                  {JSON.stringify(selectedRecord.original_payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-[#162032] flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-[#162032] hover:bg-[#1E293B] text-[#F0F9FF] text-xs font-mono font-bold transition-colors cursor-pointer border border-[#334155]/40"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
