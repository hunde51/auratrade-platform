import { useEffect, useMemo, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi, ColorType } from 'lightweight-charts';
import type { CandleData } from '@/lib/types';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '@/services/http';

interface Props {
  data: CandleData[];
  symbol: string;
  timeframe: '1H' | '4H' | '1D' | '1W';
  onTimeframeChange: (value: '1H' | '4H' | '1D' | '1W') => void;
  isUpdating?: boolean;
}

const TIMEFRAMES: Array<'1H' | '4H' | '1D' | '1W'> = ['1H', '4H', '1D', '1W'];

export function MarketChart({ data, symbol, timeframe, onTimeframeChange, isUpdating = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const lastCandleRef = useRef<CandleData | null>(null);
  const fittedRef = useRef(false);

  const normalizedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    // Deduplicate candles by time so chart updates stay stable.
    const unique: CandleData[] = [];
    for (const candle of sorted) {
      if (unique.length > 0 && unique[unique.length - 1].time === candle.time) {
        unique[unique.length - 1] = candle;
      } else {
        unique.push(candle);
      }
    }
    return unique;
  }, [data]);

  const latest = normalizedData[normalizedData.length - 1];
  const prev = normalizedData[normalizedData.length - 2];
  const delta = latest && prev ? latest.close - prev.close : 0;
  const deltaPct = latest && prev && prev.close !== 0 ? (delta / prev.close) * 100 : 0;
  const pricePositive = delta >= 0;

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(71, 85, 105, 0.13)' },
        horzLines: { color: 'rgba(71, 85, 105, 0.13)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(75, 85, 99, 0.55)',
      },
      timeScale: {
        borderColor: 'rgba(75, 85, 99, 0.55)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => price.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      },
      width: containerRef.current.clientWidth,
      height: 430,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.08,
        bottom: 0.08,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastCandleRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fittedRef.current = false;
  }, [symbol, timeframe]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || normalizedData.length === 0) {
      return;
    }

    series.setData(normalizedData as any);
    if (!fittedRef.current) {
      chart.timeScale().fitContent();
      fittedRef.current = true;
    }
    lastCandleRef.current = normalizedData[normalizedData.length - 1] ?? null;
  }, [normalizedData]);

  useEffect(() => {
    const base = getApiBaseUrl();
    const url = new URL(base);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const normalizedSymbol = symbol.replace(/\//g, '').toUpperCase();
    const ws = new WebSocket(`${wsProtocol}//${url.host}/ws/markets?symbol=${encodeURIComponent(normalizedSymbol)}`);

    const step = (() => {
      switch (timeframe) {
        case '1H':
          return 3600;
        case '4H':
          return 4 * 3600;
        case '1D':
          return 24 * 3600;
        case '1W':
          return 7 * 24 * 3600;
        default:
          return 4 * 3600;
      }
    })();

    ws.onmessage = (event) => {
      const series = seriesRef.current;
      if (!series) {
        return;
      }

      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const quote = payload?.type === 'ticker_update'
        ? payload.quote
        : payload?.type === 'market_snapshot'
          ? (Array.isArray(payload.quotes) ? payload.quotes.find((item: any) => item?.symbol === normalizedSymbol) : null)
          : null;

      if (!quote || quote.symbol !== normalizedSymbol || typeof quote.price !== 'number') {
        return;
      }

      const tickTs = typeof quote.timestamp === 'string' ? Math.floor(new Date(quote.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const bucket = Math.floor(tickTs / step) * step;
      const prev = lastCandleRef.current;

      if (!prev) {
        const first: CandleData = {
          time: bucket,
          open: quote.price,
          high: quote.price,
          low: quote.price,
          close: quote.price,
          volume: 0,
        };
        lastCandleRef.current = first;
        series.update(first as any);
        return;
      }

      // Guard against anomalous ticks creating unrealistic candle spikes in the UI.
      const rawMovePct = Math.abs((quote.price - prev.close) / Math.max(prev.close, 1e-9));
      if (rawMovePct > 0.02) {
        return;
      }

      if (bucket > prev.time) {
        const next: CandleData = {
          time: bucket,
          open: prev.close,
          high: Math.max(prev.close, quote.price),
          low: Math.min(prev.close, quote.price),
          close: quote.price,
          volume: 0,
        };
        lastCandleRef.current = next;
        series.update(next as any);
      } else {
        const updated: CandleData = {
          ...prev,
          high: Math.max(prev.high, quote.price),
          low: Math.min(prev.low, quote.price),
          close: quote.price,
        };
        lastCandleRef.current = updated;
        series.update(updated as any);
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol, timeframe]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{symbol} Chart</h3>
          <p className="text-[11px] text-muted-foreground">Live updates every 2s {isUpdating ? '• syncing...' : ''}</p>
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                tf === timeframe
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      {latest && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] md:grid-cols-6">
          <div className={`rounded bg-secondary/40 px-2 py-1 ${pricePositive ? 'text-emerald-300' : 'text-red-300'}`}>
            C {latest.close.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="rounded bg-secondary/40 px-2 py-1 text-muted-foreground">
            O {latest.open.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="rounded bg-secondary/40 px-2 py-1 text-muted-foreground">
            H {latest.high.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="rounded bg-secondary/40 px-2 py-1 text-muted-foreground">
            L {latest.low.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className={`rounded bg-secondary/40 px-2 py-1 ${pricePositive ? 'text-emerald-300' : 'text-red-300'}`}>
            {delta >= 0 ? '+' : ''}{delta.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className={`rounded bg-secondary/40 px-2 py-1 ${pricePositive ? 'text-emerald-300' : 'text-red-300'}`}>
            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%
          </div>
        </div>
      )}
      <div ref={containerRef} />
    </motion.div>
  );
}
