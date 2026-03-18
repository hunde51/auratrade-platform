import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminAIUsage } from "@/services/adminApi";

type AIUsageChartProps = {
  usage: AdminAIUsage;
};

export function AIUsageChart({ usage }: AIUsageChartProps) {
  const data = [
    { name: "Success", value: usage.successCount, color: "#22c55e" },
    { name: "Failure", value: usage.failureCount, color: "#ef4444" },
    { name: "Fallback", value: usage.fallbackCount, color: "#eab308" },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold">AI Usage</h3>
      <p className="mt-1 text-xs text-muted-foreground">Total requests: {usage.totalRequests.toLocaleString()}</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {data.map((item) => (
          <div key={item.name} className="rounded-md bg-secondary/40 p-2 text-center">
            <p className="text-muted-foreground">{item.name}</p>
            <p className="font-semibold">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
