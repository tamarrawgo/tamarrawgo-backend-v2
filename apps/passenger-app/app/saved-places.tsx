import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Alert, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePlacesStore, SavedPlace } from '../src/store/places.store';
import { useBookingStore } from '../src/store/booking.store';
import { api } from '../src/services/api';

const GREEN = '#1B6B2F';

const ICON_OPTIONS: { key: SavedPlace['icon']; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'work', label: 'Work', icon: 'work' },
  { key: 'school', label: 'School', icon: 'school' },
  { key: 'place', label: 'Other', icon: 'place' },
];

export default function SavedPlacesScreen() {
  const router = useRouter();
  const { places, addPlace, removePlace } = usePlacesStore();
  const { setDropoff } = useBookingStore();

  const handleUsePlace = (place: SavedPlace) => {
    setDropoff({ address: place.address, latitude: place.latitude, longitude: place.longitude });
    router.back();
    setTimeout(() => router.push('/search' as any), 100);
  };
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<SavedPlace['icon']>('place');
  const [customLabel, setCustomLabel] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 3) { setSuggestions([]); return; }
    try {
      setSearching(true);
      const results = await api.get(`/maps/autocomplete?input=${encodeURIComponent(text)}`) as any[];
      setSuggestions(results ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = async (item: any) => {
    try {
      const details = await api.get(`/maps/geocode?address=${encodeURIComponent(item.description)}`) as any;
      setSelectedLocation({
        address: item.description,
        latitude: details.latitude,
        longitude: details.longitude,
      });
      setSearch(item.description);
      setSuggestions([]);
    } catch {
      Alert.alert('Error', 'Could not get place details');
    }
  };

  const handleSave = () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please search and select a location');
      return;
    }
    const label = selectedIcon === 'place' && customLabel.trim()
      ? customLabel.trim()
      : ICON_OPTIONS.find((o) => o.key === selectedIcon)?.label ?? 'Place';
    addPlace({
      label,
      icon: selectedIcon,
      address: selectedLocation.address,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
    setAdding(false);
    setSearch('');
    setSuggestions([]);
    setSelectedLocation(null);
    setCustomLabel('');
    setSelectedIcon('place');
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Remove Place', `Remove "${label}" from saved places?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePlace(id) },
    ]);
  };

  const iconName = (icon: SavedPlace['icon']) => {
    const map: Record<string, string> = { home: 'home', work: 'work', school: 'school', place: 'place' };
    return (map[icon] ?? 'place') as any;
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Places</Text>
        <View style={{ width: 32 }} />
      </View>

      {!adding ? (
        <>
          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="bookmark-border" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No saved places yet</Text>
                <Text style={styles.emptySub}>Save your frequent destinations for quick booking</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.placeCard} onPress={() => handleUsePlace(item)} activeOpacity={0.7}>
                <View style={styles.placeIcon}>
                  <MaterialIcons name={iconName(item.icon)} size={22} color={GREEN} />
                </View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeLabel}>{item.label}</Text>
                  <Text style={styles.placeAddr} numberOfLines={1}>{item.address}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.label)} style={styles.deleteBtn}>
                  <MaterialIcons name="delete-outline" size={22} color="#E53935" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />

          <View style={styles.addWrapper}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
              <MaterialIcons name="add" size={22} color="#fff" />
              <Text style={styles.addBtnText}>Add Place</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.addForm}>
            {/* Icon selector */}
            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.iconRow}>
              {ICON_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconBtn, selectedIcon === opt.key && styles.iconBtnSelected]}
                  onPress={() => setSelectedIcon(opt.key)}
                >
                  <MaterialIcons name={opt.icon as any} size={20} color={selectedIcon === opt.key ? '#fff' : GREEN} />
                  <Text style={[styles.iconBtnText, selectedIcon === opt.key && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedIcon === 'place' && (
              <>
                <Text style={styles.formLabel}>Custom Label</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Gym, Church, Market"
                  value={customLabel}
                  onChangeText={setCustomLabel}
                  placeholderTextColor="#aaa"
                />
              </>
            )}

            {/* Search */}
            <Text style={styles.formLabel}>Search Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Search for a place..."
              value={search}
              onChangeText={handleSearch}
              placeholderTextColor="#aaa"
              autoFocus
            />

            {suggestions.length > 0 && (
              <FlatList
                data={suggestions}
                keyExtractor={(_, i) => i.toString()}
                style={styles.suggestionList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
                    <MaterialIcons name="location-on" size={18} color="#888" />
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {selectedLocation && (
              <View style={styles.selectedCard}>
                <MaterialIcons name="check-circle" size={18} color={GREEN} />
                <Text style={styles.selectedText} numberOfLines={2}>{selectedLocation.address}</Text>
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAdding(false); setSearch(''); setSuggestions([]); setSelectedLocation(null); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, !selectedLocation && { opacity: 0.5 }]} onPress={handleSave} disabled={!selectedLocation}>
                <Text style={styles.saveBtnText}>Save Place</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },

  placeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  placeIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
  },
  placeInfo: { flex: 1 },
  placeLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  placeAddr: { fontSize: 13, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 8 },

  addWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 30, backgroundColor: '#F5F5F5',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14,
  },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  addForm: { flex: 1, padding: 16 },
  formLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8 },
  iconRow: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0F0E3', backgroundColor: '#fff',
  },
  iconBtnSelected: { backgroundColor: GREEN, borderColor: GREEN },
  iconBtnText: { fontSize: 12, fontWeight: '700', color: GREEN },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee',
  },
  suggestionList: { maxHeight: 200, backgroundColor: '#fff', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#eee' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { flex: 1, fontSize: 14, color: '#333' },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 12,
  },
  selectedText: { flex: 1, fontSize: 13, color: GREEN, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#666' },
  saveBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, backgroundColor: GREEN,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
