import { AdminCard } from "@/components/admin/AdminCard";
import type { AdminOverviewStats } from "@/services/adminApi";
import { formatCurrency } from "@/lib/format";

type StatsGridProps = {
  stats: AdminOverviewStats;
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
      <AdminCard label="Total Trades" value={stats.totalTrades.toLocaleString()} accent="text-success" />
      <AdminCard label="System Liquidity" value={formatCurrency(stats.systemLiquidity)} accent="text-warning" />
      <AdminCard label="Active Users (24h)" value={stats.activeUsers24h.toLocaleString()} accent="price-green" />
    </div>
  );
}
