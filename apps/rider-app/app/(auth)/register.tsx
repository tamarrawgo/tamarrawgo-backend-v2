import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { setPendingDocs } from '../../src/store/pending-docs';
import { api } from '../../src/services/api';

const GREEN = '#1B6B2F';
const GREEN_DARK = '#145224';
const GREEN_LIGHT = '#E8F5E9';
const TRICYCLE = require('../../assets/tricycle-login.png');

const DOCUMENT_FIELDS = [
  { key: 'LICENSE',       label: "Driver's License",    icon: 'badge'          as const },
  { key: 'REGISTRATION',  label: 'OR/CR Document',       icon: 'description'    as const },
  { key: 'TRICYCLE_PHOTO',label: 'Photo of Tricycle',    icon: 'local-taxi'     as const },
  { key: 'PROFILE_PHOTO', label: 'Your Photo (Selfie)',  icon: 'person'         as const },
];

// Module-level store — survives React component remount when Android kills app for camera
let _savedDocs: Record<string, { uri: string; fileName: string }> = {};

export default function RiderRegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', licenseNumber: '', plateNumber: '', vehicleBrand: '', vehicleModel: '', vehicleColor: '' });
  const [docs, setDocs] = useState<Record<string, { uri: string; fileName: string }>>(_savedDocs);

  const saveDoc = (docKey: string, data: { uri: string; fileName: string }) => {
    _savedDocs = { ..._savedDocs, [docKey]: data };
    setDocs({ ..._savedDocs });
  };

  const setField = (key: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const launchCamera = async (docKey: string) => {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
      const result = await ImagePicker.launchCameraAsync({ quality: 0.3 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        saveDoc(docKey, { uri: result.assets[0].uri, fileName: `${docKey}.jpg` });
      }
    } catch (e) { console.log('Camera error:', e); }
  };

  const launchGallery = async (docKey: string) => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.3 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const ext = result.assets[0].uri.split('.').pop() ?? 'jpg';
        saveDoc(docKey, { uri: result.assets[0].uri, fileName: `${docKey}.${ext}` });
      }
    } catch (e) { console.log('Gallery error:', e); }
  };

  const handleRegister = async () => {
    const { firstName, lastName, phone, password, licenseNumber, plateNumber } = form;
    if (!firstName || !lastName || !phone || !password || !licenseNumber || !plateNumber) {
      Alert.alert('Missing Fields', 'Please fill in all required fields including plate number.'); return;
    }
    if (password.length < 8) { Alert.alert('Weak Password', 'Password must be at least 8 characters.'); return; }

    // Documents are uploaded after login from the profile/documents screen

    const stripped = phone.trim().replace(/^(\+63|0)/, '');
    const normalizedPhone = '+63' + stripped;

    setLoading(true);
    try {
      // Register account — documents will be uploaded after OTP verification
      await api.post('/auth/register/rider', {
        firstName: firstName.trim(), lastName: lastName.trim(),
        phone: normalizedPhone, email: form.email.trim() || undefined,
        password, licenseNumber: licenseNumber.trim(),
        plateNumber: plateNumber.trim(),
        vehicleBrand: form.vehicleBrand.trim() || undefined,
        vehicleModel: form.vehicleModel.trim() || undefined,
        vehicleColor: form.vehicleColor.trim() || undefined,
      });

      // Save docs in memory so verify-otp screen can upload them after OTP
      if (Object.keys(_savedDocs).length > 0) {
        setPendingDocs(_savedDocs);
      }
      _savedDocs = {}; // Clear for next registration

      Alert.alert(
        'Registration Submitted!',
        'Please verify your phone number to complete registration.',
        [{ text: 'Enter OTP', onPress: () => router.replace({ pathname: '/(auth)/verify-otp', params: { phone: normalizedPhone } }) }],
      );
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join('\n') : (err?.message ?? 'Registration failed');
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
      setUploadingDoc(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Image source={TRICYCLE} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
          <Text style={styles.appSub}>Rider Portal</Text>
        </View>

        <Text style={styles.title}>Create Rider Account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        {/* Name */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Juan" placeholderTextColor="#bbb" value={form.firstName} onChangeText={setField('firstName')} />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Dela Cruz" placeholderTextColor="#bbb" value={form.lastName} onChangeText={setField('lastName')} />
            </View>
          </View>
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone" size={18} color="#999" style={styles.inputIcon} />
            <Text style={styles.prefix}>+63</Text>
            <TextInput style={styles.input} placeholder="9XXXXXXXXX" placeholderTextColor="#bbb" keyboardType="phone-pad" maxLength={10} value={form.phone} onChangeText={setField('phone')} />
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (optional)</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="email" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="juan@email.com" placeholderTextColor="#bbb" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={setField('email')} />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Min. 8 characters" placeholderTextColor="#bbb" secureTextEntry={!showPassword} value={form.password} onChangeText={setField('password')} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* License Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Driver's License Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="badge" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="N01-12-345678" placeholderTextColor="#bbb" autoCapitalize="characters" value={form.licenseNumber} onChangeText={setField('licenseNumber')} />
          </View>
        </View>

        {/* Vehicle Info */}
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Plate Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="directions-car" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="ABC 1234" placeholderTextColor="#bbb" autoCapitalize="characters" value={form.plateNumber} onChangeText={setField('plateNumber')} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Brand</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="e.g. Honda" placeholderTextColor="#bbb" value={form.vehicleBrand} onChangeText={setField('vehicleBrand')} />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Model</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="e.g. TMX 155" placeholderTextColor="#bbb" value={form.vehicleModel} onChangeText={setField('vehicleModel')} />
            </View>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="palette" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g. Red, Blue" placeholderTextColor="#bbb" value={form.vehicleColor} onChangeText={setField('vehicleColor')} />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <View style={{ alignItems: 'center', gap: 6 }}>
                <ActivityIndicator color="#fff" />
                {uploadingDoc && <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Uploading {uploadingDoc}...</Text>}
              </View>
            : <Text style={styles.registerBtnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
          <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 24 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: GREEN_LIGHT, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: GREEN },
  logoImg: { width: 80, height: 80 },
  appName: { fontSize: 24, fontWeight: '900', color: GREEN },
  appSub: { fontSize: 13, color: '#999', marginTop: 2 },
  title: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 20 },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  inputIcon: { marginRight: 8 },
  prefix: { fontSize: 15, color: '#333', fontWeight: '600', marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 8, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#999', marginBottom: 16 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14,
    padding: 14, marginBottom: 12, backgroundColor: '#FAFAFA',
  },
  docRowUploaded: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  docBtn: { padding: 8 },
  docIconWrap: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  docPreview: { width: 52, height: 52, borderRadius: 10 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  docStatus: { fontSize: 12, marginTop: 2 },
  registerBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20, minHeight: 56 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20, paddingBottom: 10 },
  loginLinkText: { fontSize: 14, color: '#999' },
  loginLinkBold: { color: GREEN, fontWeight: '700' },
});
