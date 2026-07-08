import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, Animated, Dimensions, Linking, Share } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 130;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.48;
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../store/booking.store';
import { connectSocket, SocketEvent } from '../services/socket';
import { api } from '../services/api';
import { listenToChat } from '../services/firebase';
import { useAuthStore } from '../store/auth.store';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const GREEN = '#1B6B2F';
const GREEN_LIGHT = '#E8F5E9';

const STATUS_LABELS: Record<string, string> = {
  [BookingStatus.SEARCHING]:     'Finding your rider...',
  [BookingStatus.ACCEPTED]:      'Driver is on the way!',
  [BookingStatus.RIDER_ARRIVED]: 'Driver has arrived!',
  [BookingStatus.IN_PROGRESS]:   'Trip in progress...',
  [BookingStatus.COMPLETED]:     'Trip completed!',
};

const ETA_MAP: Record<string, string> = {
  [BookingStatus.SEARCHING]:     '—',
  [BookingStatus.ACCEPTED]:      'En route',
  [BookingStatus.RIDER_ARRIVED]: 'Arrived',
  [BookingStatus.IN_PROGRESS]:   'En route',
  [BookingStatus.COMPLETED]:     'Done',
};

const HEADER_LABELS: Record<string, string> = {
  [BookingStatus.SEARCHING]:     'Finding a Rider...',
  [BookingStatus.ACCEPTED]:      'Driver on the Way',
  [BookingStatus.RIDER_ARRIVED]: 'Driver Arrived',
  [BookingStatus.IN_PROGRESS]:   'Trip in Progress',
  [BookingStatus.COMPLETED]:     'Trip Completed!',
};

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

