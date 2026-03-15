import { create } from 'zustand';
import type { MarketPrice } from '@/lib/types';

interface MarketStore {
  prices: MarketPrice[];
  selectedSymbol: string;
  setPrices: (prices: MarketPrice[]) => void;
  setSelectedSymbol: (symbol: string) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  prices: [],
  selectedSymbol: 'BTC/USD',
  setPrices: (prices) => set({ prices }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}));
