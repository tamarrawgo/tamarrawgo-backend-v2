import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('mailto:tamarrawgo@gmail.com')}>
          <Ionicons name="mail-outline" size={24} color="#FF6B00" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Email Us</Text>
            <Text style={styles.cardSub}>tamarrawgo@gmail.com</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.card}>
          <Ionicons name="call-outline" size={24} color="#FF6B00" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Call Us</Text>
            <Text style={styles.cardSub}>+63 (2) 8888-0000</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.card, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]} onPress={() => Linking.openURL('https://m.me/61590194953679')}>
          <Ionicons name="logo-facebook" size={24} color="#1B6B2F" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Chat with Us</Text>
            <Text style={styles.cardSub}>Message us on Facebook Messenger</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.card}>
          <Ionicons name="time-outline" size={24} color="#FF6B00" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Support Hours</Text>
            <Text style={styles.cardSub}>Mon-Sun, 6AM – 10PM</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { padding: 24, gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFF8F5', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#FFE0CC',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardSub: { fontSize: 13, color: '#999', marginTop: 2 },
});
