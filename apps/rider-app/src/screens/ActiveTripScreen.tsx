import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRiderStore } from '../store/rider.store';
import { api } from '../services/api';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { formatCurrency } from '@tamarrawgo/shared-utils';
import { connectSocket } from '../services/socket';

export default function ActiveTripScreen() {
  const router = useRouter();
  const { activeBooking, setActiveBooking } = useRiderStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    connectSocket().then((socket) => {
      const handleCancel = () => {
        setActiveBooking(null);
        Alert.alert(
          'Booking Cancelled',
          'The passenger has cancelled this booking.',
          [{ text: 'OK', onPress: () => router.replace('/') }],
        );
      };
      socket.on('passenger:booking:cancel', handleCancel);
      cleanup = () => socket.off('passenger:booking:cancel', handleCancel);
    });
    return () => cleanup?.();
  }, []);

  const updateStatus = async (endpoint: string, nextStatus: string) => {
    if (!activeBooking) return;
    setLoading(true);
    try {
      await api.patch(`/bookings/${activeBooking.bookingId}/${endpoint}`);
      setActiveBooking({ ...activeBooking, status: nextStatus });
    } catch (err: any) {
      Alert.alert('Error', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const status = activeBooking?.status;

  const getActionButton = () => {
    switch (status) {
      case BookingStatus.ACCEPTED:
        return { label: 'Arrived at Pickup', action: () => updateStatus('arrived', BookingStatus.RIDER_ARRIVED), color: '#2196F3' };
      case BookingStatus.RIDER_ARRIVED:
        return { label: 'Start Trip', action: () => updateStatus('start', BookingStatus.IN_PROGRESS), color: '#4CAF50' };
      case BookingStatus.IN_PROGRESS:
        return { label: 'Complete Trip', action: () => updateStatus('complete', BookingStatus.COMPLETED), color: '#FF6B00' };
      default:
        return null;
    }
  };

  const actionBtn = getActionButton();

  if (status === BookingStatus.COMPLETED) {
    return (
      <View style={styles.completedContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.completedTitle}>Trip Completed!</Text>
        <Text style={styles.completedFare}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => { setActiveBooking(null); router.replace('/'); }}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        initialRegion={{ latitude: 14.5995, longitude: 120.9842, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      >
        {activeBooking?.pickup && (
          <Marker coordinate={{ latitude: activeBooking.pickup.latitude, longitude: activeBooking.pickup.longitude }} title="Pickup">
            <View style={styles.pickupMarker}><Ionicons name="location" size={18} color="#fff" /></View>
          </Marker>
        )}
        {activeBooking?.dropoff && (
          <Marker coordinate={{ latitude: activeBooking.dropoff.latitude, longitude: activeBooking.dropoff.longitude }} title="Dropoff">
            <View style={styles.dropoffMarker}><Ionicons name="flag" size={16} color="#fff" /></View>
          </Marker>
        )}
      </MapView>

      <View style={styles.tripCard}>
        <View style={styles.passengerRow}>
          <View style={styles.avatar}><Ionicons name="person" size={24} color="#FF6B00" /></View>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{activeBooking?.passenger?.firstName} {activeBooking?.passenger?.lastName}</Text>
            <Text style={styles.passengerPhone}>{activeBooking?.passenger?.phone}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={20} color="#FF6B00" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#FF6B00" />
          <Text style={styles.locationText} numberOfLines={1}>{activeBooking?.pickup?.address}</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="flag" size={16} color="#333" />
          <Text style={styles.locationText} numberOfLines={1}>{activeBooking?.dropoff?.address}</Text>
        </View>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
        </View>

        {actionBtn && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: actionBtn.color }]}
            onPress={actionBtn.action}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>{actionBtn.label}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16 },
  completedTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
  completedFare: { fontSize: 36, fontWeight: '900', color: '#FF6B00' },
  doneBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tripCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0E6', alignItems: 'center', justifyContent: 'center' },
  passengerInfo: { flex: 1 },
  passengerName: { fontWeight: '700', fontSize: 16, color: '#333' },
  passengerPhone: { color: '#999', fontSize: 13, marginTop: 2 },
  callBtn: { padding: 10, backgroundColor: '#FFF0E6', borderRadius: 20 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  locationText: { flex: 1, color: '#555', fontSize: 14 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  fareLabel: { color: '#666', fontSize: 14 },
  fareAmount: { fontSize: 22, fontWeight: '900', color: '#FF6B00' },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pickupMarker: { backgroundColor: '#FF6B00', borderRadius: 16, padding: 5 },
  dropoffMarker: { backgroundColor: '#333', borderRadius: 16, padding: 5 },
});
