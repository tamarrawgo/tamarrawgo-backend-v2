import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';

interface BookingItem {
  id: string;
  status: string;
  dropoffAddress: string;
  estimatedFare: string | number;
  createdAt: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/bookings/my');
        setBookings(Array.isArray(data) ? data : []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') return '#34C759';
    if (status === 'CANCELLED') return '#FF3B30';
    return '#FF6B00';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Ride History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#FF6B00" />
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>No rides yet</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Ionicons name="flag" size={16} color="#333" />
                <Text style={styles.address} numberOfLines={1}>{item.dropoffAddress}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.status, { color: statusColor(item.status) }]}>{item.status}</Text>
                <Text style={styles.fare}>₱{Number(item.estimatedFare).toFixed(2)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#999' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  address: { flex: 1, fontSize: 15, color: '#333', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 13, fontWeight: '700' },
  fare: { fontSize: 16, fontWeight: '800', color: '#FF6B00' },
});
