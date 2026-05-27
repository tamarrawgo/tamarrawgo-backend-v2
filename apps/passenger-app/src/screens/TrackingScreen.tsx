import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../store/booking.store';
import { connectSocket, SocketEvent } from '../services/socket';
import { api } from '../services/api';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const STATUS_LABELS: Record<string, string> = {
  [BookingStatus.SEARCHING]: 'Finding your rider...',
  [BookingStatus.ACCEPTED]: 'Rider is on the way!',
  [BookingStatus.RIDER_ARRIVED]: 'Rider has arrived!',
  [BookingStatus.IN_PROGRESS]: 'Trip in progress...',
  [BookingStatus.COMPLETED]: 'Trip completed!',
};

export default function TrackingScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { activeBooking: _activeBooking, riderLocation, pickup, dropoff, setActiveBooking, setRiderLocation, reset } = useBookingStore();
  const activeBooking = _activeBooking as any;
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      const socket = await connectSocket();

      socket.on(SocketEvent.BOOKING_STATUS_UPDATE, (data: any) => {
        if (activeBooking?.id === data.bookingId) {
          setActiveBooking({ ...activeBooking, status: data.status } as any);
          if (data.status === BookingStatus.COMPLETED) {
            setTimeout(() => { router.push('/rate'); }, 1500);
          }
        }
      });

      socket.on(SocketEvent.RIDER_LOCATION, (data: any) => {
        setRiderLocation({ latitude: data.latitude, longitude: data.longitude, heading: data.heading });
        if (mapRef.current) {
          mapRef.current.animateCamera({
            center: { latitude: data.latitude, longitude: data.longitude },
          }, { duration: 500 });
        }
      });

      if (activeBooking?.riderId) {
        socket.emit(SocketEvent.JOIN_ROOM, `tracking:${activeBooking.riderId}`);
      }
    })();
  }, [activeBooking?.id]);

  const handleCancel = () => {
    Alert.alert('Cancel Ride?', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!activeBooking) return;
          await api.patch(`/bookings/${activeBooking.id}/cancel`, { reason: 'Passenger cancelled' });
          reset();
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  const status = (activeBooking?.status as any) ?? BookingStatus.SEARCHING;
  const isCompleted = status === BookingStatus.COMPLETED;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        initialRegion={
          pickup ? { latitude: pickup.latitude, longitude: pickup.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : { latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {pickup && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup">
            <View style={styles.pickupDot} />
          </Marker>
        )}
        {dropoff && (
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} title="Dropoff">
            <View style={styles.dropoffDot} />
          </Marker>
        )}
        {riderLocation && (
          <Marker
            coordinate={{ latitude: riderLocation.latitude, longitude: riderLocation.longitude }}
            title="Your Rider"
            rotation={riderLocation.heading}
          >
            <View style={styles.riderMarker}>
              <Ionicons name="bicycle" size={20} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#333" />
      </TouchableOpacity>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.statusText}>{STATUS_LABELS[status] ?? 'Processing...'}</Text>

        {activeBooking && (
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              <Ionicons name="person" size={24} color="#FF6B00" />
            </View>
            <View style={styles.riderDetails}>
              <Text style={styles.riderName}>
                {activeBooking?.rider?.user?.firstName} {activeBooking?.rider?.user?.lastName}
              </Text>
              <Text style={styles.riderPlate}>
                {activeBooking?.rider?.vehicle?.plateNumber ?? '—'} • ⭐ {Number(activeBooking?.rider?.rating ?? 5.0).toFixed(1)}
              </Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={20} color="#FF6B00" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/chat')}>
              <Ionicons name="chatbubble" size={20} color="#FF6B00" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>
            {formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}
          </Text>
        </View>

        {!isCompleted && status !== BookingStatus.IN_PROGRESS && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <TouchableOpacity style={styles.rateBtn} onPress={() => router.push('/rate')}>
            <Text style={styles.rateBtnText}>Rate Your Rider</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 56, left: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  statusCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B00', alignSelf: 'center', marginBottom: 8 },
  statusText: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  riderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center' },
  riderDetails: { flex: 1 },
  riderName: { fontWeight: '700', fontSize: 16, color: '#333' },
  riderPlate: { fontSize: 13, color: '#666', marginTop: 2 },
  callBtn: { padding: 10, backgroundColor: '#FFF0E6', borderRadius: 20 },
  chatBtn: { padding: 10, backgroundColor: '#FFF0E6', borderRadius: 20 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  fareLabel: { color: '#666', fontSize: 14 },
  fareAmount: { fontWeight: '800', fontSize: 20, color: '#FF6B00' },
  cancelBtn: { borderWidth: 1, borderColor: '#FF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#FF4444', fontWeight: '700', fontSize: 15 },
  rateBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickupDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B00', borderWidth: 2, borderColor: '#fff' },
  dropoffDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#333', borderWidth: 2, borderColor: '#fff' },
  riderMarker: { backgroundColor: '#2196F3', borderRadius: 20, padding: 8 },
});
