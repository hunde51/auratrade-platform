import { useEffect, useMemo, useState } from 'react';
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
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('4H');

  const points = useMemo(() => {
    switch (timeframe) {
      case '1H':
        return 48;
      case '4H':
        return 72;
      case '1D':
        return 120;
      case '1W':
        return 200;
      default:
        return 72;
    }
  }, [timeframe]);

  const backendTimeframe = useMemo(() => {
    switch (timeframe) {
      case '1H':
        return '1h' as const;
      case '4H':
        return '4h' as const;
      case '1D':
        return '1d' as const;
      case '1W':
        return '1w' as const;
      default:
        return '4h' as const;
    }
  }, [timeframe]);

  const { data: candles, isFetching: candlesUpdating } = useQuery({
    queryKey: ['candles', selectedSymbol, points, backendTimeframe],
    queryFn: () => getCandles(selectedSymbol, points, backendTimeframe),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 0,
    refetchOnWindowFocus: true,
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
          {candles && (
            <MarketChart
              data={candles}
              symbol={selectedSymbol}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              isUpdating={candlesUpdating}
            />
          )}
          <TopMovers prices={prices} />
        </div>
        <div>
          <Watchlist prices={prices} />
        </div>
      </div>
    </div>
  );
}
