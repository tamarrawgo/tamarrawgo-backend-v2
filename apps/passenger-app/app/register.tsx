import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { sendPhoneOtp } from '../src/services/firebase';

const GREEN = '#1B6B2F';
const TRICYCLE = require('../assets/tricycle-login.png');

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '',
  });

  const setField = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    const { firstName, lastName, phone, password, confirmPassword } = form;
    if (!firstName || !lastName || !phone || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    const stripped = phone.trim().replace(/^(\+63|0)/, '');
    const normalizedPhone = '+63' + stripped;

    setLoading(true);
    try {
      await api.post('/auth/register/passenger', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone,
        email: form.email.trim() || undefined,
        password,
      });
      // Send OTP via Firebase (free SMS via Google)
      await sendPhoneOtp(normalizedPhone);
      router.replace({ pathname: '/verify-otp', params: { phone: normalizedPhone } });
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
            <Image source={TRICYCLE} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
          <Text style={styles.appSub}>Passenger App</Text>
        </View>

        <Text style={styles.title}>Create Passenger Account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Juan" placeholderTextColor="#bbb"
                value={form.firstName} onChangeText={setField('firstName')} />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Dela Cruz" placeholderTextColor="#bbb"
                value={form.lastName} onChangeText={setField('lastName')} />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone" size={18} color="#999" style={styles.inputIcon} />
            <Text style={styles.prefix}>+63</Text>
            <TextInput style={styles.input} placeholder="9XXXXXXXXX"
              placeholderTextColor="#bbb" keyboardType="phone-pad" maxLength={10}
              value={form.phone} onChangeText={setField('phone')} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (optional)</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="email" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="juan@email.com"
              placeholderTextColor="#bbb" keyboardType="email-address" autoCapitalize="none"
              value={form.email} onChangeText={setField('email')} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Min. 8 characters"
              placeholderTextColor="#bbb" secureTextEntry={!showPassword}
              value={form.password} onChangeText={setField('password')} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Re-enter password"
              placeholderTextColor="#bbb" secureTextEntry={!showConfirm}
              value={form.confirmPassword} onChangeText={setField('confirmPassword')} />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.registerBtnText}>Create Account</Text>}
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
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#E8F5E9', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: GREEN,
  },
  logoImg: { width: 100, height: 100 },
  appName: { fontSize: 26, fontWeight: '900', color: GREEN },
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
  inputIcon: { marginRight: 8 },
  prefix: { fontSize: 15, color: '#333', fontWeight: '600', marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  registerBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20, paddingBottom: 10 },
  loginLinkText: { fontSize: 14, color: '#999' },
  loginLinkBold: { color: GREEN, fontWeight: '700' },
});
