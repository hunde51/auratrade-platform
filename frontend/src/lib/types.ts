// Types for the AuraTrade platform

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Wallet {
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
}

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  marketCap?: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price: number;
  limitPrice?: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  timestamp: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface SentimentData {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  fearGreedIndex: number; // 0 to 100
  sources: {
    name: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
  }[];
}

export interface VolatilityPrediction {
  symbol: string;
  currentVolatility: number;
  predictedVolatility: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export interface AIInsight {
  id: string;
  title: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timestamp: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: string;
}

export interface AdminStats {
  totalUsers: number;
  totalTrades: number;
  totalVolume: number;
  paperLiquidity: number;
  activeUsers: number;
  apiCalls: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  apiLatency: number;
  workerStatus: 'running' | 'stopped' | 'error';
  lastUpdated: string;
}
