import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePlacesStore, SavedPlace } from '../../src/store/places.store';
import { useBookingStore } from '../../src/store/booking.store';

const GREEN = '#1B6B2F';

const ICON_MAP: Record<string, string> = { home: 'home', work: 'work', school: 'school', place: 'place' };

export default function FavoritesScreen() {
  const router = useRouter();
  const { places, removePlace } = usePlacesStore();
  const { setDropoff } = useBookingStore();

  const handleUsePlace = (place: SavedPlace) => {
    setDropoff({ address: place.address, latitude: place.latitude, longitude: place.longitude });
    router.push('/search' as any);
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Remove Place', `Remove "${label}" from favorites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePlace(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <TouchableOpacity onPress={() => router.push('/saved-places' as any)} style={styles.addHeaderBtn}>
          <MaterialIcons name="add" size={22} color={GREEN} />
        </TouchableOpacity>
      </View>

      {places.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="favorite-border" size={64} color="#ddd" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Save your frequent destinations here for quick booking</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/saved-places' as any)}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Place</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleUsePlace(item)} activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                <MaterialIcons name={(ICON_MAP[item.icon] ?? 'place') as any} size={22} color={GREEN} />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.addr} numberOfLines={1}>{item.address}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.label)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={22} color="#E53935" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  addHeaderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  addr: { fontSize: 13, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 8 },
});
