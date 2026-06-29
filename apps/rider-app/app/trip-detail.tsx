import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { api } from '../src/services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const GREEN = '#1B6B2F';

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#34C759',
  CANCELLED: '#E53935',
  IN_PROGRESS: '#FF9800',
  ACCEPTED: '#2196F3',
  SEARCHING: '#999',
};

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const mapRef = (null as any);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data: any = await api.get(`/bookings/${id}`);
        setBooking(data);
        if (data.pickupLatitude && data.dropoffLatitude) {
          try {
            const dirs: any = await api.get(`/maps/directions?originLat=${data.pickupLatitude}&originLng=${data.pickupLongitude}&destLat=${data.dropoffLatitude}&destLng=${data.dropoffLongitude}`);
            if (dirs?.polyline) setRouteCoords(decodePolyline(dirs.polyline));
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <MaterialIcons name="error-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>Trip not found</Text>
        </View>
      </View>
    );
  }

  const riderName = booking.rider
    ? `${booking.rider.user?.firstName ?? ''} ${booking.rider.user?.lastName ?? ''}`.trim()
    : 'N/A';
  const plateNo = booking.rider?.vehicle?.plateNumber ?? 'N/A';
  const rating = booking.rating?.riderScore ?? null;
  const fare = Number(booking.estimatedFare ?? 0);
  const date = new Date(booking.createdAt);
  const pickup = { latitude: booking.pickupLatitude, longitude: booking.pickupLongitude };
  const dropoff = { latitude: booking.dropoffLatitude, longitude: booking.dropoffLongitude };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            initialRegion={{
              latitude: (pickup.latitude + dropoff.latitude) / 2,
              longitude: (pickup.longitude + dropoff.longitude) / 2,
              latitudeDelta: Math.abs(pickup.latitude - dropoff.latitude) * 1.8 + 0.01,
              longitudeDelta: Math.abs(pickup.longitude - dropoff.longitude) * 1.8 + 0.01,
            }}
            onMapReady={() => {
              setTimeout(() => {
                mapRef?.fitToCoordinates?.(
                  [pickup, dropoff],
                  { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false },
                );
              }, 500);
            }}
          >
            <Marker coordinate={pickup} anchor={{ x: 0.5, y: 1 }}>
              <Text style={styles.emoji}>🙋</Text>
            </Marker>
            <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }}>
              <Text style={styles.emoji}>🏁</Text>
            </Marker>
            {routeCoords.length > 0 && (
              <Polyline coordinates={routeCoords} strokeColor={GREEN} strokeWidth={4} />
            )}
          </MapView>
        </View>

        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[booking.status] ?? '#999') + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[booking.status] ?? '#999' }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] ?? '#999' }]}>{booking.status}</Text>
          </View>
          <Text style={styles.dateText}>
            {date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.timeText}>
          {date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Locations */}
        <View style={styles.card}>
          <View style={styles.locRow}>
            <View style={styles.dotGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locLabel}>Pickup</Text>
              <Text style={styles.locAddr} numberOfLines={2}>{booking.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.locDivider} />
          <View style={styles.locRow}>
            <View style={styles.dotRed} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locLabel}>Dropoff</Text>
              <Text style={styles.locAddr} numberOfLines={2}>{booking.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Driver info */}
        {booking.rider && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver</Text>
            <View style={styles.driverRow}>
              {(booking as any)?.rider?.user?.profilePhoto
                ? <Image source={{ uri: booking.rider.user.profilePhoto }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                : <View style={styles.driverAvatar}><MaterialIcons name="person" size={24} color={GREEN} /></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{riderName}</Text>
                <Text style={styles.driverSub}>Plate: {plateNo}</Text>
              </View>
              {rating && (
                <View style={styles.ratingBadge}>
                  <MaterialIcons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingText}>{rating}/5</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Fare breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Breakdown</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>{formatCurrency(Number(booking.baseFare ?? 0))}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance ({Number(booking.distanceKm ?? 0).toFixed(1)} km)</Text>
            <Text style={styles.fareValue}>{formatCurrency(Number(booking.distanceFare ?? 0))}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Duration (~{booking.estimatedDurationMinutes ?? 0} mins)</Text>
            <Text style={styles.fareValue}>{formatCurrency(Number(booking.timeFare ?? 0))}</Text>
          </View>
          {Number(booking.surgeMultiplier ?? 1) > 1 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Surge ({booking.surgeMultiplier}x)</Text>
              <Text style={[styles.fareValue, { color: '#E53935' }]}>Applied</Text>
            </View>
          )}
          {(booking.passengerCount ?? 1) > 1 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Passengers ({booking.passengerCount})</Text>
              <Text style={styles.fareValue}>+{((booking.passengerCount - 1) * 20)}%</Text>
            </View>
          )}
          <View style={styles.fareDivider} />
          <View style={styles.fareRow}>
            <Text style={styles.fareTotalLabel}>Total Fare</Text>
            <Text style={styles.fareTotalValue}>{formatCurrency(fare)}</Text>
          </View>
        </View>

        {/* Trip info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Info</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Payment</Text>
              <Text style={styles.infoValue}>{booking.paymentMethod ?? 'CASH'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Passengers</Text>
              <Text style={styles.infoValue}>{booking.passengerCount ?? 1}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Booking ID</Text>
              <Text style={styles.infoValue}>{booking.id?.slice(0, 8)}...</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  content: { padding: 16, paddingBottom: 40 },

  mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  emoji: { fontSize: 24, lineHeight: 26 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 13, color: '#888' },
  timeText: { fontSize: 12, color: '#bbb', marginBottom: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  locRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, marginTop: 4 },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E53935', marginTop: 4 },
  locLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  locAddr: { fontSize: 14, color: '#333', marginTop: 2 },
  locDivider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 24, marginVertical: 10 },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  driverSub: { fontSize: 13, color: '#888', marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#F5A623' },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  fareLabel: { fontSize: 14, color: '#666' },
  fareValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  fareDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 6 },
  fareTotalLabel: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  fareTotalValue: { fontSize: 18, fontWeight: '900', color: GREEN },

  infoGrid: { flexDirection: 'row', gap: 12 },
  infoItem: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 10, padding: 10, alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 4 },
});
