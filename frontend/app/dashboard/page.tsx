"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { clearAccessToken, getAccessToken } from "@/lib/session";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTransactions, useWallet } from "@/hooks/useWallet";
import MarketWatchlist from "@/components/MarketWatchlist";
import { depositToWallet, withdrawFromWallet } from "@/services/wallet";

type NavItem = {
  label: string;
  detail: string;
  shortLabel: string;
};

function transactionTone(type: "deposit" | "withdraw" | "trade") {
  if (type === "deposit") {
    return "text-emerald-400";
  }

  if (type === "withdraw") {
    return "text-rose-400";
  }

  return "text-slate-300";
}

const quickStats = [
  { label: "Session Mode", value: "Paper", copy: "Protected account endpoints active." },
  { label: "Ledger Events", value: "Realtime", copy: "Balance changes invalidate and refresh queries." },
  { label: "Wallet Locking", value: "Atomic", copy: "Backend applies row-level locking on mutations." },
];

const navItems: NavItem[] = [
  { label: "Dashboard", detail: "Overview and activity", shortLabel: "DB" },
  { label: "Wallet", detail: "Balance and funding", shortLabel: "WA" },
  { label: "Trades", detail: "Markets and execution", shortLabel: "TR" },
  { label: "Settings", detail: "Session and preferences", shortLabel: "SE" },
];

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("1000");
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  function handleSidebarClose() {
    setMobileMenuOpen(false);
  }

  if (!token || userLoading || walletLoading || txLoading) {
    return <main className="shell mx-auto max-w-7xl px-6 py-12 text-slate-300">Loading dashboard...</main>;
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "AT";

  return (
    <div className="shell min-h-screen bg-[color:var(--bg)] text-slate-100">
      <div className="flex min-h-screen">
        <div
          className={[
            "fixed inset-0 z-40 bg-slate-950/70 transition-opacity lg:hidden",
            mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
          onClick={handleSidebarClose}
        />

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-800 bg-slate-950 px-4 py-4 transition-transform duration-200 lg:static lg:z-auto lg:w-[92px] lg:translate-x-0 lg:px-3 xl:w-[280px] xl:px-4",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="mb-6 flex items-center justify-between gap-3 px-2 lg:justify-center xl:justify-between">
            <div className="flex items-center gap-3 lg:hidden xl:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-sm font-semibold text-sky-300">
                AT
              </div>
              <div className="lg:hidden xl:block">
                <p className="text-sm font-semibold text-slate-50">AuraTrade</p>
                <p className="mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Terminal</p>
              </div>
            </div>
            <button
              aria-label="Close navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
              onClick={handleSidebarClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item, index) => {
              const isActive = index === 0;

              return (
                <button
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-sky-500/30 bg-sky-500/10 text-slate-50"
                      : "border-transparent bg-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900 hover:text-slate-100",
                  ].join(" ")}
                  key={item.label}
                  onClick={handleSidebarClose}
                  type="button"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 mono text-xs font-medium">
                    {item.shortLabel}
                  </span>
                  <span className="hidden min-w-0 flex-1 xl:block">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 lg:hidden xl:block">
            <p className="section-kicker mb-2">Account</p>
            <p className="text-sm font-medium text-slate-100">{user?.email}</p>
            <p className="mt-2 text-sm text-slate-500">Paper wallet #{wallet?.id}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-0">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-[rgba(10,13,20,0.92)] backdrop-blur">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Open navigation"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  type="button"
                >
                  <MenuIcon />
                </button>
                <div>
                  <p className="section-kicker mb-1">AuraTrade</p>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">Professional trading dashboard</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden data-chip badge-accent md:inline-flex">JWT session active</span>
                <div className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-100">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{user?.email}</p>
                    <p className="text-xs text-slate-500">Active session</p>
                  </div>
                </div>
                <button className="action-secondary !px-4 !py-2.5" onClick={handleLogout} type="button">
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 md:px-6 xl:px-8">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
              <div className="panel rounded-2xl p-5 md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="section-kicker mb-2">Overview</p>
                    <h2 className="page-title font-semibold text-slate-50">Wallet overview and funding controls</h2>
                    <p className="mt-3 page-copy">
                      Review the current account state, move paper capital in or out of the wallet, and scan transaction activity without leaving the dashboard.
                    </p>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <div className="metric-card min-w-0">
                      <p className="metric-label">Available Balance</p>
                      <p className="stat-value mt-3 text-slate-50">${wallet?.balance}</p>
                      <p className="metric-copy mt-2">Live wallet amount available for operations.</p>
                    </div>
                    <div className="metric-card min-w-0">
                      <p className="metric-label">Ledger Events</p>
                      <p className="metric-value mt-3">{transactions?.length ?? 0}</p>
                      <p className="metric-copy mt-2">Recorded balance mutations in this account.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {quickStats.map((stat) => (
                  <div className="metric-card" key={stat.label}>
                    <p className="metric-label">{stat.label}</p>
                    <p className="surface-title mt-2">{stat.value}</p>
                    <p className="metric-copy mt-2">{stat.copy}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="grid gap-4 md:grid-cols-2">
                <form className="panel rounded-2xl p-5 md:p-6" onSubmit={handleDeposit}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker mb-2">Wallet</p>
                      <h2 className="section-title">Deposit capital</h2>
                    </div>
                    <span className="data-chip">/wallet/deposit</span>
                  </div>
                  <p className="metric-copy mb-5">Increase wallet balance and append a deposit event to the transaction ledger.</p>
                  <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="deposit-amount">
                    Amount
                  </label>
                  <input
                    className="terminal-input mb-4 h-12"
                    id="deposit-amount"
                    min="0.01"
                    onChange={(event) => setDepositAmount(event.target.value)}
                    step="0.01"
                    type="number"
                    value={depositAmount}
                  />
                  <button className="action-primary h-12 w-full" disabled={depositMutation.isPending} type="submit">
                    {depositMutation.isPending ? "Processing..." : "Add Funds"}
                  </button>
                  {depositMutation.isError && <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>Deposit failed.</p>}
                </form>

                <form className="panel rounded-2xl p-5 md:p-6" onSubmit={handleWithdraw}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker mb-2">Wallet</p>
                      <h2 className="section-title">Withdraw capital</h2>
                    </div>
                    <span className="data-chip">/wallet/withdraw</span>
                  </div>
                  <p className="metric-copy mb-5">Reduce available balance while keeping wallet state and transaction history synchronized.</p>
                  <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="withdraw-amount">
                    Amount
                  </label>
                  <input
                    className="terminal-input mb-4 h-12"
                    id="withdraw-amount"
                    min="0.01"
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    step="0.01"
                    type="number"
                    value={withdrawAmount}
                  />
                  <button className="action-secondary h-12 w-full" disabled={withdrawMutation.isPending} type="submit">
                    {withdrawMutation.isPending ? "Processing..." : "Withdraw Funds"}
                  </button>
                  {withdrawMutation.isError && <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>Withdraw failed.</p>}
                </form>
              </div>

              <section className="grid gap-4 self-start">
                <MarketWatchlist />

                <div className="panel-muted rounded-2xl p-5">
                  <p className="section-kicker mb-2">Session Detail</p>
                  <h2 className="section-title mb-4">Account state</h2>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <span className="muted">User</span>
                      <span className="mono max-w-[180px] truncate text-slate-300">{user?.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <span className="muted">Wallet ID</span>
                      <span className="mono text-slate-300">#{wallet?.id}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="muted">Status</span>
                      <span className="mono text-emerald-400">Connected</span>
                    </div>
                  </div>
                </div>
              </section>
            </section>

            <section className="panel rounded-2xl p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="section-kicker mb-2">Wallet Ledger</p>
                  <h2 className="section-title">Transaction history</h2>
                </div>
                <span className="data-chip self-start sm:self-auto">{transactions?.length ?? 0} events</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <th className="border-b border-slate-800 px-0 py-3 font-medium">Type</th>
                      <th className="border-b border-slate-800 px-4 py-3 font-medium">Amount</th>
                      <th className="border-b border-slate-800 px-4 py-3 font-medium">Description</th>
                      <th className="border-b border-slate-800 px-4 py-3 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions?.map((transaction) => (
                      <tr className="text-sm text-slate-300" key={transaction.id}>
                        <td className={`border-b border-slate-900 px-0 py-4 font-semibold capitalize ${transactionTone(transaction.transaction_type)}`}>
                          {transaction.transaction_type}
                        </td>
                        <td className="border-b border-slate-900 px-4 py-4 font-medium text-slate-100">{transaction.amount}</td>
                        <td className="border-b border-slate-900 px-4 py-4 text-slate-400">{transaction.description ?? "No description"}</td>
                        <td className="border-b border-slate-900 px-4 py-4 text-slate-500">{new Date(transaction.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!transactions?.length && <div className="pt-6 text-sm muted">No transactions yet.</div>}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
