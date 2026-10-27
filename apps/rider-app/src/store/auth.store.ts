import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { api } from '../services/api';

// Temporary diagnostics: report push registration failures so they appear in Railway logs as [FCM-REG]
function reportPushIssue(stage: string, err: any) {
  const detail = typeof err === 'string' ? err : err?.message ?? JSON.stringify(err);
  api.post('/users/push-debug', { stage, detail: String(detail).slice(0, 500) }).catch(() => {});
}

async function registerFcmToken() {
  try {
    // High-importance channel so booking pushes show as a heads-up banner with sound
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking Requests',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch((e) => reportPushIssue('channel', e));
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') { reportPushIssue('permission', status); return; }
    // Native FCM token — backend sends via firebase-admin, which rejects Expo push tokens
    const token = await Notifications.getDevicePushTokenAsync();
    if (token?.data) {
      await api.put('/users/fcm-token', { fcmToken: token.data }).catch((e) => reportPushIssue('save', e));
    } else {
      reportPushIssue('token', 'empty token');
    }
  } catch (e) {
    reportPushIssue('error', e);
  }
}

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
    if (tokens.pendingApproval) {
      throw { message: 'Your account is pending admin approval. Please upload your documents on the TamarrawGo website and wait for approval.' };
    }
    await SecureStore.setItemAsync('riderAccessToken', tokens.accessToken);
    await SecureStore.setItemAsync('riderRefreshToken', tokens.refreshToken);
    const user = await api.get('/users/profile');
    set({ user, isAuthenticated: true });
    registerFcmToken();
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
      registerFcmToken();
    } catch {
      set({ isLoading: false });
    }
  },
}));
