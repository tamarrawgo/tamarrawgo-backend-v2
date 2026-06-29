import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform, StatusBar, Alert, Clipboard } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../src/services/api';

const GREEN = '#1B6B2F';

const ICON_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  PROMO_ALERT: { icon: 'local-offer', color: '#E65100', bg: '#FFF3E0' },
  BOOKING_REQUEST: { icon: 'local-taxi', color: GREEN, bg: '#E8F5E9' },
  TRIP_COMPLETED: { icon: 'check-circle', color: '#4CAF50', bg: '#E8F5E9' },
  SYSTEM: { icon: 'info', color: '#1565C0', bg: '#E3F2FD' },
  PAYMENT_RECEIVED: { icon: 'payments', color: GREEN, bg: '#E8F5E9' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then((res: any) => {
        const notifs = res?.data ?? (Array.isArray(res) ? res : []);
        setNotifications(notifs);
        // Mark all unread as read
        notifs.filter((n: any) => !n.read).forEach((n: any) => {
          api.patch(`/notifications/${n.id}/read`).catch(() => {});
        });
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const getIcon = (type: string) => ICON_MAP[type] ?? ICON_MAP.SYSTEM;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={64} color="#ddd" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const { icon, color, bg } = getIcon(item.type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => {
                  markAsRead(item.id);
                  const code = item.data?.promoCode;
                  if (code) {
                    Alert.alert('Your Promo Code', `\n${code}\n\nEnter this code when booking to get your discount.`, [
                      { text: 'Copy Code', onPress: () => { Clipboard.setString(code); Alert.alert('Copied!', `${code} copied to clipboard`); } },
                      { text: 'OK' },
                    ]);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  <MaterialIcons name={icon as any} size={22} color={color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#999' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: GREEN },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  cardBody: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#bbb', marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginTop: 6 },
});
