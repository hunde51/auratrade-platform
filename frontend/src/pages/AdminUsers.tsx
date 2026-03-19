import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UsersTable } from "@/components/admin/UsersTable";
import { useAdminUserDetail, useAdminUsers } from "@/hooks/useAdmin";
import { formatCurrency } from "@/lib/format";
import { resetAdminUserWallet, updateAdminUserRole, updateAdminUserStatus } from "@/services/adminApi";

const PAGE_SIZE = 12;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin">("all");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [walletDraft, setWalletDraft] = useState<string>("");

  const usersQuery = useAdminUsers(query, role, page, PAGE_SIZE);
  const userDetailQuery = useAdminUserDetail(selectedUserId);
  const { data, isLoading } = usersQuery;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const summary = useMemo(() => {
    if (!total) {
      return "No users found";
    }
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `Showing ${start}-${end} of ${total}`;
  }, [page, total]);

  const invalidateAdminQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", selectedUserId] }),
    ]);
  };

  const roleMutation = useMutation({
    mutationFn: async (nextRole: "user" | "admin") => {
      if (selectedUserId == null) {
        throw new Error("Select a user first");
      }
      await updateAdminUserRole(selectedUserId, nextRole);
    },
    onSuccess: async () => {
      toast.success("User role updated");
      await invalidateAdminQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (selectedUserId == null) {
        throw new Error("Select a user first");
      }
      await updateAdminUserStatus(selectedUserId, isActive);
    },
    onSuccess: async () => {
      toast.success("User status updated");
      await invalidateAdminQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    },
  });

  const walletMutation = useMutation({
    mutationFn: async (balance: number) => {
      if (selectedUserId == null) {
        throw new Error("Select a user first");
      }
      await resetAdminUserWallet(selectedUserId, balance);
    },
    onSuccess: async () => {
      toast.success("Wallet balance reset");
      setWalletDraft("");
      await invalidateAdminQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reset wallet");
    },
  });

  const selectedDetail = userDetailQuery.data;

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search by username or id"
            className="h-10 rounded-md border border-border bg-secondary px-3 text-sm"
          />

          <select
            value={role}
            onChange={(event) => {
              setPage(1);
              setRole(event.target.value as "all" | "user" | "admin");
            }}
            className="h-10 rounded-md border border-border bg-secondary px-3 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 text-xs text-muted-foreground">
            <span>{summary}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Loading users...</div>
      ) : usersQuery.isError ? (
        <div className="glass-card flex items-center justify-between p-6 text-sm">
          <span className="text-red-300">Failed to load users.</span>
          <button type="button" onClick={() => usersQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <UsersTable users={data?.items ?? []} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} />
          </div>

          <div className="glass-card p-4 text-sm">
            {selectedUserId == null ? (
              <p className="text-muted-foreground">Select a user to view details and actions.</p>
            ) : userDetailQuery.isLoading ? (
              <p className="text-muted-foreground">Loading user details...</p>
            ) : userDetailQuery.isError || !selectedDetail ? (
              <div className="space-y-3">
                <p className="text-red-300">Failed to load user details.</p>
                <button type="button" onClick={() => userDetailQuery.refetch()} className="rounded-md bg-secondary px-3 py-2 text-xs">
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">{selectedDetail.username}</h3>
                  <p className="text-xs text-muted-foreground">{selectedDetail.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-secondary/40 p-2">
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-semibold uppercase">{selectedDetail.role}</p>
                  </div>
                  <div className="rounded-md bg-secondary/40 p-2">
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold uppercase">{selectedDetail.isActive ? "Active" : "Disabled"}</p>
                  </div>
                  <div className="rounded-md bg-secondary/40 p-2 col-span-2">
                    <p className="text-muted-foreground">Wallet</p>
                    <p className="font-semibold">{formatCurrency(selectedDetail.walletBalance)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Role Actions</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={selectedDetail.role === "admin" || roleMutation.isPending}
                      onClick={() => roleMutation.mutate("admin")}
                      className="rounded-md bg-secondary px-3 py-2 text-xs disabled:opacity-40"
                    >
                      Promote to Admin
                    </button>
                    <button
                      type="button"
                      disabled={selectedDetail.role === "user" || roleMutation.isPending}
                      onClick={() => roleMutation.mutate("user")}
                      className="rounded-md bg-secondary px-3 py-2 text-xs disabled:opacity-40"
                    >
                      Demote to User
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Account Actions</p>
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(!selectedDetail.isActive)}
                    className="rounded-md bg-secondary px-3 py-2 text-xs disabled:opacity-40"
                  >
                    {selectedDetail.isActive ? "Disable User" : "Enable User"}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Reset Wallet</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={walletDraft}
                      onChange={(event) => setWalletDraft(event.target.value)}
                      placeholder="New balance"
                      className="h-9 w-full rounded-md border border-border bg-secondary px-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={walletMutation.isPending || walletDraft.trim() === ""}
                      onClick={() => walletMutation.mutate(Number(walletDraft))}
                      className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Recent Trades</p>
                  <div className="max-h-40 overflow-auto rounded-md border border-border/70">
                    <table className="min-w-full text-xs">
                      <thead className="bg-secondary/30 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left">Symbol</th>
                          <th className="px-2 py-1 text-left">Side</th>
                          <th className="px-2 py-1 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.recentTrades.slice(0, 8).map((trade) => (
                          <tr key={trade.id} className="border-t border-border/60">
                            <td className="px-2 py-1">{trade.symbol}</td>
                            <td className="px-2 py-1 uppercase">{trade.side}</td>
                            <td className="px-2 py-1 text-right">{trade.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
