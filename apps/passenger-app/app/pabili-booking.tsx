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

export default function PabiliBookingScreen() {
  const router = useRouter();
  const { setActiveBooking } = useBookingStore();

  const [storeAddress, setStoreAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [shoppingList, setShoppingList] = useState('');
  const [itemBudget, setItemBudget] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!storeAddress.trim()) { Alert.alert('Required', 'Please enter the store address.'); return; }
    if (!deliveryAddress.trim()) { Alert.alert('Required', 'Please enter your delivery address.'); return; }
    if (!shoppingList.trim()) { Alert.alert('Required', 'Please enter the shopping list.'); return; }
    const budget = parseFloat(itemBudget);
    if (!itemBudget || isNaN(budget) || budget <= 0) { Alert.alert('Required', 'Please enter a valid item budget.'); return; }

    setLoading(true);
    try {
      const booking = await api.post('/bookings', {
        pickup: { address: storeAddress, latitude: 0, longitude: 0 },
        dropoff: { address: deliveryAddress, latitude: 0, longitude: 0 },
        paymentMethod: 'CASH',
        bookingType: 'PABILI',
        storeAddress: storeAddress.trim(),
        shoppingList: shoppingList.trim(),
        itemBudget: budget,
      });
      setActiveBooking(booking as any);
      router.replace('/searching');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Failed to book');
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
        <Text style={styles.headerTitle}>🛒 Pabili</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Store / Market Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Where should the rider buy from?"
          value={storeAddress}
          onChangeText={setStoreAddress}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.sectionTitle}>Your Delivery Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Where should items be delivered?"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.sectionTitle}>Shopping List</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={"e.g.\n- 1 kilo rice\n- 2 cans sardines\n- 1 bottle cooking oil"}
          value={shoppingList}
          onChangeText={setShoppingList}
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={5}
        />

        <Text style={styles.sectionTitle}>Item Budget (₱)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={itemBudget}
          onChangeText={setItemBudget}
          placeholderTextColor="#aaa"
          keyboardType="decimal-pad"
        />

        <View style={styles.noteBox}>
          <MaterialIcons name="info-outline" size={16} color="#555" />
          <Text style={styles.noteText}>
            The rider will use their own money to buy items and collect payment from you upon delivery. Small items only.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.bookBtnText}>Book Pabili</Text>}
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12, marginTop: 20,
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
