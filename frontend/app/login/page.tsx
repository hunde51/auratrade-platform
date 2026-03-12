"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { setAccessToken } from "@/lib/session";
import { loginUser } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser({ email, password });
      setAccessToken(response.access_token);
      router.push("/dashboard");
    } catch {
      setError("Login failed. Check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell mx-auto flex min-h-screen max-w-6xl items-center px-5 py-6 md:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-2xl p-6 md:p-8">
          <p className="section-kicker mb-3">Session Access</p>
          <h1 className="page-title mb-4 font-semibold tracking-tight text-slate-50">Authenticate to enter the trading workspace.</h1>
          <p className="max-w-xl page-copy">
            Sign in to the protected dashboard and load the active user, wallet balance, and transaction ledger.
          </p>

          <div className="my-8 divider-label">Access profile</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="metric-card">
              <p className="metric-label">Security Model</p>
              <p className="surface-title mt-2">JWT bearer session</p>
              <p className="metric-copy mt-2">Authenticated calls resolve the current user and unlock wallet endpoints.</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Available Data</p>
              <p className="surface-title mt-2">Wallet and ledger</p>
              <p className="metric-copy mt-2">The dashboard surfaces balance, funding flows, and recorded transaction events.</p>
            </div>
          </div>
        </section>

        <section className="panel rounded-2xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker mb-2">Login</p>
              <h2 className="section-title">Operator credentials</h2>
            </div>
            <Link className="data-chip" href="/">
              Home
            </Link>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              className="terminal-input"
              type="email"
              placeholder="trader@auratrade.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="terminal-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
            <button className="action-primary w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Enter Dashboard"}
            </button>
          </form>
          <p className="mt-5 text-sm muted">
            Need an account? <Link className="font-medium text-sky-300" href="/register">Create one now</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
