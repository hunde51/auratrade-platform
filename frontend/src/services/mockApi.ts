import type {
  User, Wallet, MarketPrice, Order, Position, Trade,
  SentimentData, VolatilityPrediction, AIInsight, NewsItem,
  AdminStats, SystemHealth, CandleData,
} from '@/lib/types';
import { randomBetween } from '@/lib/format';

// ─── Mock User ───
const mockUser: User = {
  id: '1',
  email: 'trader@auratrade.com',
  name: 'Alex Morgan',
  role: 'admin',
  createdAt: '2024-01-15T10:00:00Z',
};

// ─── Mock Wallet ───
const mockWallet: Wallet = {
  balance: 100000,
  equity: 104520.50,
  marginUsed: 12400,
  freeMargin: 92120.50,
  dailyPnL: 2340.50,
  dailyPnLPercent: 2.34,
  totalPnL: 4520.50,
};

// ─── Mock Market Prices ───
const basePrices: Record<string, { price: number; name: string }> = {
  'BTC/USD': { price: 67432.50, name: 'Bitcoin' },
  'ETH/USD': { price: 3521.80, name: 'Ethereum' },
  'AAPL': { price: 189.45, name: 'Apple Inc.' },
  'TSLA': { price: 248.90, name: 'Tesla Inc.' },
  'GOOGL': { price: 141.20, name: 'Alphabet Inc.' },
  'AMZN': { price: 178.30, name: 'Amazon.com' },
  'MSFT': { price: 415.60, name: 'Microsoft' },
  'SOL/USD': { price: 142.75, name: 'Solana' },
};

function generateMarketPrices(): MarketPrice[] {
  return Object.entries(basePrices).map(([symbol, { price, name }]) => {
    const change = randomBetween(-price * 0.03, price * 0.03);
    const currentPrice = price + change;
    return {
      symbol,
      name,
      price: currentPrice,
      change,
      changePercent: (change / price) * 100,
      high24h: currentPrice * 1.02,
      low24h: currentPrice * 0.98,
      volume: randomBetween(1e6, 5e9),
    };
  });
}

// ─── Mock Positions ───
const mockPositions: Position[] = [
  { id: '1', symbol: 'BTC/USD', side: 'long', quantity: 0.5, entryPrice: 65000, currentPrice: 67432, pnl: 1216, pnlPercent: 3.74, timestamp: '2024-03-10T14:30:00Z' },
  { id: '2', symbol: 'ETH/USD', side: 'long', quantity: 5, entryPrice: 3400, currentPrice: 3521, pnl: 605, pnlPercent: 3.56, timestamp: '2024-03-11T09:15:00Z' },
  { id: '3', symbol: 'TSLA', side: 'short', quantity: 10, entryPrice: 255, currentPrice: 248.9, pnl: 61, pnlPercent: 2.39, timestamp: '2024-03-12T11:00:00Z' },
  { id: '4', symbol: 'AAPL', side: 'long', quantity: 20, entryPrice: 185, currentPrice: 189.45, pnl: 89, pnlPercent: 2.41, timestamp: '2024-03-12T13:45:00Z' },
];

// ─── Mock Trades ───
const mockTrades: Trade[] = [
  { id: '1', symbol: 'BTC/USD', side: 'buy', quantity: 0.5, price: 65000, total: 32500, timestamp: '2024-03-10T14:30:00Z' },
  { id: '2', symbol: 'ETH/USD', side: 'buy', quantity: 5, price: 3400, total: 17000, timestamp: '2024-03-11T09:15:00Z' },
  { id: '3', symbol: 'TSLA', side: 'sell', quantity: 10, price: 255, total: 2550, timestamp: '2024-03-12T11:00:00Z' },
  { id: '4', symbol: 'AAPL', side: 'buy', quantity: 20, price: 185, total: 3700, timestamp: '2024-03-12T13:45:00Z' },
  { id: '5', symbol: 'GOOGL', side: 'buy', quantity: 15, price: 138, total: 2070, timestamp: '2024-03-12T15:20:00Z' },
  { id: '6', symbol: 'SOL/USD', side: 'buy', quantity: 50, price: 135, total: 6750, timestamp: '2024-03-13T08:10:00Z' },
];

// ─── Mock Orders ───
const mockOrders: Order[] = [
  { id: '1', symbol: 'BTC/USD', side: 'buy', type: 'limit', quantity: 0.25, price: 67000, limitPrice: 64000, status: 'open', timestamp: '2024-03-13T10:00:00Z' },
  { id: '2', symbol: 'MSFT', side: 'buy', type: 'limit', quantity: 10, price: 415, limitPrice: 400, status: 'open', timestamp: '2024-03-13T10:30:00Z' },
];

// ─── Mock Sentiment ───
const mockSentiment: SentimentData = {
  overall: 'bullish',
  score: 72,
  fearGreedIndex: 68,
  sources: [
    { name: 'Social Media', sentiment: 'bullish', score: 78 },
    { name: 'News Articles', sentiment: 'bullish', score: 65 },
    { name: 'Technical Analysis', sentiment: 'neutral', score: 52 },
    { name: 'On-chain Data', sentiment: 'bullish', score: 80 },
  ],
};

// ─── Mock Volatility ───
const mockVolatility: VolatilityPrediction[] = [
  { symbol: 'BTC/USD', currentVolatility: 42, predictedVolatility: 55, direction: 'increasing', confidence: 78 },
  { symbol: 'ETH/USD', currentVolatility: 38, predictedVolatility: 35, direction: 'decreasing', confidence: 82 },
  { symbol: 'TSLA', currentVolatility: 55, predictedVolatility: 60, direction: 'increasing', confidence: 65 },
];

