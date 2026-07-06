import { create } from 'zustand';
import { api } from '../services/api';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('adminUser') ?? 'null'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: async (username, password) => {
    const tokens: any = await api.post('/auth/admin-login', { username, password });
    localStorage.setItem('accessToken', tokens.accessToken);
    const user = await api.get('/users/profile');
    localStorage.setItem('adminUser', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('adminUser');
    set({ user: null, isAuthenticated: false });
  },
}));
