import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, SafeAreaView, StatusBar,
  ActivityIndicator, Alert, Image, Modal, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useBookingStore } from '../store/booking.store';
import { api } from '../services/api';
import { Location as LocationType } from '@tamarrawgo/shared-types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const GREEN = '#1B6B2F';
const GREEN_DARK = '#145224';
const GREEN_LIGHT = '#E8F5E9';

const TRICYCLE_IMG = require('../../assets/tricycle-small.png');

const RIDE_TYPES = [
  { id: 'regular', label: 'Regular Tricycle (Shared)', price: '₱15 base · per seat', icon: 'local-taxi' as const, bookingType: 'REGULAR', maxPax: 2 },
  { id: 'special', label: 'Special Trip (Exclusive)', price: '₱40 base · private', icon: 'groups' as const, bookingType: 'RIDE', maxPax: 4 },
];

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: 'payments' as const },
  { id: 'GCASH', label: 'GCash', icon: 'account-balance-wallet' as const },
];

type SearchField = 'pickup' | 'dropoff' | null;

export default function SearchScreen() {
  const router = useRouter();
  const { pickup, dropoff, setPickup, setDropoff, setActiveBooking } = useBookingStore();

  const [pickupText, setPickupText] = useState(pickup?.address ?? '');
  const [dropoffText, setDropoffText] = useState(dropoff?.address ?? '');
  const [activeField, setActiveField] = useState<SearchField>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [selectedRide, setSelectedRide] = useState('regular');
  const [selectedPayment, setSelectedPayment] = useState('CASH');
  const [passengerCount, setPassengerCount] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<{
    totalFare: number; distanceKm: number; estimatedDurationMinutes: number;
    polyline?: string | null; surgeType?: string | null; surgeMultiplier?: number;
  } | null>(null);
  const mapPreviewRef = useRef<MapView>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detect pickup on mount if not set
  useEffect(() => {
    if (!pickup?.address || pickup.address === '') {
      detectCurrentLocation();
    }
  }, []);

  const detectCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        const locCoords = last?.coords ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
        const coords = { latitude: locCoords.latitude, longitude: locCoords.longitude };
        const geocode = await api.get(`/maps/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
          .catch(() => ({ address: 'Current Location' })) as any;
        const address = geocode?.address ?? 'Current Location';
        setPickup({ ...coords, address });
        setPickupText(address);
      }
    } catch {
      const fallback = { latitude: 14.5995, longitude: 120.9842, address: 'Manila, Philippines' };
      setPickup(fallback);
      setPickupText(fallback.address);
    } finally {
      setDetectingLocation(false);
    }
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    try {
      const result = await api.get(`/maps/autocomplete?input=${encodeURIComponent(query)}`) as any;
      setSuggestions(result?.predictions ?? result ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const handleTextChange = (text: string, field: SearchField) => {
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
      const geocoded = await api.get(`/maps/geocode?address=${encodeURIComponent(address)}`) as any;
      const coords = {
        latitude: geocoded?.lat ?? geocoded?.latitude ?? 14.5995,
        longitude: geocoded?.lng ?? geocoded?.longitude ?? 120.9842,
        address,
      };
      if (activeField === 'pickup') {
        setPickup(coords);
        setPickupText(address);
      } else {
        setDropoff(coords);
        setDropoffText(address);
      }
    } catch {
      if (activeField === 'pickup') {
        setPickupText(address);
      } else {
        setDropoffText(address);
        setDropoff({ latitude: 14.5995, longitude: 120.9842, address });
      }
    }
    setActiveField(null);
  };

  const selectedRideType = RIDE_TYPES.find(r => r.id === selectedRide) ?? RIDE_TYPES[0];
  const bookingType = selectedRideType.bookingType;
  const isRegular = bookingType === 'REGULAR';

  const handleFindRide = useCallback(async () => {
    if (!pickup) { Alert.alert('Error', 'Please set your pickup location.'); return; }
    if (!dropoffText || !dropoff) { Alert.alert('Error', 'Please select a destination from the suggestions.'); return; }

    setLoadingEstimate(true);
    try {
      const result = await api.post('/bookings/estimate', {
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        dropoffLat: dropoff.latitude,
        dropoffLng: dropoff.longitude,
        passengerCount,
        bookingType,
        promoCode: !isRegular ? (promoCode.trim() || undefined) : undefined,
      }) as any;
      if (Number(result?.totalFare ?? 0) <= 0 || Number(result?.distanceKm ?? 0) <= 0) {
        Alert.alert('Invalid Trip', 'Pickup and destination are too close. Please choose a different destination.');
        setLoadingEstimate(false);
        return;
      }

      const discount = Number(result?.discount ?? 0);
      setPromoApplied(discount > 0);
      setPromoDiscount(discount);
      if (result?.promoRejected) {
        Alert.alert('Promo Not Applied', 'Promo codes can only be used on bookings over ₱100.');
      }
      setFareEstimate({
        totalFare: result?.totalFare ?? 0,
        distanceKm: result?.distanceKm ?? 0,
        estimatedDurationMinutes: result?.estimatedDurationMinutes ?? 0,
        polyline: result?.polyline ?? null,
        surgeType: result?.surgeType ?? null,
        surgeMultiplier: result?.surgeMultiplier ?? 1,
      });
      setShowFareModal(true);
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to get fare estimate');
      Alert.alert('Error', String(msg));
    } finally {
      setLoadingEstimate(false);
    }
  }, [pickup, dropoff, dropoffText, passengerCount, promoCode, bookingType, isRegular]);

  const handleConfirmBooking = useCallback(async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    try {
      const booking = await api.post('/bookings', {
        pickup,
        dropoff,
        bookingType,
        paymentMethod: selectedPayment,
        passengerCount,
        promoCode: !isRegular ? (promoCode.trim() || undefined) : undefined,
      });
      setActiveBooking(booking as any);
      setShowFareModal(false);
      router.replace('/searching');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to book ride');
      if (msg.toLowerCase().includes('active booking')) {
        try {
          const existing = await api.get('/bookings/active') as any;
          if (existing) { setActiveBooking(existing); router.replace('/searching'); return; }
        } catch {}
      }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [pickup, dropoff, selectedPayment, passengerCount, promoCode, bookingType, isRegular]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={activeField && suggestions.length > 0 ? suggestions : []}
        keyExtractor={(item, i) => item.place_id ?? String(i)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Route Card */}
            <View style={styles.routeCard}>
              {/* Pickup Row */}
              <View style={styles.routeRow}>
                <View style={styles.dotGreen} />
                <TextInput
                  style={styles.routeInput}
                  placeholder="Pickup location"
                  placeholderTextColor="#aaa"
                  value={pickupText}
                  onChangeText={(t) => handleTextChange(t, 'pickup')}
                  onFocus={() => setActiveField('pickup')}
                />
                <TouchableOpacity onPress={detectCurrentLocation} style={styles.locationBtn}>
                  {detectingLocation
                    ? <ActivityIndicator size="small" color={GREEN} />
                    : <MaterialIcons name="my-location" size={18} color={GREEN} />
                  }
                </TouchableOpacity>
              </View>
              <View style={styles.routeDivider} />
              {/* Dropoff Row */}
              <View style={styles.routeRow}>
                <View style={styles.dotRed} />
                <TextInput
                  style={styles.routeInput}
                  placeholder="Enter destination or landmark"
                  placeholderTextColor="#aaa"
                  value={dropoffText}
                  onChangeText={(t) => handleTextChange(t, 'dropoff')}
                  onFocus={() => setActiveField('dropoff')}
                  autoFocus={!pickup?.address}
                />
                {dropoffText.length > 0 && (
                  <TouchableOpacity onPress={() => { setDropoffText(''); setSuggestions([]); }}>
                    <MaterialIcons name="close" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Loading suggestions */}
            {loadingSuggestions && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={styles.loadingText}>Searching places...</Text>
              </View>
            )}

            {/* No suggestions active - show ride type and payment */}
            {(!activeField || suggestions.length === 0) && (
              <>
                {/* Ride Type */}
                <Text style={styles.sectionLabel}>Choose Ride Type</Text>
                {RIDE_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt.id}
                    style={[styles.rideTypeRow, selectedRide === rt.id && styles.rideTypeSelected]}
                    onPress={() => { setSelectedRide(rt.id); if (rt.bookingType === 'REGULAR') setPassengerCount(1); }}
                  >
                    <View style={[styles.rideTypeIcon, selectedRide === rt.id && styles.rideTypeIconSelected]}>
                      <MaterialIcons name={rt.icon} size={22} color={selectedRide === rt.id ? '#fff' : GREEN} />
                    </View>
                    <View style={styles.rideTypeText}>
                      <Text style={[styles.rideTypeName, selectedRide === rt.id && { color: GREEN_DARK }]}>{rt.label}</Text>
                      <Text style={styles.rideTypePrice}>{rt.price}</Text>
                    </View>
                    {selectedRide === rt.id && <MaterialIcons name="check-circle" size={22} color={GREEN} />}
                  </TouchableOpacity>
                ))}

                {/* Passenger Count — hidden for Regular (always 1) */}
                {!isRegular && (
                  <>
                    <Text style={styles.sectionLabel}>Number of Passengers</Text>
                    <View style={styles.passengerCountRow}>
                      {[1, 2, 3, 4].map(n => {
                        const maxPax = selectedRideType.maxPax;
                        const disabled = n > maxPax;
                        return (
                          <TouchableOpacity
                            key={n}
                            style={[
                              styles.passengerCountBtn,
                              passengerCount === n && styles.passengerCountBtnSelected,
                              disabled && { opacity: 0.3 },
                            ]}
                            onPress={() => !disabled && setPassengerCount(n)}
                            disabled={disabled}
                          >
                            <MaterialIcons name="person" size={18} color={passengerCount === n ? '#fff' : GREEN} />
                            <Text style={[styles.passengerCountText, passengerCount === n && { color: '#fff' }]}>{n}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {passengerCount > 1 && (
                      <Text style={styles.passengerCountHint}>
                        {'+' + (passengerCount - 1) * 20 + '% fare for ' + passengerCount + ' passengers'}
                      </Text>
                    )}
                  </>
                )}

                {/* Payment Method */}
                <Text style={styles.sectionLabel}>Payment Method</Text>
                <View style={styles.paymentRow}>
                  {PAYMENT_METHODS.map(pm => (
                    <TouchableOpacity
                      key={pm.id}
                      style={[styles.paymentBtn, selectedPayment === pm.id && styles.paymentBtnSelected]}
                      onPress={() => setSelectedPayment(pm.id)}
                    >
                      <MaterialIcons name={pm.icon} size={20} color={selectedPayment === pm.id ? GREEN : '#666'} />
                      <Text style={[styles.paymentLabel, selectedPayment === pm.id && { color: GREEN, fontWeight: '700' }]}>
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestion} onPress={() => selectSuggestion(item)}>
            <MaterialIcons name="location-on" size={20} color="#999" />
            <View style={styles.suggestionText}>
              <Text style={styles.suggMain} numberOfLines={1}>
                {item.structured_formatting?.main_text ?? item.description?.split(',')[0] ?? item.address}
              </Text>
              <Text style={styles.suggSub} numberOfLines={1}>
                {item.structured_formatting?.secondary_text ?? item.description ?? ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Find Button */}
      <View style={styles.findWrapper}>
        <TouchableOpacity style={styles.findBtn} onPress={handleFindRide} disabled={loadingEstimate}>
          {loadingEstimate
            ? <ActivityIndicator color="#fff" />
            : <>
                <MaterialIcons name="my-location" size={20} color="#fff" />
                <Text style={styles.findBtnText}>Find Nearby Tricycle</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Fare Estimate Bottom Sheet */}
      <Modal
        visible={showFareModal}
        animationType="slide"
        onRequestClose={() => setShowFareModal(false)}
      >
        <View style={styles.fullScreenModal}>
          {/* Map takes top half */}
          {pickup && dropoff && (
            <View style={styles.mapPreviewContainer}>
              <MapView
                ref={mapPreviewRef}
                style={styles.mapPreview}
                provider={PROVIDER_DEFAULT}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                initialRegion={{
                  latitude: (pickup.latitude + dropoff.latitude) / 2,
                  longitude: (pickup.longitude + dropoff.longitude) / 2,
                  latitudeDelta: Math.abs(pickup.latitude - dropoff.latitude) * 1.8 + 0.01,
                  longitudeDelta: Math.abs(pickup.longitude - dropoff.longitude) * 1.8 + 0.01,
                }}
                onMapReady={() => {
                  setTimeout(() => {
                    mapPreviewRef.current?.fitToCoordinates(
                      [
                        { latitude: pickup.latitude, longitude: pickup.longitude },
                        { latitude: dropoff.latitude, longitude: dropoff.longitude },
                      ],
                      { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
                    );
                  }, 500);
                }}
              >
                <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} anchor={{ x: 0.5, y: 1 }}>
                  <Text style={styles.emojiMarker}>🙋</Text>
                </Marker>
                <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} anchor={{ x: 0.5, y: 1 }}>
                  <Text style={styles.emojiMarker}>🏁</Text>
                </Marker>
                {fareEstimate?.polyline && (
                  <Polyline
                    coordinates={decodePolyline(fareEstimate.polyline)}
                    strokeColor={GREEN}
                    strokeWidth={4}
                  />
                )}
              </MapView>

              {/* Back button overlay */}
              <TouchableOpacity style={styles.mapBackBtn} onPress={() => setShowFareModal(false)}>
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom info card */}
          <View style={styles.fareSheet}>
            {/* Route summary */}
            <View style={styles.routeSummaryCard}>
              <View style={styles.routeSummaryRow}>
                <View style={styles.dotGreen} />
                <Text style={styles.routeSummaryText} numberOfLines={1}>{pickup?.address}</Text>
              </View>
              <View style={styles.routeSummaryDivider} />
              <View style={styles.routeSummaryRow}>
                <View style={styles.dotRed} />
                <Text style={styles.routeSummaryText} numberOfLines={1}>{dropoff?.address}</Text>
              </View>
            </View>

            {/* Surge pricing indicator */}
            {fareEstimate?.surgeType && (
              <View style={[styles.surgeCard, fareEstimate.surgeType === 'PEAK' ? styles.surgePeak : styles.surgeNight]}>
                <Text style={styles.surgeIcon}>{fareEstimate.surgeType === 'PEAK' ? '⚡' : '🌙'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.surgeTitle}>
                    {fareEstimate.surgeType === 'PEAK' ? 'Peak Hour Surge' : 'Night Differential'}
                    {' '}({fareEstimate.surgeMultiplier}x)
                  </Text>
                  <Text style={styles.surgeDesc}>
                    {fareEstimate.surgeType === 'PEAK'
                      ? 'Higher demand during rush hour (7-9AM, 5-8PM). Fare is increased.'
                      : 'Night rate applies from 10PM to 5AM. Fare is slightly higher.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Tricycle fare card */}
            <View style={styles.fareCard}>
              <Text style={styles.fareEmoji}>{isRegular ? '🚌' : '🛺'}</Text>
              <View style={styles.fareInfo}>
                <Text style={styles.fareName}>{isRegular ? 'Regular (Shared)' : 'Special (Exclusive)'}</Text>
                <Text style={styles.fareDesc}>
                  👤 {passengerCount} passenger{passengerCount > 1 ? 's' : ''} · {fareEstimate?.distanceKm?.toFixed(1) ?? '—'} km · ~{fareEstimate?.estimatedDurationMinutes ?? '—'} mins
                </Text>
                {isRegular && (fareEstimate as any)?.perSeatFare != null && (
                  <Text style={styles.fareDesc}>
                    ₱{Number((fareEstimate as any).perSeatFare).toFixed(0)} per seat × {passengerCount}
                  </Text>
                )}
              </View>
              <Text style={styles.fareAmount}>₱{fareEstimate?.totalFare?.toFixed(0) ?? '—'}</Text>
            </View>
            {isRegular && (
              <View style={styles.poolInfoCard}>
                <Text style={styles.poolInfoIcon}>🚌</Text>
                <Text style={styles.poolInfoText}>
                  This is a shared ride. You may be matched with up to 3 total passengers. Your booking will show to riders once the pool is full or after 15 minutes.
                </Text>
              </View>
            )}

            {/* Payment method */}
            <View style={styles.paymentInfoRow}>
              <MaterialIcons
                name={selectedPayment === 'CASH' ? 'payments' : 'account-balance-wallet'}
                size={16}
                color={GREEN}
              />
              <Text style={styles.paymentInfoText}>
                {selectedPayment === 'CASH' ? 'Cash' : 'GCash'}
              </Text>
            </View>

            {/* Promo code — not available for Regular pooling */}
            {!isRegular && (
              <>
                <View style={styles.promoRow}>
                  <MaterialIcons name="local-offer" size={16} color={promoApplied ? GREEN : '#999'} />
                  <TextInput
                    style={styles.promoInput}
                    placeholder="Enter promo code"
                    placeholderTextColor="#bbb"
                    value={promoCode}
                    onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoApplied(false); }}
                    autoCapitalize="characters"
                  />
                  {promoApplied && (
                    <View style={styles.promoAppliedBadge}>
                      <MaterialIcons name="check-circle" size={14} color={GREEN} />
                      <Text style={styles.promoAppliedText}>-₱{promoDiscount.toFixed(0)}</Text>
                    </View>
                  )}
                </View>
                {promoCode.trim() && !promoApplied && (
                  <Text style={styles.promoHint}>Tap "Find Nearby Tricycle" again to apply promo</Text>
                )}
                {promoApplied && (
                  <Text style={styles.promoSuccess}>Promo applied! ₱{promoDiscount.toFixed(0)} discount on this ride</Text>
                )}
              </>
            )}

            {/* Confirm */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmBooking}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>CONFIRM BOOKING</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  routeCard: {
    margin: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#E0E0E0',
    padding: 16, backgroundColor: '#FAFAFA',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
  dotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E53935' },
  routeDivider: { height: 1, backgroundColor: '#EEE', marginLeft: 24, marginVertical: 8 },
  routeInput: { flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0 },
  locationBtn: { padding: 4 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  loadingText: { fontSize: 13, color: '#888' },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  rideTypeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA',
  },
  rideTypeSelected: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  rideTypeIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  rideTypeIconSelected: { backgroundColor: GREEN },
  rideTypeText: { flex: 1 },
  rideTypeName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rideTypePrice: { fontSize: 13, color: '#666', marginTop: 2 },

  passengerCountRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  passengerCountBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0F0E3', backgroundColor: '#fff',
  },
  passengerCountBtnSelected: { backgroundColor: GREEN, borderColor: GREEN },
  passengerCountText: { fontSize: 16, fontWeight: '700', color: GREEN },
  passengerCountHint: { textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  paymentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingVertical: 12, backgroundColor: '#FAFAFA',
  },
  paymentBtnSelected: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  paymentLabel: { fontSize: 14, color: '#555' },

  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  suggestionText: { flex: 1 },
  suggMain: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  suggSub: { fontSize: 13, color: '#999', marginTop: 2 },

  findWrapper: {
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
  },
  findBtn: {
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  findBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Fare estimate modal
  fullScreenModal: {
    flex: 1, backgroundColor: '#fff',
  },
  fareSheet: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
  },
  routeSummaryCard: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 14,
    padding: 14, backgroundColor: '#FAFAFA', marginBottom: 16,
  },
  routeSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeSummaryDivider: { height: 1, backgroundColor: '#EEE', marginLeft: 22, marginVertical: 8 },
  routeSummaryText: { flex: 1, fontSize: 13, color: '#555' },
  fareCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 16,
    padding: 16, backgroundColor: '#F0FAF2', marginBottom: 14,
  },
  fareEmoji: { fontSize: 36 },
  fareInfo: { flex: 1 },
  fareName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  fareDesc: { fontSize: 12, color: '#777', marginTop: 3 },
  fareAmount: { fontSize: 26, fontWeight: '900', color: GREEN },
  paymentInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 20, paddingHorizontal: 4,
  },
  paymentInfoText: { fontSize: 14, color: GREEN, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  goBackBtn: { alignItems: 'center', paddingVertical: 10 },
  goBackText: { color: '#999', fontSize: 14, fontWeight: '600' },
  promoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6,
  },
  promoInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 8 },
  promoAppliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  promoAppliedText: { fontSize: 13, fontWeight: '700', color: GREEN },
  promoHint: { fontSize: 11, color: '#999', marginBottom: 12, paddingHorizontal: 4 },
  promoSuccess: { fontSize: 12, color: GREEN, fontWeight: '600', marginBottom: 12, paddingHorizontal: 4 },
  surgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  surgePeak: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082' },
  surgeNight: { backgroundColor: '#E8EAF6', borderWidth: 1, borderColor: '#C5CAE9' },
  surgeIcon: { fontSize: 24 },
  surgeTitle: { fontSize: 13, fontWeight: '700', color: '#333' },
  surgeDesc: { fontSize: 11, color: '#777', marginTop: 2, lineHeight: 16 },
  mapPreviewContainer: {
    flex: 1, position: 'relative',
  },
  mapPreview: { flex: 1 },
  mapBackBtn: {
    position: 'absolute', top: 48, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  emojiMarker: { fontSize: 28, lineHeight: 30 },
  poolInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  poolInfoIcon: { fontSize: 18 },
  poolInfoText: { flex: 1, fontSize: 12, color: '#2E7D32', lineHeight: 18 },
});
