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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold">Login</h1>
      <form className="space-y-4 rounded-xl bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <input
          className="w-full rounded-md border border-slate-300 px-4 py-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-slate-300 px-4 py-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-teal-700 px-4 py-3 text-white" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Need an account? <Link className="text-teal-700" href="/register">Register</Link>
      </p>
    </main>
  );
}
