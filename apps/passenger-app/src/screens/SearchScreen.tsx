import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../store/booking.store';
import { Location } from '@tamarrawgo/shared-types';

const POPULAR_LOCATIONS: Location[] = [
  { address: 'SM Mall of Asia, Pasay City', latitude: 14.5353, longitude: 120.9832 },
  { address: 'Bonifacio Global City, Taguig', latitude: 14.5501, longitude: 121.0494 },
  { address: 'Makati City Hall, Makati', latitude: 14.5547, longitude: 121.0244 },
  { address: 'Robinsons Place Manila, Ermita', latitude: 14.5794, longitude: 120.9835 },
  { address: 'Intramuros, Manila', latitude: 14.5893, longitude: 120.9744 },
  { address: 'Quezon City Hall, Quezon City', latitude: 14.6507, longitude: 121.0488 },
  { address: 'NAIA Terminal 3, Pasay City', latitude: 14.5086, longitude: 121.0197 },
  { address: 'Eastwood City, Quezon City', latitude: 14.6095, longitude: 121.0794 },
  { address: 'Ortigas Center, Pasig City', latitude: 14.5876, longitude: 121.0600 },
  { address: 'Divisoria, Manila', latitude: 14.5995, longitude: 120.9734 },
  { address: 'UP Diliman, Quezon City', latitude: 14.6548, longitude: 121.0651 },
  { address: 'Cubao, Quezon City', latitude: 14.6196, longitude: 121.0532 },
  { address: 'Pasig City Hall, Pasig', latitude: 14.5764, longitude: 121.0851 },
  { address: 'Mandaluyong City Hall', latitude: 14.5794, longitude: 121.0359 },
  { address: 'SM Megamall, Mandaluyong', latitude: 14.5853, longitude: 121.0565 },
];

export default function SearchScreen() {
  const router = useRouter();
  const { pickup, setDropoff } = useBookingStore();
  const [query, setQuery] = useState('');

  const filtered = query.length >= 2
    ? POPULAR_LOCATIONS.filter(loc =>
        loc.address.toLowerCase().includes(query.toLowerCase())
      )
    : POPULAR_LOCATIONS;

  const selectPlace = useCallback((location: Location) => {
    setDropoff(location);
    router.back();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <Ionicons name="flag" size={18} color="#FF6B00" />
          <TextInput
            style={styles.input}
            placeholder="Where do you want to go?"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {pickup && (
        <View style={styles.pickupRow}>
          <Ionicons name="location" size={18} color="#FF6B00" />
          <Text style={styles.pickupText} numberOfLines={1}>{pickup.address}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>
        {query.length >= 2 ? 'Search Results' : 'Popular Locations'}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => selectPlace(item)}>
            <Ionicons name="location-outline" size={20} color="#999" />
            <View style={styles.itemText}>
              <Text style={styles.mainText}>{item.address.split(',')[0]}</Text>
              <Text style={styles.secondaryText}>{item.address.split(',').slice(1).join(',').trim()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No locations found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    paddingTop: 56, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, color: '#333' },
  pickupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFF8F5', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  pickupText: { flex: 1, color: '#666', fontSize: 14 },
  sectionLabel: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  itemText: { flex: 1 },
  mainText: { fontSize: 15, color: '#333', fontWeight: '500' },
  secondaryText: { fontSize: 13, color: '#999', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
