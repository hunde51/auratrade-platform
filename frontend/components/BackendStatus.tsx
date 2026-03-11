"use client";

import { useHealth } from "@/hooks/useHealth";

export default function BackendStatus() {
  const { data, error, isLoading } = useHealth();

  if (isLoading) {
    return <p className="text-slate-600">Checking FastAPI connection...</p>;
  }

  if (error) {
    return <p className="text-red-600">FastAPI connection failed.</p>;
  }

  return <p className="text-emerald-700">FastAPI connection: {data?.status}</p>;
}
