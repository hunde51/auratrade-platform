import { Brain, LogOut, Shield, Users } from "lucide-react";
import { Navigate, NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/useUserStore";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

const adminNavItems = [
  { label: "Overview", path: "/admin", icon: Shield, exact: true },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Trades", path: "/admin/trades", icon: Brain },
] as const satisfies ReadonlyArray<{
  label: string;
  path: string;
  icon: React.ElementType;
  exact?: boolean;
}>;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  useAdminRealtime(Boolean(user && user.role === "admin"));

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="text-xl font-bold">
            <span className="neon-text">{APP_NAME}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Admin Control Center</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {adminNavItems.map((item) => {
            const active = "exact" in item && item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <RouterNavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-primary neon-border"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </RouterNavLink>
            );
          })}

        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-border px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Admin Workspace</h2>
              <p className="text-sm text-muted-foreground">Role-based administration</p>
            </div>
            <div />
          </div>
        </header>

        <main className="p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
