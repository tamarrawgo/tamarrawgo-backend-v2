import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api } from '../services/api';
import { User } from '@tamarrawgo/shared-types';

async function registerFcmToken() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = await Notifications.getExpoPushTokenAsync();
    if (token?.data) {
      await api.put('/users/fcm-token', { fcmToken: token.data }).catch(() => {});
    }
  } catch {}
}

// Dual storage: SecureStore (primary) + AsyncStorage (fallback)
// Some Android skins (Honor/EMUI) can clear SecureStore on aggressive cleanup
const SECURE_KEYS = {
  accessToken: 'passengerAccessToken',
  refreshToken: 'passengerRefreshToken',
};
const ASYNC_KEYS = {
  accessToken: '@passenger_access_token',
  refreshToken: '@passenger_refresh_token',
};
const OLD_ASYNC_KEYS = {
  accessToken: '@tamarrawgo_access_token',
  refreshToken: '@tamarrawgo_refresh_token',
};
const USER_CACHE_KEY = '@tamarrawgo_passenger_user';

async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.accessToken, accessToken).catch(() => {}),
    SecureStore.setItemAsync(SECURE_KEYS.refreshToken, refreshToken).catch(() => {}),
    AsyncStorage.setItem(ASYNC_KEYS.accessToken, accessToken),
    AsyncStorage.setItem(ASYNC_KEYS.refreshToken, refreshToken),
  ]);
}

async function readToken(): Promise<string | null> {
  // Try SecureStore first
  try {
    const t = await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
    if (t) return t;
  } catch {}
  // Fallback to AsyncStorage (current keys)
  const t2 = await AsyncStorage.getItem(ASYNC_KEYS.accessToken);
  if (t2) return t2;
  // Migrate from old AsyncStorage keys (pre-SecureStore builds)
  const old = await AsyncStorage.getItem(OLD_ASYNC_KEYS.accessToken);
  if (old) {
    const oldRefresh = await AsyncStorage.getItem(OLD_ASYNC_KEYS.refreshToken);
    await saveTokens(old, oldRefresh ?? '');
    await AsyncStorage.multiRemove([OLD_ASYNC_KEYS.accessToken, OLD_ASYNC_KEYS.refreshToken]);
    return old;
  }
  return null;
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.accessToken).catch(() => {}),
    SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken).catch(() => {}),
    AsyncStorage.multiRemove([
      ASYNC_KEYS.accessToken, ASYNC_KEYS.refreshToken,
      OLD_ASYNC_KEYS.accessToken, OLD_ASYNC_KEYS.refreshToken,
      USER_CACHE_KEY,
    ]),
  ]);
}

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
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    const user = await api.get('/users/profile');
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
    registerFcmToken();
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const token = await readToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        set({ user: JSON.parse(cached), isAuthenticated: true, isLoading: false });
      } else {
        set({ isAuthenticated: true, isLoading: false });
      }

      try {
        const user = await api.get('/users/profile');
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true });
      } catch {
        // Keep cached session on any error
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

export { SECURE_KEYS as AUTH_KEYS };
