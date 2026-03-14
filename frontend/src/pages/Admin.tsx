import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getAdminStats, getSystemHealth } from '@/services/mockApi';
import { StatsPanel, SystemHealthPanel } from '@/components/admin/AdminWidgets';

export default function AdminPage() {
  const { data: stats } = useQuery({ queryKey: ['adminStats'], queryFn: getAdminStats });
  const { data: health } = useQuery({ queryKey: ['systemHealth'], queryFn: getSystemHealth });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">System overview & management</p>
      </motion.div>

      {stats && <StatsPanel stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {health && <SystemHealthPanel health={health} />}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold mb-4">Token Usage</h3>
          <div className="space-y-4">
            {[
              { label: 'GPT-4 Tokens', used: 842000, limit: 1000000 },
              { label: 'Embedding Tokens', used: 2100000, limit: 5000000 },
              { label: 'API Requests', used: 18420, limit: 50000 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{(item.used / 1000).toFixed(0)}K / {(item.limit / 1000).toFixed(0)}K</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(item.used / item.limit) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
