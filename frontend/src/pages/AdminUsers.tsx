import { useMemo, useState } from "react";

import { UsersTable } from "@/components/admin/UsersTable";
import { useAdminUsers } from "@/hooks/useAdmin";

const PAGE_SIZE = 12;

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin">("all");
  const [page, setPage] = useState(1);

  const usersQuery = useAdminUsers(query, role, page, PAGE_SIZE);
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
        <UsersTable users={data?.items ?? []} />
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
