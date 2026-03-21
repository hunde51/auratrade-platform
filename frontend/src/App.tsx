import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { getUser } from "@/services/mockApi";
import { getAccessToken } from "@/services/http";
import { useUserStore } from "@/store/useUserStore";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import DashboardPage from "./pages/Dashboard";
import MarketsPage from "./pages/Markets";
import TradePage from "./pages/Trade";
import AIPage from "./pages/AI";
import SettingsPage from "./pages/Settings";
import AdminPage from "./pages/Admin";
import AdminLayout from "./pages/AdminLayout";
import AdminTradesPage from "./pages/AdminTrades";
import AdminUsersPage from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireRole({ role, children }: { role: "admin" | "user"; children: React.ReactNode }) {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useUserStore((state) => state.user);
  if (!user) {
    return <>{children}</>;
  }
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function AppRoutes() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (user) {
        if (active) {
          setBootstrapping(false);
        }
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (active) {
          setBootstrapping(false);
        }
        return;
      }

      try {
        const current = await getUser();
        if (active) {
          setUser(current);
        }
      } catch {
        if (active) {
          logout();
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [logout, setUser, user]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring session...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="trades" element={<AdminTradesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        element={
          <RequireRole role="user">
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(225 25% 9%)',
            border: '1px solid hsl(225 15% 18%)',
            color: 'hsl(210 40% 92%)',
          },
        }}
      />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