// ─── Mock AI Insights ───
const mockInsights: AIInsight[] = [
  { id: '1', title: 'BTC Breakout Expected', summary: 'Market sentiment is bullish due to strong earnings reports and ETF inflows. Bitcoin likely to test $70k resistance.', sentiment: 'bullish', confidence: 85, timestamp: '2024-03-13T08:00:00Z' },
  { id: '2', title: 'TSLA Earnings Watch', summary: 'Tesla earnings next week may cause increased volatility. Consider hedging long positions.', sentiment: 'neutral', confidence: 72, timestamp: '2024-03-13T07:30:00Z' },
  { id: '3', title: 'ETH Network Upgrade', summary: 'Upcoming Ethereum network upgrade could drive price appreciation. On-chain metrics are positive.', sentiment: 'bullish', confidence: 78, timestamp: '2024-03-13T06:00:00Z' },
  { id: '4', title: 'Fed Rate Decision Impact', summary: 'Federal Reserve likely to hold rates. Markets may rally on dovish commentary.', sentiment: 'bullish', confidence: 68, timestamp: '2024-03-12T22:00:00Z' },
];

// ─── Mock News ───
const mockNews: NewsItem[] = [
  { id: '1', title: 'Bitcoin ETF sees record inflows of $1.2B', source: 'Bloomberg', sentiment: 'positive', timestamp: '2024-03-13T09:00:00Z' },
  { id: '2', title: 'Fed signals potential rate cuts in Q3', source: 'Reuters', sentiment: 'positive', timestamp: '2024-03-13T08:30:00Z' },
  { id: '3', title: 'Tech stocks rally on AI optimism', source: 'CNBC', sentiment: 'positive', timestamp: '2024-03-13T07:45:00Z' },
  { id: '4', title: 'Regulatory concerns weigh on crypto markets', source: 'CoinDesk', sentiment: 'negative', timestamp: '2024-03-13T07:00:00Z' },
  { id: '5', title: 'Apple announces new AI features', source: 'TechCrunch', sentiment: 'positive', timestamp: '2024-03-13T06:30:00Z' },
];

// ─── Mock Admin Stats ───
const mockAdminStats: AdminStats = {
  totalUsers: 12847,
  totalTrades: 284521,
  totalVolume: 1284000000,
  paperLiquidity: 5420000000,
  activeUsers: 3421,
  apiCalls: 1842000,
};

const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  uptime: 99.97,
  cpuUsage: 34,
  memoryUsage: 62,
  apiLatency: 12,
  workerStatus: 'running',
  lastUpdated: new Date().toISOString(),
};

// ─── Generate Candle Data ───
function generateCandles(basePrice: number, count = 100): CandleData[] {
  const candles: CandleData[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i > 0; i--) {
    const open = price;
    const change = randomBetween(-price * 0.015, price * 0.015);
    const close = open + change;
    const high = Math.max(open, close) + randomBetween(0, price * 0.005);
    const low = Math.min(open, close) - randomBetween(0, price * 0.005);
    candles.push({
      time: now - i * 3600,
      open,
      high,
      low,
      close,
      volume: randomBetween(100, 10000),
    });
    price = close;
  }
  return candles;
}

// ─── Mock API Functions ───
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export async function getUser(): Promise<User> {
  await delay();
  return mockUser;
}

export async function getWallet(): Promise<Wallet> {
  await delay();
  return { ...mockWallet };
}

export async function getMarketPrices(): Promise<MarketPrice[]> {
  await delay(100);
  return generateMarketPrices();
}

export async function getPositions(): Promise<Position[]> {
  await delay();
  return [...mockPositions];
}

export async function getTrades(): Promise<Trade[]> {
  await delay();
  return [...mockTrades];
}

export async function getOrders(): Promise<Order[]> {
  await delay();
  return [...mockOrders];
}

export async function placeOrder(order: Omit<Order, 'id' | 'status' | 'timestamp'>): Promise<Order> {
  await delay(500);
  const newOrder: Order = {
    ...order,
    id: String(Date.now()),
    status: order.type === 'market' ? 'filled' : 'open',
    timestamp: new Date().toISOString(),
  };
  return newOrder;
}

export async function getSentiment(): Promise<SentimentData> {
  await delay();
  return { ...mockSentiment };
}

export async function getVolatility(): Promise<VolatilityPrediction[]> {
  await delay();
  return [...mockVolatility];
}

export async function getInsights(): Promise<AIInsight[]> {
  await delay();
  return [...mockInsights];
}

export async function getNews(): Promise<NewsItem[]> {
  await delay();
  return [...mockNews];
}

export async function getAdminStats(): Promise<AdminStats> {
  await delay();
  return { ...mockAdminStats };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  await delay();
  return { ...mockSystemHealth, lastUpdated: new Date().toISOString() };
}

export async function getCandles(symbol: string): Promise<CandleData[]> {
  await delay(200);
  const base = basePrices[symbol]?.price ?? 100;
  return generateCandles(base);
}

export async function loginUser(_email: string, _password: string): Promise<User> {
  await delay(800);
  return mockUser;
}

export async function registerUser(_email: string, _password: string, _name: string): Promise<User> {
  await delay(800);
  return mockUser;
}
