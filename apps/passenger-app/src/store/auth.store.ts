import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
import { User } from '@tamarrawgo/shared-types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phone, password) => {
    const tokens = await api.post('/auth/login', { phone, password });
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    const user = await api.get('/users/profile');
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { set({ isLoading: false }); return; }
      const user = await api.get('/users/profile');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
