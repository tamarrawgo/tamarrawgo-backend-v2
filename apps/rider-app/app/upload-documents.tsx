import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';

const GREEN = '#1B6B2F';

const DOCUMENT_FIELDS = [
  { key: 'LICENSE',        label: "Driver's License",   icon: 'badge'        as const },
  { key: 'REGISTRATION',   label: 'OR/CR Document',      icon: 'description'  as const },
  { key: 'TRICYCLE_PHOTO', label: 'Photo of Tricycle',   icon: 'local-taxi'   as const },
  { key: 'PROFILE_PHOTO',  label: 'Your Photo (Selfie)', icon: 'person'       as const },
];

export default function UploadDocumentsScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  const launchCamera = async (docKey: string) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.4 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await uploadDoc(docKey, result.assets[0].uri, `${docKey}.jpg`);
      }
    } catch (e) { console.log('Camera error:', e); }
  };

  const launchGallery = async (docKey: string) => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.4 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const ext = result.assets[0].uri.split('.').pop() ?? 'jpg';
        await uploadDoc(docKey, result.assets[0].uri, `${docKey}.${ext}`);
      }
    } catch (e) { console.log('Gallery error:', e); }
  };

  const uploadDoc = async (docKey: string, uri: string, fileName: string) => {
    setUploading(docKey);
    try {
      // Copy file to cache dir first (fixes Android content:// URI issues)
      const cacheUri = `${FileSystem.cacheDirectory}${docKey}-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: cacheUri });
      const base64 = await FileSystem.readAsStringAsync(cacheUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64 || base64.length < 100) {
        Alert.alert('Error', 'Could not read the image. Please try again.');
        return;
      }
      await api.post('/riders/upload-file', { base64, fileName, docType: docKey });
      setDocs((d) => ({ ...d, [docKey]: uri }));
      setUploadedCount((c) => c + 1);
      Alert.alert('Uploaded!', `${DOCUMENT_FIELDS.find(f => f.key === docKey)?.label} uploaded successfully.`);
    } catch (e: any) {
      const msg = Array.isArray(e?.message) ? e.message.join(', ') : (e?.message ?? 'Failed to upload. Please try again.');
      Alert.alert('Upload Failed', String(msg));
    } finally {
      setUploading(null);
    }
  };

  const allUploaded = DOCUMENT_FIELDS.every(f => docs[f.key]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Documents</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Upload clear photos of each document. These will be reviewed by admin before approval.
        </Text>

        <Text style={styles.progress}>{Object.keys(docs).length} / 4 uploaded</Text>

        {DOCUMENT_FIELDS.map((doc) => {
          const uri = docs[doc.key];
          const isUploading = uploading === doc.key;
          return (
            <View key={doc.key} style={[styles.docRow, uri && styles.docRowDone]}>
              {uri ? (
                <Image source={{ uri }} style={styles.preview} />
              ) : (
                <View style={styles.iconWrap}>
                  <MaterialIcons name={doc.icon} size={28} color={GREEN} />
                </View>
              )}
              <View style={styles.docInfo}>
                <Text style={styles.docLabel}>{doc.label}</Text>
                <Text style={[styles.docStatus, { color: uri ? GREEN : '#999' }]}>
                  {uri ? '✓ Uploaded' : 'Not uploaded'}
                </Text>
              </View>
              {isUploading ? (
                <ActivityIndicator color={GREEN} />
              ) : (
                <View style={styles.btnGroup}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => launchCamera(doc.key)}>
                    <MaterialIcons name="camera-alt" size={22} color={GREEN} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => launchGallery(doc.key)}>
                    <MaterialIcons name="photo-library" size={22} color="#555" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {allUploaded && (
          <View style={styles.doneCard}>
            <MaterialIcons name="check-circle" size={32} color={GREEN} />
            <Text style={styles.doneText}>All documents uploaded!</Text>
            <Text style={styles.doneSub}>Please wait for admin approval before going online.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/')}>
          <Text style={styles.skipText}>{allUploaded ? 'Go to Home' : 'Skip for now'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  content: { padding: 20, gap: 12 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  progress: { fontSize: 15, fontWeight: '700', color: GREEN, marginBottom: 4 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  docRowDone: { borderColor: GREEN, backgroundColor: '#F0FFF4' },
  iconWrap: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  preview: { width: 52, height: 52, borderRadius: 10 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  docStatus: { fontSize: 12, marginTop: 2 },
  btnGroup: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  doneCard: {
    backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, marginTop: 8,
  },
  doneText: { fontSize: 16, fontWeight: '800', color: GREEN },
  doneSub: { fontSize: 13, color: '#555', textAlign: 'center' },
  skipBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  skipText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
