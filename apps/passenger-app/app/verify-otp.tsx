import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../src/services/api';
import { getPendingSelfie, clearPendingSelfie } from '../src/store/pending-selfie';

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
      const res: any = await api.post('/auth/verify-otp', { phone, otp });
      const accessToken = res?.accessToken;

      // Upload selfie if we have tokens and a selfie
      const selfie = getPendingSelfie();
      if (accessToken && selfie) {
        try {
          await AsyncStorage.setItem('@passenger_access_token', accessToken);
          const base64 = await FileSystem.readAsStringAsync(selfie, { encoding: 'base64' as any });
          await api.post('/users/upload-photo', { base64, fileName: 'selfie.jpg' });
        } catch (e) {
          console.log('Selfie upload error:', e);
        }
        clearPendingSelfie();
        await AsyncStorage.removeItem('@passenger_access_token');
      }

      Alert.alert(
        'Phone Verified!',
        'Your account is now active. You can now sign in.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.message ?? 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/request-otp', { phone });
      Alert.alert('OTP Sent', 'Check the backend terminal logs for the new OTP code.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>TamarrawGo</Text>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to{'\n'}<Text style={styles.phone}>{phone}</Text></Text>

        <View style={styles.devNote}>
          <Text style={styles.devNoteText}>Check the backend terminal logs for your OTP code</Text>
        </View>

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

        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.link}>
            {resending ? 'Sending...' : <>Didn't receive it? <Text style={styles.linkBold}>Resend OTP</Text></>}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={styles.link}>← Go back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  inner: { padding: 32, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: '800', color: '#1B6B2F', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  phone: { fontWeight: '700', color: '#333' },
  devNote: {
    backgroundColor: '#FFF5EE', borderRadius: 10, padding: 12,
    marginBottom: 24, width: '100%',
  },
  devNoteText: { fontSize: 13, color: '#1B6B2F', textAlign: 'center' },
  otpInput: {
    width: '100%', borderWidth: 2, borderColor: '#1B6B2F', borderRadius: 16,
    paddingVertical: 18, fontSize: 32, fontWeight: '800',
    color: '#333', letterSpacing: 12, marginBottom: 24,
  },
  btn: {
    backgroundColor: '#1B6B2F', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', width: '100%', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', color: '#666', fontSize: 14 },
  linkBold: { color: '#1B6B2F', fontWeight: '700' },
});
