import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
});

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="rate" />
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
        <Stack.Screen name="searching" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="history" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="support" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify-otp" />
      </Stack>
    </QueryClientProvider>
  );
}
