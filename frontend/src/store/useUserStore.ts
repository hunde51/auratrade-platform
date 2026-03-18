import { create } from 'zustand';
import type { User } from '@/lib/types';
import { clearAccessToken } from '@/services/http';

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => {
    clearAccessToken();
    set({ user: null, isAuthenticated: false });
  },
}));
