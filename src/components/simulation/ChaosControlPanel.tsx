import React, { useState, useEffect } from "react";
import {
  Sliders,
  Play,
  Square,
  Zap,
  AlertTriangle,
  Flame,
  CheckCircle2
} from "lucide-react";
import { SimulationConfig, MetricData } from "../../types";
import { api } from "../../services/api";

interface ChaosControlPanelProps {
  metrics: MetricData | null;
  onClose?: () => void;
}

export const ChaosControlPanel: React.FC<ChaosControlPanelProps> = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    is_running: true,
    events_per_second: 250,
    anomaly_rate: 1.0,
    null_rate: 0.5,
    schema_drift_rate: 0.5,
    force_mode: "NONE",
    circuit_breaker_status: "CLOSED"
  });

  const [activePresetStep, setActivePresetStep] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const data = await api.getSimulationConfig();
      setConfig(data);
    } catch (e) {
      console.error("Error loading simulation config:", e);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleToggleGenerator = async () => {
    try {
      if (config.is_running) {
        await api.stopGenerator();
        setConfig(prev => ({ ...prev, is_running: false }));
        showToast("Stream Generator PAUSED");
      } else {
        await api.startGenerator();
        setConfig(prev => ({ ...prev, is_running: true }));
        showToast("Stream Generator RESUMED");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateConfig = async (partial: Partial<SimulationConfig>) => {
    try {
      const updated = { ...config, ...partial };
      setConfig(updated);
      await api.updateSimulationConfig(partial);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectNull = async () => {
    await api.injectNull();
    showToast("⚠️ Injected NULL Value Anomaly Spike (15% nulls for 15s)");
  };

  const handleInjectSchema = async () => {
    await api.injectSchemaDrift();
    showToast("⚠️ Injected Schema Drift Anomaly (Unapproved metadata columns)");
  };

  const handleInjectAmounts = async () => {
    await api.injectInvalidAmounts();
    showToast("⚠️ Injected Math Inconsistency & Negative Amounts");
  };

  const handleInjectHighError = async () => {
    await api.injectHighErrorRate();
    showToast("🔥 Injected High Error Burst (6.5% error rate) - Circuit Breaker Tripping!");
  };

  const handleTriggerBreaker = async () => {
    await api.triggerCircuitBreaker();
    showToast("⛔ Circuit Breaker Force Tripped to OPEN state");
  };

  const handleResetBreaker = async () => {
    await api.resetCircuitBreaker();
    showToast("✅ Circuit Breaker Reset to CLOSED state");
  };

  const handleTriggerRemediation = async () => {
    await api.triggerRemediation();
    showToast("🔄 Automated Remediation Run Initiated");
  };

  // Guided Walkthrough Steps
  const walkthroughSteps = [
    {
      step: 1,
      title: "Normal Lakehouse Streaming",
      desc: "System streams 250 eps with <1% baseline noise. All records validated and committed to Iceberg.",
      action: async () => {
        await handleResetBreaker();
        await handleUpdateConfig({ events_per_second: 250, null_rate: 0.5, schema_drift_rate: 0.2 });
        setActivePresetStep(1);
        showToast("Step 1: Pipeline running in healthy nominal mode");
      }
    },
    {
      step: 2,
      title: "Inject Chaos Anomaly Burst",
      desc: "Simulates upstream microservice failure generating corrupted NULL payloads, spiking error rate >2.0%.",
      action: async () => {
        await handleInjectHighError();
        setActivePresetStep(2);
      }
    },
    {
      step: 3,
      title: "Circuit Breaker Tripping & DLQ Isolation",
      desc: "Flink Circuit Breaker detects SLA violation, flips to OPEN, and isolates Apache Iceberg table while diverting bad records to DLQ.",
      action: async () => {
        await handleTriggerBreaker();
        setActivePresetStep(3);
      }
    },
    {
      step: 4,
      title: "Automated Self-Healing & Verification",
      desc: "Remediation engine re-fetches from source, repairs batches, tests canary in HALF_OPEN, and resumes ingestion.",
      action: async () => {
        await handleTriggerRemediation();
        setActivePresetStep(4);
      }
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Chaos Engineering &amp; Simulation Studio</h2>
          <p className="text-xs text-[#7DD3FC]/70 mt-1">
            Inject realistic streaming telemetry failure modes to test circuit breakers, Great Expectations contracts, and self-healing
          </p>
        </div>

        {notification && (
          <div className="px-4 py-2 rounded-2xl bg-[#0B111E] border border-[#00F0FF] text-[#00F0FF] text-xs font-mono shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-pulse">
            {notification}
          </div>
        )}
      </div>

      {/* Guided Walkthrough Presets */}
      <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div>
          <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Interactive Demonstration Walkthrough</h3>
          <p className="text-xs text-[#7DD3FC]/70">Step through the complete end-to-end incident &amp; recovery lifecycle</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {walkthroughSteps.map((ws) => {
            const isActive = activePresetStep === ws.step;
            return (
              <div
                key={ws.step}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                  isActive
                    ? "border-[#00F0FF] bg-[#05080E] ring-1 ring-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                    : "border-[#162032] bg-[#05080E]/60 hover:bg-[#05080E] hover:border-[#38BDF8]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold font-mono px-2.5 py-0.5 rounded-full bg-[#0B111E] text-[#00F0FF] border border-[#00F0FF]/40">
                      Step {ws.step}
                    </span>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00F0FF]" />}
                  </div>
                  <h4 className="text-xs font-bold text-[#F0F9FF] mt-2 font-mono">{ws.title}</h4>
                  <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed font-sans">{ws.desc}</p>
                </div>

                <button
                  onClick={ws.action}
                  className="w-full py-2 px-3 rounded-xl bg-[#0B111E] hover:bg-[#00F0FF] hover:text-[#05080E] text-[#00F0FF] border border-[#162032] hover:border-[#00F0FF] text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
                >
                  Execute Step {ws.step}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Stream Generator Controls & Sliders */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-[#162032] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Stream Ingestion Generator</h3>
              <p className="text-xs text-[#7DD3FC]/70">Control event rate and continuous anomaly noise floor</p>
            </div>
            <button
              onClick={handleToggleGenerator}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                config.is_running
                  ? "bg-[#2D0D12] text-[#FB7185] border-[#FB7185]/60 hover:bg-[#3D141C]"
                  : "bg-[#06241B] text-[#34D399] border-[#10B981]/50 hover:bg-[#0A3327]"
              }`}
            >
              {config.is_running ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{config.is_running ? "PAUSE STREAM" : "RESUME STREAM"}</span>
            </button>
          </div>

          {/* Throughput Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#94A3B8] font-semibold">Throughput Rate:</span>
              <span className="text-[#00F0FF] font-bold">{config.events_per_second} events / sec</span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={config.events_per_second}
              onChange={(e) => handleUpdateConfig({ events_per_second: Number(e.target.value) })}
              className="w-full h-2 bg-[#162032] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
            />
            <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
              <span>50 eps</span>
              <span>1,000 eps</span>
              <span>2,000 eps</span>
            </div>
          </div>

          {/* NULL Anomaly Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#94A3B8] font-semibold">NULL Field Rate:</span>
              <span className="text-[#FB7185] font-bold">{config.null_rate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={config.null_rate}
              onChange={(e) => handleUpdateConfig({ null_rate: Number(e.target.value) })}
              className="w-full h-2 bg-[#162032] rounded-lg appearance-none cursor-pointer accent-[#FB7185]"
            />
          </div>

          {/* Schema Drift Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#94A3B8] font-semibold">Schema Drift Rate:</span>
              <span className="text-[#FBBF24] font-bold">{config.schema_drift_rate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={config.schema_drift_rate}
              onChange={(e) => handleUpdateConfig({ schema_drift_rate: Number(e.target.value) })}
              className="w-full h-2 bg-[#162032] rounded-lg appearance-none cursor-pointer accent-[#FBBF24]"
            />
          </div>
        </div>

        {/* Right Column: 1-Click Chaos Injectors & Safety Switches */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="border-b border-[#162032] pb-4">
            <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Instant Chaos Injectors</h3>
            <p className="text-xs text-[#7DD3FC]/70">Trigger explicit real-world data corruption anomalies</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleInjectNull}
              className="p-4 rounded-2xl border border-[#162032] bg-[#05080E] hover:border-[#FB7185] hover:bg-[#2D0D12]/20 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-[#FB7185] font-bold text-xs font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Inject NULL Values</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Sends missing customer_id &amp; total_amount values violating Rule 1 &amp; 7.
              </p>
            </button>

            <button
              onClick={handleInjectSchema}
              className="p-4 rounded-2xl border border-[#162032] bg-[#05080E] hover:border-[#FBBF24] hover:bg-[#291B07]/20 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-[#FBBF24] font-bold text-xs font-mono">
                <Zap className="w-4 h-4" />
                <span>Inject Schema Drift</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Injects unexpected field changes breaking schema contract (Rule 6).
              </p>
            </button>

            <button
              onClick={handleInjectAmounts}
              className="p-4 rounded-2xl border border-[#162032] bg-[#05080E] hover:border-[#38BDF8] hover:bg-[#0284C7]/20 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-xs font-mono">
                <Sliders className="w-4 h-4" />
                <span>Invalid Amounts</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Injects negative prices and quantity mismatches violating Rule 2 &amp; 5.
              </p>
            </button>

            <button
              onClick={handleInjectHighError}
              className="p-4 rounded-2xl border border-[#162032] bg-[#05080E] hover:border-[#FB7185] hover:bg-[#2D0D12]/20 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-[#FB7185] font-bold text-xs font-mono">
                <Flame className="w-4 h-4" />
                <span>Trigger SLA Trip</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1 font-sans">
                Forces 6.5% error spike to trip Circuit Breaker immediately.
              </p>
            </button>
          </div>

          {/* Circuit Breaker Manual Controls */}
          <div className="pt-3 border-t border-[#162032] space-y-3">
            <span className="text-xs font-bold text-[#38BDF8] uppercase font-mono tracking-wider">
              Circuit Breaker Manual Override
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTriggerBreaker}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#2D0D12] hover:bg-[#3D141C] border border-[#FB7185]/60 text-[#FB7185] text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Force OPEN
              </button>

              <button
                onClick={handleResetBreaker}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#06241B] hover:bg-[#0A3327] border border-[#10B981]/50 text-[#34D399] text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Reset CLOSED
              </button>

              <button
                onClick={handleTriggerRemediation}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#291B07] hover:bg-[#3B280B] border border-[#F59E0B]/50 text-[#FBBF24] text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Trigger Recovery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
