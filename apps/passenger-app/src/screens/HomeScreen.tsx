import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useBookingStore } from '../store/booking.store';
import { api } from '../services/api';
import { connectSocket, SocketEvent } from '../services/socket';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const { pickup, dropoff, activeBooking, riderLocation, setPickup, setActiveBooking, setRiderLocation } = useBookingStore();
  const router = useRouter();

  useEffect(() => {
    // Check for existing active booking on mount
    (async () => {
      try {
        const existing = await api.get('/bookings/active') as any;
        if (existing) {
          setActiveBooking(existing);
          router.replace('/searching');
        }
      } catch { /* no active booking */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Location access is required'); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);

      // Auto-set pickup to current location
      const { data: geocode } = await api.get(`/maps/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`).catch(() => ({ data: { address: 'Current Location' } }));
      setPickup({ ...coords, address: geocode.address });

      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const socket = await connectSocket();

      socket.on(SocketEvent.BOOKING_STATUS_UPDATE, (data: any) => {
        if (activeBooking?.id === data.bookingId) {
          setActiveBooking({ ...activeBooking, status: data.status } as any);
        }
      });

      socket.on(SocketEvent.RIDER_LOCATION, (data: any) => {
        setRiderLocation({ latitude: data.latitude, longitude: data.longitude, heading: data.heading });
      });

      socket.on(SocketEvent.BOOKING_ASSIGNED, (data: any) => {
        setActiveBooking(data.booking);
        router.push('/tracking');
      });
    })();
  }, [activeBooking]);

  const handleBookRide = useCallback(async () => {
    if (!pickup || !dropoff) { router.push('/search'); return; }
    setLoading(true);
    try {
      const booking = await api.post('/bookings', {
        pickup,
        dropoff,
        paymentMethod: 'CASH',
      });
      setActiveBooking(booking as any);
      router.push('/searching');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to book ride');
      if (msg.toLowerCase().includes('active booking')) {
        try {
          const existing = await api.get('/bookings/active') as any;
          if (existing) {
            setActiveBooking(existing);
            router.push('/searching');
            return;
          }
        } catch {}
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [pickup, dropoff]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{ latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {pickup && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup">
            <View style={styles.pickupMarker}><Ionicons name="location" size={24} color="#fff" /></View>
          </Marker>
        )}
        {dropoff && (
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} title="Drop-off">
            <View style={styles.dropoffMarker}><Ionicons name="flag" size={20} color="#fff" /></View>
          </Marker>
        )}
        {riderLocation && (
          <Marker coordinate={{ latitude: riderLocation.latitude, longitude: riderLocation.longitude }} title="Rider">
            <View style={styles.riderMarker}><Ionicons name="bicycle" size={20} color="#fff" /></View>
          </Marker>
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.firstName}!</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={20} color="#FF6B00" />
          <Text style={styles.searchText}>
            {dropoff ? dropoff.address : 'Where do you want to go?'}
          </Text>
        </TouchableOpacity>

        {pickup && dropoff && (
          <TouchableOpacity style={styles.bookBtn} onPress={handleBookRide} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.bookBtnText}>Book TamarrawGo</Text>
            }
          </TouchableOpacity>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/history')}>
            <Ionicons name="time-outline" size={22} color="#FF6B00" />
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color="#FF6B00" />
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/support')}>
            <Ionicons name="help-circle-outline" size={22} color="#FF6B00" />
            <Text style={styles.actionLabel}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 56, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  greeting: { fontSize: 16, fontWeight: '700', color: '#333' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  searchText: { flex: 1, fontSize: 15, color: '#666' },
  bookBtn: {
    backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16,
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 12, color: '#666' },
  pickupMarker: { backgroundColor: '#FF6B00', borderRadius: 20, padding: 6 },
  dropoffMarker: { backgroundColor: '#333', borderRadius: 20, padding: 6 },
  riderMarker: { backgroundColor: '#2196F3', borderRadius: 20, padding: 6 },
});
