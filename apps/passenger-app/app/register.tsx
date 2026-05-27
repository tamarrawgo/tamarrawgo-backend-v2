import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '',
  });

  const set = (key: keyof typeof form) => (val: string) =>
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

    // Normalize 09XXXXXXXXX → +639XXXXXXXXX
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('09')) {
      normalizedPhone = '+63' + normalizedPhone.slice(1);
    }

    setLoading(true);
    try {
      await api.post('/auth/register/passenger', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone,
        email: form.email.trim() || undefined,
        password,
      });

      Alert.alert(
        'Registration Successful!',
        'Check the backend logs for your OTP, then verify your phone to activate your account.',
        [{ text: 'Enter OTP', onPress: () => router.replace({ pathname: '/verify-otp', params: { phone: normalizedPhone } }) }],
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
        <View style={styles.header}>
          <Text style={styles.logo}>TamarrawGo</Text>
          <Text style={styles.tagline}>Create your passenger account</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput style={styles.input} placeholder="Juan" value={form.firstName} onChangeText={set('firstName')} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput style={styles.input} placeholder="Dela Cruz" value={form.lastName} onChangeText={set('lastName')} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput style={styles.input} placeholder="09XXXXXXXXX" keyboardType="phone-pad"
            value={form.phone} onChangeText={set('phone')} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput style={styles.input} placeholder="juan@email.com" keyboardType="email-address"
            autoCapitalize="none" value={form.email} onChangeText={set('email')} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} placeholder="Min. 8 characters" secureTextEntry
            value={form.password} onChangeText={set('password')} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput style={styles.input} placeholder="Re-enter password" secureTextEntry
            value={form.confirmPassword} onChangeText={set('confirmPassword')} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 28, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 32, fontWeight: '800', color: '#FF6B00' },
  tagline: { fontSize: 14, color: '#666', marginTop: 6 },
  row: { flexDirection: 'row' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    backgroundColor: '#FAFAFA', color: '#333',
  },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', color: '#666', fontSize: 14 },
  linkBold: { color: '#FF6B00', fontWeight: '700' },
});
