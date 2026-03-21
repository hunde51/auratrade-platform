import { Bell, Menu, Search } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, Shield, LogOut, X, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Brain, Shield, Settings,
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
};

export function Navbar() {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setNotifications([
      {
        id: 'notif-1',
        title: 'Welcome back',
        description: `Signed in as ${user.name}`,
        timestamp: new Date().toISOString(),
        read: false,
      },
      {
        id: 'notif-2',
        title: 'Market stream active',
        description: 'Realtime market feed is connected.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        read: false,
      },
    ]);
  }, [user]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const openSettings = () => {
    navigate('/settings');
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setProfileMenuOpen(false);
  };

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
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setProfileMenuOpen(false);
              }}
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse-neon" />}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Notifications</span>
                  <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                </div>
                <div className="max-h-64 space-y-2 overflow-auto">
                  {notifications.length === 0 && (
                    <div className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">No notifications yet.</div>
                  )}
                  {notifications.map((item) => (
                    <div key={item.id} className={cn('rounded-md border px-3 py-2 text-xs', item.read ? 'border-border bg-secondary/40 text-muted-foreground' : 'border-primary/40 bg-secondary')}>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={markAllAsRead} className="rounded-md bg-secondary px-2 py-1 text-xs">
                    Mark all read
                  </button>
                  <button type="button" onClick={clearNotifications} className="rounded-md bg-secondary px-2 py-1 text-xs">
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {user && (
            <div ref={profileMenuRef} className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
                className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary"
                aria-label="Open profile menu"
              >
                {user.name.split(' ').map((n) => n[0]).join('')}
              </button>
              <span className="hidden md:block text-sm font-medium">{user.name}</span>

              {profileMenuOpen && (
                <div className="absolute right-0 top-10 w-52 rounded-lg border border-border bg-card p-2 shadow-lg">
                  <div className="mb-2 rounded-md bg-secondary/60 px-2 py-2">
                    <p className="text-xs font-semibold">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openSettings}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-secondary"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-red-300 hover:bg-secondary"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              )}
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
