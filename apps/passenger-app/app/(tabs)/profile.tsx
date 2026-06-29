import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Image, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { api } from '../../src/services/api';
import FaceScanCamera from '../../src/components/FaceScanCamera';

const GREEN = '#1B6B2F';
const GREEN_LIGHT = '#E8F5E9';

const MENU_ITEMS = [
  { icon: 'history' as const,              label: 'Ride History',      route: '/history' },
  { icon: 'notifications' as const,        label: 'Notifications',     route: '/notifications' },
  { icon: 'support-agent' as const,        label: 'Support',           route: '/support' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSelfieCapture = async (uri: string, base64: string) => {
    setCameraOpen(false);
    setUploading(true);
    try {
      await api.post('/users/upload-photo', { base64, fileName: 'selfie.jpg' });
      const profile: any = await api.get('/users/profile');
      if (profile) useAuthStore.setState({ user: profile });
      Alert.alert('Success', 'Profile photo updated!');
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={() => setCameraOpen(true)} style={{ position: 'relative' }}>
          {(user as any)?.profilePhoto ? (
            <Image source={{ uri: (user as any).profilePhoto }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person-outline" size={40} color={GREEN} />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <MaterialIcons name="camera-alt" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>

        {!(user as any)?.profilePhoto && (
          <TouchableOpacity style={styles.selfiePrompt} onPress={() => setCameraOpen(true)}>
            <MaterialIcons name="face" size={18} color={GREEN} />
            <Text style={styles.selfiePromptText}>Take a selfie to earn loyalty points!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={() => router.push(item.route as any)}>
            <View style={styles.menuIcon}>
              <MaterialIcons name={item.icon} size={20} color={GREEN} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={18} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Face Scan Camera */}
      <Modal visible={cameraOpen} animationType="slide">
        <FaceScanCamera
          onCapture={handleSelfieCapture}
          onClose={() => setCameraOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  avatarSection: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 28, marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 12,
    borderWidth: 2, borderColor: GREEN,
  },
  cameraIcon: {
    position: 'absolute', bottom: 10, right: -2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  phone: { fontSize: 14, color: '#999' },
  selfiePrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, backgroundColor: GREEN_LIGHT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  selfiePromptText: { fontSize: 13, fontWeight: '600', color: GREEN },
  menu: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 14,
    backgroundColor: '#FFF0F0', borderRadius: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
});
