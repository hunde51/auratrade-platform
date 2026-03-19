import { useQuery } from "@tanstack/react-query";

import {
  getAIUsage,
  getAdminAnomalies,
  getAdminOrders,
  getAdminPositions,
  getAdminStats,
  getAdminUserDetail,
  getSystemHealth,
  getAdminTrades,
  getAdminUsers,
  getTradesSeries,
  getUserGrowthSeries,
} from "@/services/adminApi";

export const useAdminStats = () =>
  useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useAdminSystem = () =>
  useQuery({
    queryKey: ["admin", "system"],
    queryFn: getSystemHealth,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

export const useAIUsage = () =>
  useQuery({
    queryKey: ["admin", "ai-usage"],
    queryFn: getAIUsage,
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

export const useTradesOverTime = () =>
  useQuery({
    queryKey: ["admin", "trades-series"],
    queryFn: () => getTradesSeries(7),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export const useUserGrowth = () =>
  useQuery({
    queryKey: ["admin", "user-growth"],
    queryFn: () => getUserGrowthSeries(6),
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

export const useAdminUsers = (query: string, role: "all" | "user" | "admin", page: number, pageSize: number) =>
  useQuery({
    queryKey: ["admin", "users", query, role, page, pageSize],
    queryFn: () => getAdminUsers({ query, role, page, pageSize }),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

export const useAdminUserDetail = (userId: number | null) =>
  useQuery({
    queryKey: ["admin", "users", "detail", userId],
    queryFn: () => getAdminUserDetail(userId as number),
    enabled: userId != null,
    staleTime: 30_000,
  });

export const useAdminTrades = (page: number, pageSize: number) =>
  useQuery({
    queryKey: ["admin", "trades", page, pageSize],
    queryFn: () => getAdminTrades({ page, pageSize }),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

export const useAdminOrders = (page: number, pageSize: number) =>
  useQuery({
    queryKey: ["admin", "orders", page, pageSize],
    queryFn: () => getAdminOrders({ page, pageSize }),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

export const useAdminPositions = (page: number, pageSize: number) =>
  useQuery({
    queryKey: ["admin", "positions", page, pageSize],
    queryFn: () => getAdminPositions({ page, pageSize }),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

export const useAdminAnomalies = () =>
  useQuery({
    queryKey: ["admin", "anomalies"],
    queryFn: getAdminAnomalies,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
