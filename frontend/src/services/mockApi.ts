import type {
  AIInsight,
  CandleData,
  MarketPrice,
  NewsItem,
  Order,
  Position,
  SentimentData,
  Trade,
  User,
  VolatilityPrediction,
  Wallet,
} from "@/lib/types";
import { SYMBOLS } from "@/lib/constants";
import { apiRequest, clearAccessToken, setAccessToken } from "@/services/http";

type AuthResponse = {
  access_token: string;
  token_type: string;
};

type UserResponse = {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  is_active: boolean;
};

type WalletResponse = {
  id: number;
  user_id: number;
  balance: string | number;
};

type MarketListResponse = {
  items: Array<{
    symbol: string;
    price: number;
    volume: number;
    change_percent: number | null;
    source: string;
    timestamp: string;
  }>;
};

type PositionResponse = {
  id: number;
  user_id: number;
  symbol: string;
  quantity: string | number;
  average_price: string | number;
  updated_at: string;
};

type TradeResponse = {
  id: number;
  order_id: number;
  user_id: number;
  symbol: string;
  price: string | number;
  quantity: string | number;
  side: "buy" | "sell";
  executed_at: string;
};

type OrderResponse = {
  id: number;
  user_id: number;
  symbol: string;
  order_type: "market" | "limit";
  side: "buy" | "sell";
  price: string | number | null;
  quantity: string | number;
  status: "pending" | "filled" | "cancelled";
  created_at: string;
};

type SentimentResponse = {
  symbol: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number;
  source: string;
  created_at: string | null;
};

type VolatilityResponse = {
  symbol: string;
  current_volatility: number;
  predicted_volatility: number;
  direction: "increasing" | "decreasing" | "stable";
  confidence: number;
};

type InsightResponse = {
  id: string;
  title: string;
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  timestamp: string;
};

type NewsResponse = {
  id: string;
  title: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  timestamp: string;
};

type CandleResponse = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const symbolNameMap = new Map(SYMBOLS.map((item) => [item.symbol.replace("/", ""), item.name]));

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapUser(input: UserResponse): User {
  return {
    id: String(input.id),
    email: input.email,
    name: input.username,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
}

export async function getUser(): Promise<User> {
  const user = await apiRequest<UserResponse>("/auth/me");
  return mapUser(user);
}

export async function loginUser(email: string, password: string): Promise<User> {
  const auth = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(auth.access_token);
  return getUser();
}

export async function registerUser(email: string, password: string, username: string): Promise<User> {
  const auth = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password, username }),
  });
  setAccessToken(auth.access_token);
  return getUser();
}

export function logoutUser(): void {
  clearAccessToken();
}

export async function getWallet(): Promise<Wallet> {
  const wallet = await apiRequest<WalletResponse>("/wallet");
  const balance = toNumber(wallet.balance);
  const marginUsed = balance * 0.12;
  const freeMargin = Math.max(0, balance - marginUsed);

  return {
    balance,
    equity: balance,
    marginUsed,
    freeMargin,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    totalPnL: 0,
  };
}

export async function getMarketPrices(): Promise<MarketPrice[]> {
  const payload = await apiRequest<MarketListResponse>("/markets", { auth: false });
  return payload.items.map((item) => {
    const normalizedSymbol = item.symbol.replace("/", "");
    const name = symbolNameMap.get(normalizedSymbol) || item.symbol;
    return {
      symbol: item.symbol,
      name,
      price: item.price,
      change: ((item.change_percent ?? 0) / 100) * item.price,
      changePercent: item.change_percent ?? 0,
      high24h: item.price,
      low24h: item.price,
      volume: item.volume,
    };
  });
}

export async function getPositions(): Promise<Position[]> {
  const rows = await apiRequest<PositionResponse[]>("/positions");
  return rows.map((row) => {
    const entryPrice = toNumber(row.average_price);
    return {
      id: String(row.id),
      symbol: row.symbol,
      side: "long",
      quantity: toNumber(row.quantity),
      entryPrice,
      currentPrice: entryPrice,
      pnl: 0,
      pnlPercent: 0,
      timestamp: row.updated_at,
    };
  });
}

