import { motion } from 'framer-motion';
import { formatCurrency, formatTimestamp } from '@/lib/format';
import type { Trade } from '@/lib/types';

export function TradeHistory({ trades }: { trades: Trade[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold mb-4">Recent Trades</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left pb-3 font-medium">Symbol</th>
              <th className="text-left pb-3 font-medium">Side</th>
              <th className="text-right pb-3 font-medium">Qty</th>
              <th className="text-right pb-3 font-medium">Price</th>
              <th className="text-right pb-3 font-medium">Total</th>
              <th className="text-right pb-3 font-medium hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-3 font-medium">{t.symbol}</td>
                <td className="py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${t.side === 'buy' ? 'bg-green price-green' : 'bg-red price-red'}`}>
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 text-right">{t.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(t.price)}</td>
                <td className="py-3 text-right font-semibold">{formatCurrency(t.total)}</td>
                <td className="py-3 text-right text-muted-foreground hidden md:table-cell">{formatTimestamp(t.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
