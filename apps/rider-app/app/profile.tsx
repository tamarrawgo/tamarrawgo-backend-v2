import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/auth.store';
import { useRiderStore } from '../src/store/rider.store';

export default function RiderProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { setOnline, setBookingRequest, setActiveBooking } = useRiderStore();

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await logout();
          setOnline(false);
          setBookingRequest(null);
          setActiveBooking(null);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#1A1A2E" />
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.badge}>
          <Ionicons name="bicycle" size={14} color="#FF6B00" />
          <Text style={styles.badgeText}>Rider</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/earnings')}>
            <Ionicons name="wallet-outline" size={20} color="#1A1A2E" />
            <Text style={styles.rowLabel}>My Earnings</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/history')}>
            <Ionicons name="time-outline" size={20} color="#1A1A2E" />
            <Text style={styles.rowLabel}>Trip History</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 24, alignItems: 'center' },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8EAF6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 4 },
  phone: { fontSize: 15, color: '#999', marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF3EC', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, marginBottom: 32,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#FF6B00' },
  section: { width: '100%', marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  rowLabel: { flex: 1, fontSize: 15, color: '#333' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 1.5, borderColor: '#FF3B30', borderRadius: 12,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
});
