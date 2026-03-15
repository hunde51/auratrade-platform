import { Bell, Menu, Search } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, Shield, LogOut, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, Shield,
};

export function Navbar() {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-lg flex items-center px-4 lg:px-6 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="lg:hidden text-sm font-bold neon-text">{APP_NAME}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search markets, symbols..."
              className="w-full h-9 pl-9 pr-4 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse-neon" />
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="hidden md:block text-sm font-medium">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold neon-text">{APP_NAME}</span>
              <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5 text-foreground" /></button>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                const active = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      active ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <button
              onClick={() => { logout(); navigate('/login'); setMobileOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 mt-4 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
