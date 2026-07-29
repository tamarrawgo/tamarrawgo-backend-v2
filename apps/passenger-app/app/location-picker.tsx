import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../src/services/api';
import { setLocationPickerResult, clearLocationPickerResult } from '../src/store/locationPicker';

const GREEN = '#1B6B2F';
const GREEN_DARK = '#145224';

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat: string; lng: string; address: string; field: string }>();

  const initialLat = parseFloat(params.lat ?? '12.8797');
  const initialLng = parseFloat(params.lng ?? '121.7740');

  const [region, setRegion] = useState<Region>({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [address, setAddress] = useState(params.address ?? '');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [unitFloor, setUnitFloor] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    clearLocationPickerResult();
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const result = await api.get(`/maps/reverse-geocode?lat=${lat}&lng=${lng}`) as any;
      setAddress(result?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  const onRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => reverseGeocode(r.latitude, r.longitude), 600);
  }, [reverseGeocode]);

  const handleConfirm = () => {
    setLocationPickerResult({
      address,
      latitude: region.latitude,
      longitude: region.longitude,
      unitFloor: unitFloor.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      field: params.field ?? 'dropoff',
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Address bar at top */}
      <View style={styles.addressBar}>
        <TouchableOpacity onPress={() => { clearLocationPickerResult(); router.back(); }} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.addressPill}>
          <View style={styles.addressDot} />
          <Text style={styles.addressText} numberOfLines={2}>
            {reverseGeocoding ? 'Getting address...' : address}
          </Text>
          {reverseGeocoding && <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 6 }} />}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />

        {/* Fixed center pin */}
        <View style={styles.pinWrapper} pointerEvents="none">
          <View style={styles.pinHead} />
          <View style={styles.pinStem} />
          <View style={styles.pinShadow} />
        </View>

        {/* My location button */}
        <TouchableOpacity
          style={styles.myLocationBtn}
          onPress={() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 500);
            }
          }}
        >
          <MaterialIcons name="my-location" size={22} color={GREEN} />
        </TouchableOpacity>
      </View>

      {/* Bottom details form */}
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Address details</Text>

        <TextInput
          style={styles.formInput}
          placeholder="Floor or unit number (optional)"
          value={unitFloor}
          onChangeText={setUnitFloor}
          placeholderTextColor="#bbb"
        />

        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+63</Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.phoneInput]}
            placeholder="Contact number"
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholderTextColor="#bbb"
            keyboardType="phone-pad"
          />
        </View>

        <TextInput
          style={styles.formInput}
          placeholder="Contact name"
          value={contactName}
          onChangeText={setContactName}
          placeholderTextColor="#bbb"
        />

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirm</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  addressBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 10, paddingHorizontal: 12,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 4, zIndex: 10,
  },
  backBtn: { padding: 6, marginRight: 8 },
  addressPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  addressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: GREEN, marginRight: 10, flexShrink: 0,
  },
  addressText: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },

  mapContainer: { flex: 1 },

  // Fixed center pin
  pinWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  pinHead: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: GREEN, borderWidth: 3, borderColor: '#fff',
    marginBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
  },
  pinStem: {
    width: 3, height: 16, backgroundColor: GREEN, marginTop: -2,
  },
  pinShadow: {
    width: 10, height: 4, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 1,
  },

  myLocationBtn: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 30, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },

  // Form
  form: { backgroundColor: '#fff', maxHeight: 280 },
  formContent: { padding: 20, paddingBottom: 32 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16 },
  formInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#333', marginBottom: 10, backgroundColor: '#FAFAFA',
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  phonePrefix: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 13,
    backgroundColor: '#FAFAFA', marginRight: 8,
  },
  phonePrefixText: { fontSize: 15, color: '#333', fontWeight: '600' },
  phoneInput: { flex: 1, marginBottom: 0 },

  confirmBtn: {
    backgroundColor: GREEN_DARK, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
