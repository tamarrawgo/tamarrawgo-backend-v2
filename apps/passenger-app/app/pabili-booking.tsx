import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../src/services/api';
import { useBookingStore } from '../src/store/booking.store';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const GREEN = '#1B6B2F';
const BLUE_LIGHT = '#E3F2FD';

type Coords = { address: string; latitude: number; longitude: number };

export default function PabiliBookingScreen() {
  const router = useRouter();
  const { setActiveBooking } = useBookingStore();

  const [storeLocation, setStoreLocation] = useState<Coords | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<Coords | null>(null);
  const [storeText, setStoreText] = useState('');
  const [deliveryText, setDeliveryText] = useState('');
  const [activeField, setActiveField] = useState<'store' | 'delivery' | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [shoppingList, setShoppingList] = useState('');
  const [itemBudget, setItemBudget] = useState('');

  const [fareEstimate, setFareEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [booking, setBooking] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  const detectCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geo = await api.get(`/maps/reverse-geocode?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`)
          .catch(() => ({ address: 'Current Location' })) as any;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, address: geo?.address ?? 'Current Location' };
        setDeliveryLocation(coords);
        setDeliveryText(coords.address);
      }
    } catch { /* ignore */ }
    finally { setDetectingLocation(false); }
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    try {
      const result = await api.get(`/maps/autocomplete?input=${encodeURIComponent(query)}`) as any;
      setSuggestions(result?.predictions ?? result ?? []);
    } catch { setSuggestions([]); }
    finally { setLoadingSuggestions(false); }
  }, []);

  const handleTextChange = (text: string, field: 'store' | 'delivery') => {
    if (field === 'store') setStoreText(text);
    else setDeliveryText(text);
    setActiveField(field);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 400);
  };

  const selectSuggestion = async (suggestion: any) => {
    const address = suggestion.description ?? suggestion.formatted_address ?? suggestion.address ?? '';
    setSuggestions([]);
    try {
      const geo = await api.get(`/maps/geocode?address=${encodeURIComponent(address)}`) as any;
      const coords = { latitude: geo?.lat ?? geo?.latitude ?? 0, longitude: geo?.lng ?? geo?.longitude ?? 0, address };
      if (activeField === 'store') { setStoreLocation(coords); setStoreText(address); }
      else { setDeliveryLocation(coords); setDeliveryText(address); }
    } catch {
      if (activeField === 'store') setStoreText(address);
      else { setDeliveryText(address); setDeliveryLocation({ latitude: 0, longitude: 0, address }); }
    }
    setActiveField(null);
  };

  const handleEstimate = async () => {
    if (!storeLocation) { Alert.alert('Required', 'Please select the store location.'); return; }
    if (!deliveryLocation) { Alert.alert('Required', 'Please set your delivery address.'); return; }
    if (!shoppingList.trim()) { Alert.alert('Required', 'Please enter your shopping list.'); return; }
    const budget = parseFloat(itemBudget);
    if (!itemBudget || isNaN(budget) || budget <= 0) { Alert.alert('Required', 'Please enter a valid item budget.'); return; }

    setLoadingEstimate(true);
    try {
      const result = await api.post('/bookings/estimate', {
        pickupLat: storeLocation.latitude, pickupLng: storeLocation.longitude,
        dropoffLat: deliveryLocation.latitude, dropoffLng: deliveryLocation.longitude,
        bookingType: 'PABILI',
      }) as any;
      setFareEstimate(result);
      setShowFareModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not estimate fare');
    } finally { setLoadingEstimate(false); }
  };

  const handleBook = async () => {
    if (!storeLocation || !deliveryLocation) return;
    setBooking(true);
    try {
      const result = await api.post('/bookings', {
        pickup: storeLocation,
        dropoff: deliveryLocation,
        paymentMethod: 'CASH',
        bookingType: 'PABILI',
        storeAddress: storeLocation.address,
        shoppingList: shoppingList.trim(),
        itemBudget: parseFloat(itemBudget),
      }) as any;
      setActiveBooking(result);
      setShowFareModal(false);
      router.replace('/searching');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to book');
      Alert.alert('Error', msg);
    } finally { setBooking(false); }
  };

  const showingSuggestions = suggestions.length > 0 && activeField !== null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8F8F8' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛒 Pabili</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Store location */}
        <Text style={styles.sectionTitle}>Store / Market Location</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="store" size={20} color="#1565C0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Where should the rider go to buy?"
            value={storeText}
            onChangeText={(t) => handleTextChange(t, 'store')}
            onFocus={() => setActiveField('store')}
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Delivery location */}
        <Text style={styles.sectionTitle}>Your Delivery Address</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="home" size={20} color={GREEN} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Where should items be delivered?"
            value={deliveryText}
            onChangeText={(t) => handleTextChange(t, 'delivery')}
            onFocus={() => setActiveField('delivery')}
            placeholderTextColor="#aaa"
          />
          {detectingLocation
            ? <ActivityIndicator size="small" color={GREEN} />
            : <TouchableOpacity onPress={detectCurrentLocation}>
                <MaterialIcons name="my-location" size={20} color={GREEN} />
              </TouchableOpacity>}
        </View>

        {/* Suggestions */}
        {showingSuggestions && (
          <View style={styles.suggestionsBox}>
            {loadingSuggestions
              ? <ActivityIndicator size="small" color={GREEN} style={{ padding: 12 }} />
              : <FlatList
                  data={suggestions}
                  keyExtractor={(_, i) => String(i)}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                      <MaterialIcons name="location-on" size={16} color="#888" style={{ marginRight: 8 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.description ?? item.formatted_address ?? item.address}
                      </Text>
                    </TouchableOpacity>
                  )}
                />}
          </View>
        )}

        {/* Shopping list */}
        <Text style={styles.sectionTitle}>Shopping List</Text>
        <TextInput
          style={[styles.inputRow, styles.multiline]}
          placeholder={'e.g.\n- 1 kilo rice\n- 2 cans sardines\n- 1 bottle cooking oil'}
          value={shoppingList}
          onChangeText={setShoppingList}
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={5}
          onFocus={() => { setSuggestions([]); setActiveField(null); }}
        />

        {/* Budget */}
        <Text style={styles.sectionTitle}>Item Budget (₱)</Text>
        <View style={styles.inputRow}>
          <Text style={styles.pesoSign}>₱</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={itemBudget}
            onChangeText={setItemBudget}
            placeholderTextColor="#aaa"
            keyboardType="decimal-pad"
            onFocus={() => { setSuggestions([]); setActiveField(null); }}
          />
        </View>

        <View style={styles.noteBox}>
          <MaterialIcons name="info-outline" size={15} color="#1565C0" />
          <Text style={styles.noteText}>
            Rider buys items using their own money. You pay the rider: <Text style={{ fontWeight: '700' }}>delivery fee + item cost</Text> in cash upon delivery.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.estimateBtn, (!storeLocation || !deliveryLocation) && styles.btnDisabled]}
          onPress={handleEstimate}
          disabled={loadingEstimate || !storeLocation || !deliveryLocation}
        >
          {loadingEstimate
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.estimateBtnText}>See Fare Estimate</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Fare modal */}
      <Modal visible={showFareModal} transparent animationType="slide" onRequestClose={() => setShowFareModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🛒 Pabili Summary</Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Store</Text>
              <Text style={styles.modalValue} numberOfLines={2}>{storeLocation?.address}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Deliver to</Text>
              <Text style={styles.modalValue} numberOfLines={2}>{deliveryLocation?.address}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Distance</Text>
              <Text style={styles.modalValue}>{Number(fareEstimate?.distanceKm ?? 0).toFixed(1)} km</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Item Budget</Text>
              <Text style={styles.modalValue}>{formatCurrency(parseFloat(itemBudget) || 0)} <Text style={{ color: '#aaa', fontSize: 11 }}>(you pay rider)</Text></Text>
            </View>
            <View style={[styles.modalRow, styles.fareRow]}>
              <Text style={styles.fareLabelBig}>Delivery Fee</Text>
              <Text style={styles.fareAmountBig}>{formatCurrency(Number(fareEstimate?.totalFare ?? 0))}</Text>
            </View>
            {fareEstimate?.serviceFee ? (
              <Text style={styles.serviceFeeNote}>Includes ₱{Number(fareEstimate.serviceFee).toFixed(0)} errand service fee</Text>
            ) : null}
            <Text style={styles.modalNote}>Pay rider: delivery fee + item cost in cash on delivery</Text>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={booking}>
              {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Book Pabili</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowFareModal(false)}>
              <Text style={styles.cancelModalText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  inputIcon: { marginRight: 8 },
  pesoSign: { fontSize: 16, fontWeight: '700', color: GREEN, marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  multiline: { alignItems: 'flex-start', minHeight: 100, paddingVertical: 12 },
  suggestionsBox: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { flex: 1, fontSize: 14, color: '#333' },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: BLUE_LIGHT, borderRadius: 10, padding: 12, marginTop: 20,
  },
  noteText: { flex: 1, fontSize: 12, color: '#444' },
  estimateBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.4 },
  estimateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  modalLabel: { fontSize: 13, color: '#888', flex: 1 },
  modalValue: { fontSize: 13, color: '#333', fontWeight: '600', flex: 2, textAlign: 'right' },
  fareRow: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 8, paddingTop: 12 },
  fareLabelBig: { fontSize: 16, fontWeight: '700', color: '#333' },
  fareAmountBig: { fontSize: 28, fontWeight: '900', color: GREEN },
  serviceFeeNote: { fontSize: 11, color: '#888', textAlign: 'right', marginTop: -6, marginBottom: 8 },
  modalNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 16 },
  bookBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelModalBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelModalText: { color: '#888', fontSize: 15 },
});