export default function TrackingScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { activeBooking: _ab, riderLocation: storeRiderLoc, pickup, dropoff, setActiveBooking, setRiderLocation, setPickup, setDropoff, reset } = useBookingStore();
  const activeBooking = _ab as any;
  const status: string = activeBooking?.status ?? BookingStatus.SEARCHING;
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const lastRouteCalcRef = useRef<{ lat: number; lng: number } | null>(null);
  // Local state for rider marker — ensures re-render on every position change
  const [localRiderLoc, setLocalRiderLoc] = useState<{ latitude: number; longitude: number; heading: number } | null>(null);
  const riderLocation = localRiderLoc ?? storeRiderLoc;

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();
  const [selectedReason, setSelectedReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const sheetExpanded = useRef(false);
  const navigatedToRate = useRef(false);

  const handleToggleSheet = useCallback(() => {
    const toValue = sheetExpanded.current ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
    sheetExpanded.current = !sheetExpanded.current;
    Animated.spring(sheetAnim, { toValue, useNativeDriver: false, bounciness: 0, speed: 14 }).start();
  }, []);


  const CANCEL_REASONS = [
    'Changed my mind',
    'Rider is taking too long',
    'Found another ride',
    'Wrong pickup location entered',
    'Emergency / personal reason',
    'Other',
  ];

  const fitMapToRider = useCallback((riderLat: number, riderLng: number) => {
    mapRef.current?.animateCamera({
      center: { latitude: riderLat, longitude: riderLng },
      zoom: 16,
    }, { duration: 500 });
  }, []);

  const fetchRoute = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const result = await api.get(`/maps/directions?originLat=${fromLat}&originLng=${fromLng}&destLat=${toLat}&destLng=${toLng}`) as any;
      if (result?.polyline) {
        setRouteCoords(decodePolyline(result.polyline));
      }
    } catch {}
  }, []);

  // On mount: fetch full booking (ensures vehicle/plate data is available)
  useEffect(() => {
    (async () => {
      try {
        const full: any = await api.get('/bookings/active');
        if (full?.id) {
          setActiveBooking(full);
          if (!pickup && full.pickupLatitude && full.pickupLongitude) {
            setPickup({ address: full.pickupAddress, latitude: full.pickupLatitude, longitude: full.pickupLongitude });
          }
          if (!dropoff && full.dropoffLatitude && full.dropoffLongitude) {
            setDropoff({ address: full.dropoffAddress, latitude: full.dropoffLatitude, longitude: full.dropoffLongitude });
          }
          const rLat = full.rider?.currentLatitude;
          const rLng = full.rider?.currentLongitude;
          if (rLat && rLng) {
            const loc = { latitude: rLat, longitude: rLng, heading: 0 };
            setRiderLocation(loc);
            setLocalRiderLoc(loc);
          }
        }
      } catch {}
    })();
  }, []);

  // On mount: seed riderLocation and fit map to show rider + destination
  useEffect(() => {
    const booking = activeBooking as any;
    const seedLat = booking?.rider?.currentLatitude;
    const seedLng = booking?.rider?.currentLongitude;
    if (seedLat && seedLng && !riderLocation) {
      setRiderLocation({ latitude: seedLat, longitude: seedLng, heading: 0 });
    }
    const rLat = seedLat ?? pickup?.latitude;
    const rLng = seedLng ?? pickup?.longitude;
    if (rLat && rLng) {
      setTimeout(() => fitMapToRider(rLat, rLng), 600);
    }
  }, []);

  // Fit map + fetch route when status changes
  useEffect(() => {
    if (riderLocation) fitMapToRider(riderLocation.latitude, riderLocation.longitude);
    if (!dropoff) return;
    if (status === BookingStatus.RIDER_ARRIVED && pickup) {
      // Rider is at pickup — show pickup→dropoff as trip preview
      fetchRoute(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude);
    } else if (status === BookingStatus.IN_PROGRESS) {
      // Rider may be stationary at pickup when trip starts — fall back to pickup coords
      const origin = riderLocation ?? pickup;
      if (origin) fetchRoute(origin.latitude, origin.longitude, dropoff.latitude, dropoff.longitude);
    } else if (status === BookingStatus.ACCEPTED) {
      // Route from rider's position TO the pickup (rider coming to passenger)
      // Use live socket location if available, else fall back to stored DB coordinates
      const booking = activeBooking as any;
      const riderLat = riderLocation?.latitude ?? booking?.rider?.currentLatitude;
      const riderLng = riderLocation?.longitude ?? booking?.rider?.currentLongitude;
      if (riderLat && riderLng && pickup) {
        fetchRoute(riderLat, riderLng, pickup.latitude, pickup.longitude);
      }
    }
  }, [status, dropoff]);

  // Recalculate route when rider moves significantly (>200m from last calc point)
  useEffect(() => {
    if (!riderLocation) return;
    const currentStatus = (useBookingStore.getState().activeBooking as any)?.status;
    // ACCEPTED → route to pickup; IN_PROGRESS → route to dropoff
    const destination = currentStatus === BookingStatus.IN_PROGRESS ? dropoff : pickup;
    if (!destination) return;
    const last = lastRouteCalcRef.current;
    if (!last) {
      lastRouteCalcRef.current = { lat: riderLocation.latitude, lng: riderLocation.longitude };
      fetchRoute(riderLocation.latitude, riderLocation.longitude, destination.latitude, destination.longitude);
      return;
    }
    const dist = Math.sqrt(
      Math.pow((riderLocation.latitude - last.lat) * 111000, 2) +
      Math.pow((riderLocation.longitude - last.lng) * 111000, 2)
    );
    if (dist > 200) {
      lastRouteCalcRef.current = { lat: riderLocation.latitude, lng: riderLocation.longitude };
      fetchRoute(riderLocation.latitude, riderLocation.longitude, destination.latitude, destination.longitude);
    }
  }, [riderLocation]);

  // Listen for unread messages from rider
  useEffect(() => {
    if (!activeBooking?.id) return;
    const unsubscribe = listenToChat(activeBooking.id, (msg) => {
      if (msg.senderRole === 'RIDER') {
        setUnreadCount((c) => c + 1);
      }
    });
    return unsubscribe;
  }, [activeBooking?.id]);

  useEffect(() => {
    let mounted = true;
    let socketRef: any = null;

    const handleStatusUpdate = (data: any) => {
      const current = useBookingStore.getState().activeBooking as any;
      if (!current || current.id !== data.bookingId) return;
      useBookingStore.getState().setActiveBooking({ ...current, status: data.status } as any);
      if (data.status === BookingStatus.COMPLETED) {
        if (!navigatedToRate.current) { navigatedToRate.current = true; setTimeout(() => { if (mounted) router.replace('/rate'); }, 1500); }
      } else if (data.status === BookingStatus.CANCELLED) {
        useBookingStore.getState().reset();
        if (mounted) router.replace('/(tabs)/home');
      }
    };

    const handleRiderLocation = (data: any) => {
      const loc = { latitude: data.latitude, longitude: data.longitude, heading: data.heading ?? 0 };
      setRiderLocation(loc);
      setLocalRiderLoc({ ...loc });
      fitMapToRider(data.latitude, data.longitude);
      const p = useBookingStore.getState().pickup;
      const currentStatus = (useBookingStore.getState().activeBooking as any)?.status;
      if (p && (currentStatus === BookingStatus.ACCEPTED || currentStatus === BookingStatus.SEARCHING)) {
        const dLat = (data.latitude - p.latitude) * 111000;
        const dLng = (data.longitude - p.longitude) * 111000 * Math.cos(p.latitude * Math.PI / 180);
        const distM = Math.sqrt(dLat * dLat + dLng * dLng);
        const mins = Math.max(1, Math.round(distM / 250));
        setEtaMinutes(mins);
      }
    };

    connectSocket().then((socket) => {
      if (!mounted) return;
      socketRef = socket;
      socket.on(SocketEvent.BOOKING_STATUS_UPDATE, handleStatusUpdate);
      socket.on(SocketEvent.RIDER_LOCATION, handleRiderLocation);
    });

    return () => {
      mounted = false;
      if (socketRef) {
        socketRef.off(SocketEvent.BOOKING_STATUS_UPDATE, handleStatusUpdate);
        socketRef.off(SocketEvent.RIDER_LOCATION, handleRiderLocation);
      }
    };
  }, []);

  // Polling fallback — syncs status every 10s in case WebSocket events are missed
  useEffect(() => {
    let mounted = true;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const booking: any = await api.get(`/bookings/active?_t=${Date.now()}`);
        if (!mounted) return;
        const current = useBookingStore.getState().activeBooking as any;
        if (!current) return;

        if (!booking?.id) {
          // Active endpoint only returns in-progress statuses — null means terminal.
          // Fetch the specific booking to know if it was completed or cancelled.
          try {
            const specific: any = await api.get(`/bookings/${current.id}`);
            if (!mounted) return;
            if (specific?.status === BookingStatus.COMPLETED) {
              useBookingStore.getState().setActiveBooking({ ...current, status: BookingStatus.COMPLETED } as any);
              if (!navigatedToRate.current) { navigatedToRate.current = true; router.replace('/rate'); }
            } else if (specific?.status === BookingStatus.CANCELLED) {
              useBookingStore.getState().reset();
              router.replace('/(tabs)/home');
            }
          } catch {}
          return;
        }

        if (booking.status !== current.status) {
          useBookingStore.getState().setActiveBooking({ ...current, ...booking } as any);
          if (booking.status === BookingStatus.COMPLETED) {
            if (!navigatedToRate.current) { navigatedToRate.current = true; router.replace('/rate'); }
          } else if (booking.status === BookingStatus.CANCELLED) {
            useBookingStore.getState().reset();
            router.replace('/(tabs)/home');
          }
        }
        // Read rider location from booking response directly
        const rLat = booking.rider?.currentLatitude;
        const rLng = booking.rider?.currentLongitude;
        if (rLat && rLng) {
          const loc = { latitude: Number(rLat), longitude: Number(rLng), heading: 0 };
          useBookingStore.getState().setRiderLocation(loc);
          setLocalRiderLoc({ ...loc });
          fitMapToRider(Number(rLat), Number(rLng));
          const p = useBookingStore.getState().pickup;
          if (p && (booking.status === 'ACCEPTED' || booking.status === 'SEARCHING')) {
            const dLat = (Number(rLat) - p.latitude) * 111000;
            const dLng = (Number(rLng) - p.longitude) * 111000 * Math.cos(p.latitude * Math.PI / 180);
            const distM = Math.sqrt(dLat * dLat + dLng * dLng);
            setEtaMinutes(Math.max(1, Math.round(distM / 250)));
          }
        }
      } catch {} finally { polling = false; }
    };
    const interval = setInterval(poll, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleCancel = () => {
    setSelectedReason('');
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedReason) { Alert.alert('Select Reason', 'Please select a cancellation reason.'); return; }
    if (!activeBooking) return;
    setCancelLoading(true);
    try {
      await api.patch(`/bookings/${activeBooking.id}/cancel`, { reason: selectedReason });
      reset();
      setShowCancelModal(false);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  const riderName = activeBooking?.rider
    ? `${activeBooking.rider.user?.firstName ?? ''} ${activeBooking.rider.user?.lastName ?? ''}`.trim()
    : 'Finding driver...';
  const plateNo = activeBooking?.rider?.vehicle?.plateNumber ?? '—';
  const rating = Number(activeBooking?.rider?.rating ?? 5.0).toFixed(1);
  const isCompleted = status === BookingStatus.COMPLETED;
  const canCancel = status === BookingStatus.ACCEPTED || status === BookingStatus.SEARCHING || status === BookingStatus.RIDER_ARRIVED;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={
          pickup
            ? { latitude: pickup.latitude, longitude: pickup.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 13.4115, longitude: 121.1803, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={GREEN}
            strokeWidth={4}
          />
        )}

        {/* Fallback straight line if no route yet */}
        {routeCoords.length === 0 && pickup && dropoff && (
          <Polyline
            coordinates={[
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            ]}
            strokeColor={GREEN}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}

        {pickup && status !== BookingStatus.IN_PROGRESS && status !== BookingStatus.COMPLETED && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title="Pickup" anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.emojiMarker}>🙋</Text>
          </Marker>
        )}
        {dropoff && (
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} title="Dropoff" anchor={{ x: 0.5, y: 1 }}>
            <Text style={styles.emojiMarker}>🏁</Text>
          </Marker>
        )}
        {riderLocation && (
          <Marker
            coordinate={{ latitude: riderLocation.latitude, longitude: riderLocation.longitude }}
            title="Driver"
            anchor={{ x: 0.5, y: 1 }}
          >
            <Text style={styles.emojiMarker}>🛺</Text>
          </Marker>
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color="#333" />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleBadge}>
        <Text style={styles.titleText}>
          {HEADER_LABELS[status] ?? 'Driver on the Way'}
        </Text>
      </View>

      {/* SOS Button */}
      {!isCompleted && (
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => {
            Alert.alert(
              'Emergency SOS',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
                {
                  text: 'Share Location',
                  onPress: () => {
                    const loc = riderLocation ?? pickup;
                    const mapsLink = loc ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : '';
                    Share.share({
                      message: `EMERGENCY - I need help!\n\nI'm on a TamarrawGo ride.\nDriver: ${riderName}\nPlate: ${plateNo}\n${mapsLink ? `My location: ${mapsLink}` : ''}`,
                      title: 'Emergency - TamarrawGo',
                    }).catch(() => {});
                  },
                },
              ],
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      )}

      {/* Collapsible Bottom Sheet */}
      <Animated.View style={[styles.driverCard, { height: sheetAnim }]}>
        {/* Pull handle */}
        <TouchableOpacity onPress={handleToggleSheet} activeOpacity={0.8} style={styles.sheetHandle}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* Always visible: driver name + fare + status */}
        <View style={styles.driverRowCompact}>
          {(activeBooking as any)?.rider?.user?.profilePhoto ? (
            <Image source={{ uri: (activeBooking as any).rider.user.profilePhoto }} style={styles.driverAvatarSmall} />
          ) : (
            <View style={styles.driverAvatarSmall}>
              <MaterialIcons name="person-pin-circle" size={22} color={GREEN} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.driverName, { flex: 1 }]} numberOfLines={1}>{riderName}</Text>
              {(activeBooking as any)?.rider?.status === 'APPROVED' && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={13} color="#1565C0" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
            </View>
            <View style={styles.statusRowCompact}>
              <View style={[styles.statusDot, { backgroundColor: isCompleted ? '#34C759' : GREEN }]} />
              <Text style={styles.statusTextCompact}>{STATUS_LABELS[status] ?? 'Processing...'}</Text>
            </View>
          </View>
          <Text style={styles.fareAmountCompact}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
        </View>

        {/* Expanded content */}
        <View style={styles.expandedContent}>
          <View style={styles.driverDetailRow}>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color="#F5A623" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            <View style={styles.driverMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Plate No.</Text>
                <Text style={styles.metaValue}>{plateNo}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>ETA</Text>
                <Text style={[styles.metaValue, { color: GREEN }]}>
                  {status === BookingStatus.RIDER_ARRIVED ? 'Arrived'
                    : status === BookingStatus.COMPLETED ? 'Done'
                    : etaMinutes ? `~${etaMinutes} min${etaMinutes > 1 ? 's' : ''}`
                    : ETA_MAP[status] ?? '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            <Text style={styles.fareAmount}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setUnreadCount(0); router.push('/chat'); }}>
              <MaterialIcons name="chat" size={20} color="#333" />
              <Text style={styles.actionLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {
              const phone = activeBooking?.rider?.user?.phone;
              if (phone) Linking.openURL(`tel:${phone}`);
              else Alert.alert('Unavailable', 'Rider phone number not available');
            }}>
              <MaterialIcons name="call" size={20} color="#333" />
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {
              const loc = riderLocation ?? pickup;
              const mapsLink = loc ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : '';
              const msg = `I'm on a TamarrawGo ride!\n\nDriver: ${riderName}\nPlate: ${plateNo}\nStatus: ${STATUS_LABELS[status] ?? 'On the way'}\nFare: ${formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}\n${mapsLink ? `\nTrack my location: ${mapsLink}` : ''}`;
              Share.share({ message: msg, title: 'My TamarrawGo Trip' }).catch(() => {});
            }}>
              <MaterialIcons name="share" size={20} color="#333" />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
            {canCancel && (
              <TouchableOpacity style={[styles.actionBtn, styles.cancelActionBtn]} onPress={handleCancel}>
                <MaterialIcons name="cancel" size={20} color="#E53935" />
                <Text style={[styles.actionLabel, { color: '#E53935' }]}>Cancel</Text>
              </TouchableOpacity>
            )}
            {isCompleted && (
              <TouchableOpacity style={[styles.actionBtn, styles.rateActionBtn]} onPress={() => { if (!navigatedToRate.current) { navigatedToRate.current = true; router.replace('/rate'); } }}>
                <MaterialIcons name="star" size={20} color="#fff" />
                <Text style={[styles.actionLabel, { color: '#fff' }]}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Cancellation Reason Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSubtitle}>Please tell us why you're cancelling:</Text>

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
              <TouchableOpacity style={styles.modalBackBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBackText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !selectedReason && { opacity: 0.5 }]}
                onPress={confirmCancel}
                disabled={cancelLoading || !selectedReason}
              >
                {cancelLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Confirm Cancel</Text>
                }
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
  backBtn: {
    position: 'absolute', top: 56, left: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  sosBtn: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: '#E53935', borderRadius: 24, width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  sosBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  titleBadge: {
    position: 'absolute', top: 60, alignSelf: 'center', left: 0, right: 0, alignItems: 'center',
  },
  titleText: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, fontSize: 15, fontWeight: '700', color: '#1A1A1A',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  driverCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD' },
  driverRowCompact: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  driverAvatarSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  driverName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#E3F2FD', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10,
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: '700', color: '#1565C0' },
  statusRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusTextCompact: { fontSize: 11, color: '#888', fontWeight: '600' },
  fareAmountCompact: { fontSize: 17, fontWeight: '900', color: GREEN },
  chatBtnCompact: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 30 },
  driverDetailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingTop: 4,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, color: '#555', fontWeight: '600' },
  driverMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  fareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  fareLabel: { fontSize: 14, color: '#666' },
  fareAmount: { fontSize: 20, fontWeight: '900', color: GREEN },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, paddingVertical: 12,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  badge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#E53935', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  cancelActionBtn: { borderColor: '#FFCDD2', backgroundColor: '#FFF5F5' },
  rateActionBtn: { borderColor: GREEN, backgroundColor: GREEN },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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
  modalBackBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBackText: { color: '#666', fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1, backgroundColor: '#E53935', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickupDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: GREEN, borderWidth: 2, borderColor: '#fff' },
  dropoffDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E53935', borderWidth: 2, borderColor: '#fff' },
  emojiMarker: { fontSize: 28, lineHeight: 30 },
  tricycleMarker: {},
  tricycleEmoji: { fontSize: 36 },
});
