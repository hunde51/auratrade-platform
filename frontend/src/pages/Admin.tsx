import { FormEvent, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AIUsageChart } from "@/components/admin/AIUsageChart";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { SystemStatus } from "@/components/admin/SystemStatus";
import { useAIUsage, useAdminStats, useAdminSystem, useTradesOverTime, useUserGrowth } from "@/hooks/useAdmin";
import { sendGlobalAdminAlert } from "@/services/adminApi";

export default function AdminPage() {
  const [alertMessage, setAlertMessage] = useState("");

  const statsQuery = useAdminStats();
  const systemQuery = useAdminSystem();
  const aiUsageQuery = useAIUsage();
  const tradesSeriesQuery = useTradesOverTime();
  const userGrowthQuery = useUserGrowth();

  const stats = statsQuery.data;
  const system = systemQuery.data;
  const aiUsage = aiUsageQuery.data;
  const tradesSeries = tradesSeriesQuery.data;
  const userGrowth = userGrowthQuery.data;

  const aiBreakdown = useMemo(
    () => [
      { name: "success", value: aiUsage?.successCount ?? 0 },
      { name: "failure", value: aiUsage?.failureCount ?? 0 },
      { name: "fallback", value: aiUsage?.fallbackCount ?? 0 },
    ],
    [aiUsage]
  );

  const onBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!alertMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await sendGlobalAdminAlert(alertMessage.trim());
      toast.success("Global alert queued");
      setAlertMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send alert";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="glass-card h-24 animate-pulse p-4" />
          ))}
        </div>
      ) : statsQuery.isError ? (
        <div className="glass-card flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-red-300">Failed to load admin stats.</span>
          <button
            type="button"
            onClick={() => statsQuery.refetch()}
            className="rounded-md bg-secondary px-3 py-1.5 text-xs"
          >
            Retry
          </button>
        </div>
      ) : (
        stats && <StatsGrid stats={stats} />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 xl:col-span-2">
          <h3 className="text-sm font-semibold">Trades Over Time</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tradesSeries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {tradesSeriesQuery.isError && (
            <div className="mt-3 flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
              <span className="text-red-300">Unable to load trade series.</span>
              <button type="button" onClick={() => tradesSeriesQuery.refetch()} className="rounded bg-secondary px-2 py-1">
                Retry
              </button>
            </div>
          )}
        </motion.div>

        {systemQuery.isLoading ? (
          <div className="glass-card h-64 animate-pulse p-6" />
        ) : systemQuery.isError ? (
          <div className="glass-card flex h-64 flex-col items-center justify-center gap-2 p-6 text-sm">
            <p className="text-red-300">Failed to load system health.</p>
            <button type="button" onClick={() => systemQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
              Retry
            </button>
          </div>
        ) : (
          system && <SystemStatus data={system} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-sm font-semibold">User Growth</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {aiUsageQuery.isLoading ? (
          <div className="glass-card h-56 animate-pulse p-6" />
        ) : aiUsageQuery.isError ? (
          <div className="glass-card flex h-56 flex-col items-center justify-center gap-2 p-6 text-sm">
            <p className="text-red-300">Failed to load AI usage.</p>
            <button type="button" onClick={() => aiUsageQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
              Retry
            </button>
          </div>
        ) : (
          aiUsage && <AIUsageChart usage={aiUsage} />
        )}

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onBroadcast}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold">Global Alert</h3>
          <p className="mt-1 text-xs text-muted-foreground">Broadcast a system-wide message.</p>
          <textarea
            value={alertMessage}
            onChange={(event) => setAlertMessage(event.target.value)}
            placeholder="Enter alert message"
            className="mt-4 h-28 w-full rounded-md border border-border bg-secondary p-3 text-sm"
          />
          <button
            type="submit"
            className="mt-3 h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Send Alert
          </button>
        </motion.form>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold">AI Request Mix</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {aiBreakdown.map((item) => (
            <div key={item.name} className="rounded-md bg-secondary/40 p-3">
              <p className="text-xs uppercase text-muted-foreground">{item.name}</p>
              <p className="text-lg font-semibold">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        {aiUsageQuery.isError && (
          <p className="mt-3 text-xs text-red-300">Request mix may be stale due to API errors.</p>
        )}
      </div>
    </div>
  );
}

