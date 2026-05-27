import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../src/store/booking.store';
import { api } from '../src/services/api';
import { connectSocket, SocketEvent } from '../src/services/socket';

export default function SearchingScreen() {
  const router = useRouter();
  const { activeBooking: _ab, setActiveBooking } = useBookingStore();
  const activeBooking = _ab as any;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Refresh booking from API on mount
    (async () => {
      try {
        const booking: any = await api.get('/bookings/active');
        if (booking && booking.id) {
          setActiveBooking(booking as any);
          // Already accepted — go straight to tracking
          if (booking.status === 'ACCEPTED' || booking.status === 'RIDER_ARRIVED' || booking.status === 'IN_PROGRESS') {
            router.replace('/tracking');
            return;
          }
        } else {
          setActiveBooking(null);
          router.replace('/(tabs)/home');
          return;
        }
      } catch {
        // keep whatever is in store
      }
    })();

    // Listen for socket BOOKING_ASSIGNED event
    connectSocket().then((socket) => {
      socket.on(SocketEvent.BOOKING_ASSIGNED, async () => {
        try {
          const booking: any = await api.get('/bookings/active');
          if (booking?.id) setActiveBooking(booking as any);
        } catch {}
        router.replace('/tracking');
      });
    });

    // Poll every 5s as fallback
    pollRef.current = setInterval(async () => {
      try {
        const booking: any = await api.get('/bookings/active');
        if (!booking?.id) {
          clearInterval(pollRef.current!);
          setActiveBooking(null);
          router.replace('/(tabs)/home');
          return;
        }
        setActiveBooking(booking as any);
        if (['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
          clearInterval(pollRef.current!);
          router.replace('/tracking');
        } else if (booking.status === 'CANCELLED') {
          clearInterval(pollRef.current!);
          setActiveBooking(null);
          router.replace('/(tabs)/home');
        }
        // SEARCHING and EXPIRED (re-dispatching) — stay on this screen
      } catch {}
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      connectSocket().then((socket) => socket.off(SocketEvent.BOOKING_ASSIGNED));
    };
  }, []);

  const handleCancel = async () => {
    const bookingId = activeBooking?.id;
    if (!bookingId) {
      router.replace('/(tabs)/home');
      return;
    }
    try {
      await api.patch(`/bookings/${String(bookingId)}/cancel`, { reason: 'Cancelled by passenger' });
      setActiveBooking(null);
      if (pollRef.current) clearInterval(pollRef.current);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to cancel');
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B00" style={styles.spinner} />
      <Text style={styles.title}>Looking for a rider...</Text>
      <Text style={styles.subtitle}>Please wait while we find you a TamarrawGo rider nearby</Text>

      {activeBooking?.dropoffAddress ? (
        <View style={styles.bookingInfo}>
          <Text style={styles.label}>Drop-off</Text>
          <Text style={styles.value}>{activeBooking.dropoffAddress}</Text>
          <Text style={styles.label}>Estimated Fare</Text>
          <Text style={styles.fare}>₱{Number(activeBooking.estimatedFare).toFixed(2)}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel Booking</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  spinner: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 32 },
  bookingInfo: {
    width: '100%', backgroundColor: '#FFF8F5', borderRadius: 16,
    padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#FFE0CC',
  },
  label: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase', marginTop: 12 },
  value: { fontSize: 15, color: '#333', marginTop: 4 },
  fare: { fontSize: 28, fontWeight: '800', color: '#FF6B00', marginTop: 4 },
  cancelBtn: {
    borderWidth: 1.5, borderColor: '#FF6B00', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  cancelText: { color: '#FF6B00', fontSize: 15, fontWeight: '700' },
});
