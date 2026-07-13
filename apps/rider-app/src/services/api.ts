import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config || config._retryCount >= 2) return Promise.reject(error);
  const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('Network Error'));
  if (!isNetworkError) return Promise.reject(error);
  config._retryCount = (config._retryCount || 0) + 1;
  await new Promise((r) => setTimeout(r, 2000));
  return api(config);
});

let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredCallback(cb: () => void) {
  _onSessionExpired = cb;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('riderAccessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => ('success' in (response.data ?? {}) ? response.data.data : response.data),
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('riderRefreshToken');
        if (!refreshToken) {
          // Token already cleared (logged out) — don't call refresh endpoint
          _onSessionExpired?.();
          return Promise.reject(error.response?.data ?? error);
        }
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess: string = data.accessToken;
        await SecureStore.setItemAsync('riderAccessToken', newAccess);
        if (data.refreshToken) await SecureStore.setItemAsync('riderRefreshToken', data.refreshToken).catch(() => {});
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('riderAccessToken');
        await SecureStore.deleteItemAsync('riderRefreshToken');
        _onSessionExpired?.();
      }
    }
    return Promise.reject(error.response?.data ?? error);
  },
);
