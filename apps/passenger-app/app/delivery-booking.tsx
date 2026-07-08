import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useBookingStore } from '../src/store/booking.store';

const GREEN = '#1B6B2F';

export default function DeliveryBookingScreen() {
  const router = useRouter();
  const { setActiveBooking } = useBookingStore();

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!pickupAddress.trim()) { Alert.alert('Required', 'Please enter a pickup address.'); return; }
    if (!dropoffAddress.trim()) { Alert.alert('Required', 'Please enter a dropoff address.'); return; }
    if (!recipientName.trim()) { Alert.alert('Required', 'Please enter the recipient name.'); return; }
    if (!recipientPhone.trim()) { Alert.alert('Required', 'Please enter the recipient phone number.'); return; }

    setLoading(true);
    try {
      const booking = await api.post('/bookings', {
        pickup: { address: pickupAddress, latitude: 0, longitude: 0 },
        dropoff: { address: dropoffAddress, latitude: 0, longitude: 0 },
        paymentMethod: 'CASH',
        bookingType: 'DELIVERY',
        packageDescription: packageDescription.trim() || undefined,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
      });
      setActiveBooking(booking as any);
      router.replace('/searching');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to book delivery');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Delivery</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Pickup Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter pickup address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.sectionTitle}>Dropoff Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter dropoff address"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.sectionTitle}>Package Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What are you sending? (optional)"
          value={packageDescription}
          onChangeText={setPackageDescription}
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionTitle}>Recipient Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Recipient name"
          value={recipientName}
          onChangeText={setRecipientName}
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="Recipient phone number"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          placeholderTextColor="#aaa"
          keyboardType="phone-pad"
        />

        <View style={styles.noteBox}>
          <MaterialIcons name="info-outline" size={16} color="#555" />
          <Text style={styles.noteText}>Small items only. Payment is cash on delivery to the rider.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.bookBtnText}>Book Delivery</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 20,
  },
  noteText: { flex: 1, fontSize: 12, color: '#444' },
  footer: {
    padding: 16, paddingBottom: 32, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  bookBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
