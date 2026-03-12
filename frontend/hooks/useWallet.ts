"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTransactions, fetchWallet } from "@/services/wallet";

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWallet,
    enabled,
  });
}

export function useTransactions(enabled = true) {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
    enabled,
  });
}
