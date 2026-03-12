import BackendStatus from "@/components/BackendStatus";
import Link from "next/link";

export default function Home() {
  return (
    <main className="shell mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 xl:px-10">
      <header className="panel rounded-2xl px-5 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-kicker mb-2">AuraTrade</p>
            <h1 className="hero-title font-semibold text-slate-50">Operator console</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="action-secondary" href="/login">
              Sign in
            </Link>
            <Link className="action-primary" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="grid gap-6">
          <div className="panel rounded-2xl p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="data-chip badge-accent">Phase 2 Active</span>
              <span className="data-chip">Paper environment</span>
              <span className="data-chip">JWT secured</span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
              <div>
                <p className="section-kicker mb-3">Workspace Summary</p>
                <p className="max-w-2xl page-copy">
                  This build is positioned as a trading workspace, not a marketing page. Access the protected dashboard, inspect wallet state, and review the transaction ledger through a denser dark shell.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="metric-card">
                  <p className="metric-label">Wallet</p>
                  <p className="metric-value mt-2">$100K</p>
                  <p className="metric-copy mt-2">Starting paper balance.</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Ledger</p>
                  <p className="metric-value mt-2">Atomic</p>
                  <p className="metric-copy mt-2">All balance mutations recorded.</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Client</p>
                  <p className="metric-value mt-2">Next 14</p>
                  <p className="metric-copy mt-2">Typed React dashboard shell.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel rounded-2xl p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker mb-2">Navigation</p>
                <h2 className="section-title">Primary routes</h2>
              </div>
            </div>

            <div className="sidebar-list md:grid md:grid-cols-2">
              <Link className="shell-link" href="/dashboard">
                <div>
                  <p className="surface-title">Dashboard</p>
                  <p className="metric-copy mt-1">Wallet, funding actions, market watchlist, ledger.</p>
                </div>
                <span className="mono text-sm text-slate-500">/dashboard</span>
              </Link>
              <Link className="shell-link" href="/login">
                <div>
                  <p className="surface-title">Login</p>
                  <p className="metric-copy mt-1">Authenticate into the current account session.</p>
                </div>
                <span className="mono text-sm text-slate-500">/login</span>
              </Link>
              <Link className="shell-link" href="/register">
                <div>
                  <p className="surface-title">Register</p>
                  <p className="metric-copy mt-1">Create a user and provision the wallet.</p>
                </div>
                <span className="mono text-sm text-slate-500">/register</span>
              </Link>
            </div>
          </div>
        </div>

        <aside className="grid gap-6">
          <BackendStatus />

          <div className="panel-muted rounded-2xl p-5">
            <p className="section-kicker mb-2">Platform Scope</p>
            <h2 className="section-title mb-4">Current capabilities</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <span className="muted">Authentication</span>
                <span className="mono text-slate-300">Register / Login / Me</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <span className="muted">Wallet</span>
                <span className="mono text-slate-300">Auto-provisioned</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <span className="muted">Transactions</span>
                <span className="mono text-slate-300">Deposit / Withdraw</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="muted">Interface</span>
                <span className="mono text-slate-300">Dark terminal shell</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
