import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../src/services/api';
import { useBookingStore } from '../src/store/booking.store';
import { formatCurrency } from '@tamarrawgo/shared-utils';
import { getLocationPickerResult, clearLocationPickerResult } from '../src/store/locationPicker';

const GREEN = '#1B6B2F';
const GREEN_LIGHT = '#E8F5E9';

type Coords = { address: string; latitude: number; longitude: number };

export default function DeliveryBookingScreen() {
  const router = useRouter();
  const { setActiveBooking, setPickup: setStorePickup, setDropoff: setStoreDropoff } = useBookingStore();

  const [pickup, setPickup] = useState<Coords | null>(null);
  const [dropoff, setDropoff] = useState<Coords | null>(null);
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [packageDescription, setPackageDescription] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactPhone, setPickupContactPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const [fareEstimate, setFareEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [booking, setBooking] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  // Read result back from the location picker screen when we regain focus
  useFocusEffect(useCallback(() => {
    const result = getLocationPickerResult();
    if (result) {
      const coords = { address: result.address, latitude: result.latitude, longitude: result.longitude };
      if (result.field === 'pickup') {
        setPickup(coords);
        setPickupText(result.address);
        if (result.contactName) setPickupContactName(result.contactName);
        if (result.contactPhone) setPickupContactPhone(result.contactPhone.replace(/^(\+63|0)/, '0'));
      } else {
        setDropoff(coords);
        setDropoffText(result.address);
        if (result.contactName) setRecipientName(result.contactName);
        if (result.contactPhone) setRecipientPhone(result.contactPhone.replace(/^(\+63|0)/, '0'));
      }
      clearLocationPickerResult();
    }
  }, []));

  const detectCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geo = await api.get(`/maps/reverse-geocode?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`)
          .catch(() => ({ address: 'Current Location' })) as any;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, address: geo?.address ?? 'Current Location' };
        setPickup(coords);
        setPickupText(coords.address);
      }
    } catch { }
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

  const handleTextChange = (text: string, field: 'pickup' | 'dropoff') => {
    if (field === 'pickup') setPickupText(text);
    else setDropoffText(text);
    setActiveField(field);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 400);
  };

  const selectSuggestion = async (suggestion: any) => {
    const address = suggestion.description ?? suggestion.formatted_address ?? suggestion.address ?? '';
    setSuggestions([]);

    try {
      const geo = await api.get(`/maps/geocode?address=${encodeURIComponent(address)}`) as any;
      const lat = geo?.lat ?? geo?.latitude ?? 0;
      const lng = geo?.lng ?? geo?.longitude ?? 0;

      // Both pickup and dropoff open the map pin picker
      const field = activeField ?? 'dropoff';
      setActiveField(null);
      router.push(`/location-picker?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}&field=${field}` as any);
    } catch {
      setActiveField(null);
    }
  };

  const openPickupPicker = () => {
    setSuggestions([]);
    setActiveField(null);
    const lat = pickup?.latitude ?? 12.8797;
    const lng = pickup?.longitude ?? 121.7740;
    const addr = pickupText || '';
    router.push(`/location-picker?lat=${lat}&lng=${lng}&address=${encodeURIComponent(addr)}&field=pickup` as any);
  };

  const openDropoffPicker = () => {
    setSuggestions([]);
    setActiveField(null);
    const lat = dropoff?.latitude ?? pickup?.latitude ?? 12.8797;
    const lng = dropoff?.longitude ?? pickup?.longitude ?? 121.7740;
    const addr = dropoffText || '';
    router.push(`/location-picker?lat=${lat}&lng=${lng}&address=${encodeURIComponent(addr)}&field=dropoff` as any);
  };

  const handleEstimate = async () => {
    if (!pickup) { Alert.alert('Required', 'Please set your pickup location.'); return; }
    if (!dropoff) { Alert.alert('Required', 'Please select a dropoff location.'); return; }
    setLoadingEstimate(true);
    try {
      const result = await api.post('/bookings/estimate', {
        pickupLat: pickup.latitude, pickupLng: pickup.longitude,
        dropoffLat: dropoff.latitude, dropoffLng: dropoff.longitude,
        bookingType: 'DELIVERY',
      }) as any;
      setFareEstimate(result);
      setShowFareModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not estimate fare');
    } finally { setLoadingEstimate(false); }
  };

  const handleBook = async () => {
    if (!pickup || !dropoff) return;
    if (!packageDescription.trim()) {
      Alert.alert('Required', 'Please describe what you are sending before booking.');
      return;
    }
    setBooking(true);
    try {
      const result = await api.post('/bookings', {
        pickup, dropoff,
        paymentMethod: 'CASH',
        bookingType: 'DELIVERY',
        packageDescription: packageDescription.trim() || undefined,
        notes: driverNotes.trim() || undefined,
        pickupContactName: pickupContactName.trim() || undefined,
        pickupContactPhone: pickupContactPhone.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
      }) as any;
      setActiveBooking(result);
      if (pickup) setStorePickup(pickup);
      if (dropoff) setStoreDropoff(dropoff);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Delivery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Pickup */}
        <Text style={styles.sectionTitle}>Pickup Location</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="location-on" size={20} color={GREEN} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Where to pick up the package?"
            value={pickupText}
            onChangeText={(t) => handleTextChange(t, 'pickup')}
            onFocus={() => { setSuggestions([]); setActiveField('pickup'); }}
            placeholderTextColor="#aaa"
          />
          {detectingLocation
            ? <ActivityIndicator size="small" color={GREEN} />
            : <>
                <TouchableOpacity onPress={detectCurrentLocation} style={{ marginRight: 8 }}>
                  <MaterialIcons name="my-location" size={20} color={GREEN} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openPickupPicker}>
                  <MaterialIcons name="map" size={20} color={GREEN} />
                </TouchableOpacity>
              </>}
        </View>

        {/* Dropoff */}
        <Text style={styles.sectionTitle}>Dropoff Location</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="place" size={20} color="#E53935" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Where to deliver the package?"
            value={dropoffText}
            onChangeText={(t) => handleTextChange(t, 'dropoff')}
            onFocus={() => { setSuggestions([]); setActiveField('dropoff'); }}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={openDropoffPicker}>
            <MaterialIcons name="map" size={20} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* Recipient contact — auto-filled from location picker */}
        {(recipientName || recipientPhone) ? (
          <View style={styles.contactRow}>
            <MaterialIcons name="person" size={15} color={GREEN} />
            <Text style={styles.contactText}>
              {recipientName}{recipientName && recipientPhone ? '  ·  ' : ''}{recipientPhone}
            </Text>
            <TouchableOpacity onPress={openDropoffPicker}>
              <Text style={styles.contactEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Autocomplete suggestions */}
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

        {/* Delivery item details */}
        <Text style={styles.sectionTitle}>Delivery Item Details <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.inputRow, styles.multiline]}
          placeholder={'What are you sending?\ne.g. documents, clothes, food...'}
          value={packageDescription}
          onChangeText={setPackageDescription}
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
          onFocus={() => { setSuggestions([]); setActiveField(null); }}
        />

        {/* Notes to driver */}
        <Text style={styles.sectionTitle}>Notes to Driver <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.inputRow, styles.multiline]}
          placeholder={'Any special instructions?\ne.g. Call before delivery, handle with care...'}
          value={driverNotes}
          onChangeText={setDriverNotes}
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
          onFocus={() => { setSuggestions([]); setActiveField(null); }}
        />

        <View style={styles.noteBox}>
          <MaterialIcons name="info-outline" size={15} color={GREEN} />
          <Text style={styles.noteText}>Small items only. Rider collects payment from recipient on delivery.</Text>
        </View>

        <TouchableOpacity
          style={[styles.estimateBtn, (!pickup || !dropoff) && styles.btnDisabled]}
          onPress={handleEstimate}
          disabled={loadingEstimate || !pickup || !dropoff}
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
            <Text style={styles.modalTitle}>📦 Delivery Summary</Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>From</Text>
              <Text style={styles.modalValue} numberOfLines={2}>{pickup?.address}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>To</Text>
              <Text style={styles.modalValue} numberOfLines={2}>{dropoff?.address}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Distance</Text>
              <Text style={styles.modalValue}>{Number(fareEstimate?.distanceKm ?? 0).toFixed(1)} km</Text>
            </View>
            {recipientName ? <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Recipient</Text>
              <Text style={styles.modalValue}>{recipientName} · {recipientPhone}</Text>
            </View> : null}
            <View style={[styles.modalRow, styles.fareRow]}>
              <Text style={styles.fareLabelBig}>Delivery Fare</Text>
              <Text style={styles.fareAmountBig}>{formatCurrency(Number(fareEstimate?.totalFare ?? 0))}</Text>
            </View>
            <Text style={styles.modalNote}>Payment: Cash on pickup</Text>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={booking}>
              {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Book Delivery</Text>}
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
  optional: { fontWeight: '400', color: '#aaa' },
  required: { fontWeight: '700', color: '#E53935' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  multiline: { alignItems: 'flex-start', minHeight: 72, paddingVertical: 12 },
  suggestionsBox: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
    marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { flex: 1, fontSize: 14, color: '#333' },
  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN_LIGHT, borderRadius: 10, padding: 12, marginTop: 20,
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
  modalNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 16 },
  bookBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelModalBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelModalText: { color: '#888', fontSize: 15 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, paddingVertical: 6,
  },
  contactText: { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },
  contactEdit: { fontSize: 13, color: GREEN, fontWeight: '700' },
});
