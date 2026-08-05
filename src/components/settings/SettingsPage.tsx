import React from "react";
import {
  Server,
  Shield
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight font-mono">Platform Configuration &amp; SLA Thresholds</h2>
        <p className="text-xs text-[#7DD3FC]/70 mt-1">
          Observability engine operational parameters, Kafka topics, Iceberg REST catalog credentials, and circuit breaker trip thresholds
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quality Engine Settings */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 border-b border-[#162032] pb-4">
            <Shield className="w-4 h-4 text-[#00F0FF]" />
            <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Circuit Breaker &amp; SLA Thresholds</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Circuit Trip Error Rate:</span>
              <span className="text-[#FB7185] font-bold">2.0%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Sliding Evaluation Window:</span>
              <span className="text-[#F0F9FF]">60 seconds</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Auto-Remediation Trigger:</span>
              <span className="text-[#34D399] font-bold">Enabled</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Half-Open Canary Batch:</span>
              <span className="text-[#F0F9FF]">500 records</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#94A3B8]">Max Auto-Recovery Retries:</span>
              <span className="text-[#38BDF8] font-bold">3 attempts</span>
            </div>
          </div>
        </div>

        {/* Infrastructure Connection Details */}
        <div className="p-6 rounded-3xl border border-[#162032] bg-[#0B111E] space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 border-b border-[#162032] pb-4">
            <Server className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-[#F0F9FF] font-mono">Lakehouse Infrastructure Endpoints</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Kafka Bootstrap Servers:</span>
              <span className="text-[#F0F9FF]">kafka:9092 (KRaft)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Ingestion Topic:</span>
              <span className="text-[#00F0FF] font-bold">checkout-events (3p, 1r)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Iceberg REST Catalog:</span>
              <span className="text-[#F0F9FF]">http://iceberg-rest:8181</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#162032]">
              <span className="text-[#94A3B8]">Object Storage Warehouse:</span>
              <span className="text-[#38BDF8]">s3://warehouse/ecommerce</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#94A3B8]">Flink Checkpoint Interval:</span>
              <span className="text-[#F0F9FF]">5000 ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
