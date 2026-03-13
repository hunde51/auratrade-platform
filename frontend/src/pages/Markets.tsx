import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getMarketPrices, getCandles } from '@/services/mockApi';
import { useMarketStore } from '@/store/useMarketStore';
import { PriceTicker, Watchlist, TopMovers } from '@/components/market/MarketWidgets';
import { MarketChart } from '@/components/market/MarketChart';
import { REFRESH_INTERVAL } from '@/lib/constants';

export default function MarketsPage() {
  const setPrices = useMarketStore((s) => s.setPrices);
  const prices = useMarketStore((s) => s.prices);
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);

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

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Markets</h2>
        <p className="text-sm text-muted-foreground">Live market data & analysis</p>
      </motion.div>

      {prices.length > 0 && <PriceTicker prices={prices} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {candles && <MarketChart data={candles} symbol={selectedSymbol} />}
          <TopMovers prices={prices} />
        </div>
        <div>
          <Watchlist prices={prices} />
        </div>
      </div>
    </div>
  );
}
