import { apiClient } from "@/lib/api";

export type Wallet = {
  id: number;
  user_id: number;
  balance: string;
};

export type WalletTransaction = {
  id: number;
  transaction_type: "deposit" | "withdraw" | "trade";
  amount: string;
  description: string | null;
  created_at: string;
};

export async function fetchWallet(): Promise<Wallet> {
  const response = await apiClient.get<Wallet>("/wallet");
  return response.data;
}

export async function fetchTransactions(): Promise<WalletTransaction[]> {
  const response = await apiClient.get<WalletTransaction[]>("/transactions");
  return response.data;
}

export async function depositToWallet(amount: number): Promise<Wallet> {
  const response = await apiClient.post<Wallet>("/wallet/deposit", { amount });
  return response.data;
}

export async function withdrawFromWallet(amount: number): Promise<Wallet> {
  const response = await apiClient.post<Wallet>("/wallet/withdraw", { amount });
  return response.data;
}
