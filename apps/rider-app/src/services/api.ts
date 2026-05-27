import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('riderAccessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
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
