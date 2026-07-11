import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Animated, Dimensions, TouchableWithoutFeedback, ScrollView, Image } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import CustomToggle from '../components/CustomToggle';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useRiderStore } from '../store/rider.store';
import { useAuthStore } from '../store/auth.store';
import { api } from '../services/api';
import { BookingStatus } from '@tamarrawgo/shared-types';
import { connectSocket, SocketEvent } from '../services/socket';
import { formatCurrency, formatDistance } from '@tamarrawgo/shared-utils';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;
const GREEN = '#1B6B2F';

const LOCATION_INTERVAL = 3000;

// Mindoro island bounding box
const MINDORO = { minLat: 11.9, maxLat: 13.6, minLng: 120.5, maxLng: 121.8 };
const isInMindoro = (lat: number, lng: number) =>
  lat >= MINDORO.minLat && lat <= MINDORO.maxLat && lng >= MINDORO.minLng && lng <= MINDORO.maxLng;

export default function RiderHomeScreen() {
  const mapRef = useRef<MapView>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownLocation = useRef<{ latitude: number; longitude: number; heading: number } | null>(null);
  const {
    isOnline, bookingRequests, activeBooking,
    setOnline, addBookingRequest, removeBookingRequest, clearBookingRequests, setActiveBooking,
  } = useRiderStore();
  const hasActiveBooking = activeBooking && !['COMPLETED', 'CANCELLED'].includes((activeBooking as any)?.status);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; heading: number } | null>(null);
  const [summary, setSummary] = useState<{ today: number; totalTrips: number; todayTrips: number; averageRating: number } | null>(null);
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, friction: 8 }).start(() => setDrawerOpen(false));
  }, []);

  const handleDrawerNav = useCallback((route: string) => {
    closeDrawer();
    setTimeout(() => router.push(route as any), 250);
  }, []);

  const handleLogout = useCallback(() => {
    closeDrawer();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  }, []);

  const { setBookingRequests } = useRiderStore();
  const fetchAvailableBookings = useCallback(async () => {
    try {
      const bookings = await api.get('/bookings/available') as any[];
      if (Array.isArray(bookings)) setBookingRequests(bookings);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      // Check if rider has an active booking (session recovery after app close)
      try {
        const activeBooking = await api.get('/bookings/active') as any;
        if (activeBooking?.id && ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'].includes(activeBooking.status)) {
          setActiveBooking({
            bookingId: activeBooking.id,
            status: activeBooking.status,
            bookingType: activeBooking.bookingType ?? 'RIDE',
            pickup: { address: activeBooking.pickupAddress, latitude: activeBooking.pickupLatitude, longitude: activeBooking.pickupLongitude },
            dropoff: { address: activeBooking.dropoffAddress, latitude: activeBooking.dropoffLatitude, longitude: activeBooking.dropoffLongitude },
            passenger: { firstName: activeBooking.passenger?.firstName, lastName: activeBooking.passenger?.lastName, phone: activeBooking.passenger?.phone },
            estimatedFare: activeBooking.estimatedFare,
            packageDescription: activeBooking.packageDescription,
            pickupContactName: activeBooking.pickupContactName,
            pickupContactPhone: activeBooking.pickupContactPhone,
            recipientName: activeBooking.recipientName,
            recipientPhone: activeBooking.recipientPhone,
            storeAddress: activeBooking.storeAddress,
            shoppingList: activeBooking.shoppingList,
            itemBudget: activeBooking.itemBudget ? Number(activeBooking.itemBudget) : undefined,
          });
          router.replace('/active-trip');
          return;
        }
      } catch {}

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to show your position on the map.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? 0 };
        lastKnownLocation.current = coords;
        setUserLocation(coords);
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
      } catch {
        // GPS not available
      }

      fetchAvailableBookings();
    })();

    setupSocket();
    // Sync online status from DB
    api.get('/users/profile').then((profile: any) => {
      const dbOnline = profile?.rider?.onlineStatus === 'ONLINE';
      setOnline(dbOnline);
      if (dbOnline) {
        sendLocation();
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
        fetchAvailableBookings();
      }
    }).catch(() => {});
    fetchStats();
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  const fetchStats = useCallback(() => {
    api.get('/riders/earnings').then((data: any) =>
      setSummary({ today: data.today, totalTrips: data.totalTrips, todayTrips: data.todayTrips ?? 0, averageRating: data.averageRating })
    ).catch(() => {});
  }, []);

  // Poll for available bookings every 10s while online with no active trip.
  useEffect(() => {
    if (!isOnline || hasActiveBooking) return;
    fetchAvailableBookings();
    const interval = setInterval(fetchAvailableBookings, 10000);
    return () => clearInterval(interval);
  }, [isOnline, hasActiveBooking, fetchAvailableBookings]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline && !hasActiveBooking) fetchAvailableBookings();
      fetchStats();
      api.get('/users/profile').then((profile: any) => {
        if (profile) useAuthStore.setState({ user: profile });
      }).catch(() => {});
      // Check for unread loyalty reward notifications (show once, mark read immediately)
      api.get('/notifications').then(async (res: any) => {
        const notifs = res?.data ?? (Array.isArray(res) ? res : []);
        const reward = notifs.find((n: any) => n.type === 'PROMO_ALERT' && !n.read);
        if (reward) {
          await api.patch(`/notifications/${reward.id}/read`).catch(() => {});
          Alert.alert('Loyalty Reward!', reward.body, [{ text: 'OK' }]);
        }
      }).catch(() => {});
    }, [isOnline, hasActiveBooking, fetchAvailableBookings, fetchStats])
  );

  const setupSocket = async () => {
    const socket = await connectSocket();
    socket.on(SocketEvent.BOOKING_REQUEST, (data: any) => {
      addBookingRequest(data);
    });
    socket.on('booking:taken', (data: any) => {
      removeBookingRequest(data.bookingId);
    });
    socket.on('passenger:booking:cancel', (data: any) => {
      removeBookingRequest(data.bookingId);
      if (activeBooking?.bookingId === data.bookingId) {
        setActiveBooking(null);
        Alert.alert('Booking Cancelled', 'The passenger has cancelled this booking.');
      }
    });
    socket.on(SocketEvent.BOOKING_STATUS_UPDATE, (data: any) => {
      if (data.status === 'CANCELLED') {
        removeBookingRequest(data.bookingId);
        if (activeBooking?.bookingId === data.bookingId) {
          setActiveBooking(null);
          Alert.alert('Booking Cancelled', 'The passenger has cancelled this booking.');
        }
      }
    });
  };

  const toggleOnline = useCallback(async (value: boolean) => {
    if (value) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Enable location permission to go online.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isInMindoro(loc.coords.latitude, loc.coords.longitude)) {
          Alert.alert('Outside Service Area', 'TamarrawGo is only available in Mindoro. You cannot go online outside the island.');
          return;
        }
      } catch {
        Alert.alert('Location Error', 'Unable to verify your location. Please enable GPS and try again.');
        return;
      }
    }
    try {
      await api.post('/riders/status', { status: value ? 'ONLINE' : 'OFFLINE' });
      setOnline(value);

      if (value) {
        sendLocation();
        locationInterval.current = setInterval(sendLocation, LOCATION_INTERVAL);
        fetchAvailableBookings();
      } else {
        if (locationInterval.current) clearInterval(locationInterval.current);
        clearBookingRequests();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update status');
    }
  }, []);

  const sendLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? 0 };
      lastKnownLocation.current = coords;
      setUserLocation(coords);
      await api.post('/riders/location', { ...coords, speed: loc.coords.speed ?? 0 });
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.status === 401) {
        if (locationInterval.current) { clearInterval(locationInterval.current); locationInterval.current = null; }
        return;
      }
      if (lastKnownLocation.current) {
        await api.post('/riders/location', { ...lastKnownLocation.current, heading: 0, speed: 0 }).catch(() => {});
      }
    }
  };

  const acceptBooking = async (bookingId: string) => {
    const req = useRiderStore.getState().bookingRequests.find((r) => r.bookingId === bookingId);
    if (!req) return;
    try {
      await api.post(`/bookings/${bookingId}/accept`);
      setActiveBooking({ ...req, status: BookingStatus.ACCEPTED });
      clearBookingRequests();
      router.push('/active-trip');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to accept booking');
      removeBookingRequest(bookingId);
    }
  };

  const rejectBooking = (bookingId: string) => removeBookingRequest(bookingId);

  const renderBookingItem = ({ item }: { item: any }) => {
    const bType: string = item.bookingType ?? 'RIDE';
    const isDelivery = bType === 'DELIVERY';
    const isPabili = bType === 'PABILI';
    return (
      <View style={styles.bookingCard}>
        {/* Booking type badge */}
        {(isDelivery || isPabili) && (
          <View style={[styles.typeBadge, isPabili && styles.typeBadgePabili]}>
            <Text style={styles.typeBadgeText}>{isDelivery ? '📦 Delivery Request' : '🛒 Pabili Request'}</Text>
          </View>
        )}
        <View style={styles.bookingInfo}>
          <MaterialIcons name="location-on" size={16} color="#1B6B2F" />
          <Text style={styles.bookingAddr} numberOfLines={1}>{item.pickup?.address}</Text>
        </View>
        <View style={styles.bookingInfo}>
          <MaterialIcons name="place" size={16} color="#333" />
          <Text style={styles.bookingAddr} numberOfLines={1}>{item.dropoff?.address}</Text>
        </View>
        {/* Delivery-specific details */}
        {isDelivery && item.packageDescription && (
          <Text style={styles.bookingDetailText}>📦 {item.packageDescription}</Text>
        )}
        {isDelivery && item.recipientName && (
          <Text style={styles.bookingDetailText}>👤 Recipient: {item.recipientName} · {item.recipientPhone}</Text>
        )}
        {isDelivery && item.notes && (
          <Text style={styles.bookingDetailText}>📝 Note: {item.notes}</Text>
        )}
        {/* Pabili-specific details */}
        {isPabili && item.storeAddress && (
          <Text style={styles.bookingDetailText}>🏪 Store: {item.storeAddress}</Text>
        )}
        {isPabili && item.pickupContactName && (
          <Text style={styles.bookingDetailText}>👤 Store Contact: {item.pickupContactName} · {item.pickupContactPhone}</Text>
        )}
        {isPabili && item.shoppingList && (
          <Text style={styles.bookingDetailText} numberOfLines={2}>🛒 {item.shoppingList}</Text>
        )}
        {isPabili && item.itemBudget && (
          <Text style={styles.bookingDetailText}>💰 Budget: ₱{Number(item.itemBudget).toFixed(2)}</Text>
        )}
        {isPabili && item.recipientName && (
          <Text style={styles.bookingDetailText}>🏠 Deliver to: {item.recipientName} · {item.recipientPhone}</Text>
        )}
        {isPabili && item.notes && (
          <Text style={styles.bookingDetailText}>📝 Note: {item.notes}</Text>
        )}
        {Number(item.discount ?? 0) > 0 && (
          <View style={styles.promoBadge}>
            <MaterialIcons name="local-offer" size={14} color="#E65100" />
            <Text style={styles.promoBadgeText}>🏷 ₱{Number(item.discount).toFixed(0)} Promo Applied · No commission on this trip</Text>
          </View>
        )}
        <View style={styles.bookingMeta}>
          <Text style={styles.bookingFare}>{formatCurrency(item.estimatedFare)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isDelivery && !isPabili && <Text style={styles.bookingDist}>👤 {item.passengerCount ?? 1}</Text>}
            <Text style={styles.bookingDist}>{formatDistance(item.distanceKm)}</Text>
          </View>
        </View>
        <View style={styles.bookingActions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectBooking(item.bookingId)}>
            <Text style={styles.rejectText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptBooking(item.bookingId)}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Return to active booking banner */}
      {hasActiveBooking && (
        <TouchableOpacity
          style={styles.returnBanner}
          onPress={() => router.replace('/active-trip')}
        >
          <MaterialIcons name="electric-rickshaw" size={20} color="#fff" />
          <Text style={styles.returnBannerText}>Active trip in progress — Tap to return</Text>
          <MaterialIcons name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={userLocation
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
          : { latitude: 12.8797, longitude: 121.7740, latitudeDelta: 8, longitudeDelta: 8 }}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You are here" pinColor="#1B6B2F" />
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburgerBtn}>
          <MaterialIcons name="menu" size={26} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.statusLabel}>{isOnline ? 'You are ONLINE' : 'You are OFFLINE'}</Text>
          <Text style={styles.statusSub}>{isOnline ? 'Ready to receive bookings' : 'Toggle to go online'}</Text>
        </View>
        <CustomToggle value={isOnline} onValueChange={toggleOnline} />
      </View>

      {/* Bottom Card — shown only when no booking requests */}
      {bookingRequests.length === 0 && (
        <View style={styles.bottomCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="account-balance-wallet" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>₱{(summary?.today ?? 0).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="route" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>{summary?.todayTrips ?? 0}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={22} color="#1B6B2F" />
              <Text style={styles.statValue}>{(summary?.averageRating ?? 5.0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/earnings')}>
              <MaterialIcons name="account-balance-wallet" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/history')}>
              <MaterialIcons name="history" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/profile')}>
              <MaterialIcons name="person-outline" size={22} color="#1B6B2F" />
              <Text style={styles.navLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Requests List */}
      {bookingRequests.length > 0 && (
        <View style={styles.requestsPanel}>
          <Text style={styles.requestsHeader}>
            {bookingRequests.length} Booking Request{bookingRequests.length > 1 ? 's' : ''}
          </Text>
          <FlatList
            data={bookingRequests}
            keyExtractor={(item) => item.bookingId}
            renderItem={renderBookingItem}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </View>
      )}

      {/* Side Drawer */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.drawerOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                {/* Profile header */}
                <View style={styles.drawerHeader}>
                  {(user as any)?.profilePhoto ? (
                    <Image source={{ uri: (user as any).profilePhoto }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#fff' }} />
                  ) : (
                    <View style={styles.drawerAvatar}>
                      <MaterialIcons name="person" size={32} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.drawerName}>{user?.firstName} {user?.lastName}</Text>
                  <Text style={styles.drawerPhone}>{user?.phone}</Text>
                  <View style={styles.pointsBadge}>
                    <MaterialIcons name="stars" size={14} color="#FFD700" />
                    <Text style={styles.pointsText}>{(user as any)?.loyaltyPoints ?? 0} points</Text>
                  </View>
                </View>

                <ScrollView style={styles.drawerMenu}>
                  {[
                    { icon: 'person-outline', label: 'My Profile', route: '/profile' },
                    { icon: 'history', label: 'Ride History', route: '/history' },
                    { icon: 'account-balance-wallet', label: 'Earnings', route: '/earnings' },
                    { icon: 'report-problem', label: 'Report & Complaints', route: '/complaints' },
                    { icon: 'headset-mic', label: 'Help & Support', route: '/support' },
                  ].map((item) => (
                    <TouchableOpacity key={item.route} style={styles.drawerItem} onPress={() => handleDrawerNav(item.route)}>
                      <MaterialIcons name={item.icon as any} size={22} color="#333" />
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))}

                  <View style={styles.drawerDivider} />

                  {[
                    { icon: 'info-outline', label: 'About', route: '/about' },
                    { icon: 'privacy-tip', label: 'Privacy Policy', route: '/privacy' },
                    { icon: 'description', label: 'Terms & Conditions', route: '/terms' },
                  ].map((item) => (
                    <TouchableOpacity key={item.route} style={styles.drawerItem} onPress={() => handleDrawerNav(item.route)}>
                      <MaterialIcons name={item.icon as any} size={22} color="#333" />
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.drawerLogout} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={22} color="#E53935" />
                  <Text style={styles.drawerLogoutText}>Logout</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  returnBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#145224', paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: 48,
  },
  returnBannerText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    position: 'absolute', top: 56, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  statusLabel: { fontWeight: '700', fontSize: 16, color: '#333' },
  statusSub: { fontSize: 12, color: '#999', marginTop: 2 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontWeight: '800', fontSize: 18, color: '#333' },
  statLabel: { fontSize: 12, color: '#999' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },
  navRow: { flexDirection: 'row', justifyContent: 'space-around' },
  navBtn: { alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 12, color: '#666' },
  requestsPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36,
    maxHeight: '65%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  requestsHeader: {
    fontSize: 16, fontWeight: '800', color: '#1B6B2F', marginBottom: 12, textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#F8FFF9', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0F0E3',
  },
  bookingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bookingAddr: { flex: 1, fontSize: 14, color: '#555' },
  bookingMeta: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  bookingFare: { fontSize: 20, fontWeight: '900', color: '#1B6B2F' },
  bookingDist: { fontSize: 14, color: '#999', alignSelf: 'center' },
  bookingActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#FF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: '#FF4444', fontWeight: '700' },
  acceptBtn: { flex: 2, backgroundColor: '#1B6B2F', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  typeBadgePabili: { backgroundColor: '#E3F2FD' },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: '#1B6B2F' },
  bookingDetailText: { fontSize: 12, color: '#555', marginBottom: 3, marginTop: 1 },
  promoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4,
  },
  promoBadgeText: { fontSize: 11, fontWeight: '600', color: '#E65100', flex: 1 },

  // Drawer
  hamburgerBtn: { padding: 4 },
  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH,
    backgroundColor: '#fff', zIndex: 101,
  },
  drawerHeader: {
    backgroundColor: GREEN, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
  },
  drawerAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  drawerName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  drawerPhone: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pointsText: { fontSize: 12, fontWeight: '700', color: '#FFD700' },
  drawerMenu: { flex: 1, paddingTop: 8 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  drawerItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  drawerDivider: { height: 1, backgroundColor: '#eee', marginHorizontal: 20, marginVertical: 8 },
  drawerLogout: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 18,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  drawerLogoutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },
});
