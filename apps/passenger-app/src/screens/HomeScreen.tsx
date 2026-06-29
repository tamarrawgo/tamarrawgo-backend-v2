import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, SafeAreaView, StatusBar, Image, Platform,
  Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/auth.store';
import { useBookingStore } from '../store/booking.store';
import { usePlacesStore } from '../store/places.store';
import { api } from '../services/api';
import { connectSocket, SocketEvent } from '../services/socket';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

const GREEN = '#1B6B2F';
const GREEN_DARK = '#145224';
const GREEN_LIGHT = '#E8F5E9';

const TRICYCLE_IMG = require('../../assets/tricycle.png');
const DRIVER_IMG   = require('../../assets/tricycle-driver.png');
const SMALL_IMG    = require('../../assets/tricycle-small.png');

const QUICK_DESTINATIONS = [
  { name: 'Calapan City',  latitude: 13.4115, longitude: 121.1803 },
  { name: 'Pinamalayan',   latitude: 13.0000, longitude: 121.4833 },
  { name: 'Baco',          latitude: 13.3567, longitude: 121.0997 },
  { name: 'Roxas',         latitude: 12.5859, longitude: 121.5053 },
  { name: 'Naujan',        latitude: 13.3233, longitude: 121.3022 },
  { name: 'Victoria',      latitude: 13.1708, longitude: 121.2775 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { setActiveBooking, setDropoff, setPickup, setRiderLocation, activeBooking } = useBookingStore();
  const { places: savedPlaces } = usePlacesStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const selfieAlertShown = useRef(false);

  // Refresh profile + unread count when screen gains focus
  useFocusEffect(
    useCallback(() => {
      api.get('/users/profile').then((profile: any) => {
        if (profile) {
          useAuthStore.setState({ user: profile });
          if (!profile.profilePhoto && !selfieAlertShown.current) {
            selfieAlertShown.current = true;
            setTimeout(() => {
              Alert.alert(
                'Complete Your Profile',
                'Take a selfie to start earning loyalty points! Go to Profile → tap your photo.',
                [{ text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile' as any) }, { text: 'Later' }]
              );
            }, 1000);
          }
        }
      }).catch(() => {});
      api.get('/notifications').then((res: any) => {
        const notifs = res?.data ?? (Array.isArray(res) ? res : []);
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
      }).catch(() => {});
    }, [])
  );

  useEffect(() => {
    (async () => {
      try {
        const existing = await api.get('/bookings/active') as any;
        if (existing) {
          setActiveBooking(existing);
          // Route based on booking status
          if (existing.status === 'SEARCHING') {
            router.replace('/searching');
          } else {
            router.replace('/tracking');
          }
          return;
        }
      } catch {}

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const geocode = await api.get(`/maps/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
            .catch(() => ({ address: 'Current Location' })) as any;
          setPickup({ ...coords, address: geocode?.address ?? 'Current Location' });
        }
      } catch {
        setPickup({ latitude: 14.5995, longitude: 120.9842, address: 'Manila, Philippines' });
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    let socketRef: any = null;

    const handleStatusUpdate = (data: any) => {
      const current = useBookingStore.getState().activeBooking as any;
      if (current?.id === data.bookingId) {
        useBookingStore.getState().setActiveBooking({ ...current, status: data.status } as any);
      }
    };
    const handleRiderLocation = (data: any) => {
      setRiderLocation({ latitude: data.latitude, longitude: data.longitude, heading: data.heading });
    };
    const handleBookingAssigned = (data: any) => {
      setActiveBooking(data.booking);
      if (mounted) router.push('/tracking');
    };

    connectSocket().then((socket) => {
      if (!mounted) return;
      socketRef = socket;
      socket.on(SocketEvent.BOOKING_STATUS_UPDATE, handleStatusUpdate);
      socket.on(SocketEvent.RIDER_LOCATION, handleRiderLocation);
      socket.on(SocketEvent.BOOKING_ASSIGNED, handleBookingAssigned);
    });

    return () => {
      mounted = false;
      if (socketRef) {
        socketRef.off(SocketEvent.BOOKING_STATUS_UPDATE, handleStatusUpdate);
        socketRef.off(SocketEvent.RIDER_LOCATION, handleRiderLocation);
        socketRef.off(SocketEvent.BOOKING_ASSIGNED, handleBookingAssigned);
      }
    };
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14 }).start();
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }).start(() => setDrawerOpen(false));
  }, []);

  const handleQuickDestination = useCallback((dest: { name: string; latitude: number; longitude: number; address?: string }) => {
    setDropoff({ address: dest.address ?? dest.name + ', Oriental Mindoro', latitude: dest.latitude, longitude: dest.longitude });
    router.push('/search');
  }, []);

  const handleDrawerNav = useCallback((route: string) => {
    closeDrawer();
    setTimeout(() => router.push(route as any), 250);
  }, []);

  const handleLogout = useCallback(() => {
    closeDrawer();
    setTimeout(() => { logout(); router.replace('/(auth)/login'); }, 250);
  }, []);

  const hasActiveBooking = activeBooking && !['COMPLETED', 'CANCELLED'].includes((activeBooking as any)?.status);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Active booking return banner */}
      {hasActiveBooking && (
        <TouchableOpacity
          style={styles.returnBanner}
          onPress={() => {
            const status = (activeBooking as any)?.status;
            if (status === 'SEARCHING') router.replace('/searching');
            else router.replace('/tracking');
          }}
        >
          <MaterialIcons name="local-taxi" size={20} color="#fff" />
          <Text style={styles.returnBannerText}>You have an active booking — Tap to return</Text>
          <MaterialIcons name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <MaterialIcons name="menu" size={26} color="#333" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Text style={styles.logoTop}>TAMARRAW</Text>
            <Text style={styles.logoGo}>GO</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <MaterialIcons name="notifications-none" size={26} color="#333" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location Pill */}
        <View style={styles.locationRow}>
          <TouchableOpacity style={styles.locationPill}>
            <MaterialIcons name="location-on" size={16} color={GREEN} />
            <Text style={styles.locationText}>Oriental Mindoro</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>Where to?</Text>
            <Text style={styles.heroSub}>
              Book your tricycle{'\n'}in just <Text style={styles.heroHighlight}>one click.</Text>
            </Text>
          </View>
          <Image source={TRICYCLE_IMG} style={styles.tricycleImg} resizeMode="contain" />
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')}>
          <MaterialIcons name="search" size={22} color="#888" />
          <Text style={styles.searchText}>Enter destination</Text>
          <View style={styles.searchCircle}>
            <MaterialIcons name="my-location" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconWrap}>
              <MaterialIcons name="bolt" size={22} color={GREEN} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Fast. Easy. Reliable.</Text>
              <Text style={styles.bannerSub}>Tamarraw GO is here{'\n'}for your everyday ride!</Text>
            </View>
          </View>
          <Image source={DRIVER_IMG} style={styles.driverImg} resizeMode="contain" />
        </View>

        {/* Saved Places */}
        {savedPlaces.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Saved Places</Text>
            <View style={styles.quickGrid}>
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.savedChip}
                  onPress={() => handleQuickDestination({ name: place.label, address: place.address, latitude: place.latitude, longitude: place.longitude })}
                >
                  <MaterialIcons name={place.icon as any} size={14} color={GREEN} />
                  <Text style={styles.savedChipText}>{place.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.quickChipMore} onPress={() => router.push('/saved-places' as any)}>
                <Text style={styles.quickChipMoreText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Quick Destinations */}
        <Text style={styles.sectionTitle}>Quick Destinations</Text>
        <View style={styles.quickGrid}>
          {QUICK_DESTINATIONS.map((dest) => (
            <TouchableOpacity
              key={dest.name}
              style={styles.quickChip}
              onPress={() => handleQuickDestination(dest)}
            >
              <Text style={styles.quickChipText}>{dest.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* BOOK NOW Button */}
      <View style={styles.bookNowWrapper}>
        <TouchableOpacity style={styles.bookNowBtn} onPress={() => router.push('/search')}>
          <Image source={SMALL_IMG} style={styles.bookNowImg} resizeMode="contain" />
          <View style={styles.bookNowText}>
            <Text style={styles.bookNowTitle}>BOOK NOW</Text>
            <Text style={styles.bookNowSub}>Find a tricycle near you</Text>
          </View>
          <View style={styles.bookNowArrow}>
            <MaterialIcons name="arrow-forward" size={22} color={GREEN_DARK} />
          </View>
        </TouchableOpacity>
      </View>
      {/* Side Drawer */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.drawerOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                {/* Profile header */}
                <View style={styles.drawerHeader}>
                  {(user as any)?.profilePhoto ? (
                    <Image source={{ uri: (user as any).profilePhoto }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fff' }} />
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
                    { icon: 'bookmark-border', label: 'Saved Places', route: '/saved-places' },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  returnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#145224', paddingHorizontal: 16, paddingVertical: 14,
  },
  returnBannerText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
    backgroundColor: '#fff',
  },
  menuBtn: { padding: 4 },
  logoWrap: { alignItems: 'center' },
  logoTop: { fontSize: 10, fontWeight: '800', color: '#1A1A1A', letterSpacing: 2 },
  logoGo: { fontSize: 22, fontWeight: '900', color: GREEN, letterSpacing: 2, marginTop: -4 },
  bellBtn: { padding: 4, position: 'relative' },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  locationRow: { alignItems: 'center', paddingVertical: 10, backgroundColor: '#fff', marginBottom: 8 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GREEN_LIGHT, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  locationText: { fontSize: 14, color: GREEN, fontWeight: '700' },

  heroSection: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    marginBottom: 8,
  },
  heroLeft: { flex: 1 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  heroSub: { fontSize: 16, color: '#555', lineHeight: 24 },
  heroHighlight: { color: GREEN, fontWeight: '800' },
  tricycleImg: { width: 150, height: 120 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 50, marginHorizontal: 16,
    paddingHorizontal: 18, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    marginBottom: 8,
  },
  searchText: { flex: 1, fontSize: 16, color: '#aaa' },
  searchCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  bannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  bannerSub: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  driverImg: { width: 100, height: 80 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 20, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  quickChip: {
    borderWidth: 1.5, borderColor: '#DDD', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff',
  },
  quickChipText: { fontSize: 13, color: '#333', fontWeight: '600' },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: GREEN_LIGHT,
  },
  savedChipText: { fontSize: 13, color: GREEN, fontWeight: '700' },
  quickChipMore: {
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: GREEN_LIGHT,
  },
  quickChipMoreText: { fontSize: 13, color: GREEN, fontWeight: '700' },

  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH,
    backgroundColor: '#fff', zIndex: 101,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  drawerHeader: {
    backgroundColor: GREEN, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 20 : 60,
    paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center',
  },
  drawerAvatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)',
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
    borderTopWidth: 1, borderTopColor: '#eee',
    marginBottom: Platform.OS === 'android' ? 16 : 30,
  },
  drawerLogoutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },

  bookNowWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10,
    backgroundColor: '#F5F5F5',
  },
  bookNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GREEN_DARK, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  bookNowImg: { width: 52, height: 42 },
  bookNowText: { flex: 1 },
  bookNowTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bookNowSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  bookNowArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
});
