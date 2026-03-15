import { create } from 'zustand';
import type { Position, Trade, Order } from '@/lib/types';

interface TradingStore {
  positions: Position[];
  trades: Trade[];
  orders: Order[];
  setPositions: (p: Position[]) => void;
  setTrades: (t: Trade[]) => void;
  setOrders: (o: Order[]) => void;
  addTrade: (t: Trade) => void;
  addPosition: (p: Position) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  positions: [],
  trades: [],
  orders: [],
  setPositions: (positions) => set({ positions }),
  setTrades: (trades) => set({ trades }),
  setOrders: (orders) => set({ orders }),
  addTrade: (t) => set((s) => ({ trades: [t, ...s.trades] })),
  addPosition: (p) => set((s) => ({ positions: [p, ...s.positions] })),
}));
