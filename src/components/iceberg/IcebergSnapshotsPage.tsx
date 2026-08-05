import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  CheckCircle2
} from "lucide-react";
import { IcebergSnapshot, TimeTravelResult } from "../../types";
import { api } from "../../services/api";

export const IcebergSnapshotsPage: React.FC = () => {
  const [snapshots, setSnapshots] = useState<IcebergSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<IcebergSnapshot | null>(null);
  const [timeTravelData, setTimeTravelData] = useState<TimeTravelResult | null>(null);
  const [activePreset, setActivePreset] = useState<string>("current");
  const [compareSnapA, setCompareSnapA] = useState<string>("");
  const [compareSnapB, setCompareSnapB] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);

  const fetchSnapshots = async () => {
    try {
      const data = await api.getIcebergSnapshots();
      setSnapshots(data);
      if (data.length > 0 && !selectedSnapshot) {
        setSelectedSnapshot(data[data.length - 1]);
        setCompareSnapA(data[0].snapshot_id);
        setCompareSnapB(data[data.length - 1].snapshot_id);
      }
    } catch (e) {
      console.error("Error loading Iceberg snapshots:", e);
    }
  };

  const executeTimeTravel = async (preset?: string, snapId?: string) => {
    try {
      const result = await api.getTimeTravel({ preset, snapshot_id: snapId });
      setTimeTravelData(result);
    } catch (e) {
      console.error("Error executing time travel query:", e);
    }
  };

  useEffect(() => {
    fetchSnapshots();
    executeTimeTravel("current");
  }, []);

  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    executeTimeTravel(preset);
  };

  const handleSnapshotClick = (snap: IcebergSnapshot) => {
    setSelectedSnapshot(snap);
    setActivePreset("custom");
    executeTimeTravel(undefined, snap.snapshot_id);
  };

  const snapA = snapshots.find(s => s.snapshot_id === compareSnapA) || snapshots[0];
  const snapB = snapshots.find(s => s.snapshot_id === compareSnapB) || snapshots[snapshots.length - 1];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Apache Iceberg Snapshots &amp; Time-Travel</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            ACID lakehouse transaction commits, partition manifests, and deterministic snapshot-isolated historical queries
          </p>
        </div>

        <button
          onClick={() => setIsComparing(!isComparing)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer self-start sm:self-auto shadow-sm ${
            isComparing 
              ? "bg-[#00F0FF] border-[#00F0FF] text-[#05080E] shadow-[0_0_15px_rgba(0,240,255,0.3)]" 
              : "bg-[#0B111E] border-[#162032] text-[#F0F9FF] hover:border-[#00F0FF]/50"
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isComparing ? "Close Diff View" : "Compare Snapshots"}</span>
        </button>
      </div>

      {/* Preset Time-Travel Selector */}
      <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#38BDF8] uppercase font-mono tracking-wider">
            Time-Travel Query Points
          </span>
          <span className="text-[11px] font-mono text-[#00F0FF] font-semibold">Target: ecommerce.checkout_events</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "current", label: "Current State", desc: "Head commit (Latest)" },
            { id: "previous", label: "Previous Snapshot", desc: "T - 1 Commit" },
            { id: "before_incident", label: "Before Incident", desc: "T = 15:15:00 (Pre-anomaly)" },
            { id: "after_recovery", label: "After Recovery", desc: "T = 15:30:25 (Remediated)" }
          ].map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-[#00F0FF] bg-[#05080E] ring-1 ring-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                    : "border-[#162032] bg-[#05080E]/60 hover:bg-[#05080E] hover:border-[#38BDF8]/40"
                }`}
              >
                <div className="font-bold text-xs font-mono text-[#F0F9FF] flex items-center justify-between">
                  <span>{preset.label}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00F0FF]" />}
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-1 font-mono">{preset.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Snapshot Comparison Diff View (Toggled) */}
      {isComparing && (
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#162032] pb-3">
            <div className="flex items-center gap-2 font-mono">
              <ArrowLeftRight className="w-4 h-4 text-[#00F0FF]" />
              <h3 className="text-sm font-bold text-[#F0F9FF]">Snapshot Comparison Differential</h3>
            </div>
            <span className="text-xs text-[#94A3B8] font-mono">Comparing manifests &amp; record delta</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Snapshot A */}
            <div className="p-4 rounded-2xl bg-[#05080E] border border-[#162032] space-y-2">
              <span className="text-[10px] text-[#38BDF8] font-mono uppercase font-bold">Baseline Snapshot A</span>
              <select
                value={compareSnapA}
                onChange={(e) => setCompareSnapA(e.target.value)}
                className="w-full bg-[#0B111E] border border-[#162032] rounded-xl p-2.5 text-xs font-mono text-[#F0F9FF] focus:outline-none focus:border-[#00F0FF]"
              >
                {snapshots.map(s => (
                  <option key={s.snapshot_id} value={s.snapshot_id}>
                    {s.snapshot_id} ({s.operation} - {new Date(s.timestamp).toLocaleTimeString()})
                  </option>
                ))}
              </select>
              {snapA && (
                <div className="text-xs font-mono text-[#94A3B8] space-y-1 pt-1">
                  <div>Total Records: <strong className="text-[#F0F9FF]">{snapA.total_records.toLocaleString()}</strong></div>
                  <div>Operation: <span className="text-[#00F0FF] font-semibold">{snapA.operation}</span></div>
                  <div>Manifest: <span className="text-[#7DD3FC]/70 text-[10px] truncate block">{snapA.manifest_list}</span></div>
                </div>
              )}
            </div>

            {/* Snapshot B */}
            <div className="p-4 rounded-2xl bg-[#05080E] border border-[#162032] space-y-2">
              <span className="text-[10px] text-[#38BDF8] font-mono uppercase font-bold">Comparison Snapshot B</span>
              <select
                value={compareSnapB}
                onChange={(e) => setCompareSnapB(e.target.value)}
                className="w-full bg-[#0B111E] border border-[#162032] rounded-xl p-2.5 text-xs font-mono text-[#F0F9FF] focus:outline-none focus:border-[#00F0FF]"
              >
                {snapshots.map(s => (
                  <option key={s.snapshot_id} value={s.snapshot_id}>
                    {s.snapshot_id} ({s.operation} - {new Date(s.timestamp).toLocaleTimeString()})
                  </option>
                ))}
              </select>
              {snapB && (
                <div className="text-xs font-mono text-[#94A3B8] space-y-1 pt-1">
                  <div>Total Records: <strong className="text-[#F0F9FF]">{snapB.total_records.toLocaleString()}</strong></div>
                  <div>Operation: <span className="text-[#00F0FF] font-semibold">{snapB.operation}</span></div>
                  <div>Manifest: <span className="text-[#7DD3FC]/70 text-[10px] truncate block">{snapB.manifest_list}</span></div>
                </div>
              )}
            </div>
          </div>

          {snapA && snapB && (
            <div className="p-4 rounded-2xl bg-[#05080E] border border-[#162032] text-xs font-mono text-[#94A3B8] flex items-center justify-between">
              <span>Net Record Delta (B - A):</span>
              <span className="font-bold text-[#34D399]">
                {(snapB.total_records - snapA.total_records) > 0 ? `+${(snapB.total_records - snapA.total_records).toLocaleString()}` : `${(snapB.total_records - snapA.total_records).toLocaleString()}`} Records
              </span>
            </div>
          )}
        </div>
      )}

      {/* Historical Query Execution Result */}
      {timeTravelData && (
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162032] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#F0F9FF] font-mono">Time-Travel Result at Commit</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#05080E] text-[#00F0FF] border border-[#162032] text-[10px] font-mono font-bold">
                  {timeTravelData.snapshot_id}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                Timestamp: {new Date(timeTravelData.timestamp).toLocaleString()} | Operation: <span className="text-[#38BDF8]">{timeTravelData.operation}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#34D399] font-bold">{timeTravelData.valid_records.toLocaleString()} Valid</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#F0F9FF] font-bold">{timeTravelData.total_records.toLocaleString()} Total</span>
            </div>
          </div>

          {/* Sample Table Rows from Historical Commit */}
          <div>
            <span className="text-[11px] font-mono text-[#7DD3FC]/80 block mb-3 font-semibold">Sample Snapshot Record Manifest Rows:</span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#162032] text-[#94A3B8] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162032]/80 text-[#F0F9FF]">
                  {timeTravelData.sample_records.map((r) => (
                    <tr key={r.transaction_id} className="hover:bg-[#05080E]/70 transition-colors">
                      <td className="py-3 px-3 text-[#00F0FF] font-bold">{r.transaction_id}</td>
                      <td className="py-3 px-3 text-[#94A3B8]">{r.customer_id}</td>
                      <td className="py-3 px-3 text-[#94A3B8]">{r.product_id}</td>
                      <td className="py-3 px-3">{r.quantity}</td>
                      <td className="py-3 px-3 font-semibold">{r.unit_price}</td>
                      <td className="py-3 px-3 font-bold text-[#F0F9FF]">{r.total_amount}</td>
                      <td className="py-3 px-3">{r.currency}</td>
                      <td className="py-3 px-3 text-[#34D399] font-semibold">{r.payment_status}</td>
                      <td className="py-3 px-3 text-[#7DD3FC]/80">{r.region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots Commit Log Table */}
      <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F0F9FF] font-mono">Iceberg Commit Log (ecommerce.checkout_events)</h3>
          <span className="text-xs font-mono text-[#00F0FF] font-bold">{snapshots.length} Snapshots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#162032] text-[#94A3B8] uppercase text-[10px]">
                <th className="py-3 px-3">Snapshot ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Operation</th>
                <th className="py-3 px-3">Records Added</th>
                <th className="py-3 px-3">Total Records</th>
                <th className="py-3 px-3">Summary</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162032]/80 text-[#F0F9FF]">
              {snapshots.map((snap) => {
                const isSelected = selectedSnapshot?.snapshot_id === snap.snapshot_id;

                return (
                  <tr key={snap.snapshot_id} className={`hover:bg-[#05080E]/70 transition-colors ${isSelected ? "bg-[#05080E]/90 ring-1 ring-[#00F0FF]/30" : ""}`}>
                    <td className="py-3.5 px-3 font-bold text-[#00F0FF]">{snap.snapshot_id}</td>
                    <td className="py-3.5 px-3 text-[#94A3B8]">{new Date(snap.timestamp).toLocaleString()}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        snap.operation === "OVERWRITE" ? "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50" : "bg-[#06241B] text-[#34D399] border-[#10B981]/50"
                      }`}>
                        {snap.operation}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#34D399]">+{snap.records_added.toLocaleString()}</td>
                    <td className="py-3.5 px-3 font-bold text-[#F0F9FF]">{snap.total_records.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-[#94A3B8] max-w-xs truncate">{snap.summary_description}</td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleSnapshotClick(snap)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#05080E] hover:bg-[#162032] text-[#00F0FF] border border-[#162032] hover:border-[#00F0FF]/40 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Inspect Commit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
