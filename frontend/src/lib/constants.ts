export const APP_NAME = 'AuraTrade';

export const SYMBOLS = [
  { symbol: 'BTC/USD', name: 'Bitcoin' },
  { symbol: 'ETH/USD', name: 'Ethereum' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'SOL/USD', name: 'Solana' },
] as const;

export const REFRESH_INTERVAL = 2000;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Markets', path: '/markets', icon: 'TrendingUp' },
  { label: 'Trade', path: '/trade', icon: 'ArrowLeftRight' },
  { label: 'AI Insights', path: '/ai', icon: 'Brain' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
