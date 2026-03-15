import { motion } from 'framer-motion';
import type { AdminStats, SystemHealth } from '@/lib/types';
import { formatCurrency, formatVolume } from '@/lib/format';
import { Users, BarChart3, DollarSign, Activity, Cpu, HardDrive, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

export function StatsPanel({ stats }: { stats: AdminStats }) {
  const items = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'Total Trades', value: stats.totalTrades.toLocaleString(), icon: BarChart3, color: 'text-success' },
    { label: 'Total Volume', value: formatCurrency(stats.totalVolume), icon: DollarSign, color: 'text-warning' },
    { label: 'Paper Liquidity', value: formatCurrency(stats.paperLiquidity), icon: Activity, color: 'text-primary' },
    { label: 'Active Users', value: stats.activeUsers.toLocaleString(), icon: Users, color: 'price-green' },
    { label: 'API Calls', value: formatVolume(stats.apiCalls), icon: Zap, color: 'text-warning' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SystemHealthPanel({ health }: { health: SystemHealth }) {
  const statusColor = health.status === 'healthy' ? 'price-green' : health.status === 'degraded' ? 'text-warning' : 'price-red';
  const StatusIcon = health.status === 'healthy' ? CheckCircle2 : AlertTriangle;

  const metrics = [
    { label: 'CPU Usage', value: `${health.cpuUsage}%`, max: 100, current: health.cpuUsage, icon: Cpu },
    { label: 'Memory', value: `${health.memoryUsage}%`, max: 100, current: health.memoryUsage, icon: HardDrive },
    { label: 'API Latency', value: `${health.apiLatency}ms`, max: 100, current: health.apiLatency, icon: Zap },
    { label: 'Uptime', value: `${health.uptime}%`, max: 100, current: health.uptime, icon: Activity },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold">System Health</h3>
        <div className={`flex items-center gap-1.5 ${statusColor}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{health.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-sm font-bold mb-1">{m.value}</p>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(m.current, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Worker Status</span>
        <span className={`font-semibold ${health.workerStatus === 'running' ? 'price-green' : 'price-red'}`}>
          {health.workerStatus.toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}
