import axios from "axios";

import { getAccessToken, getApiBaseUrl } from "@/services/http";

export type AdminOverviewStats = {
  totalUsers: number;
  totalTrades: number;
  systemLiquidity: number;
  activeUsers24h: number;
};

export type AdminSystemHealth = {
  apiStatus: "healthy" | "down";
  databaseStatus: "connected" | "disconnected";
  redisStatus: "connected" | "disconnected";
  workerStatus: "running" | "stopped";
  websocketConnections: number;
};

export type AdminAIUsage = {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
};

export type AdminUserRow = {
  id: number;
  username: string;
  role: "user" | "admin";
  walletBalance: number;
  createdAt: string;
};

export type AdminUserDetail = {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  isActive: boolean;
  walletBalance: number;
  createdAt: string;
  walletId: number | null;
  recentTrades: Array<{
    id: number;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    quantity: number;
    executedAt: string;
  }>;
  positions: Array<{
    id: number;
    symbol: string;
    quantity: number;
    averagePrice: number;
    updatedAt: string;
  }>;
};

export type AdminTradeRow = {
  id: number;
  user: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  time: string;
};

export type AdminOrderRow = {
  id: number;
  userId: number;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity: number;
  status: "open" | "filled" | "cancelled";
  createdAt: string;
};

export type AdminPositionRow = {
  id: number;
  userId: number;
  symbol: string;
  quantity: number;
  averagePrice: number;
  updatedAt: string;
};

export type AdminAnomalyRow = {
  userId: number;
  reason: string;
};

export type TimeSeriesPoint = {
  label: string;
  value: number;
};

type StatsResponse = {
  total_users: number;
  active_users: number;
  total_trades: number;
  total_volume: string | number;
  total_positions: number;
  system_liquidity: string | number;
};

type SystemResponse = {
  api_status: string;
  database_status: string;
  redis_status: string;
  websocket_connections: number;
  celery_worker_status: string;
};

type AIUsageResponse = {
  total_requests: number;
  success_count: number;
  failure_count: number;
  fallback_count: number;
};

type UsersPageResponse = {
  items: Array<{
    id: number;
    username: string;
    role: string;
    wallet_balance: string | number;
    created_at: string;
  }>;
  page: number;
  page_size: number;
  total: number;
};

type UserDetailResponse = {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  wallet: {
    wallet_id: number;
    balance: string | number;
  } | null;
  created_at: string;
  recent_trades: Array<{
    id: number;
    symbol: string;
    side: "buy" | "sell";
    price: string | number;
    quantity: string | number;
    executed_at: string;
  }>;
  positions: Array<{
    id: number;
    symbol: string;
    quantity: string | number;
    average_price: string | number;
    updated_at: string;
  }>;
};

type TradeItemResponse = {
  id: number;
  user_id: number;
  symbol: string;
  side: "buy" | "sell";
  price: string | number;
  quantity: string | number;
  timestamp: string;
};

type OrderItemResponse = {
  id: number;
  user_id: number;
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  quantity: string | number;
  status: "open" | "filled" | "cancelled";
  created_at: string;
};

type PositionItemResponse = {
  id: number;
  user_id: number;
  symbol: string;
  quantity: string | number;
  average_price: string | number;
  updated_at: string;
};

type AnomaliesResponse = {
  items: Array<{
    user_id: number;
    reason: string;
  }>;
};

const adminClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

adminClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error?.response?.data?.detail?.[0]?.msg ||
      error?.response?.data?.detail ||
      error?.message ||
      "Request failed";
    return Promise.reject(new Error(String(detail)));
  }
);

function toNumber(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdminStats(): Promise<AdminOverviewStats> {
  const { data } = await adminClient.get<StatsResponse>("/admin/stats");
  return {
    totalUsers: data.total_users,
    totalTrades: data.total_trades,
    systemLiquidity: toNumber(data.system_liquidity),
    activeUsers24h: data.active_users,
  };
}

export async function getSystemHealth(): Promise<AdminSystemHealth> {
  const { data } = await adminClient.get<SystemResponse>("/admin/system");
  return {
    apiStatus: data.api_status === "healthy" ? "healthy" : "down",
    databaseStatus: data.database_status === "connected" ? "connected" : "disconnected",
    redisStatus: data.redis_status === "connected" ? "connected" : "disconnected",
    workerStatus: data.celery_worker_status === "running" ? "running" : "stopped",
    websocketConnections: data.websocket_connections,
  };
}

export async function getAIUsage(): Promise<AdminAIUsage> {
  const { data } = await adminClient.get<AIUsageResponse>("/admin/ai-usage");
  return {
    totalRequests: data.total_requests,
    successCount: data.success_count,
    failureCount: data.failure_count,
    fallbackCount: data.fallback_count,
  };
}

export async function getAdminUsers(params: {
  query: string;
  role: "all" | "user" | "admin";
  page: number;
  pageSize: number;
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const { data } = await adminClient.get<UsersPageResponse>("/admin/users", {
    params: {
      page: params.page,
      page_size: params.pageSize,
      query: params.query || undefined,
      role: params.role === "all" ? undefined : params.role,
    },
  });

  const items: AdminUserRow[] = data.items.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role === "admin" ? "admin" : "user",
    walletBalance: toNumber(row.wallet_balance),
    createdAt: row.created_at,
  }));

  return { items, total: data.total };
}

