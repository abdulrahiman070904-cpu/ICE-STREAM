/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar, TabId } from "./components/layout/Sidebar";
import { HomeOverview } from "./components/dashboard/HomeOverview";
import { PipelineLineage } from "./components/lineage/PipelineLineage";
import { DataQualityPage } from "./components/quality/DataQualityPage";
import { IncidentsPage } from "./components/incidents/IncidentsPage";
import { DLQPage } from "./components/dlq/DLQPage";
import { RemediationPage } from "./components/remediation/RemediationPage";
import { IcebergSnapshotsPage } from "./components/iceberg/IcebergSnapshotsPage";
import { LiveEventConsole } from "./components/logs/LiveEventConsole";
import { ChaosControlPanel } from "./components/simulation/ChaosControlPanel";
import { SettingsPage } from "./components/settings/SettingsPage";
import { useWebSocket } from "./hooks/useWebSocket";
import { api } from "./services/api";
import { PipelineHealthStatus } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [pipelineStatus, setPipelineStatus] = useState<PipelineHealthStatus | null>(null);
  const [showChaosModal, setShowChaosModal] = useState(false);

  const {
    isConnected,
    liveMetrics,
    recentLogs,
    activeIncident,
    activeWorkflow,
    latestSnapshot
  } = useWebSocket();

  // Polling pipeline status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await api.getPipelineStatus();
        setPipelineStatus(status);
      } catch (err) {
        console.error("Failed to fetch pipeline status:", err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCircuit = async () => {
    try {
      await api.resetCircuitBreaker();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerRemediation = async () => {
    try {
      await api.triggerRemediation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectAnomaly = async () => {
    try {
      await api.injectHighErrorRate();
      setActiveTab("simulation");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080E] text-[#E2F1FD] flex flex-col antialiased selection:bg-[#0284C7]/30 selection:text-[#67E8F9]">
      {/* Global Application Header */}
      <Header
        isConnected={isConnected}
        metrics={liveMetrics}
        onOpenSimulation={() => setActiveTab("simulation")}
        onResetCircuit={handleResetCircuit}
      />

      {/* Main Body Area: Sidebar + Scrollable Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeIncidentsCount={liveMetrics?.active_incidents_count || 0}
          dlqCount={liveMetrics?.dlq_records_count || 0}
          circuitState={liveMetrics?.circuit_breaker_status || "CLOSED"}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#05080E]">
          <div className="max-w-7xl mx-auto">
            {activeTab === "dashboard" && (
              <HomeOverview
                metrics={liveMetrics}
                pipelineStatus={pipelineStatus}
                activeIncident={activeIncident}
                onNavigate={setActiveTab}
                onInjectAnomaly={handleInjectAnomaly}
              />
            )}

            {activeTab === "lineage" && (
              <PipelineLineage
                pipelineStatus={pipelineStatus}
                metrics={liveMetrics}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === "quality" && (
              <DataQualityPage
                metrics={liveMetrics}
                onOpenSimulation={() => setActiveTab("simulation")}
              />
            )}

            {activeTab === "incidents" && (
              <IncidentsPage onNavigate={setActiveTab} />
            )}

            {activeTab === "dlq" && <DLQPage />}

            {activeTab === "remediation" && (
              <RemediationPage onTriggerRemediation={handleTriggerRemediation} />
            )}

            {activeTab === "snapshots" && <IcebergSnapshotsPage />}

            {activeTab === "logs" && (
              <LiveEventConsole recentLogs={recentLogs} />
            )}

            {activeTab === "simulation" && (
              <ChaosControlPanel metrics={liveMetrics} />
            )}

            {activeTab === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

