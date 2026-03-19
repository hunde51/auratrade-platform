import { useState } from "react";

import { TradesTable } from "@/components/admin/TradesTable";
import { useAdminAnomalies, useAdminOrders, useAdminPositions, useAdminTrades } from "@/hooks/useAdmin";
import { formatCurrency } from "@/lib/format";

const PAGE_SIZE = 14;
type TradingTab = "trades" | "orders" | "positions";

export default function AdminTradesPage() {
  const [tab, setTab] = useState<TradingTab>("trades");
  const [page, setPage] = useState(1);
  const tradesQuery = useAdminTrades(page, PAGE_SIZE);
  const ordersQuery = useAdminOrders(page, PAGE_SIZE);
  const positionsQuery = useAdminPositions(page, PAGE_SIZE);
  const anomaliesQuery = useAdminAnomalies();

  const activeQuery = tab === "trades" ? tradesQuery : tab === "orders" ? ordersQuery : positionsQuery;
  const data = activeQuery.data;
  const isLoading = activeQuery.isLoading;

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-4">
      <div className="glass-card p-3">
        <div className="flex flex-wrap gap-2">
          {(["trades", "orders", "positions"] as TradingTab[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setPage(1);
                setTab(name);
              }}
              className={`rounded-md px-3 py-2 text-xs uppercase ${
                tab === name ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Loading {tab}...</div>
      ) : activeQuery.isError ? (
        <div className="glass-card flex items-center justify-between p-6 text-sm">
          <span className="text-red-300">Failed to load {tab}.</span>
          <button type="button" onClick={() => activeQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
            Retry
          </button>
        </div>
      ) : tab === "trades" ? (
        <TradesTable trades={tradesQuery.data?.items ?? []} />
      ) : tab === "orders" ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(ordersQuery.data?.items ?? []).map((order) => (
                  <tr key={order.id} className="border-t border-border/70">
                    <td className="px-4 py-3">#{order.userId}</td>
                    <td className="px-4 py-3">{order.symbol}</td>
                    <td className="px-4 py-3 uppercase">{order.orderType}</td>
                    <td className="px-4 py-3 uppercase">{order.side}</td>
                    <td className="px-4 py-3">{order.quantity}</td>
                    <td className="px-4 py-3 uppercase">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Avg Price</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(positionsQuery.data?.items ?? []).map((position) => (
                  <tr key={position.id} className="border-t border-border/70">
                    <td className="px-4 py-3">#{position.userId}</td>
                    <td className="px-4 py-3">{position.symbol}</td>
                    <td className="px-4 py-3">{position.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(position.averagePrice)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(position.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Anomalies</h3>
          <button type="button" onClick={() => anomaliesQuery.refetch()} className="rounded-md bg-secondary px-3 py-1.5 text-xs">
            Refresh
          </button>
        </div>
        {anomaliesQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Scanning recent trading activity...</p>
        ) : anomaliesQuery.isError ? (
          <p className="text-xs text-red-300">Failed to load anomalies.</p>
        ) : anomaliesQuery.data && anomaliesQuery.data.length > 0 ? (
          <ul className="space-y-2 text-xs">
            {anomaliesQuery.data.map((item, idx) => (
              <li key={`${item.userId}-${idx}`} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <span className="font-semibold">User #{item.userId}:</span> {item.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No anomalies detected in the latest window.</p>
        )}
      </div>

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
