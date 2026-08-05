import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Clock,
  Play,
  Check
} from "lucide-react";
import { RemediationWorkflow } from "../../types";
import { api } from "../../services/api";

interface RemediationPageProps {
  onTriggerRemediation: () => void;
}

export const RemediationPage: React.FC<RemediationPageProps> = ({ onTriggerRemediation }) => {
  const [workflows, setWorkflows] = useState<RemediationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<RemediationWorkflow | null>(null);

  const fetchWorkflows = async () => {
    try {
      const data = await api.getRemediation();
      setWorkflows(data);
      if (data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(data[0]);
      } else if (data.length > 0) {
        const current = data.find(w => w.workflow_id === selectedWorkflow?.workflow_id) || data[0];
        setSelectedWorkflow(current);
      }
    } catch (e) {
      console.error("Error loading remediation workflows:", e);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Automated Remediation &amp; Self-Healing Engine</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Autonomous self-healing lifecycle: Detection → Circuit Isolation → DLQ Quarantine → Source Re-fetch → Validation → Canary Test → Pipeline Resumption
          </p>
        </div>

        <button
          onClick={onTriggerRemediation}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer self-start sm:self-auto hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Trigger Auto-Recovery Run</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow History List */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#38BDF8] font-mono">
            Remediation Executions
          </span>

          <div className="space-y-2.5">
            {workflows.map((wf) => {
              const isSelected = selectedWorkflow?.workflow_id === wf.workflow_id;
              const isCompleted = wf.status === "COMPLETED";

              return (
                <div
                  key={wf.workflow_id}
                  onClick={() => setSelectedWorkflow(wf)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#00F0FF] bg-[#0B111E] shadow-[0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-[#00F0FF]"
                      : "border-[#162032] bg-[#0B111E]/70 hover:bg-[#0B111E] hover:border-[#38BDF8]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono text-[#00F0FF]">{wf.workflow_id}</span>
                    <span className={`text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border ${
                      isCompleted ? "bg-[#06241B] text-[#34D399] border-[#10B981]/50" : "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50 animate-pulse"
                    }`}>
                      {wf.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] font-mono mt-2">
                    Linked Incident: <strong className="text-[#F0F9FF]">{wf.incident_id}</strong>
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#7DD3FC]/70 mt-3 pt-2 border-t border-[#162032]">
                    <span>Started: {new Date(wf.started_at).toLocaleTimeString()}</span>
                    <span className="text-[#38BDF8] font-bold">{wf.stages.filter(s => s.status === "COMPLETED").length} / {wf.stages.length} Stages</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow Stages Timeline Visualizer */}
        <div className="lg:col-span-2">
          {selectedWorkflow ? (
            <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-[#162032] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#F0F9FF] font-mono">{selectedWorkflow.workflow_id} Timeline</h3>
                  <p className="text-xs text-[#7DD3FC]/70 mt-0.5">
                    Target Incident: <span className="text-[#00F0FF] font-mono font-medium">{selectedWorkflow.incident_id}</span>
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                  selectedWorkflow.status === "COMPLETED"
                    ? "bg-[#06241B] text-[#34D399] border-[#10B981]/50"
                    : "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50 animate-pulse"
                }`}>
                  {selectedWorkflow.status}
                </span>
              </div>

              {/* Stage-by-Stage Flow */}
              <div className="space-y-4">
                {selectedWorkflow.stages.map((stage, idx) => {
                  const isDone = stage.status === "COMPLETED";
                  const isRunning = stage.status === "IN_PROGRESS";
                  const isLast = idx === selectedWorkflow.stages.length - 1;

                  return (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Line connector */}
                      {!isLast && (
                        <div className={`absolute left-4 top-8 bottom-0 w-0.5 ${isDone ? "bg-[#10B981]" : "bg-[#162032]"}`} />
                      )}

                      {/* Icon Bubble */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors ${
                        isDone
                          ? "bg-[#06241B] border-[#10B981]/50 text-[#34D399] shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : isRunning
                          ? "bg-[#291B07] border-[#F59E0B]/50 text-[#FBBF24] animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                          : "bg-[#05080E] border-[#162032] text-[#64748B]"
                      }`}>
                        {isDone ? (
                          <Check className="w-4 h-4" />
                        ) : isRunning ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-[#00F0FF]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Content Card */}
                      <div className={`flex-1 p-4 rounded-2xl border transition-all ${
                        isRunning 
                          ? "bg-[#05080E] border-[#00F0FF] ring-1 ring-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                          : "bg-[#05080E] border-[#162032]"
                      }`}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#F0F9FF] font-mono">{stage.stage}</h4>
                          <span className="text-[10px] font-mono text-[#38BDF8]">
                            {stage.timestamp !== "-" ? `${stage.timestamp} (${stage.duration_ms}ms)` : "Pending"}
                          </span>
                        </div>

                        <p className="text-xs text-[#94A3B8] mt-1 font-sans">
                          {stage.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl border border-[#162032] bg-[#0B111E] text-center text-[#94A3B8] text-xs font-mono shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              Select a workflow to inspect its self-healing trace
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
