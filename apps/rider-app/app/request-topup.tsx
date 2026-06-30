import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, ActivityIndicator, SafeAreaView, Platform, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const GREEN = '#1B6B2F';

export default function RequestTopupScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = () => {
    api.get('/riders/topup-requests').then((res: any) => setHistory(Array.isArray(res) ? res : []))
      .catch(() => {}).finally(() => setLoadingHistory(false));
  };

  const pickReceipt = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return;
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (e) { console.log('Pick receipt error:', e); }
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Invalid Amount', 'Please enter a valid topup amount.'); return; }
    if (!receiptUri) { Alert.alert('Receipt Required', 'Please attach a photo of your payment receipt.'); return; }

    setSubmitting(true);
    try {
      const cacheUri = `${FileSystem.cacheDirectory}topup-receipt-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: receiptUri, to: cacheUri });
      const base64 = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
      if (!base64 || base64.length < 100) {
        Alert.alert('Error', 'Could not read the receipt image. Please try again.');
        return;
      }
      await api.post('/riders/topup-request', {
        amount: amt,
        base64,
        fileName: 'receipt.jpg',
        referenceNumber: referenceNumber.trim() || undefined,
      });
      Alert.alert('Submitted!', 'Your topup request has been sent for admin review.');
      setAmount(''); setReferenceNumber(''); setReceiptUri(null);
      loadHistory();
    } catch (e: any) {
      const msg = Array.isArray(e?.message) ? e.message.join(', ') : (e?.message ?? 'Failed to submit request.');
      Alert.alert('Submission Failed', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      PENDING: { bg: '#FFF3E0', color: '#E65100' },
      APPROVED: { bg: '#E8F5E9', color: GREEN },
      REJECTED: { bg: '#FFEBEE', color: '#C62828' },
    };
    const s = map[status] ?? map.PENDING;
    return (
      <View style={{ backgroundColor: s.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ color: s.color, fontSize: 11, fontWeight: '700' }}>{status}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Topup</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Transfer payment to TamarrawGo's official GCash/account, then submit the amount and receipt photo below for admin review.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (₱) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            placeholderTextColor="#bbb"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reference Number (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="GCash/bank reference number"
            placeholderTextColor="#bbb"
            value={referenceNumber}
            onChangeText={setReferenceNumber}
          />
        </View>

        <Text style={styles.label}>Payment Receipt *</Text>
        <View style={[styles.receiptBox, receiptUri && styles.receiptBoxDone]}>
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
          ) : (
            <View style={styles.receiptPlaceholder}>
              <MaterialIcons name="receipt-long" size={32} color={GREEN} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.receiptStatus}>{receiptUri ? 'Receipt attached' : 'No receipt attached'}</Text>
            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => pickReceipt(true)}>
                <MaterialIcons name="camera-alt" size={20} color={GREEN} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => pickReceipt(false)}>
                <MaterialIcons name="photo-library" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>

        <Text style={styles.historyTitle}>Request History</Text>
        {loadingHistory ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 12 }} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No topup requests yet.</Text>
        ) : (
          history.map((req: any) => (
            <View key={req.id} style={styles.historyRow}>
              <Image source={{ uri: req.receiptUrl }} style={styles.historyThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyAmount}>{formatCurrency(Number(req.amount))}</Text>
                <Text style={styles.historyDate}>{new Date(req.createdAt).toLocaleString()}</Text>
                {req.status === 'REJECTED' && req.rejectionReason && (
                  <Text style={styles.rejectReason}>{req.rejectionReason}</Text>
                )}
              </View>
              {statusBadge(req.status)}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 8 },
  inputGroup: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333',
  },
  receiptBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  receiptBoxDone: { borderColor: GREEN, backgroundColor: '#F0FFF4' },
  receiptPlaceholder: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  receiptPreview: { width: 52, height: 52, borderRadius: 10 },
  receiptStatus: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  btnGroup: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  submitBtn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8, minHeight: 50, justifyContent: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  historyTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 20, marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 12 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F0F0F0',
  },
  historyThumb: { width: 40, height: 40, borderRadius: 8 },
  historyAmount: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  historyDate: { fontSize: 11, color: '#999', marginTop: 2 },
  rejectReason: { fontSize: 11, color: '#C62828', marginTop: 2 },
});
