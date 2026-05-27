import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    const normalizedPhone = phone.trim().startsWith('09') ? '+63' + phone.trim().slice(1) : phone.trim();
    setLoading(true);
    try {
      await login(normalizedPhone, password);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Login failed');
      if (msg.toLowerCase().includes('verify')) {
        Alert.alert('Phone Not Verified', msg, [
          { text: 'Verify Now', onPress: () => router.push('/verify-otp') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.logo}>TamarrawGo</Text>
        <Text style={styles.tagline}>Your reliable motorcycle ride</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="+63 Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '800', color: '#FF6B00' },
  tagline: { fontSize: 14, color: '#666', marginTop: 8 },
  form: { paddingHorizontal: 32 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    marginBottom: 16, backgroundColor: '#FAFAFA',
  },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', color: '#666', fontSize: 14 },
  linkBold: { color: '#FF6B00', fontWeight: '700' },
});
