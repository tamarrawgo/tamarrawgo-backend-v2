import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const GREEN = '#1B6B2F';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('https://m.me/61590194953679')}>
          <MaterialIcons name="chat" size={24} color={GREEN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Chat with Us</Text>
            <Text style={styles.cardSub}>Message us on Facebook Messenger</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => Linking.openURL('mailto:tamarrawgo@gmail.com')}>
          <MaterialIcons name="mail-outline" size={24} color={GREEN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Email Us</Text>
            <Text style={styles.cardSub}>tamarrawgo@gmail.com</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.card}>
          <MaterialIcons name="access-time" size={24} color={GREEN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Support Hours</Text>
            <Text style={styles.cardSub}>Mon-Sun, 6AM – 10PM</Text>
          </View>
        </View>
        <View style={styles.card}>
          <MaterialIcons name="location-on" size={24} color={GREEN} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Location</Text>
            <Text style={styles.cardSub}>Oriental Mindoro, Philippines</Text>
          </View>
        </View>
      </View>
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
  content: { padding: 24, gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F0FAF2', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E0F0E3',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
});
