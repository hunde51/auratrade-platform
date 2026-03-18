import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";

import { APP_NAME } from "@/lib/constants";
import { useUserStore } from "@/store/useUserStore";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

function adminTabClass({ isActive }: { isActive: boolean }) {
  return [
    "rounded-md px-3 py-2 text-sm transition-all",
    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
  ].join(" ");
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  useAdminRealtime(Boolean(user && user.role === "admin"));

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="glass-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{APP_NAME}</p>
            <h2 className="text-lg font-bold">Admin Control Center</h2>
            <p className="text-sm text-muted-foreground">Independent role-based administration workspace</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-md bg-secondary px-3 py-2 text-sm text-foreground"
            >
              Back to App
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <NavLink to="/admin" end className={adminTabClass}>
            Overview
          </NavLink>
          <NavLink to="/admin/users" className={adminTabClass}>
            Users
          </NavLink>
          <NavLink to="/admin/trades" className={adminTabClass}>
            Trades
          </NavLink>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
