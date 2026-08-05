import React from "react";
import {
  LayoutDashboard,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  RefreshCw,
  History,
  Terminal,
  Sliders,
  Settings,
  Server
} from "lucide-react";

export type TabId = 
  | "dashboard"
  | "lineage"
  | "quality"
  | "incidents"
  | "dlq"
  | "remediation"
  | "snapshots"
  | "logs"
  | "simulation"
  | "settings";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeIncidentsCount: number;
  dlqCount: number;
  circuitState: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeIncidentsCount,
  dlqCount
}) => {
  const menuItems = [
    { id: "dashboard" as TabId, label: "Dashboard", icon: LayoutDashboard },
    { id: "lineage" as TabId, label: "Pipeline Lineage", icon: GitFork },
    { id: "quality" as TabId, label: "Data Quality", icon: CheckCircle2 },
    { 
      id: "incidents" as TabId, 
      label: "Incidents", 
      icon: AlertTriangle,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor: "bg-[#E11D48] text-white shadow-[0_0_8px_rgba(225,29,72,0.4)]"
    },
    { 
      id: "dlq" as TabId, 
      label: "Dead Letter Queue", 
      icon: Inbox,
      badge: dlqCount > 0 ? dlqCount : undefined,
      badgeColor: "bg-[#291B07] border border-[#D97706]/60 text-[#FBBF24]"
    },
    { id: "remediation" as TabId, label: "Remediation", icon: RefreshCw },
    { id: "snapshots" as TabId, label: "Iceberg Snapshots", icon: History },
    { id: "logs" as TabId, label: "Event Logs", icon: Terminal },
    { 
      id: "simulation" as TabId, 
      label: "Chaos Simulation", 
      icon: Sliders,
      highlight: true
    },
    { id: "settings" as TabId, label: "Settings", icon: Settings }
  ];

  return (
    <aside className="w-64 border-r border-[#162032] bg-[#070B14] flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#38BDF8]/70 font-mono flex items-center justify-between">
          <span>Observability Modules</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#0284C7]/30 to-[#00F0FF]/15 border border-[#38BDF8]/50 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                    : item.highlight
                    ? "text-[#67E8F9] hover:bg-[#0E1726] hover:text-[#00F0FF] border border-transparent"
                    : "text-[#94A3B8] hover:bg-[#0E1726] hover:text-[#E2F1FD] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Cluster Node Status footer */}
      <div className="p-3.5 m-3 rounded-2xl border border-[#162032] bg-[#0B111E] space-y-2.5 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="flex items-center gap-1.5 font-bold text-[#E2F1FD]">
            <Server className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Infrastructure</span>
          </span>
          <span className="text-[#34D399] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
            Synced
          </span>
        </div>
        <div className="space-y-1 text-[11px] font-mono text-[#94A3B8]">
          <div className="flex justify-between">
            <span>Kafka Brokers:</span>
            <span className="text-[#38BDF8] font-bold">1 (KRaft)</span>
          </div>
          <div className="flex justify-between">
            <span>Flink TaskSlots:</span>
            <span className="text-[#38BDF8] font-bold">4 / 4</span>
          </div>
          <div className="flex justify-between">
            <span>Iceberg Catalog:</span>
            <span className="text-[#67E8F9] font-bold">REST (v0.7)</span>
          </div>
          <div className="flex justify-between">
            <span>Object Store:</span>
            <span className="text-[#E2F1FD] font-medium">MinIO S3</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

