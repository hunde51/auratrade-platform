import type {
  AlertRule,
  AlertTriggerEvent,
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

type AlertRuleResponse = {
  id: number;
  user_id: number;
  symbol: string;
  condition_type: "price_above" | "price_below" | "percent_drop";
  threshold: string | number;
  window_minutes: number;
  action_type: "notify" | "place_order";
  action_payload: Record<string, unknown>;
  enabled: boolean;
  cooldown_seconds: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

type AlertTriggerEventResponse = {
  id: number;
  rule_id: number;
  user_id: number;
  action_type: string;
  status: string;
  details: Record<string, unknown>;
  triggered_at: string;
};

type AlertRulesListResponse = {
  items: AlertRuleResponse[];
  recent_events: AlertTriggerEventResponse[];
};

export type UserSettings = {
  username: string;
  email: string;
  defaultOrderType: "market" | "limit";
  defaultOrderQuantity: number;
  notifyTradeConfirmations: boolean;
  notifyWalletUpdates: boolean;
  notifyOrderStatusChanges: boolean;
  notifyPriceAlerts: boolean;
  preferredSymbols: string[];
  preferredTimeframe: "1h" | "4h" | "1d" | "1w";
};

type UserSettingsResponse = {
  username: string;
  email: string;
  default_order_type: "market" | "limit";
  default_order_quantity: string | number;
  notify_trade_confirmations: boolean;
  notify_wallet_updates: boolean;
  notify_order_status_changes: boolean;
  notify_price_alerts: boolean;
  preferred_symbols: string[];
  preferred_timeframe: "1h" | "4h" | "1d" | "1w";
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

export async function getCandles(symbol: string, points = 72, timeframe: '1h' | '4h' | '1d' | '1w' = '4h'): Promise<CandleData[]> {
  const normalizedSymbol = symbol.replace(/\//g, "");
  const boundedPoints = Math.max(12, Math.min(points, 240));
  const rows = await apiRequest<CandleResponse[]>(
    `/markets/${encodeURIComponent(normalizedSymbol)}/candles?points=${boundedPoints}&timeframe=${timeframe}`,
    {
    auth: false,
    }
  );
  return rows.map((row) => ({
    time: row.time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}

function mapUserSettings(data: UserSettingsResponse): UserSettings {
  return {
    username: data.username,
    email: data.email,
    defaultOrderType: data.default_order_type,
    defaultOrderQuantity: toNumber(data.default_order_quantity),
    notifyTradeConfirmations: data.notify_trade_confirmations,
    notifyWalletUpdates: data.notify_wallet_updates,
    notifyOrderStatusChanges: data.notify_order_status_changes,
    notifyPriceAlerts: data.notify_price_alerts,
    preferredSymbols: data.preferred_symbols ?? [],
    preferredTimeframe: data.preferred_timeframe,
  };
}

export async function getUserSettings(): Promise<UserSettings> {
  const data = await apiRequest<UserSettingsResponse>("/settings");
  return mapUserSettings(data);
}

export async function updateUserSettings(payload: {
  username?: string;
  defaultOrderType?: "market" | "limit";
  defaultOrderQuantity?: number;
  notifyTradeConfirmations?: boolean;
  notifyWalletUpdates?: boolean;
  notifyOrderStatusChanges?: boolean;
  notifyPriceAlerts?: boolean;
  preferredSymbols?: string[];
  preferredTimeframe?: "1h" | "4h" | "1d" | "1w";
}): Promise<UserSettings> {
  const requestBody = {
    username: payload.username,
    default_order_type: payload.defaultOrderType,
    default_order_quantity: payload.defaultOrderQuantity,
    notify_trade_confirmations: payload.notifyTradeConfirmations,
    notify_wallet_updates: payload.notifyWalletUpdates,
    notify_order_status_changes: payload.notifyOrderStatusChanges,
    notify_price_alerts: payload.notifyPriceAlerts,
    preferred_symbols: payload.preferredSymbols,
    preferred_timeframe: payload.preferredTimeframe,
  };

  const data = await apiRequest<UserSettingsResponse>("/settings", {
    method: "PATCH",
    body: JSON.stringify(requestBody),
  });
  return mapUserSettings(data);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<void>("/settings/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

function mapAlertRule(row: AlertRuleResponse): AlertRule {
  return {
    id: String(row.id),
    symbol: row.symbol,
    conditionType: row.condition_type,
    threshold: toNumber(row.threshold),
    windowMinutes: row.window_minutes,
    actionType: row.action_type,
    actionPayload: row.action_payload ?? {},
    enabled: row.enabled,
    cooldownSeconds: row.cooldown_seconds,
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlertEvent(row: AlertTriggerEventResponse): AlertTriggerEvent {
  return {
    id: String(row.id),
    ruleId: String(row.rule_id),
    actionType: row.action_type,
    status: row.status,
    details: row.details ?? {},
    triggeredAt: row.triggered_at,
  };
}

export async function getAlertRules(): Promise<{ items: AlertRule[]; recentEvents: AlertTriggerEvent[] }> {
  const data = await apiRequest<AlertRulesListResponse>("/alerts");
  return {
    items: data.items.map(mapAlertRule),
    recentEvents: data.recent_events.map(mapAlertEvent),
  };
}

export async function createAlertRule(payload: {
  symbol: string;
  conditionType: "price_above" | "price_below" | "percent_drop";
  threshold: number;
  windowMinutes: number;
  actionType: "notify" | "place_order";
  actionPayload?: Record<string, unknown>;
  enabled: boolean;
  cooldownSeconds: number;
}): Promise<AlertRule> {
  const data = await apiRequest<AlertRuleResponse>("/alerts", {
    method: "POST",
    body: JSON.stringify({
      symbol: payload.symbol,
      condition_type: payload.conditionType,
      threshold: payload.threshold,
      window_minutes: payload.windowMinutes,
      action_type: payload.actionType,
      action_payload: payload.actionPayload ?? {},
      enabled: payload.enabled,
      cooldown_seconds: payload.cooldownSeconds,
    }),
  });
  return mapAlertRule(data);
}

export async function updateAlertRule(
  ruleId: string,
  payload: Partial<{
    symbol: string;
    conditionType: "price_above" | "price_below" | "percent_drop";
    threshold: number;
    windowMinutes: number;
    actionType: "notify" | "place_order";
    actionPayload: Record<string, unknown>;
    enabled: boolean;
    cooldownSeconds: number;
  }>
): Promise<AlertRule> {
  const data = await apiRequest<AlertRuleResponse>(`/alerts/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      symbol: payload.symbol,
      condition_type: payload.conditionType,
      threshold: payload.threshold,
      window_minutes: payload.windowMinutes,
      action_type: payload.actionType,
      action_payload: payload.actionPayload,
      enabled: payload.enabled,
      cooldown_seconds: payload.cooldownSeconds,
    }),
  });
  return mapAlertRule(data);
}

export async function toggleAlertRule(ruleId: string, enabled: boolean): Promise<AlertRule> {
  const data = await apiRequest<AlertRuleResponse>(`/alerts/${encodeURIComponent(ruleId)}/toggle`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  return mapAlertRule(data);
}

export async function deleteAlertRule(ruleId: string): Promise<void> {
  await apiRequest<void>(`/alerts/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
  });
}
