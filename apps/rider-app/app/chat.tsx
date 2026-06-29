import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRiderStore } from '../src/store/rider.store';
import { api } from '../src/services/api';
import { sendChatMessage, listenToChat } from '../src/services/firebase';

const GREEN = '#1B6B2F';

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  timestamp: number;
}

export default function RiderChatScreen() {
  const router = useRouter();
  const { activeBooking } = useRiderStore();
  const booking = activeBooking as any;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [riderId, setRiderId] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    api.get('/users/profile').then((p: any) => setRiderId(p?.id ?? '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (!booking?.bookingId) return;
    const unsubscribe = listenToChat(booking.bookingId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsubscribe;
  }, [booking?.bookingId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !booking?.bookingId || !riderId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendChatMessage(booking.bookingId, {
        senderId: riderId,
        senderRole: 'RIDER',
        message: text,
      });
    } finally {
      setSending(false);
    }
  }, [input, booking, riderId, sending]);

  const passengerName = booking?.passenger
    ? `${booking.passenger.firstName ?? ''} ${booking.passenger.lastName ?? ''}`.trim()
    : 'Passenger';

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderRole === 'RIDER';
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={16} color={GREEN} />
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
          <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
            {new Date(item.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{passengerName}</Text>
          <Text style={styles.headerSub}>Passenger</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat" size={48} color="#ddd" />
              <Text style={styles.emptyText}>Send a message to your passenger</Text>
            </View>
          }
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#aaa"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <MaterialIcons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 1 },
  msgList: { padding: 16, gap: 10, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, color: '#333', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#aaa' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'android' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#333', maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
});
