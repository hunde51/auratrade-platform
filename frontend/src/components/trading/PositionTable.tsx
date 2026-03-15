import { motion } from 'framer-motion';
import { formatCurrency, formatPercent, formatTimestamp } from '@/lib/format';
import type { Position } from '@/lib/types';

export function PositionTable({ positions }: { positions: Position[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold mb-4">Open Positions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left pb-3 font-medium">Symbol</th>
              <th className="text-left pb-3 font-medium">Side</th>
              <th className="text-right pb-3 font-medium">Qty</th>
              <th className="text-right pb-3 font-medium">Entry</th>
              <th className="text-right pb-3 font-medium">Current</th>
              <th className="text-right pb-3 font-medium">P&L</th>
              <th className="text-right pb-3 font-medium hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-3 font-medium">{p.symbol}</td>
                <td className="py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.side === 'long' ? 'bg-green price-green' : 'bg-red price-red'}`}>
                    {p.side.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 text-right">{p.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(p.entryPrice)}</td>
                <td className="py-3 text-right">{formatCurrency(p.currentPrice)}</td>
                <td className={`py-3 text-right font-semibold ${p.pnl >= 0 ? 'price-green' : 'price-red'}`}>
                  {formatCurrency(p.pnl)} ({formatPercent(p.pnlPercent)})
                </td>
                <td className="py-3 text-right text-muted-foreground hidden md:table-cell">{formatTimestamp(p.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