export async function getAdminUserDetail(userId: number): Promise<AdminUserDetail> {
  const { data } = await adminClient.get<UserDetailResponse>(`/admin/users/${userId}`);
  return {
    id: data.id,
    email: data.email,
    username: data.username,
    role: data.role === "admin" ? "admin" : "user",
    isActive: data.is_active,
    walletBalance: toNumber(data.wallet?.balance),
    createdAt: data.created_at,
    walletId: data.wallet?.wallet_id ?? null,
    recentTrades: data.recent_trades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      price: toNumber(trade.price),
      quantity: toNumber(trade.quantity),
      executedAt: trade.executed_at,
    })),
    positions: data.positions.map((position) => ({
      id: position.id,
      symbol: position.symbol,
      quantity: toNumber(position.quantity),
      averagePrice: toNumber(position.average_price),
      updatedAt: position.updated_at,
    })),
  };
}

export async function updateAdminUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  await adminClient.patch(`/admin/users/${userId}/role`, { role });
}

export async function updateAdminUserStatus(userId: number, isActive: boolean): Promise<void> {
  await adminClient.patch(`/admin/users/${userId}/status`, { is_active: isActive });
}

export async function resetAdminUserWallet(userId: number, balance: number): Promise<void> {
  await adminClient.post(`/admin/users/${userId}/reset-wallet`, { balance });
}

export async function getAdminTrades(params: {
  page: number;
  pageSize: number;
}): Promise<{ items: AdminTradeRow[]; total: number }> {
  const { data } = await adminClient.get<TradeItemResponse[]>("/admin/trades", {
    params: {
      page: params.page,
      page_size: params.pageSize,
    },
  });

  const items = data.map((row) => ({
    id: row.id,
    user: `User #${row.user_id}`,
    symbol: row.symbol,
    side: row.side,
    price: toNumber(row.price),
    quantity: toNumber(row.quantity),
    time: row.timestamp,
  }));

  return {
    items,
    total: (params.page - 1) * params.pageSize + data.length + (data.length === params.pageSize ? 1 : 0),
  };
}

export async function getAdminOrders(params: {
  page: number;
  pageSize: number;
}): Promise<{ items: AdminOrderRow[]; total: number }> {
  const { data } = await adminClient.get<OrderItemResponse[]>("/admin/orders", {
    params: {
      page: params.page,
      page_size: params.pageSize,
    },
  });

  return {
    items: data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      symbol: row.symbol,
      side: row.side,
      orderType: row.order_type,
      quantity: toNumber(row.quantity),
      status: row.status,
      createdAt: row.created_at,
    })),
    total: (params.page - 1) * params.pageSize + data.length + (data.length === params.pageSize ? 1 : 0),
  };
}

export async function getAdminPositions(params: {
  page: number;
  pageSize: number;
}): Promise<{ items: AdminPositionRow[]; total: number }> {
  const { data } = await adminClient.get<PositionItemResponse[]>("/admin/positions", {
    params: {
      page: params.page,
      page_size: params.pageSize,
    },
  });

  return {
    items: data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      symbol: row.symbol,
      quantity: toNumber(row.quantity),
      averagePrice: toNumber(row.average_price),
      updatedAt: row.updated_at,
    })),
    total: (params.page - 1) * params.pageSize + data.length + (data.length === params.pageSize ? 1 : 0),
  };
}

export async function getAdminAnomalies(): Promise<AdminAnomalyRow[]> {
  const { data } = await adminClient.get<AnomaliesResponse>("/admin/alerts/anomalies");
  return data.items.map((item) => ({
    userId: item.user_id,
    reason: item.reason,
  }));
}

export async function getTradesSeries(days = 7): Promise<TimeSeriesPoint[]> {
  const { data } = await adminClient.get<TimeSeriesPoint[]>("/admin/trades/series", {
    params: { days },
  });
  return data;
}

export async function getUserGrowthSeries(months = 6): Promise<TimeSeriesPoint[]> {
  const { data } = await adminClient.get<TimeSeriesPoint[]>("/admin/stats/user-growth", {
    params: { months },
  });
  return data;
}

export async function sendGlobalAdminAlert(message: string): Promise<void> {
  await adminClient.post("/admin/alerts/broadcast", { message });
}
