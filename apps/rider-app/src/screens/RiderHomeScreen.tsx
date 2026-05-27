import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRiderStore } from '../store/rider.store';
import { api } from '../services/api';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { connectSocket, SocketEvent } from '../services/socket';
import { formatCurrency, formatDistance } from '@tamarrawgo/shared-utils';

const LOCATION_INTERVAL = 3000;

export default function RiderHomeScreen() {
  const mapRef = useRef<MapView>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isOnline, currentBookingRequest, setOnline, setBookingRequest, setActiveBooking } = useRiderStore();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [slideAnim] = useState(new Animated.Value(300));
  const [summary, setSummary] = useState<{ today: number; totalTrips: number; averageRating: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to show your position on the map.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
      } catch {
        // BlueStacks/emulator fallback — use Manila city center
        const fallback = { latitude: 14.5995, longitude: 120.9842 };
        setUserLocation(fallback);
      }
    })();

    setupSocket();
    // Sync online status from DB — avoids forcing OFFLINE after trip completion
    api.get('/users/profile').then((profile: any) => {
      const dbOnline = profile?.rider?.onlineStatus === 'ONLINE';
      setOnline(dbOnline);
      if (dbOnline) {
        sendLocation();
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
      }
    }).catch(() => {});
    api.get('/riders/earnings').then((data: any) =>
      setSummary({ today: data.today, totalTrips: data.totalTrips, averageRating: data.averageRating })
    ).catch(() => {});
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  useEffect(() => {
    if (currentBookingRequest) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [currentBookingRequest]);

  const setupSocket = async () => {
    const socket = await connectSocket();
    socket.on(SocketEvent.BOOKING_REQUEST, (data: any) => {
      setBookingRequest(data);
    });
    socket.on('booking:taken', (data: any) => {
      if (useRiderStore.getState().currentBookingRequest?.bookingId === data.bookingId) {
        setBookingRequest(null);
      }
    });
  };

  const toggleOnline = useCallback(async (value: boolean) => {
    try {
      await api.post('/riders/status', { status: value ? 'ONLINE' : 'OFFLINE' });
      setOnline(value);

      if (value) {
        sendLocation(); // immediate first update
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
      } else {
        if (locationInterval.current) clearInterval(locationInterval.current);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update status');
    }
  }, []);

  const sendLocation = async () => {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await api.post('/riders/location', {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      heading: loc.coords.heading ?? 0,
      speed: loc.coords.speed ?? 0,
    }).catch(() => {});
    setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  const acceptBooking = async () => {
    if (!currentBookingRequest) return;
    try {
      await api.post(`/bookings/${currentBookingRequest.bookingId}/accept`);
      setActiveBooking({ ...currentBookingRequest, status: BookingStatus.ACCEPTED });
      setBookingRequest(null);
      router.push('/active-trip');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to accept booking');
      setBookingRequest(null);
    }
  };

  const rejectBooking = () => setBookingRequest(null);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You are here">
            <View style={styles.riderMarker}>
              <Ionicons name="bicycle" size={20} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.statusLabel}>{isOnline ? 'You are ONLINE' : 'You are OFFLINE'}</Text>
          <Text style={styles.statusSub}>{isOnline ? 'Ready to receive bookings' : 'Toggle to go online'}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ false: '#ccc', true: '#FF6B00' }}
          thumbColor="#fff"
          ios_backgroundColor="#ccc"
        />
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={22} color="#FF6B00" />
            <Text style={styles.statValue}>₱{(summary?.today ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="bicycle" size={22} color="#FF6B00" />
            <Text style={styles.statValue}>{summary?.totalTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={22} color="#FF6B00" />
            <Text style={styles.statValue}>{(summary?.averageRating ?? 5.0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/earnings')}>
            <Ionicons name="wallet-outline" size={22} color="#FF6B00" />
            <Text style={styles.navLabel}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/history')}>
            <Ionicons name="time-outline" size={22} color="#FF6B00" />
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color="#FF6B00" />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Booking Request Modal */}
      <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>
        {currentBookingRequest && (
          <>
            <Text style={styles.bookingTitle}>New Booking Request!</Text>
            <View style={styles.bookingInfo}>
              <Ionicons name="location" size={16} color="#FF6B00" />
              <Text style={styles.bookingAddr} numberOfLines={1}>{currentBookingRequest.pickup?.address}</Text>
            </View>
            <View style={styles.bookingInfo}>
              <Ionicons name="flag" size={16} color="#333" />
              <Text style={styles.bookingAddr} numberOfLines={1}>{currentBookingRequest.dropoff?.address}</Text>
            </View>
            <View style={styles.bookingMeta}>
              <Text style={styles.bookingFare}>{formatCurrency(currentBookingRequest.estimatedFare)}</Text>
              <Text style={styles.bookingDist}>{formatDistance(currentBookingRequest.distanceKm)}</Text>
            </View>
            <View style={styles.bookingActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={rejectBooking}>
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={acceptBooking}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 56, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  statusLabel: { fontWeight: '700', fontSize: 16, color: '#333' },
  statusSub: { fontSize: 12, color: '#999', marginTop: 2 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontWeight: '800', fontSize: 18, color: '#333' },
  statLabel: { fontSize: 12, color: '#999' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },
  navRow: { flexDirection: 'row', justifyContent: 'space-around' },
  navBtn: { alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 12, color: '#666' },
  riderMarker: {
    backgroundColor: '#FF6B00', borderRadius: 20, padding: 6,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  bookingCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  bookingTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 12, textAlign: 'center' },
  bookingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bookingAddr: { flex: 1, fontSize: 14, color: '#555' },
  bookingMeta: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  bookingFare: { fontSize: 22, fontWeight: '900', color: '#FF6B00' },
  bookingDist: { fontSize: 14, color: '#999', alignSelf: 'center' },
  bookingActions: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  rejectText: { color: '#FF4444', fontWeight: '700' },
  acceptBtn: { flex: 2, backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
