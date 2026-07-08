import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, Linking, ScrollView, Modal, Animated, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRiderStore } from '../store/rider.store';
import { api } from '../services/api';
import { listenToChat } from '../services/firebase';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { formatCurrency } from '@tamarrawgo/shared-utils';
import { connectSocket } from '../services/socket';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

const GREEN = '#1B6B2F';
const TRICYCLE_ICON = require('../../assets/tricycleicon.png');

// Decode Google encoded polyline
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function ActiveTripScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { activeBooking, setActiveBooking } = useRiderStore();
  const [loading, setLoading] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [navMode, setNavMode] = useState(false);
  const navModeRef = useRef(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const nearPickup = distanceToPickup !== null && distanceToPickup <= 1000;
  const lastLocationPushRef = useRef(0);

  // Bottom sheet
  const SHEET_COLLAPSED = 150;
  const SHEET_EXPANDED = Dimensions.get('window').height * 0.55;
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetAnim = useRef(new Animated.Value(150)).current;
  const expandedRef = useRef(false);

  const handleToggleSheet = () => {
    const expand = !expandedRef.current;
    Animated.spring(sheetAnim, {
      toValue: expand ? SHEET_EXPANDED : SHEET_COLLAPSED,
      useNativeDriver: false,
      friction: 9,
    }).start();
    expandedRef.current = expand;
    setSheetExpanded(expand);
  };

  const CANCEL_REASONS = [
    'Passenger not at pickup location',
    'Passenger requested different route',
    'Emergency / personal reason',
    'Too far from pickup location',
    'Passenger is unresponsive',
    'Other',
  ];
  const lastRouteCalcRef = useRef<{ lat: number; lng: number } | null>(null);
  const announcedPickupRef = useRef(false);
  const announcedDropoffRef = useRef(false);

  const fetchRoute = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const result = await api.get(`/maps/directions?originLat=${fromLat}&originLng=${fromLng}&destLat=${toLat}&destLng=${toLng}`) as any;
      if (result?.polyline) {
        const coords = decodePolyline(result.polyline);
        setRouteCoords(coords);
        if (coords.length > 0 && mapRef.current) {
          mapRef.current.fitToCoordinates([
            { latitude: fromLat, longitude: fromLng },
            { latitude: toLat, longitude: toLng },
          ], { edgePadding: { top: 80, right: 40, bottom: 300, left: 40 }, animated: true });
        }
      }
    } catch {}
  }, []);

  // Track rider GPS and update route
  useEffect(() => {
    let subscription: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10 },
        (loc) => {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? 0 };
          setRiderLocation(coords);

          // Push location to backend so passenger gets real-time updates (throttle to every 3s)
          const now = Date.now();
          if (now - lastLocationPushRef.current >= 3000) {
            lastLocationPushRef.current = now;
            api.post('/riders/location', { latitude: coords.latitude, longitude: coords.longitude, heading: coords.heading, speed: loc.coords.speed ?? 0 }).catch(() => {});
          }

          // Always follow rider — nav mode controls pitch/heading
          if (mapRef.current) {
            if (navModeRef.current) {
              // Navigation view: pitched, heading-aware
              mapRef.current.animateCamera({
                center: { latitude: coords.latitude, longitude: coords.longitude },
                pitch: 60,
                heading: coords.heading ?? 0,
                zoom: 18,
              }, { duration: 500 });
            } else {
              // Normal view: flat, follow rider only
              mapRef.current.animateCamera({
                center: { latitude: coords.latitude, longitude: coords.longitude },
                pitch: 0,
                zoom: 16,
              }, { duration: 500 });
            }
          }

          // Proximity announcements (100m threshold, once per phase)
          if (activeBooking) {
            const pickup = activeBooking.pickup;
            const dropoff = activeBooking.dropoff;
            if (activeBooking.status === BookingStatus.ACCEPTED && pickup && !announcedPickupRef.current) {
              const dPickup = Math.sqrt(
                Math.pow((coords.latitude - pickup.latitude) * 111000, 2) +
                Math.pow((coords.longitude - pickup.longitude) * 111000, 2)
              );
              if (dPickup <= 100) {
                announcedPickupRef.current = true;
                Speech.speak("You have arrived at the pickup location", { language: 'en' });
              }
            }
            if (activeBooking.status === BookingStatus.IN_PROGRESS && dropoff && !announcedDropoffRef.current) {
              const dDropoff = Math.sqrt(
                Math.pow((coords.latitude - dropoff.latitude) * 111000, 2) +
                Math.pow((coords.longitude - dropoff.longitude) * 111000, 2)
              );
              if (dDropoff <= 100) {
                announcedDropoffRef.current = true;
                Speech.speak("You have arrived at your destination", { language: 'en' });
              }
            }

            // Track distance to pickup to gate the "Arrived at Pickup" button
            if (activeBooking.status === BookingStatus.ACCEPTED && pickup) {
              const dPickup = Math.sqrt(
                Math.pow((coords.latitude - pickup.latitude) * 111000, 2) +
                Math.pow((coords.longitude - pickup.longitude) * 111000, 2)
              );
              setDistanceToPickup(dPickup);
            }
          }

          const last = lastRouteCalcRef.current;
          if (!last && activeBooking) {
            // GPS just became available but initial route wasn't fetched yet — fetch now
            const destination = (activeBooking.status === BookingStatus.ACCEPTED || activeBooking.status === BookingStatus.SEARCHING)
              ? activeBooking.pickup
              : activeBooking.dropoff;
            if (destination) {
              lastRouteCalcRef.current = { lat: coords.latitude, lng: coords.longitude };
              fetchRoute(coords.latitude, coords.longitude, destination.latitude, destination.longitude);
            }
          } else if (last && activeBooking) {
            // Recalculate route if moved >200m from last calc
            const dist = Math.sqrt(
              Math.pow((coords.latitude - last.lat) * 111000, 2) +
              Math.pow((coords.longitude - last.lng) * 111000, 2)
            );
            if (dist > 200) {
              const destination = activeBooking.status === BookingStatus.ACCEPTED
                ? activeBooking.pickup
                : activeBooking.dropoff;
              if (destination) {
                lastRouteCalcRef.current = { lat: coords.latitude, lng: coords.longitude };
                fetchRoute(coords.latitude, coords.longitude, destination.latitude, destination.longitude);
              }
            }
          }
        }
      );
    })();
    return () => subscription?.remove();
  }, [activeBooking?.status]);

  // Reset announcement flags when status changes to a new phase
  useEffect(() => {
    if (activeBooking?.status === BookingStatus.ACCEPTED) {
      announcedPickupRef.current = false;
    } else if (activeBooking?.status === BookingStatus.IN_PROGRESS) {
      announcedDropoffRef.current = false;
    }
  }, [activeBooking?.status]);

  // Fetch initial route when status changes (not on every location update)
  useEffect(() => {
    if (!activeBooking || !riderLocation) return;
    const destination = activeBooking.status === BookingStatus.ACCEPTED || activeBooking.status === BookingStatus.SEARCHING
      ? activeBooking.pickup
      : activeBooking.dropoff;
    if (destination) {
      lastRouteCalcRef.current = { lat: riderLocation.latitude, lng: riderLocation.longitude };
      fetchRoute(riderLocation.latitude, riderLocation.longitude, destination.latitude, destination.longitude);
    }
  }, [activeBooking?.status]); // Only re-run when status changes, NOT on location update

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    connectSocket().then((socket) => {
      const handleCancel = () => {
        setActiveBooking(null);
        router.back();
      };
      socket.on('passenger:booking:cancel', handleCancel);
      cleanup = () => socket.off('passenger:booking:cancel', handleCancel);
    });
    return () => cleanup?.();
  }, []);

  // Listen for unread messages from passenger
  useEffect(() => {
    if (!activeBooking?.bookingId) return;
    const unsubscribe = listenToChat(activeBooking.bookingId, (msg) => {
      if (msg.senderRole === 'PASSENGER') {
        setUnreadCount((c) => c + 1);
      }
    });
    return unsubscribe;
  }, [activeBooking?.bookingId]);

  const handleCancelBooking = async () => {
    if (!selectedReason) { Alert.alert('Select Reason', 'Please select a cancellation reason.'); return; }
    if (!activeBooking) return;
    setLoading(true);
    try {
      await api.patch(`/bookings/${activeBooking.bookingId}/cancel`, { reason: selectedReason });
      setActiveBooking(null);
      setShowCancelModal(false);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (lat: number, lng: number, label: string) => {
    const googleMapsUrl = `google.navigation:q=${lat},${lng}&mode=d`;
    const fallbackUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
    Linking.canOpenURL(googleMapsUrl).then((supported) => {
      Linking.openURL(supported ? googleMapsUrl : fallbackUrl);
    });
  };

  const updateStatus = async (endpoint: string, nextStatus: string) => {
    if (!activeBooking) return;
    setLoading(true);
    try {
      await api.patch(`/bookings/${activeBooking.bookingId}/${endpoint}`);
      setActiveBooking({ ...activeBooking, status: nextStatus });
    } catch (err: any) {
      Alert.alert('Error', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const status = activeBooking?.status;

  const getActionButton = () => {
    switch (status) {
      case BookingStatus.ACCEPTED:
        return { label: 'Arrived at Pickup', action: () => updateStatus('arrived', BookingStatus.RIDER_ARRIVED), color: nearPickup ? GREEN : '#9E9E9E', disabled: !nearPickup };
      case BookingStatus.RIDER_ARRIVED:
        return { label: 'Start Trip', action: async () => {
          await updateStatus('start', BookingStatus.IN_PROGRESS);
          setNavMode(true);
          navModeRef.current = true;
          // Switch to navigation view
          if (riderLocation && mapRef.current) {
            mapRef.current.animateCamera({
              center: { latitude: riderLocation.latitude, longitude: riderLocation.longitude },
              pitch: 60,
              heading: riderLocation.heading ?? 0,
              zoom: 18,
            }, { duration: 1000 });
          }
        }, color: '#145224' };
      case BookingStatus.IN_PROGRESS:
        return { label: 'Complete Trip', action: () => updateStatus('complete', BookingStatus.COMPLETED), color: '#0D3A19' };
      default: return null;
    }
  };

  const actionBtn = getActionButton();
  const destination = status === BookingStatus.ACCEPTED || status === BookingStatus.SEARCHING
    ? activeBooking?.pickup
    : activeBooking?.dropoff;

  if (status === BookingStatus.COMPLETED) {
    return (
      <View style={styles.completedContainer}>
        <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
        <Text style={styles.completedTitle}>Trip Completed!</Text>
        <Text style={styles.completedFare}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => { setActiveBooking(null); router.back(); }}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Start map centered on pickup location so rider can see where to go
  // Always start centered on pickup location so rider sees where to go
  const initialRegion = activeBooking?.pickup
    ? { latitude: activeBooking.pickup.latitude, longitude: activeBooking.pickup.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }
    : { latitude: 12.8797, longitude: 121.7740, latitudeDelta: 8, longitudeDelta: 8 };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} provider={PROVIDER_DEFAULT} style={StyleSheet.absoluteFillObject} initialRegion={initialRegion}>

        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={GREEN} strokeWidth={4} />
        )}

        {/* Fallback straight line */}
        {routeCoords.length === 0 && riderLocation && destination && (
          <Polyline
            coordinates={[
              { latitude: riderLocation.latitude, longitude: riderLocation.longitude },
              { latitude: destination.latitude, longitude: destination.longitude },
            ]}
            strokeColor={GREEN} strokeWidth={3} lineDashPattern={[8, 4]}
          />
        )}

        {/* Rider (own location) */}
        {riderLocation && (
          <Marker coordinate={riderLocation} title="You" anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.emojiMarker}>🛺</Text>
          </Marker>
        )}

        {/* Pickup marker — hide once trip starts */}
        {activeBooking?.pickup && status !== BookingStatus.IN_PROGRESS && status !== BookingStatus.COMPLETED && (
          <Marker coordinate={{ latitude: activeBooking.pickup.latitude, longitude: activeBooking.pickup.longitude }} title="Pickup" anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.emojiMarker}>🙋</Text>
          </Marker>
        )}

        {/* Dropoff marker */}
        {activeBooking?.dropoff && (
          <Marker coordinate={{ latitude: activeBooking.dropoff.latitude, longitude: activeBooking.dropoff.longitude }} title="Dropoff" anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.emojiMarker}>🏁</Text>
          </Marker>
        )}
      </MapView>

      {/* Nav mode toggle button */}
      <TouchableOpacity
        style={[styles.navBtn, navMode && styles.navBtnActive]}
        onPress={() => {
          const newNavMode = !navMode;
          setNavMode(newNavMode);
          navModeRef.current = newNavMode;
          if (newNavMode && riderLocation && mapRef.current) {
            mapRef.current.animateCamera({
              center: { latitude: riderLocation.latitude, longitude: riderLocation.longitude },
              pitch: 60, heading: riderLocation.heading ?? 0, zoom: 18,
            }, { duration: 800 });
          } else if (!newNavMode && mapRef.current) {
            mapRef.current.animateCamera({ pitch: 0, zoom: 14 }, { duration: 800 });
          }
        }}
      >
        <MaterialIcons name="navigation" size={22} color={navMode ? '#fff' : GREEN} />
      </TouchableOpacity>

      {/* Collapsible Bottom Sheet */}
      <Animated.View style={[styles.tripCard, { height: sheetAnim, overflow: 'hidden' }]}>
        {/* Drag handle */}
        <TouchableOpacity onPress={handleToggleSheet} style={styles.sheetHandle} activeOpacity={0.7}>
          <View style={styles.handleBar} />
          <MaterialIcons name={sheetExpanded ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} size={20} color="#999" />
        </TouchableOpacity>

        {/* Always visible: passenger + fare + chat + navigate */}
        <View style={styles.passengerRow}>
          {activeBooking?.passenger?.profilePhoto
            ? <Image source={{ uri: activeBooking.passenger.profilePhoto }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            : <View style={styles.avatar}><MaterialIcons name="person-outline" size={22} color={GREEN} /></View>
          }
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName} numberOfLines={1}>{activeBooking?.passenger?.firstName} {activeBooking?.passenger?.lastName}</Text>
            {(activeBooking?.passengerCount ?? 1) > 1 && (
              <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>👤 {activeBooking.passengerCount} passengers</Text>
            )}
          </View>
          <Text style={styles.fareAmountCompact}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
          <TouchableOpacity style={styles.callBtn} onPress={() => { setUnreadCount(0); router.push('/chat' as any); }}>
            <View style={{ position: 'relative' }}>
              <MaterialIcons name="chat" size={18} color={GREEN} />
              {unreadCount > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Locations */}
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color={GREEN} />
          <Text style={styles.locationText} numberOfLines={1}>{activeBooking?.pickup?.address}</Text>
        </View>
        <View style={styles.locationRow}>
          <MaterialIcons name="place" size={16} color="#333" />
          <Text style={styles.locationText} numberOfLines={1}>{activeBooking?.dropoff?.address}</Text>
        </View>

        {/* Delivery / Pabili details */}
        {(activeBooking as any)?.bookingType === 'DELIVERY' && (
          <View style={styles.deliveryBox}>
            <Text style={styles.deliveryBoxTitle}>📦 Delivery Details</Text>
            {(activeBooking as any).packageDescription && <Text style={styles.deliveryBoxRow}>Package: {(activeBooking as any).packageDescription}</Text>}
            {(activeBooking as any).recipientName && <Text style={styles.deliveryBoxRow}>Recipient: {(activeBooking as any).recipientName}</Text>}
            {(activeBooking as any).recipientPhone && <Text style={styles.deliveryBoxRow}>Phone: {(activeBooking as any).recipientPhone}</Text>}
          </View>
        )}
        {(activeBooking as any)?.bookingType === 'PABILI' && (
          <View style={styles.deliveryBox}>
            <Text style={styles.deliveryBoxTitle}>🛒 Pabili Details</Text>
            {(activeBooking as any).storeAddress && <Text style={styles.deliveryBoxRow}>Store: {(activeBooking as any).storeAddress}</Text>}
            {(activeBooking as any).shoppingList && <Text style={styles.deliveryBoxRow}>List: {(activeBooking as any).shoppingList}</Text>}
            {(activeBooking as any).itemBudget && <Text style={styles.deliveryBoxRow}>Budget: ₱{Number((activeBooking as any).itemBudget).toFixed(2)}</Text>}
          </View>
        )}

        {/* Navigate */}
        {(status === BookingStatus.ACCEPTED || status === BookingStatus.RIDER_ARRIVED || status === BookingStatus.IN_PROGRESS) && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => {
              const dest = status === BookingStatus.IN_PROGRESS
                ? activeBooking?.dropoff
                : activeBooking?.pickup;
              if (dest) openNavigation(dest.latitude, dest.longitude,
                status === BookingStatus.IN_PROGRESS ? 'Dropoff' : 'Pickup');
            }}
          >
            <MaterialIcons name="navigation" size={18} color="#fff" />
            <Text style={styles.navigateBtnText}>
              {status === BookingStatus.IN_PROGRESS ? 'Navigate to Dropoff' : 'Navigate to Pickup'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Expanded content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Action button */}
          {actionBtn && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: actionBtn.color }]}
              onPress={actionBtn.action}
              disabled={loading || !!actionBtn.disabled}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>{actionBtn.label}</Text>}
            </TouchableOpacity>
          )}

          {status === BookingStatus.ACCEPTED && !nearPickup && distanceToPickup !== null && (
            <Text style={styles.distanceHint}>
              📍 {(distanceToPickup / 1000).toFixed(2)}km from pickup — must be within 1km to mark as arrived
            </Text>
          )}
          {status === BookingStatus.ACCEPTED && !nearPickup && distanceToPickup === null && (
            <Text style={styles.distanceHint}>📍 Getting your location...</Text>
          )}

          {/* Call & Chat buttons */}
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={() => {
              const phone = activeBooking?.passenger?.phone;
              if (phone) Linking.openURL(`tel:${phone}`);
              else Alert.alert('Unavailable', 'Passenger phone number not available');
            }}>
              <MaterialIcons name="call" size={20} color={GREEN} />
              <Text style={styles.contactBtnText}>Call Passenger</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn} onPress={() => { setUnreadCount(0); router.push('/chat'); }}>
              <MaterialIcons name="chat" size={20} color={GREEN} />
              <Text style={styles.contactBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {status === BookingStatus.ACCEPTED && (
            <TouchableOpacity
              style={styles.cancelBookingBtn}
              onPress={() => { setSelectedReason(''); setShowCancelModal(true); }}
            >
              <MaterialIcons name="cancel" size={18} color="#E53935" />
              <Text style={styles.cancelBookingText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      {/* Cancellation Reason Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSubtitle}>Please select a reason:</Text>

            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonRow, selectedReason === reason && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(reason)}
              >
                <MaterialIcons
                  name={selectedReason === reason ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={selectedReason === reason ? '#E53935' : '#999'}
                />
                <Text style={[styles.reasonText, selectedReason === reason && { color: '#E53935', fontWeight: '700' }]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !selectedReason && { opacity: 0.5 }]}
                onPress={handleCancelBooking}
                disabled={loading || !selectedReason}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Confirm Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16 },
  completedTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
  completedFare: { fontSize: 36, fontWeight: '900', color: GREEN },
  doneBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tripCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  sheetHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', marginBottom: 4 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  passengerName: { fontWeight: '700', fontSize: 15, color: '#333' },
  fareAmountCompact: { fontSize: 18, fontWeight: '900', color: GREEN, marginRight: 8 },
  callBtn: { padding: 10, backgroundColor: '#E8F5E9', borderRadius: 20 },
  chatBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#E53935', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  chatBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  locationText: { flex: 1, color: '#555', fontSize: 14 },
  deliveryBox: {
    backgroundColor: '#F1F8E9', borderRadius: 10, padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#1B6B2F',
  },
  deliveryBoxTitle: { fontSize: 13, fontWeight: '700', color: '#1B6B2F', marginBottom: 4 },
  deliveryBoxRow: { fontSize: 12, color: '#444', marginBottom: 2 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  fareLabel: { color: '#666', fontSize: 13 },
  fareAmount: { fontSize: 20, fontWeight: '900', color: GREEN },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E0F0E3', borderRadius: 12, paddingVertical: 12,
    backgroundColor: '#F0FAF2',
  },
  contactBtnText: { color: GREEN, fontWeight: '700', fontSize: 14 },
  cancelBookingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E53935', borderRadius: 12, paddingVertical: 12, marginTop: 8,
    backgroundColor: '#FFF5F5',
  },
  cancelBookingText: { color: '#E53935', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  reasonRowSelected: { backgroundColor: '#FFF5F5', borderRadius: 8, paddingHorizontal: 8 },
  reasonText: { fontSize: 15, color: '#333', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: '#666', fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1, backgroundColor: '#E53935', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 12, marginBottom: 8,
  },
  navigateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  distanceHint: { textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8 },
  tricycleMarker: {
    backgroundColor: '#1B6B2F', borderRadius: 30, padding: 10,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
  },
  navBtn: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: '#fff', borderRadius: 24, padding: 12,
    borderWidth: 2, borderColor: GREEN,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  navBtnActive: { backgroundColor: GREEN },
  pickupMarker: { backgroundColor: GREEN, borderRadius: 16, padding: 5 },
  dropoffMarker: { backgroundColor: '#333', borderRadius: 16, padding: 5 },
  emojiMarker: { fontSize: 28, lineHeight: 30 },
});
