import BackendStatus from "@/components/BackendStatus";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">AuraTrade Phase 1</h1>
        <p className="text-lg text-slate-700">Foundation setup for the platform is in place.</p>
      </header>
      <BackendStatus />
    </main>
  );
}
