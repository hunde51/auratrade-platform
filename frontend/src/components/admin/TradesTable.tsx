import type { AdminTradeRow } from "@/services/adminApi";

type TradesTableProps = {
  trades: AdminTradeRow[];
};

export function TradesTable({ trades }: TradesTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-border/70">
                <td className="px-4 py-3">{trade.user}</td>
                <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                <td className="px-4 py-3">
                  <span className={trade.side === "buy" ? "price-green font-semibold" : "price-red font-semibold"}>
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">${trade.price.toLocaleString()}</td>
                <td className="px-4 py-3">{trade.quantity}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(trade.time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
