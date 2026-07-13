import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const SECURE_KEY = 'passengerAccessToken';
const ASYNC_KEY = '@passenger_access_token';
const SECURE_REFRESH = 'passengerRefreshToken';
const ASYNC_REFRESH = '@passenger_refresh_token';

async function getToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(SECURE_KEY);
    if (t) return t;
  } catch {}
  return AsyncStorage.getItem(ASYNC_KEY);
}

async function getRefreshToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(SECURE_REFRESH);
    if (t) return t;
  } catch {}
  return AsyncStorage.getItem(ASYNC_REFRESH);
}

async function saveAccessToken(token: string) {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEY, token).catch(() => {}),
    AsyncStorage.setItem(ASYNC_KEY, token),
  ]);
}

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

api.interceptors.request.use(async (config) => {
  const token = await getToken();
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
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          return Promise.reject(error.response?.data ?? error);
        }
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess: string = data.accessToken;
        await saveAccessToken(newAccess);
        if (data.refreshToken) {
          await Promise.all([
            SecureStore.setItemAsync(SECURE_REFRESH, data.refreshToken).catch(() => {}),
            AsyncStorage.setItem(ASYNC_REFRESH, data.refreshToken),
          ]);
        }
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        // Do NOT delete tokens — keeps the session alive
      }
    }
    return Promise.reject(error.response?.data ?? error);
  },
);
