"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { setAccessToken } from "@/lib/session";
import { registerUser } from "@/services/auth";

export default function RegisterPage() {
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
      const response = await registerUser({ email, password });
      setAccessToken(response.access_token);
      router.push("/dashboard");
    } catch {
      setError("Registration failed. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell mx-auto flex min-h-screen max-w-6xl items-center px-5 py-6 md:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-2xl p-6 md:p-8">
          <p className="section-kicker mb-3">Account Setup</p>
          <h1 className="page-title mb-4 font-semibold tracking-tight text-slate-50">Provision a paper trading account.</h1>
          <p className="max-w-xl page-copy">
            Registration creates the user record, opens the wallet, applies the initial paper allocation, and writes the first ledger entry.
          </p>

          <div className="my-8 divider-label">Provisioning rules</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="metric-card">
              <p className="metric-label">Initial Balance</p>
              <p className="metric-value mt-2">$100,000</p>
              <p className="metric-copy mt-2">Every new account starts with preloaded paper capital.</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Ledger Integrity</p>
              <p className="surface-title mt-2">Transaction-backed balance</p>
              <p className="metric-copy mt-2">Balance mutations are paired with persisted events for auditability.</p>
            </div>
          </div>
        </section>

        <section className="panel rounded-2xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker mb-2">Register</p>
              <h2 className="section-title">Create credentials</h2>
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
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
            <button className="action-primary w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="mt-5 text-sm muted">
            Already have an account? <Link className="font-medium text-sky-300" href="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
