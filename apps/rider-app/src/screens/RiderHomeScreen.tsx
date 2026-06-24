import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import CustomToggle from '../components/CustomToggle';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRiderStore } from '../store/rider.store';
import { api } from '../services/api';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { connectSocket, SocketEvent } from '../services/socket';
import { formatCurrency, formatDistance } from '@tamarrawgo/shared-utils';

const LOCATION_INTERVAL = 3000;

export default function RiderHomeScreen() {
  const mapRef = useRef<MapView>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const {
    isOnline, bookingRequests, activeBooking,
    setOnline, addBookingRequest, removeBookingRequest, clearBookingRequests, setActiveBooking,
  } = useRiderStore();
  const hasActiveBooking = activeBooking && !['COMPLETED', 'CANCELLED'].includes((activeBooking as any)?.status);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [summary, setSummary] = useState<{ today: number; totalTrips: number; todayTrips: number; averageRating: number } | null>(null);
  const router = useRouter();

  const { setBookingRequests } = useRiderStore();
  const fetchAvailableBookings = useCallback(async () => {
    try {
      const bookings = await api.get('/bookings/available') as any[];
      if (Array.isArray(bookings)) setBookingRequests(bookings);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      // Check if rider has an active booking (session recovery after app close)
      try {
        const activeBooking = await api.get('/bookings/active') as any;
        if (activeBooking?.id && ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'].includes(activeBooking.status)) {
          setActiveBooking({
            bookingId: activeBooking.id,
            status: activeBooking.status,
            pickup: { address: activeBooking.pickupAddress, latitude: activeBooking.pickupLatitude, longitude: activeBooking.pickupLongitude },
            dropoff: { address: activeBooking.dropoffAddress, latitude: activeBooking.dropoffLatitude, longitude: activeBooking.dropoffLongitude },
            passenger: { firstName: activeBooking.passenger?.firstName, lastName: activeBooking.passenger?.lastName, phone: activeBooking.passenger?.phone },
            estimatedFare: activeBooking.estimatedFare,
          });
          router.replace('/active-trip');
          return;
        }
      } catch {}

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to show your position on the map.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        lastKnownLocation.current = coords;
        setUserLocation(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
      } catch {
        // GPS not available
      }

      fetchAvailableBookings();
    })();

    setupSocket();
    // Sync online status from DB
    api.get('/users/profile').then((profile: any) => {
      const dbOnline = profile?.rider?.onlineStatus === 'ONLINE';
      setOnline(dbOnline);
      if (dbOnline) {
        sendLocation();
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
        fetchAvailableBookings();
      }
    }).catch(() => {});
    api.get('/riders/earnings').then((data: any) =>
      setSummary({ today: data.today, totalTrips: data.totalTrips, todayTrips: data.todayTrips ?? 0, averageRating: data.averageRating })
    ).catch(() => {});
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  // Poll for available bookings every 10s while online with no active trip.
  // Covers all return paths: passenger cancel, trip complete, rider cancel, socket miss.
  useEffect(() => {
    if (!isOnline || hasActiveBooking) return;
    fetchAvailableBookings();
    const interval = setInterval(fetchAvailableBookings, 10000);
    return () => clearInterval(interval);
  }, [isOnline, hasActiveBooking, fetchAvailableBookings]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline && !hasActiveBooking) fetchAvailableBookings();
    }, [isOnline, hasActiveBooking, fetchAvailableBookings])
  );

  const setupSocket = async () => {
    const socket = await connectSocket();
    socket.on(SocketEvent.BOOKING_REQUEST, (data: any) => {
      addBookingRequest(data);
    });
    socket.on('booking:taken', (data: any) => {
      removeBookingRequest(data.bookingId);
    });
    socket.on('passenger:booking:cancel', (data: any) => {
      removeBookingRequest(data.bookingId);
      if (activeBooking?.bookingId === data.bookingId) {
        setActiveBooking(null);
        Alert.alert('Booking Cancelled', 'The passenger has cancelled this booking.');
      }
    });
    socket.on(SocketEvent.BOOKING_STATUS_UPDATE, (data: any) => {
      if (data.status === 'CANCELLED') {
        removeBookingRequest(data.bookingId);
        if (activeBooking?.bookingId === data.bookingId) {
          setActiveBooking(null);
          Alert.alert('Booking Cancelled', 'The passenger has cancelled this booking.');
        }
      }
    });
  };

  const toggleOnline = useCallback(async (value: boolean) => {
    try {
      await api.post('/riders/status', { status: value ? 'ONLINE' : 'OFFLINE' });
      setOnline(value);

      if (value) {
        sendLocation();
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
        fetchAvailableBookings();
      } else {
        if (locationInterval.current) clearInterval(locationInterval.current);
        clearBookingRequests();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update status');
    }
  }, []);

  const sendLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      lastKnownLocation.current = coords;
      setUserLocation(coords);
      await api.post('/riders/location', { ...coords, heading: loc.coords.heading ?? 0, speed: loc.coords.speed ?? 0 }).catch(() => {});
    } catch {
      if (lastKnownLocation.current) {
        await api.post('/riders/location', { ...lastKnownLocation.current, heading: 0, speed: 0 }).catch(() => {});
      }
    }
  };

  const acceptBooking = async (bookingId: string) => {
    const req = useRiderStore.getState().bookingRequests.find((r) => r.bookingId === bookingId);
    if (!req) return;
    try {
      await api.post(`/bookings/${bookingId}/accept`);
      setActiveBooking({ ...req, status: BookingStatus.ACCEPTED });
      clearBookingRequests();
      router.push('/active-trip');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to accept booking');
      removeBookingRequest(bookingId);
    }
  };

  const rejectBooking = (bookingId: string) => removeBookingRequest(bookingId);

  const renderBookingItem = ({ item }: { item: any }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingInfo}>
        <MaterialIcons name="location-on" size={16} color="#1B6B2F" />
        <Text style={styles.bookingAddr} numberOfLines={1}>{item.pickup?.address}</Text>
      </View>
      <View style={styles.bookingInfo}>
        <MaterialIcons name="place" size={16} color="#333" />
        <Text style={styles.bookingAddr} numberOfLines={1}>{item.dropoff?.address}</Text>
      </View>
      <View style={styles.bookingMeta}>
        <Text style={styles.bookingFare}>{formatCurrency(item.estimatedFare)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.bookingDist}>👤 {item.passengerCount ?? 1}</Text>
          <Text style={styles.bookingDist}>{formatDistance(item.distanceKm)}</Text>
        </View>
      </View>
      <View style={styles.bookingActions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectBooking(item.bookingId)}>
          <Text style={styles.rejectText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptBooking(item.bookingId)}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Return to active booking banner */}
      {hasActiveBooking && (
        <TouchableOpacity
          style={styles.returnBanner}
          onPress={() => router.replace('/active-trip')}
        >
          <MaterialIcons name="electric-rickshaw" size={20} color="#fff" />
          <Text style={styles.returnBannerText}>Active trip in progress — Tap to return</Text>
          <MaterialIcons name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={userLocation
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
          : { latitude: 12.8797, longitude: 121.7740, latitudeDelta: 8, longitudeDelta: 8 }}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You are here" pinColor="#1B6B2F" />
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.statusLabel}>{isOnline ? 'You are ONLINE' : 'You are OFFLINE'}</Text>
          <Text style={styles.statusSub}>{isOnline ? 'Ready to receive bookings' : 'Toggle to go online'}</Text>
        </View>
        <CustomToggle value={isOnline} onValueChange={toggleOnline} />
      </View>

      {/* Bottom Card — shown only when no booking requests */}
      {bookingRequests.length === 0 && (
        <View style={styles.bottomCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="account-balance-wallet" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>₱{(summary?.today ?? 0).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="route" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>{summary?.todayTrips ?? 0}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>{(summary?.averageRating ?? 5.0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/earnings')}>
              <MaterialIcons name="account-balance-wallet" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/history')}>
              <MaterialIcons name="history" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/profile')}>
              <MaterialIcons name="person-outline" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Requests List */}
      {bookingRequests.length > 0 && (
        <View style={styles.requestsPanel}>
          <Text style={styles.requestsHeader}>
            {bookingRequests.length} Booking Request{bookingRequests.length > 1 ? 's' : ''}
          </Text>
          <FlatList
            data={bookingRequests}
            keyExtractor={(item) => item.bookingId}
            renderItem={renderBookingItem}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  returnBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#145224', paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: 48,
  },
  returnBannerText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
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
  requestsPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36,
    maxHeight: '65%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  requestsHeader: {
    fontSize: 16, fontWeight: '800', color: '#1B6B2F', marginBottom: 12, textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#F8FFF9', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0F0E3',
  },
  bookingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bookingAddr: { flex: 1, fontSize: 14, color: '#555' },
  bookingMeta: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  bookingFare: { fontSize: 20, fontWeight: '900', color: '#1B6B2F' },
  bookingDist: { fontSize: 14, color: '#999', alignSelf: 'center' },
  bookingActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: '#FF4444', fontWeight: '700' },
  acceptBtn: { flex: 2, backgroundColor: '#1B6B2F', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
