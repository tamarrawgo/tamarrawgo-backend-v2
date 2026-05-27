import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  user: any | null;
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
    await SecureStore.setItemAsync('riderAccessToken', tokens.accessToken);
    await SecureStore.setItemAsync('riderRefreshToken', tokens.refreshToken);
    const user = await api.get('/users/profile');
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await SecureStore.deleteItemAsync('riderAccessToken');
    await SecureStore.deleteItemAsync('riderRefreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('riderAccessToken');
      if (!token) { set({ isLoading: false }); return; }
      const user = await api.get('/users/profile');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
