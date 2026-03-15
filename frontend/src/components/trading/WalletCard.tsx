import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { Wallet } from '@/lib/types';
import { Wallet as WalletIcon, TrendingUp, TrendingDown } from 'lucide-react';

export function WalletCard({ wallet }: { wallet: Wallet }) {
  const isPositive = wallet.dailyPnL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 neon-border"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <WalletIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(wallet.balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-xs text-muted-foreground">Equity</p>
          <p className="text-sm font-semibold">{formatCurrency(wallet.equity)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily P&L</p>
          <div className="flex items-center gap-1">
            {isPositive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
            <p className={`text-sm font-semibold ${isPositive ? 'price-green' : 'price-red'}`}>
              {formatCurrency(wallet.dailyPnL)} ({formatPercent(wallet.dailyPnLPercent)})
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margin Used</p>
          <p className="text-sm font-semibold">{formatCurrency(wallet.marginUsed)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Free Margin</p>
          <p className="text-sm font-semibold">{formatCurrency(wallet.freeMargin)}</p>
        </div>
      </div>
    </motion.div>
  );
}
