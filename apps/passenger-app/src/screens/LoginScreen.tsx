import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { useRouter } from 'expo-router';

const TRICYCLE = require('../../assets/tricycle-login.png');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) { Alert.alert('Error', 'Please enter your phone number and password'); return; }
    const stripped = phone.trim().replace(/^(\+63|0)/, '');
    const normalizedPhone = '+63' + stripped;
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
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Image source={TRICYCLE} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
          <Text style={styles.appSub}>Passenger App</Text>
        </View>

        <Text style={styles.title}>Welcome back, Passenger!</Text>
        <Text style={styles.subtitle}>Book your tricycle ride today</Text>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone" size={18} color="#999" style={styles.inputIcon} />
            <Text style={styles.prefix}>+63</Text>
            <TextInput
              style={styles.input}
              placeholder="9XXXXXXXXX"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              maxLength={10}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#bbb"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginBtnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/forgot-password' as any)} style={{ marginTop: 12 }}>
          <Text style={{ textAlign: 'center', color: '#1B6B2F', fontSize: 14, fontWeight: '600' }}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/register')}>
          <Text style={styles.registerLinkText}>New passenger? <Text style={styles.registerLinkBold}>Create an Account</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 24, paddingTop: 60, flexGrow: 1 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#E8F5E9', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: '#1B6B2F',
  },
  logoImg: { width: 110, height: 110 },
  appName: { fontSize: 28, fontWeight: '900', color: '#1B6B2F' },
  appSub: { fontSize: 14, color: '#999', marginTop: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#999', marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputIcon: { marginRight: 8 },
  prefix: { fontSize: 15, color: '#333', fontWeight: '600', marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  loginBtn: {
    backgroundColor: '#1B6B2F', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 20, paddingBottom: 20 },
  registerLinkText: { fontSize: 14, color: '#999' },
  registerLinkBold: { color: '#1B6B2F', fontWeight: '700' },
});
