import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CAMERA_SIZE = SCREEN_W * 0.85;
const CIRCLE_SIZE = CAMERA_SIZE * 0.75;

interface Props {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export default function FaceScanCamera({ onCapture, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-alt" size={48} color="#999" />
        <Text style={styles.permissionText}>Camera permission is required for face scan</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
          <Text style={{ color: '#999', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      onCapture(photo.uri);
    } catch (e) {
      console.log('Capture error', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Face Scan</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />
        {/* Circle overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={[styles.circle, ready ? styles.circleDetected : styles.circleWaiting]} />
        </View>
      </View>

      <Text style={styles.instruction}>
        {ready
          ? 'Position your face inside the circle and tap capture'
          : 'Getting camera ready...'}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureBtn, !ready && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={!ready}
        >
          <MaterialIcons name="camera" size={36} color={ready ? '#fff' : '#aaa'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cameraWrap: {
    width: CAMERA_SIZE, height: CAMERA_SIZE, alignSelf: 'center',
    borderRadius: CAMERA_SIZE / 2, overflow: 'hidden', position: 'relative',
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3, backgroundColor: 'transparent',
  },
  circleWaiting: { borderColor: 'rgba(255,255,255,0.4)' },
  circleDetected: { borderColor: '#4CAF50' },
  instruction: {
    textAlign: 'center', color: '#ccc', fontSize: 14,
    marginTop: 20, paddingHorizontal: 40,
  },
  controls: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1B6B2F', alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff',
  },
  captureBtnDisabled: { backgroundColor: '#555', borderColor: '#888' },
  permissionContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  permissionText: { color: '#ccc', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  permissionBtn: { backgroundColor: '#1B6B2F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
