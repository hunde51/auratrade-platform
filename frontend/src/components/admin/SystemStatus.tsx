import type { AdminSystemHealth } from "@/services/adminApi";

type SystemStatusProps = {
  data: AdminSystemHealth;
};

const badgeClass = {
  healthy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  connected: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  running: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  down: "bg-red-500/20 text-red-300 border-red-500/40",
  disconnected: "bg-red-500/20 text-red-300 border-red-500/40",
  stopped: "bg-red-500/20 text-red-300 border-red-500/40",
};

export function SystemStatus({ data }: SystemStatusProps) {
  const rows = [
    { label: "API", value: data.apiStatus },
    { label: "Database", value: data.databaseStatus },
    { label: "Redis", value: data.redisStatus },
    { label: "Worker", value: data.workerStatus },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold">System Health</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${badgeClass[row.value]}`}>
              {row.value}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">WebSocket Connections</span>
          <span className="text-sm font-semibold">{data.websocketConnections}</span>
        </div>
      </div>
    </div>
  );
}
