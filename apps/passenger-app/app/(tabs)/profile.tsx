import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Image, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  const [uploadingId, setUploadingId] = useState(false);

  const hasSelfie = !!(user as any)?.profilePhoto;
  const hasValidId = !!(user as any)?.validIdUrl;
  const verifyStatus: string = (user as any)?.verificationStatus ?? 'UNVERIFIED';

  const refreshProfile = async () => {
    const profile: any = await api.get('/users/profile');
    if (profile) useAuthStore.setState({ user: profile });
  };

  const handleSelfieCapture = async (uri: string, base64: string) => {
    setCameraOpen(false);
    setUploading(true);
    try {
      await api.post('/users/upload-photo', { base64, fileName: 'selfie.jpg' });
      await refreshProfile();
      Alert.alert('Success', 'Profile photo updated!');
    } catch (e: any) {
      const msg = e?.message ?? 'Could not upload photo';
      const isFaceError = msg.toLowerCase().includes('face');
      Alert.alert(
        isFaceError ? 'No Face Detected' : 'Upload Failed',
        msg,
        isFaceError ? [{ text: 'Retake', onPress: () => setCameraOpen(true) }, { text: 'Cancel', style: 'cancel' }] : undefined,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleValidIdUpload = async () => {
    Alert.alert('Upload Valid ID', 'Choose how to upload your valid ID', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
          const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
          if (!result.canceled && result.assets[0].base64) {
            await submitValidId(result.assets[0].base64, 'valid-id.jpg');
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access is required.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
          if (!result.canceled && result.assets[0].base64) {
            const ext = result.assets[0].uri.split('.').pop() ?? 'jpg';
            await submitValidId(result.assets[0].base64, `valid-id.${ext}`);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitValidId = async (base64: string, fileName: string) => {
    setUploadingId(true);
    try {
      await api.post('/users/upload-valid-id', { base64, fileName });
      await refreshProfile();
      Alert.alert('Success', 'Valid ID uploaded successfully!');
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'Could not upload ID. Please try again.');
    } finally {
      setUploadingId(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setCameraOpen(true)} style={{ position: 'relative' }}>
            {hasSelfie ? (
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
          {verifyStatus === 'VERIFIED' && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={14} color="#1B6B2F" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>

        {/* Verification Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Verification</Text>
          {verifyStatus === 'VERIFIED' ? (
            <View style={[styles.verifyBanner, styles.verifyBannerGreen]}>
              <MaterialIcons name="verified" size={16} color="#1B6B2F" />
              <Text style={[styles.verifyBannerText, styles.verifyBannerTextGreen]}>Account Verified — You can book rides!</Text>
            </View>
          ) : verifyStatus === 'PENDING' ? (
            <View style={[styles.verifyBanner, styles.verifyBannerBlue]}>
              <MaterialIcons name="hourglass-empty" size={16} color="#1D4ED8" />
              <Text style={[styles.verifyBannerText, styles.verifyBannerTextBlue]}>Documents submitted — Under admin review</Text>
            </View>
          ) : verifyStatus === 'REJECTED' ? (
            <View style={[styles.verifyBanner, styles.verifyBannerRed]}>
              <MaterialIcons name="cancel" size={16} color="#DC2626" />
              <Text style={[styles.verifyBannerText, styles.verifyBannerTextRed]}>Verification rejected — Please re-upload clear photos</Text>
            </View>
          ) : (
            <View style={styles.verifyBanner}>
              <MaterialIcons name="info" size={16} color="#B45309" />
              <Text style={styles.verifyBannerText}>Complete verification to start booking</Text>
            </View>
          )}

          {/* Selfie row */}
          <View style={styles.verifyRow}>
            <View style={styles.verifyIcon}>
              <MaterialIcons name="face" size={20} color={hasSelfie ? GREEN : '#999'} />
            </View>
            <View style={styles.verifyInfo}>
              <Text style={styles.verifyLabel}>Selfie Photo</Text>
              <Text style={styles.verifyStatus}>{hasSelfie ? 'Uploaded ✓' : 'Not uploaded'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.verifyBtn, hasSelfie && styles.verifyBtnDone]}
              onPress={() => setCameraOpen(true)}
              disabled={uploading}
            >
              <Text style={[styles.verifyBtnText, hasSelfie && styles.verifyBtnTextDone]}>
                {uploading ? 'Uploading...' : hasSelfie ? 'Retake' : 'Take Selfie'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Valid ID row */}
          <View style={styles.verifyRow}>
            <View style={styles.verifyIcon}>
              <MaterialIcons name="badge" size={20} color={hasValidId ? GREEN : '#999'} />
            </View>
            <View style={styles.verifyInfo}>
              <Text style={styles.verifyLabel}>Valid ID</Text>
              <Text style={styles.verifyStatus}>{hasValidId ? 'Uploaded ✓' : 'Not uploaded'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.verifyBtn, hasValidId && styles.verifyBtnDone]}
              onPress={handleValidIdUpload}
              disabled={uploadingId}
            >
              <Text style={[styles.verifyBtnText, hasValidId && styles.verifyBtnTextDone]}>
                {uploadingId ? 'Uploading...' : hasValidId ? 'Re-upload' : 'Upload ID'}
              </Text>
            </TouchableOpacity>
          </View>
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

        <View style={{ height: 32 }} />
      </ScrollView>

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
  avatarImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: GREEN },
  cameraIcon: {
    position: 'absolute', bottom: 10, right: -2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  phone: { fontSize: 14, color: '#999' },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 6,
  },
  verifiedBadgeText: { fontSize: 12, color: GREEN, fontWeight: '700' },
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  verifyBannerText: { fontSize: 13, color: '#B45309', fontWeight: '600', flex: 1 },
  verifyBannerGreen: { backgroundColor: '#E8F5E9' },
  verifyBannerTextGreen: { color: '#1B6B2F' },
  verifyBannerBlue: { backgroundColor: '#EFF6FF' },
  verifyBannerTextBlue: { color: '#1D4ED8' },
  verifyBannerRed: { backgroundColor: '#FEF2F2' },
  verifyBannerTextRed: { color: '#DC2626' },
  verifyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  verifyIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  verifyInfo: { flex: 1 },
  verifyLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  verifyStatus: { fontSize: 12, color: '#999', marginTop: 2 },
  verifyBtn: {
    backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  verifyBtnDone: { backgroundColor: GREEN_LIGHT },
  verifyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  verifyBtnTextDone: { color: GREEN },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 4 },
  menu: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
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
    marginHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFF0F0', borderRadius: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
});
