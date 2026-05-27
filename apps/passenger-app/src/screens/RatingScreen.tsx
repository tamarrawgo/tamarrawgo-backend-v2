import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../store/booking.store';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

export default function RatingScreen() {
  const router = useRouter();
  const { activeBooking, reset } = useBookingStore();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!activeBooking) return;
    setLoading(true);
    try {
      await api.post(`/bookings/${activeBooking.id}/rate`, { score, comment });
      reset();
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    reset();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" style={styles.icon} />
        <Text style={styles.title}>Trip Completed!</Text>
        <Text style={styles.fare}>{formatCurrency(Number(activeBooking?.estimatedFare ?? 0))}</Text>

        <Text style={styles.rateLabel}>How was your ride?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setScore(star)}>
              <Ionicons name={star <= score ? 'star' : 'star-outline'} size={40} color="#FF6B00" />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.commentInput}
          placeholder="Leave a comment (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Rating</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  icon: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 4 },
  fare: { fontSize: 32, fontWeight: '900', color: '#FF6B00', marginBottom: 24 },
  rateLabel: { fontSize: 16, color: '#666', marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  commentInput: {
    width: '100%', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 12, fontSize: 15, marginBottom: 20, textAlignVertical: 'top',
  },
  submitBtn: { backgroundColor: '#FF6B00', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipText: { color: '#999', fontSize: 14 },
});
