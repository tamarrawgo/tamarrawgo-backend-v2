import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';

const GREEN = '#1B6B2F';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'newpass'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const normalizePhone = (p: string) => {
    const stripped = p.trim().replace(/^(\+63|0)/, '');
    return '+63' + stripped;
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) { Alert.alert('Error', 'Please enter a valid phone number'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { phone: normalizePhone(phone) });
      Alert.alert('OTP Sent', 'Check your phone for the verification code');
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!otp || otp.length < 4) { Alert.alert('Error', 'Please enter the OTP'); return; }
    if (!newPassword || newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { phone: normalizePhone(phone), otp, newPassword });
      Alert.alert('Success', 'Password reset successfully! You can now login.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login' as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'phone' ? router.back() : setStep('phone')}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Reset Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {step === 'phone' && (
          <>
            <Text style={styles.subtitle}>Enter your registered phone number to receive an OTP</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="phone" size={18} color="#999" />
              <Text style={styles.prefix}>+63</Text>
              <TextInput
                style={styles.input}
                placeholder="9XXXXXXXXX"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.subtitle}>Enter the OTP sent to +63{phone}</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock-outline" size={18} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#bbb"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => setStep('newpass')} disabled={!otp}>
              <Text style={styles.btnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'newpass' && (
          <>
            <Text style={styles.subtitle}>Create your new password</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock-outline" size={18} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="New password (min 8 chars)"
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#999" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock" size={18} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { padding: 24 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8F8F8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#eee', marginBottom: 16,
  },
  prefix: { fontSize: 15, color: '#333', fontWeight: '600' },
  input: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 12 },
  btn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
