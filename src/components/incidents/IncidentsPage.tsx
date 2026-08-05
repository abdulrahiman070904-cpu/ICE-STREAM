import React, { useState, useEffect } from "react";
import {
  Search,
  ExternalLink
} from "lucide-react";
import { Incident } from "../../types";
import { api } from "../../services/api";

interface IncidentsPageProps {
  onNavigate: (tab: any) => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (e) {
      console.error("Error loading incidents:", e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = incidents.filter(i => 
    i.incident_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.root_cause.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Incident Management &amp; Root Cause Analysis</h2>
        <p className="text-xs text-[#7DD3FC]/70 mt-1">
          Historical record of automated circuit breaker triggers, SLA violations, and root-cause diagnoses
        </p>
      </div>

      {/* Main Grid: Incident List + Detailed Drill-Down */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List Column */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search incidents by ID or cause..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0B111E] border border-[#162032] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F0F9FF] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] font-mono shadow-inner"
            />
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filtered.map((inc) => {
              const isSelected = selectedIncident?.incident_id === inc.incident_id;
              const isCrit = inc.severity === "CRITICAL";

              return (
                <div
                  key={inc.incident_id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#00F0FF] bg-[#0B111E] shadow-[0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-[#00F0FF]"
                      : "border-[#162032] bg-[#0B111E]/70 hover:bg-[#0B111E] hover:border-[#38BDF8]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono text-[#00F0FF]">{inc.incident_id}</span>
                    <span className={`text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border ${
                      isCrit ? "bg-[#2D0D12] text-[#FB7185] border-[#FB7185]/60" : "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50"
                    }`}>
                      {inc.severity}
                    </span>
                  </div>

                  <p className="text-xs text-[#F0F9FF] font-medium line-clamp-2 mt-2">
                    {inc.root_cause}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] mt-3 pt-2 border-t border-[#162032]">
                    <span>{new Date(inc.detected_at).toLocaleTimeString()}</span>
                    <span className="text-[#FB7185] font-bold">{inc.error_rate}% Error</span>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-[#94A3B8] text-xs font-mono bg-[#0B111E] rounded-2xl border border-[#162032]">
                No incidents match search filter
              </div>
            )}
          </div>
        </div>

        {/* Selected Incident Detail Inspector */}
        <div className="lg:col-span-2">
          {selectedIncident ? (
            <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-[#F0F9FF]">{selectedIncident.incident_id}</span>
                    <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-[#2D0D12] text-[#FB7185] border border-[#FB7185]/60">
                      {selectedIncident.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#7DD3FC]/70 mt-0.5 font-mono">
                    Detected at: {new Date(selectedIncident.detected_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate("remediation")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] text-xs font-mono font-bold self-start sm:self-auto cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Remediation Graph</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* KPI Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-[#05080E] border border-[#162032]">
                  <span className="text-[10px] text-[#94A3B8] uppercase">Error Rate</span>
                  <div className="text-base font-bold text-[#FB7185] mt-1">{selectedIncident.error_rate}%</div>
                  <span className="text-[9px] text-[#94A3B8]">Threshold: {selectedIncident.threshold}%</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05080E] border border-[#162032]">
                  <span className="text-[10px] text-[#94A3B8] uppercase">Records Affected</span>
                  <div className="text-base font-bold text-[#FBBF24] mt-1">{selectedIncident.records_affected.toLocaleString()}</div>
                  <span className="text-[9px] text-[#94A3B8]">Quarantined to DLQ</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05080E] border border-[#162032]">
                  <span className="text-[10px] text-[#94A3B8] uppercase">Circuit Breaker</span>
                  <div className="text-base font-bold text-[#38BDF8] mt-1 uppercase">{selectedIncident.circuit_breaker_state}</div>
                  <span className="text-[9px] text-[#94A3B8]">Automated Switch</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#05080E] border border-[#162032]">
                  <span className="text-[10px] text-[#94A3B8] uppercase">Remediation</span>
                  <div className="text-base font-bold text-[#34D399] mt-1 uppercase">{selectedIncident.remediation_state}</div>
                  <span className="text-[9px] text-[#94A3B8]">{selectedIncident.resolution_time_sec ? `${selectedIncident.resolution_time_sec}s duration` : "Ongoing"}</span>
                </div>
              </div>

              {/* Root Cause Card */}
              <div className="p-4.5 rounded-2xl bg-[#05080E] border border-[#162032] space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#38BDF8] font-bold">Root Cause Diagnosis</span>
                <p className="text-xs text-[#F0F9FF] leading-relaxed font-mono">
                  {selectedIncident.root_cause}
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-[#94A3B8]">
                  <span>Affected Node:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0B111E] border border-[#162032] text-[#00F0FF] font-mono font-medium">
                    {selectedIncident.affected_node}
                  </span>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#F0F9FF] uppercase font-mono tracking-wider">Incident Action &amp; Audit Trail</h4>
                <div className="space-y-3 border-l-2 border-[#162032] pl-4 ml-2">
                  {selectedIncident.audit_trail.map((step, idx) => (
                    <div key={idx} className="relative text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] absolute -left-[22px] top-1 ring-4 ring-[#0B111E] shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                      <span className="font-mono text-[#38BDF8] font-bold">{step.time}</span>
                      <span className="text-[#F0F9FF] ml-2">{step.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl border border-[#162032] bg-[#0B111E] text-center text-[#94A3B8] text-xs font-mono shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              Select an incident from the list to view diagnostic logs
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
