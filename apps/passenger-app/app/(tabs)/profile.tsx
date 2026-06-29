import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';

const GREEN = '#1B6B2F';
const GREEN_LIGHT = '#E8F5E9';

const MENU_ITEMS = [
  { icon: 'history' as const,              label: 'Ride History',      route: '/history' },
  { icon: 'notifications' as const,        label: 'Notifications',     route: '/notifications' },
  { icon: 'support-agent' as const,        label: 'Support',           route: '/support' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        {(user as any)?.profilePhoto ? (
          <Image source={{ uri: (user as any).profilePhoto }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatar}>
            <MaterialIcons name="person-outline" size={40} color={GREEN} />
          </View>
        )}
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={() => router.push(item.route as any)}>
            <View style={styles.menuIcon}>
              <MaterialIcons name={item.icon} size={20} color={GREEN} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color="#E53935" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  avatarSection: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 28, marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 12,
    borderWidth: 2, borderColor: GREEN,
  },
  name: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  phone: { fontSize: 14, color: '#888', marginTop: 4 },
  menu: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#FFCDD2', borderRadius: 14, backgroundColor: '#FFF5F5',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },
});
