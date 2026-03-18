import { useState } from "react";

import { TradesTable } from "@/components/admin/TradesTable";
import { useAdminTrades } from "@/hooks/useAdmin";

const PAGE_SIZE = 14;

export default function AdminTradesPage() {
  const [page, setPage] = useState(1);
  const tradesQuery = useAdminTrades(page, PAGE_SIZE);
  const { data, isLoading } = tradesQuery;

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Loading trades...</div>
      ) : tradesQuery.isError ? (
        <div className="glass-card flex items-center justify-between p-6 text-sm">
          <span className="text-red-300">Failed to load trades.</span>
          <button type="button" onClick={() => tradesQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
            Retry
          </button>
        </div>
      ) : (
        <TradesTable trades={data?.items ?? []} />
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => canPrev && setPage((current) => current - 1)}
          disabled={!canPrev}
          className="rounded-md bg-secondary px-3 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => canNext && setPage((current) => current + 1)}
          disabled={!canNext}
          className="rounded-md bg-secondary px-3 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
