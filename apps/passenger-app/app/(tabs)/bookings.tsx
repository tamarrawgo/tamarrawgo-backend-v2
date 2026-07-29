import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';

const GREEN = '#1B6B2F';
const GREEN_LIGHT = '#E8F5E9';

interface BookingItem {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: string | number;
  createdAt: string;
  rider?: { user?: { firstName?: string; lastName?: string } };
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#34C759',
  CANCELLED: '#FF3B30',
  IN_PROGRESS: GREEN,
  ACCEPTED: GREEN,
  SEARCHING: '#FF9500',
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In Progress',
  ACCEPTED: 'Accepted',
  SEARCHING: 'Searching',
};

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');

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

  const upcoming = bookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status));
  const completed = bookings.filter(b => ['COMPLETED', 'CANCELLED'].includes(b.status));
  const displayed = tab === 'upcoming' ? upcoming : completed;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'completed' && styles.tabActive]}
          onPress={() => setTab('completed')}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="receipt-long" size={64} color="#ddd" />
          <Text style={styles.emptyText}>No {tab} rides</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const driverName = item.rider
              ? `${item.rider.user?.firstName ?? ''} ${item.rider.user?.lastName ?? ''}`.trim()
              : null;
            const date = new Date(item.createdAt);
            const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardDate}>{dateStr} · {timeStr}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeRow}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.routeText} numberOfLines={1}>{item.pickupAddress ?? '—'}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <View style={styles.dotRed} />
                  <Text style={styles.routeText} numberOfLines={1}>{item.dropoffAddress ?? '—'}</Text>
                </View>
                <View style={styles.cardFooter}>
                  {driverName ? (
                    <Text style={styles.driverText}>
                      <MaterialIcons name="person-outline" size={13} color="#666" /> {driverName}
                    </Text>
                  ) : <View />}
                  <Text style={styles.fare}>₱{Number(item.estimatedFare).toFixed(2)}</Text>
                </View>
                {item.status === 'COMPLETED' && (
                  <TouchableOpacity style={styles.trackBtn}>
                    <MaterialIcons name="place" size={16} color={GREEN} />
                    <Text style={styles.trackBtnText}>Track Ride</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: GREEN },
  tabText: { fontSize: 15, fontWeight: '600', color: '#999' },
  tabTextActive: { color: GREEN },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#999' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDate: { fontSize: 13, color: '#888' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeLine: { width: 1, height: 12, backgroundColor: '#DDD', marginLeft: 6, marginVertical: 2 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E53935' },
  routeText: { flex: 1, fontSize: 14, color: '#333' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  driverText: { fontSize: 13, color: '#666' },
  fare: { fontSize: 18, fontWeight: '800', color: GREEN },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, borderWidth: 1.5, borderColor: GREEN, borderRadius: 10, paddingVertical: 10,
  },
  trackBtnText: { color: GREEN, fontWeight: '700', fontSize: 14 },
});
