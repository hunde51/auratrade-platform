import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getSentiment, getVolatility, getInsights, getNews } from '@/services/mockApi';
import { SentimentPanel, VolatilityGauge, AIInsightsPanel, NewsPanel } from '@/components/ai/AIWidgets';

export default function AIPage() {
  const { data: sentiment } = useQuery({ queryKey: ['sentiment'], queryFn: getSentiment });
  const { data: volatility } = useQuery({ queryKey: ['volatility'], queryFn: getVolatility });
  const { data: insights } = useQuery({ queryKey: ['insights'], queryFn: getInsights });
  const { data: news } = useQuery({ queryKey: ['news'], queryFn: getNews });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">AI Insights</h2>
        <p className="text-sm text-muted-foreground">AI-powered financial intelligence</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {insights && <AIInsightsPanel insights={insights} />}
          {news && <NewsPanel news={news} />}
        </div>
        <div className="space-y-6">
          {sentiment && <SentimentPanel data={sentiment} />}
          {volatility && <VolatilityGauge predictions={volatility} />}
        </div>
      </div>
    </div>
  );
}
