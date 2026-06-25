import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, StatusBar, KeyboardAvoidingView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

const GREEN = '#1B6B2F';

const REPORT_TYPES = [
  'Driver misconduct',
  'Payment issue',
  'App malfunction',
  'Route / navigation problem',
  'Safety concern',
  'Overcharging',
  'Other',
];

export default function ComplaintsScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (!selectedType) { Alert.alert('Error', 'Please select a report type'); return; }
    if (!details.trim()) { Alert.alert('Error', 'Please describe the issue'); return; }

    const subject = encodeURIComponent(`[Passenger Report] ${selectedType}`);
    const body = encodeURIComponent(`Report Type: ${selectedType}\n\nDetails:\n${details.trim()}`);
    Linking.openURL(`mailto:tamarrawgo@gmail.com?subject=${subject}&body=${body}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Report & Complaints</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>What would you like to report?</Text>
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
            placeholder="Please provide details about your complaint..."
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
            disabled={!selectedType || !details.trim()}
          >
            <MaterialIcons name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>Send via Email</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  content: { padding: 20, paddingBottom: 40 },
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
