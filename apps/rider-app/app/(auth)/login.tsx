import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';

export default function RiderLoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter your phone number and password');
      return;
    }
    // Normalize 09XXXXXXXXX → +639XXXXXXXXX
    const normalizedPhone = phone.trim().startsWith('09')
      ? '+63' + phone.trim().slice(1)
      : phone.trim();
    setLoading(true);
    try {
      await login(normalizedPhone, password);
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Login failed');
      if (msg.toLowerCase().includes('verify')) {
        Alert.alert('Phone Not Verified', msg, [
          { text: 'Verify Now', onPress: () => router.push('/(auth)/verify-otp') },
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
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="bicycle" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
          <Text style={styles.appSub}>Rider Portal</Text>
        </View>

        <Text style={styles.title}>Welcome back, Rider!</Text>
        <Text style={styles.subtitle}>Sign in to start accepting bookings</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#bbb"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginBtnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.registerLinkText}>New rider? <Text style={styles.registerLinkBold}>Create an Account</Text></Text>
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
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appName: { fontSize: 28, fontWeight: '900', color: '#1A1A2E' },
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  loginBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 20, paddingBottom: 20 },
  registerLinkText: { fontSize: 14, color: '#999' },
  registerLinkBold: { color: '#1A1A2E', fontWeight: '700' },
});
