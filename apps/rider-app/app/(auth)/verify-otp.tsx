import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { phone, otp });
      Alert.alert(
        'Phone Verified!',
        'Your account is now active. Please wait for admin approval before you can go online.',
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join('\n') : (err?.message ?? 'Verification failed');
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/request-otp', { phone });
      Alert.alert('OTP Sent', 'A new OTP has been sent. Check the backend logs.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>TamarrawGo</Text>
        </View>

        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to{'\n'}<Text style={styles.phone}>{phone}</Text></Text>

        <View style={styles.devNote}>
          <Ionicons name="information-circle-outline" size={16} color="#FF6B00" />
          <Text style={styles.devNoteText}>Check the backend terminal logs for your OTP code</Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#bbb"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            textAlign="center"
          />
        </View>

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.verifyBtnText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>
            {resending ? 'Sending...' : "Didn't receive the code? "}
            {!resending && <Text style={styles.resendBold}>Resend OTP</Text>}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={16} color="#999" />
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, paddingTop: 60, alignItems: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A1A2E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  appName: { fontSize: 24, fontWeight: '900', color: '#1A1A2E' },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  phone: { fontWeight: '700', color: '#333' },
  devNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF5EE', borderRadius: 10, padding: 12,
    marginBottom: 28, width: '100%',
  },
  devNoteText: { fontSize: 13, color: '#FF6B00', flex: 1 },
  inputGroup: { width: '100%', marginBottom: 24 },
  otpInput: {
    borderWidth: 2, borderColor: '#1A1A2E', borderRadius: 16,
    paddingVertical: 18, fontSize: 32, fontWeight: '800',
    color: '#1A1A2E', letterSpacing: 12,
  },
  verifyBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', width: '100%',
  },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendLink: { marginTop: 20 },
  resendText: { fontSize: 14, color: '#999', textAlign: 'center' },
  resendBold: { color: '#1A1A2E', fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 24 },
  backText: { fontSize: 14, color: '#999' },
});
