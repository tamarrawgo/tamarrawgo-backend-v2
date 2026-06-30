import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

export default function EarningsScreen() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/riders/earnings').then(setEarnings).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1B6B2F" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Earnings</Text>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.walletAmount}>{formatCurrency(earnings?.walletBalance ?? 0)}</Text>
        <TouchableOpacity style={styles.topupBtn} onPress={() => router.push('/request-topup' as any)}>
          <MaterialIcons name="add-circle-outline" size={18} color="#1B6B2F" />
          <Text style={styles.topupBtnText}>Request Topup</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Today', value: earnings?.today, icon: 'today' },
          { label: 'This Week', value: earnings?.thisWeek, icon: 'date-range' },
          { label: 'This Month', value: earnings?.thisMonth, icon: 'calendar-month' },
        ].map((item) => (
          <View key={item.label} style={styles.statCard}>
            <MaterialIcons name={item.icon as any} size={24} color="#1B6B2F" />
            <Text style={styles.statAmount}>{formatCurrency(item.value ?? 0)}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tripsCard}>
        <View style={styles.tripsStat}>
          <Text style={styles.tripsValue}>{earnings?.totalTrips ?? 0}</Text>
          <Text style={styles.tripsLabel}>Total Trips</Text>
        </View>
        <View style={styles.tripsDivider} />
        <View style={styles.tripsStat}>
          <Text style={styles.tripsValue}>⭐ {(earnings?.averageRating ?? 5.0).toFixed(1)}</Text>
          <Text style={styles.tripsLabel}>Average Rating</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#333' },
  walletCard: {
    margin: 16, backgroundColor: '#1B6B2F', borderRadius: 16, padding: 24, alignItems: 'center',
  },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  walletAmount: { color: '#fff', fontSize: 36, fontWeight: '900' },
  topupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16,
  },
  topupBtnText: { color: '#1B6B2F', fontWeight: '700', fontSize: 13 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  statAmount: { fontWeight: '800', fontSize: 16, color: '#333' },
  statLabel: { fontSize: 11, color: '#999' },
  tripsCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 2,
  },
  tripsStat: { alignItems: 'center', gap: 4 },
  tripsValue: { fontSize: 24, fontWeight: '800', color: '#333' },
  tripsLabel: { color: '#999', fontSize: 13 },
  tripsDivider: { width: 1, backgroundColor: '#F0F0F0' },
});
