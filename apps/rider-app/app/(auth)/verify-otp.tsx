import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { getPendingDocs, clearPendingDocs } from '../../src/store/pending-docs';
import { api } from '../../src/services/api';
import { confirmPhoneOtp, resendPhoneOtp } from '../../src/services/firebase';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      // Confirm OTP with Firebase — get back a signed ID token proving phone ownership
      const firebaseIdToken = await confirmPhoneOtp(otp);

      // Tell backend to activate the account (verifies token server-side)
      const verifyRes: any = await api.post('/auth/verify-otp', { phone, firebaseIdToken });
      const accessToken = verifyRes?.accessToken;

      if (!accessToken) {
        Alert.alert('Phone Verified!', 'Your account is active. Please log in.',
          [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]);
        return;
      }

      // Upload pending docs
      await SecureStore.setItemAsync('riderAccessToken', accessToken);
      const docs = getPendingDocs();
      const docEntries = Object.entries(docs);

      if (docEntries.length === 0) {
        await SecureStore.deleteItemAsync('riderAccessToken');
        Alert.alert('Phone Verified!', 'Your account is active. Please wait for admin approval.',
          [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]);
        return;
      }

      let uploaded = 0;
      for (const [docType, file] of docEntries as any[]) {
        if (!file?.uri) continue;
        try {
          const base64 = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (!base64) continue;
          await api.post('/riders/upload-file', {
            base64,
            fileName: file.fileName || `${docType}.jpg`,
            docType,
          });
          uploaded++;
        } catch (e: any) {
          console.log('Upload error for', docType, e?.message ?? e);
        }
      }
      clearPendingDocs();
      await SecureStore.deleteItemAsync('riderAccessToken');

      Alert.alert(
        'Phone Verified!',
        `Account active. ${uploaded} of ${docEntries.length} documents uploaded. Please wait for admin approval.`,
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
    if (!phone) return;
    setResending(true);
    try {
      await resendPhoneOtp(phone);
      Alert.alert('Code Sent', `A new verification code has been sent to ${phone}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to resend code. Please try again.');
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
        <Text style={styles.subtitle}>Enter the 6-digit code sent via SMS to{'\n'}<Text style={styles.phone}>{phone}</Text></Text>

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
            {!resending && <Text style={styles.resendBold}>Resend Code</Text>}
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
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1B6B2F',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  appName: { fontSize: 24, fontWeight: '900', color: '#1B6B2F' },
  title: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  phone: { fontWeight: '700', color: '#333' },
  inputGroup: { width: '100%', marginBottom: 24 },
  otpInput: {
    borderWidth: 2, borderColor: '#1B6B2F', borderRadius: 16,
    paddingVertical: 18, fontSize: 32, fontWeight: '800',
    color: '#1B6B2F', letterSpacing: 12,
  },
  verifyBtn: {
    backgroundColor: '#1B6B2F', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', width: '100%',
  },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendLink: { marginTop: 20 },
  resendText: { fontSize: 14, color: '#999', textAlign: 'center' },
  resendBold: { color: '#1B6B2F', fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 24 },
  backText: { fontSize: 14, color: '#999' },
});
