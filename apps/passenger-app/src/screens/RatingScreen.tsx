import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../store/booking.store';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const GREEN = '#1B6B2F';

export default function RatingScreen() {
  const router = useRouter();
  const { activeBooking, reset } = useBookingStore();
  const [booking] = useState(() => activeBooking);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!booking || submitted) return;
    setLoading(true);
    try {
      await api.post(`/bookings/${booking.id}/rate`, { score, comment });
      setSubmitted(true);
      reset();
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to submit rating';
      if (msg.includes('Already rated')) {
        reset();
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    reset();
    router.replace('/(tabs)/home');
  };

  if (!booking) {
    reset();
    router.replace('/(tabs)/home');
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Trip Completed!</Text>
        <Text style={styles.fare}>{formatCurrency(Number((booking as any)?.estimatedFare ?? 0))}</Text>

        <Text style={styles.rateLabel}>How was your ride?</Text>

        {/* Stars — fixed width container prevents shaking */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setScore(star)}
              style={styles.starBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="star"
                size={40}
                color={star <= score ? '#F5A623' : '#E0E0E0'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.scoreLabel}>
          {score === 1 ? 'Poor' : score === 2 ? 'Fair' : score === 3 ? 'Good' : score === 4 ? 'Very Good' : 'Excellent!'}
        </Text>

        <TextInput
          style={styles.commentInput}
          placeholder="Leave a comment (optional)"
          placeholderTextColor="#aaa"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Submit Rating</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 4 },
  iconWrap: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 4 },
  fare: { fontSize: 34, fontWeight: '900', color: GREEN, marginBottom: 24 },
  rateLabel: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 16 },
  stars: { flexDirection: 'row', marginBottom: 8 },
  // Fixed width container stops layout shift / shaking
  starBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scoreLabel: { fontSize: 15, fontWeight: '700', color: GREEN, marginBottom: 20 },
  commentInput: {
    width: '100%', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, fontSize: 15, marginBottom: 20, textAlignVertical: 'top',
    color: '#333', minHeight: 80,
  },
  submitBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: '#999', fontSize: 14 },
});
