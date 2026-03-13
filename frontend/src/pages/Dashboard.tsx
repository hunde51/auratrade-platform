import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getWallet, getMarketPrices, getPositions, getTrades, getSentiment } from '@/services/mockApi';
import { useMarketStore } from '@/store/useMarketStore';
import { useTradingStore } from '@/store/useTradingStore';
import { WalletCard } from '@/components/trading/WalletCard';
import { PositionTable } from '@/components/trading/PositionTable';
import { TradeHistory } from '@/components/trading/TradeHistory';
import { PriceTicker } from '@/components/market/MarketWidgets';
import { SentimentPanel } from '@/components/ai/AIWidgets';
import { REFRESH_INTERVAL } from '@/lib/constants';

export default function DashboardPage() {
  const setPrices = useMarketStore((s) => s.setPrices);
  const prices = useMarketStore((s) => s.prices);
  const setPositions = useTradingStore((s) => s.setPositions);
  const setTrades = useTradingStore((s) => s.setTrades);
  const positions = useTradingStore((s) => s.positions);
  const trades = useTradingStore((s) => s.trades);

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const { data: sentiment } = useQuery({ queryKey: ['sentiment'], queryFn: getSentiment });

  // Simulated live price updates
  useEffect(() => {
    const fetch = async () => {
      const p = await getMarketPrices();
      setPrices(p);
    };
    fetch();
    const interval = setInterval(fetch, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [setPrices]);

  useEffect(() => {
    getPositions().then(setPositions);
    getTrades().then(setTrades);
  }, [setPositions, setTrades]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Your trading overview</p>
      </motion.div>

      {prices.length > 0 && <PriceTicker prices={prices} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {wallet && <WalletCard wallet={wallet} />}
          <PositionTable positions={positions} />
          <TradeHistory trades={trades} />
        </div>
        <div>
          {sentiment && <SentimentPanel data={sentiment} />}
        </div>
      </div>
    </div>
  );
}
