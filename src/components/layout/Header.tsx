import React from "react";
import { 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  Clock,
  Sparkles
} from "lucide-react";
import { MetricData } from "../../types";
import { ICESTREAM_LOGO } from "../../assets/logo";

interface HeaderProps {
  isConnected: boolean;
  metrics: MetricData | null;
  onOpenSimulation: () => void;
  onResetCircuit: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  metrics,
  onOpenSimulation,
  onResetCircuit
}) => {
  const circuitState = metrics?.circuit_breaker_status || "CLOSED";

  return (
    <header className="h-16 border-b border-[#162032] bg-[#070B14]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,240,255,0.06)]">
      {/* Brand & Platform Identity with Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#00F0FF]/40 bg-[#0B1220] p-0.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] shrink-0 flex items-center justify-center">
            <img
              src={ICESTREAM_LOGO}
              alt="IceStream Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-[#38BDF8]/30 pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#F0F9FF] tracking-tight text-base font-mono flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-[#38BDF8] via-[#67E8F9] to-[#00F0FF] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                  IceStream
                </span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0E1E38] text-[#38BDF8] border border-[#0284C7]/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                Lakehouse v1.18
              </span>
            </div>
            <p className="text-[11px] text-[#7DD3FC]/70 font-medium">Real-Time Lakehouse Observability &amp; Self-Healing</p>
          </div>
        </div>

        <div className="h-6 w-px bg-[#162032] mx-2 hidden sm:block" />

        {/* Global Operational Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B111E] border border-[#162032] text-xs shadow-inner">
          {circuitState === "CLOSED" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className="text-[#34D399] font-bold font-mono text-[11px] tracking-wide">SYSTEM OPERATIONAL</span>
            </>
          ) : circuitState === "HALF_OPEN" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBBF24] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]"></span>
              </span>
              <span className="text-[#FBBF24] font-bold font-mono text-[11px] tracking-wide">CIRCUIT HALF-OPEN (CANARY TEST)</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FB7185] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F43F5E]"></span>
              </span>
              <span className="text-[#FB7185] font-bold font-mono text-[11px] tracking-wide">CIRCUIT OPEN (STREAM QUARANTINED)</span>
            </>
          )}
        </div>
      </div>

      {/* Right Action Bar & Health Telemetry */}
      <div className="flex items-center gap-3">
        {/* Latency badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B111E] border border-[#162032] text-[#E2F1FD] text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>{metrics?.processing_latency_ms ? `${metrics.processing_latency_ms} ms` : "-- ms"}</span>
        </div>

        {/* Circuit Breaker Badge with Action */}
        <div 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border transition-all ${
            circuitState === "CLOSED"
              ? "bg-[#06241B] border-[#059669]/50 text-[#34D399] shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              : circuitState === "HALF_OPEN"
              ? "bg-[#291B07] border-[#D97706]/60 text-[#FBBF24] animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "bg-[#2D0D12] border-[#E11D48]/60 text-[#FB7185] animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.25)]"
          }`}
        >
          {circuitState === "CLOSED" ? (
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[#FB7185]" />
          )}
          <span>Circuit: {circuitState}</span>
          {circuitState !== "CLOSED" && (
            <button
              onClick={onResetCircuit}
              title="Reset Circuit to CLOSED"
              className="ml-1 p-0.5 hover:bg-[#E11D48]/30 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-[#FB7185]" />
            </button>
          )}
        </div>

        {/* Chaos / Simulation Action Button */}
        <button
          onClick={onOpenSimulation}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00F0FF] hover:from-[#0369A1] hover:to-[#38BDF8] text-[#05080E] font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Activity className="w-3.5 h-3.5 text-[#05080E]" />
          <span>Chaos Controls</span>
        </button>

        {/* WebSocket Connection Indicator */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#162032] text-xs">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-[#34D399]" title="WebSocket Live Stream Active">
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono hidden sm:inline font-bold">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#FB7185]" title="WebSocket Disconnected - Reconnecting">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[11px] font-mono hidden sm:inline font-bold">OFFLINE</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

