import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  Pause,
  Play,
  Copy,
  Check
} from "lucide-react";
import { EventLog } from "../../types";
import { api } from "../../services/api";

interface LiveEventConsoleProps {
  recentLogs: EventLog[];
}

export const LiveEventConsole: React.FC<LiveEventConsoleProps> = ({ recentLogs }) => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Initial fetch
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const data = await api.getPipelineEvents();
        setLogs(data);
      } catch (e) {
        console.error("Error loading event logs:", e);
      }
    };
    fetchInitial();
  }, []);

  // Append new logs from WebSocket
  useEffect(() => {
    if (isPaused || recentLogs.length === 0) return;
    setLogs((prev) => {
      const existingIds = new Set(prev.map(l => l.id));
      const newItems = recentLogs.filter(l => !existingIds.has(l.id));
      if (newItems.length === 0) return prev;
      return [...newItems, ...prev].slice(0, 300);
    });
  }, [recentLogs, isPaused]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === "ALL" || log.level === levelFilter;
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.source}]: ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Live Event &amp; Diagnostic Terminal</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Real-time pipeline event bus streaming Kafka offsets, Flink execution logs, Quality checks, and Circuit Breaker transitions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ${
              isPaused 
                ? "bg-[#291B07] border-[#F59E0B]/50 text-[#FBBF24]" 
                : "bg-[#0B111E] border-[#162032] text-[#F0F9FF] hover:border-[#00F0FF]/50"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5 text-[#00F0FF]" />}
            <span>{isPaused ? "Resume Stream" : "Pause Stream"}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B111E] border border-[#162032] text-[#F0F9FF] hover:border-[#00F0FF]/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B111E] border border-[#162032] text-[#94A3B8] hover:text-[#FB7185] hover:border-[#FB7185]/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-3xl border border-[#162032] bg-[#0B111E] flex flex-wrap items-center gap-3 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search logs by keyword or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#05080E] border border-[#162032] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F0F9FF] placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] font-mono shadow-inner"
          />
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#94A3B8]">Level:</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#05080E] border border-[#162032] text-[#F0F9FF] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="ALERT">ALERT</option>
            <option value="SUCCESS">SUCCESS</option>
          </select>
        </div>

        {/* Auto-scroll toggle */}
        <label className="flex items-center gap-2 text-xs font-mono text-[#94A3B8] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded bg-[#05080E] border-[#162032] text-[#00F0FF] focus:ring-0 accent-[#00F0FF]"
          />
          <span>Auto-Scroll</span>
        </label>
      </div>

      {/* Terminal View */}
      <div className="rounded-3xl border border-[#162032] bg-[#05080E] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        {/* Terminal Title Bar */}
        <div className="h-10 bg-[#0B111E] border-b border-[#162032] px-4 flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FB7185] inline-block shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-[#FBBF24] inline-block shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-[#34D399] inline-block shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="ml-2 text-[#00F0FF] font-bold">icestream-event-bus.sock</span>
          </div>
          <span className="text-[#38BDF8]">Showing {filteredLogs.length} events</span>
        </div>

        {/* Terminal Body */}
        <div className="p-5 font-mono text-xs max-h-[580px] overflow-y-auto space-y-2 select-text bg-[#05080E]">
          {filteredLogs.map((log) => {
            const levelStyle = {
              INFO: "text-[#94A3B8]",
              WARN: "text-[#FBBF24] font-medium",
              CRITICAL: "text-[#FB7185] font-bold animate-pulse",
              ALERT: "text-[#FB7185] font-semibold",
              SUCCESS: "text-[#34D399] font-medium"
            }[log.level] || "text-[#F0F9FF]";

            return (
              <div key={log.id} className="flex items-start gap-3 hover:bg-[#0B111E]/70 p-2 rounded-xl transition-colors leading-relaxed border border-transparent hover:border-[#162032]">
                <span className="text-[#64748B] shrink-0 text-[11px] select-none">{log.timestamp}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 font-bold uppercase border ${
                  log.level === "CRITICAL" ? "bg-[#2D0D12] text-[#FB7185] border-[#FB7185]/60" :
                  log.level === "WARN" ? "bg-[#291B07] text-[#FBBF24] border-[#F59E0B]/50" :
                  log.level === "SUCCESS" ? "bg-[#06241B] text-[#34D399] border-[#10B981]/50" :
                  "bg-[#0B111E] text-[#94A3B8] border-[#162032]"
                }`}>
                  {log.level}
                </span>
                <span className="text-[#00F0FF] shrink-0 font-bold">[{log.source}]</span>
                <span className={`break-all ${levelStyle}`}>{log.message}</span>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-[#64748B]">
              No matching log events found.
            </div>
          )}

          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
