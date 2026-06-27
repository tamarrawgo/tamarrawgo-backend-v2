import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="rate" />
      <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
      <Stack.Screen name="searching" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="history" />
      <Stack.Screen name="trip-detail" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="support" />
      <Stack.Screen name="saved-places" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="about" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
