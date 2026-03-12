import BackendStatus from "@/components/BackendStatus";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AuraTrade Phase 2</h1>
        <p className="text-lg text-slate-700">Authentication, wallet setup, and transaction tracking are ready.</p>
      </header>
      <div className="flex gap-4">
        <Link className="rounded-md bg-teal-700 px-4 py-2 text-white" href="/register">
          Register
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2" href="/login">
          Login
        </Link>
        <Link className="rounded-md border border-slate-300 px-4 py-2" href="/dashboard">
          Dashboard
        </Link>
      </div>
      <BackendStatus />
    </main>
  );
}
