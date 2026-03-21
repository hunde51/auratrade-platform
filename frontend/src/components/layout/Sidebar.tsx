import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, LogOut, Settings,
} from 'lucide-react';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { useUserStore } from '@/store/useUserStore';
import { useNavigate } from 'react-router-dom';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, Settings,
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h1 className="text-xl font-bold">
          <span className="neon-text">{APP_NAME}</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Paper Trading Terminal</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const active = location.pathname === item.path;
          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-sidebar-accent text-primary neon-border'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
