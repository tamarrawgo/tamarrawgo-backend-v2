import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';

export default function RiderRegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    licenseNumber: '',
  });

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    const { firstName, lastName, phone, password, licenseNumber } = form;
    if (!firstName || !lastName || !phone || !password || !licenseNumber) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }

    // Normalize phone: convert 09XXXXXXXXX → +639XXXXXXXXX
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('09')) {
      normalizedPhone = '+63' + normalizedPhone.slice(1);
    }

    setLoading(true);
    try {
      const res: any = await api.post('/auth/register/rider', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone,
        email: form.email.trim() || undefined,
        password,
        licenseNumber: licenseNumber.trim(),
      });

      Alert.alert(
        'Registration Submitted!',
        'Check the backend logs for your OTP code, then verify your phone.',
        [{ text: 'Enter OTP', onPress: () => router.replace({ pathname: '/(auth)/verify-otp', params: { phone: normalizedPhone } }) }],
      );
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join('\n') : (err?.message ?? 'Registration failed');
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="bicycle" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
          <Text style={styles.appSub}>Rider Registration</Text>
        </View>

        <Text style={styles.title}>Create Rider Account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Juan" placeholderTextColor="#bbb"
                value={form.firstName} onChangeText={set('firstName')} />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Dela Cruz" placeholderTextColor="#bbb"
                value={form.lastName} onChangeText={set('lastName')} />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="09XXXXXXXXX or +639XXXXXXXXX"
              placeholderTextColor="#bbb" keyboardType="phone-pad"
              value={form.phone} onChangeText={set('phone')} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (optional)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="juan@email.com"
              placeholderTextColor="#bbb" keyboardType="email-address" autoCapitalize="none"
              value={form.email} onChangeText={set('email')} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Min. 8 characters"
              placeholderTextColor="#bbb" secureTextEntry={!showPassword}
              value={form.password} onChangeText={set('password')} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Driver's License Number *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="card-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="N01-12-345678"
              placeholderTextColor="#bbb" autoCapitalize="characters"
              value={form.licenseNumber} onChangeText={set('licenseNumber')} />
          </View>
        </View>

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.registerBtnText}>Register</Text>}
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
  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  appName: { fontSize: 24, fontWeight: '900', color: '#1A1A2E' },
  appSub: { fontSize: 13, color: '#999', marginTop: 2 },
  title: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#999', marginBottom: 24 },
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  registerBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { fontSize: 14, color: '#999' },
  loginLinkBold: { color: '#1A1A2E', fontWeight: '700' },
});