export async function getTrades(): Promise<Trade[]> {
  const rows = await apiRequest<TradeResponse[]>("/trades");
  return rows.map((row) => {
    const price = toNumber(row.price);
    const quantity = toNumber(row.quantity);
    return {
      id: String(row.id),
      symbol: row.symbol,
      side: row.side,
      quantity,
      price,
      total: price * quantity,
      timestamp: row.executed_at,
    };
  });
}

export async function getOrders(): Promise<Order[]> {
  const rows = await apiRequest<OrderResponse[]>("/orders");
  return rows.map((row) => {
    const price = toNumber(row.price);
    const quantity = toNumber(row.quantity);
    return {
      id: String(row.id),
      symbol: row.symbol,
      side: row.side,
      type: row.order_type,
      quantity,
      price,
      status: row.status === "pending" ? "open" : row.status,
      timestamp: row.created_at,
    };
  });
}

export async function placeOrder(order: Omit<Order, "id" | "status" | "timestamp">): Promise<Order> {
  const payload = {
    symbol: order.symbol,
    side: order.side,
    order_type: order.type,
    quantity: order.quantity,
    price: order.type === "limit" ? order.limitPrice ?? order.price : null,
  };

  const created = await apiRequest<OrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const price = toNumber(created.price ?? order.price);
  return {
    id: String(created.id),
    symbol: created.symbol,
    side: created.side,
    type: created.order_type,
    quantity: toNumber(created.quantity),
    price,
    limitPrice: created.order_type === "limit" ? price : undefined,
    status: created.status === "pending" ? "open" : created.status,
    timestamp: created.created_at,
  };
}

export async function getSentiment(): Promise<SentimentData> {
  const rows = await apiRequest<SentimentResponse[]>("/ai/sentiment", { auth: false });
  if (rows.length === 0) {
    return {
      overall: "neutral",
      score: 0,
      fearGreedIndex: 50,
      sources: [],
    };
  }

  const bullish = rows.filter((row) => row.sentiment === "bullish").length;
  const bearish = rows.filter((row) => row.sentiment === "bearish").length;
  const neutral = rows.length - bullish - bearish;
  const sumScore = rows.reduce((acc, row) => {
    if (row.sentiment === "bullish") {
      return acc + row.score;
    }
    if (row.sentiment === "bearish") {
      return acc - row.score;
    }
    return acc;
  }, 0);

  const avgDirectional = sumScore / rows.length;
  const sentimentScore = Math.round(avgDirectional * 100);
  const fearGreedIndex = Math.min(100, Math.max(0, 50 + sentimentScore / 2));

  let overall: "bullish" | "bearish" | "neutral" = "neutral";
  if (bullish > bearish) {
    overall = "bullish";
  } else if (bearish > bullish) {
    overall = "bearish";
  }

  return {
    overall,
    score: sentimentScore,
    fearGreedIndex,
    sources: [
      { name: "Bullish signals", sentiment: "bullish", score: bullish },
      { name: "Bearish signals", sentiment: "bearish", score: bearish },
      { name: "Neutral signals", sentiment: "neutral", score: neutral },
    ],
  };
}

export async function getVolatility(): Promise<VolatilityPrediction[]> {
  const rows = await apiRequest<VolatilityResponse[]>("/ai/volatility", { auth: false });
  return rows.map((row) => ({
    symbol: row.symbol,
    currentVolatility: row.current_volatility,
    predictedVolatility: row.predicted_volatility,
    direction: row.direction,
    confidence: row.confidence,
  }));
}

export async function getInsights(): Promise<AIInsight[]> {
  const rows = await apiRequest<InsightResponse[]>("/ai/insights", { auth: false });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    sentiment: row.sentiment,
    confidence: row.confidence,
    timestamp: row.timestamp,
  }));
}

export async function getNews(): Promise<NewsItem[]> {
  const rows = await apiRequest<NewsResponse[]>("/ai/news", { auth: false });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    source: row.source,
    sentiment: row.sentiment,
    timestamp: row.timestamp,
  }));
}

export async function getCandles(symbol: string): Promise<CandleData[]> {
  const rows = await apiRequest<CandleResponse[]>(`/markets/${encodeURIComponent(symbol)}/candles?points=72`, {
    auth: false,
  });
  return rows.map((row) => ({
    time: row.time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}
