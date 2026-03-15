import { motion } from 'framer-motion';
import type { SentimentData, VolatilityPrediction, AIInsight, NewsItem } from '@/lib/types';
import { formatTimestamp } from '@/lib/format';
import { Brain, TrendingUp, TrendingDown, Minus, Newspaper, Activity } from 'lucide-react';

const sentimentColors = {
  bullish: 'price-green',
  bearish: 'price-red',
  neutral: 'text-warning',
};

const sentimentBg = {
  bullish: 'bg-green',
  bearish: 'bg-red',
  neutral: 'bg-warning/15',
};

export function SentimentPanel({ data }: { data: SentimentData }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Market Sentiment</h3>
      </div>

      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${sentimentBg[data.overall]} ${sentimentColors[data.overall]}`}>
          {data.overall === 'bullish' ? <TrendingUp className="h-4 w-4" /> : data.overall === 'bearish' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {data.overall.toUpperCase()}
        </div>
        <p className="text-3xl font-bold mt-3">{data.score}</p>
        <p className="text-xs text-muted-foreground">Sentiment Score</p>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Fear & Greed Index</span>
          <span className="font-semibold">{data.fearGreedIndex}/100</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-destructive via-warning to-success transition-all"
            style={{ width: `${data.fearGreedIndex}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {data.sources.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.name}</span>
            <span className={`font-semibold ${sentimentColors[s.sentiment]}`}>{s.score}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function VolatilityGauge({ predictions }: { predictions: VolatilityPrediction[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Volatility Predictions</h3>
      </div>

      <div className="space-y-4">
        {predictions.map((p) => (
          <div key={p.symbol} className="bg-secondary/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{p.symbol}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                p.direction === 'increasing' ? 'bg-red price-red' :
                p.direction === 'decreasing' ? 'bg-green price-green' :
                'bg-warning/15 text-warning'
              }`}>
                {p.direction}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Current</p>
                <p className="font-semibold">{p.currentVolatility}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Predicted</p>
                <p className="font-semibold">{p.predictedVolatility}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Confidence</p>
                <p className="font-semibold text-primary">{p.confidence}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function AIInsightsPanel({ insights }: { insights: AIInsight[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-4">AI Trading Insights</h3>
      <div className="space-y-3">
        {insights.map((i) => (
          <div key={i.id} className="border-l-2 border-primary/50 pl-3 py-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sentimentBg[i.sentiment]} ${sentimentColors[i.sentiment]}`}>
                {i.sentiment.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">{i.confidence}% confidence</span>
            </div>
            <p className="text-sm font-medium">{i.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{i.summary}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{formatTimestamp(i.timestamp)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function NewsPanel({ news }: { news: NewsItem[] }) {
  const sentimentIcon = {
    positive: <TrendingUp className="h-3 w-3 text-success" />,
    negative: <TrendingDown className="h-3 w-3 text-destructive" />,
    neutral: <Minus className="h-3 w-3 text-warning" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">News Feed</h3>
      </div>
      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
            <div className="mt-1">{sentimentIcon[n.sentiment]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{n.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{n.source}</span>
                <span className="text-xs text-muted-foreground/60">{formatTimestamp(n.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
