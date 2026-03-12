"use client";

import { useHealth } from "@/hooks/useHealth";

export default function BackendStatus() {
  const { data, error, isLoading } = useHealth();

  if (isLoading) {
    return (
      <div className="panel-muted rounded-2xl p-5">
        <p className="section-kicker mb-2">System Status</p>
        <p className="surface-title mb-3">Backend connectivity</p>
        <p className="mono text-sm muted">Checking FastAPI connection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-muted rounded-2xl p-5">
        <p className="section-kicker mb-2">System Status</p>
        <p className="surface-title mb-3">Backend connectivity</p>
        <p className="mono text-sm" style={{ color: "var(--danger)" }}>
          FastAPI connection failed.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-muted rounded-2xl p-5">
      <p className="section-kicker mb-2">System Status</p>
      <p className="surface-title mb-3">Backend connectivity</p>
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3">
        <span className="status-dot" />
        <p className="mono text-sm" style={{ color: "var(--success)" }}>
          FastAPI connection: {data?.status}
        </p>
      </div>
    </div>
  );
}
