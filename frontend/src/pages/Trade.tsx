import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getMarketPrices, getCandles, getPositions, getTrades } from '@/services/mockApi';
import { useMarketStore } from '@/store/useMarketStore';
import { useTradingStore } from '@/store/useTradingStore';
import { MarketChart } from '@/components/market/MarketChart';
import { OrderPanel } from '@/components/trading/OrderPanel';
import { PositionTable } from '@/components/trading/PositionTable';
import { TradeHistory } from '@/components/trading/TradeHistory';
import { REFRESH_INTERVAL } from '@/lib/constants';

export default function TradePage() {
  const setPrices = useMarketStore((s) => s.setPrices);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const setPositions = useTradingStore((s) => s.setPositions);
  const setTrades = useTradingStore((s) => s.setTrades);
  const positions = useTradingStore((s) => s.positions);
  const trades = useTradingStore((s) => s.trades);

  const { data: candles } = useQuery({
    queryKey: ['candles', selectedSymbol],
    queryFn: () => getCandles(selectedSymbol),
  });

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
        <h2 className="text-lg font-bold mb-1">Trade</h2>
        <p className="text-sm text-muted-foreground">Execute paper trades</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {candles && <MarketChart data={candles} symbol={selectedSymbol} />}
          <PositionTable positions={positions} />
          <TradeHistory trades={trades} />
        </div>
        <div>
          <OrderPanel />
        </div>
      </div>
    </div>
  );
}
