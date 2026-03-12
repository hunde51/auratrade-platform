"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { clearAccessToken, getAccessToken } from "@/lib/session";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTransactions, useWallet } from "@/hooks/useWallet";
import { depositToWallet, withdrawFromWallet } from "@/services/wallet";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("1000");
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const token = getAccessToken();
  const enabled = Boolean(token);
  const { data: user, isLoading: userLoading } = useCurrentUser(enabled);
  const { data: wallet, isLoading: walletLoading } = useWallet(enabled);
  const { data: transactions, isLoading: txLoading } = useTransactions(enabled);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  const depositMutation = useMutation({
    mutationFn: (value: number) => depositToWallet(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (value: number) => withdrawFromWallet(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await depositMutation.mutateAsync(Number.parseFloat(depositAmount));
  }

  async function handleWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withdrawMutation.mutateAsync(Number.parseFloat(withdrawAmount));
  }

  function handleLogout() {
    clearAccessToken();
    router.push("/login");
  }

  if (!token || userLoading || walletLoading || txLoading) {
    return <main className="mx-auto max-w-4xl px-6 py-12">Loading dashboard...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-600">{user?.email}</p>
        </div>
        <button className="rounded-md border border-slate-300 px-4 py-2" onClick={handleLogout} type="button">
          Logout
        </button>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Wallet Balance</h2>
        <p className="mt-2 text-3xl font-bold text-teal-700">${wallet?.balance}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow-sm" onSubmit={handleDeposit}>
          <h3 className="mb-4 text-lg font-semibold">Deposit</h3>
          <input
            className="mb-4 w-full rounded-md border border-slate-300 px-4 py-3"
            min="0.01"
            onChange={(event) => setDepositAmount(event.target.value)}
            step="0.01"
            type="number"
            value={depositAmount}
          />
          <button className="rounded-md bg-teal-700 px-4 py-2 text-white" disabled={depositMutation.isPending} type="submit">
            Add Funds
          </button>
          {depositMutation.isError && <p className="mt-3 text-sm text-red-600">Deposit failed.</p>}
        </form>

        <form className="rounded-xl bg-white p-6 shadow-sm" onSubmit={handleWithdraw}>
          <h3 className="mb-4 text-lg font-semibold">Withdraw</h3>
          <input
            className="mb-4 w-full rounded-md border border-slate-300 px-4 py-3"
            min="0.01"
            onChange={(event) => setWithdrawAmount(event.target.value)}
            step="0.01"
            type="number"
            value={withdrawAmount}
          />
          <button className="rounded-md border border-slate-400 px-4 py-2" disabled={withdrawMutation.isPending} type="submit">
            Withdraw Funds
          </button>
          {withdrawMutation.isError && <p className="mt-3 text-sm text-red-600">Withdraw failed.</p>}
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Transaction History</h2>
        <div className="space-y-3">
          {transactions?.map((transaction) => (
            <div className="flex items-center justify-between border-b border-slate-100 pb-3" key={transaction.id}>
              <div>
                <p className="font-medium capitalize">{transaction.transaction_type}</p>
                <p className="text-sm text-slate-500">{transaction.description ?? "No description"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{transaction.amount}</p>
                <p className="text-sm text-slate-500">{new Date(transaction.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!transactions?.length && <p className="text-slate-500">No transactions yet.</p>}
        </div>
      </section>
    </main>
  );
}
