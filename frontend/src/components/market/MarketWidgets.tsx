import { motion } from 'framer-motion';
import { formatCurrency, formatPercent, formatVolume } from '@/lib/format';
import type { MarketPrice } from '@/lib/types';
import { useMarketStore } from '@/store/useMarketStore';

export function PriceTicker({ prices }: { prices: MarketPrice[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden glass-card"
    >
      <div className="flex animate-ticker whitespace-nowrap py-3 px-4">
        {[...prices, ...prices].map((p, i) => (
          <div key={`${p.symbol}-${i}`} className="flex items-center gap-3 mx-6 shrink-0">
            <span className="text-sm font-semibold">{p.symbol}</span>
            <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
            <span className={`text-xs font-medium ${p.change >= 0 ? 'price-green' : 'price-red'}`}>
              {formatPercent(p.changePercent)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Watchlist({ prices }: { prices: MarketPrice[] }) {
  const setSelectedSymbol = useMarketStore((s) => s.setSelectedSymbol);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold mb-4">Watchlist</h3>
      <div className="space-y-1">
        {prices.map((p) => (
          <button
            key={p.symbol}
            onClick={() => setSelectedSymbol(p.symbol)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors ${
              selectedSymbol === p.symbol ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50'
            }`}
          >
            <div className="text-left">
              <p className="font-semibold">{p.symbol}</p>
              <p className="text-xs text-muted-foreground">{p.name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(p.price)}</p>
              <p className={`text-xs font-medium ${p.change >= 0 ? 'price-green' : 'price-red'}`}>
                {formatPercent(p.changePercent)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function TopMovers({ prices }: { prices: MarketPrice[] }) {
  const sorted = [...prices].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const top = sorted.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold mb-4">Top Movers</h3>
      <div className="grid grid-cols-2 gap-3">
        {top.map((p) => (
          <div key={p.symbol} className="bg-secondary/50 rounded-md p-3">
            <p className="text-xs text-muted-foreground">{p.symbol}</p>
            <p className="text-sm font-bold mt-1">{formatCurrency(p.price)}</p>
            <p className={`text-xs font-semibold mt-0.5 ${p.change >= 0 ? 'price-green' : 'price-red'}`}>
              {formatPercent(p.changePercent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Vol: {formatVolume(p.volume)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
