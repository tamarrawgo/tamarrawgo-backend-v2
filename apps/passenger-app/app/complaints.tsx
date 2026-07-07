import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, StatusBar, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';

const GREEN = '#1B6B2F';

const REPORT_TYPES = [
  'Driver misconduct',
  'Payment issue',
  'Route / navigation problem',
  'Safety concern',
  'Overcharging',
  'Other',
];

export default function ComplaintsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/bookings/recent-trips')
      .then((res: any) => setTrips(Array.isArray(res) ? res : []))
      .catch(() => setTrips([]))
      .finally(() => setLoadingTrips(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedType) { Alert.alert('Error', 'Please select a report type'); return; }
    if (!details.trim()) { Alert.alert('Error', 'Please describe the issue'); return; }
    setSubmitting(true);
    try {
      await api.post('/support/complaints', {
        userType: 'PASSENGER',
        type: selectedType,
        details: details.trim(),
        reportedUserId: selectedTrip?.rider?.user?.id,
        bookingId: selectedTrip?.id,
      });
      Alert.alert('Submitted', 'Your complaint has been submitted. We will review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Report & Complaints</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.selectLabel}>Select a recent trip to report</Text>

        {loadingTrips ? (
          <ActivityIndicator size="large" color={GREEN} style={{ marginTop: 40 }} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No completed trips yet</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.tripList}>
            {trips.map((trip) => {
              const riderName = `${trip.rider?.user?.firstName ?? ''} ${trip.rider?.user?.lastName ?? ''}`.trim();
              const date = new Date(trip.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <TouchableOpacity key={trip.id} style={styles.tripCard} onPress={() => setSelectedTrip(trip)}>
                  <View style={styles.tripAvatar}>
                    <MaterialIcons name="person" size={24} color={GREEN} />
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripName}>{riderName || 'Unknown Rider'}</Text>
                    <Text style={styles.tripAddr} numberOfLines={1}>{trip.dropoffAddress}</Text>
                    <Text style={styles.tripDate}>{date}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#ccc" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  const riderName = `${selectedTrip.rider?.user?.firstName ?? ''} ${selectedTrip.rider?.user?.lastName ?? ''}`.trim();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedTrip(null)}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Report Driver</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.reportedCard}>
            <View style={styles.reportedAvatar}>
              <MaterialIcons name="person" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.reportedName}>{riderName}</Text>
              <Text style={styles.reportedSub}>{selectedTrip.dropoffAddress}</Text>
            </View>
          </View>

          <Text style={styles.label}>What happened?</Text>
          {REPORT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, selectedType === type && styles.typeBtnSelected]}
              onPress={() => setSelectedType(type)}
            >
              <MaterialIcons
                name={selectedType === type ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={selectedType === type ? GREEN : '#999'}
              />
              <Text style={[styles.typeText, selectedType === type && { color: GREEN, fontWeight: '700' }]}>{type}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.label, { marginTop: 20 }]}>Describe the issue</Text>
          <TextInput
            style={styles.input}
            placeholder="Please provide details..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!selectedType || !details.trim()) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!selectedType || !details.trim() || submitting}
          >
            <MaterialIcons name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Complaint'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  selectLabel: { fontSize: 15, fontWeight: '600', color: '#888', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  tripList: { padding: 16 },
  tripCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  tripAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  tripInfo: { flex: 1 },
  tripName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  tripAddr: { fontSize: 13, color: '#888', marginTop: 2 },
  tripDate: { fontSize: 12, color: '#bbb', marginTop: 2 },
  content: { padding: 20, paddingBottom: 40 },
  reportedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF3F3', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#FFE0E0',
  },
  reportedAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  reportedName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  reportedSub: { fontSize: 13, color: '#888', marginTop: 2 },
  label: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  typeBtnSelected: { backgroundColor: '#F0FAF2', borderRadius: 10 },
  typeText: { fontSize: 14, color: '#555' },
  input: {
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#eee',
    minHeight: 120,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, marginTop: 24,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
