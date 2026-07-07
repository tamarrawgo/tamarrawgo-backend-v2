import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const GREEN = '#1B6B2F';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.appName}>TAMARRAW GO</Text>
          <Text style={styles.tagline}>Proudly Mindoreño. Built for Mindoro.</Text>
        </View>

        <Text style={styles.body}>
          TAMARRAW GO is a proudly Mindoreño ride-hailing and transportation platform designed to connect passengers with reliable local drivers across Mindoro.
        </Text>

        <Text style={styles.body}>
          Our mission is to provide a safe, affordable, convenient, and community-driven transportation service while supporting local drivers and promoting economic growth within the region.
        </Text>

        <Text style={styles.body}>
          Whether you need a ride to work, school, the market, the airport, or anywhere within our service areas, TAMARRAW GO aims to make transportation easier with just a few taps on your mobile device.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Vision</Text>
          <Text style={styles.cardText}>
            To become the leading local transportation platform in Mindoro, empowering communities through innovative and accessible mobility solutions.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardText}>
            {'•'} Provide safe and reliable transportation services{'\n'}
            {'•'} Support and create opportunities for local drivers{'\n'}
            {'•'} Deliver affordable and convenient rides for passengers{'\n'}
            {'•'} Promote local pride through a homegrown Mindoreño platform{'\n'}
            {'•'} Continuously improve our technology and customer experience
          </Text>
        </View>

        <Text style={styles.copyright}>TAMARRAW GO{'\n'}Proudly Mindoreño. Moving Mindoro Forward.</Text>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 24 },
  appName: { fontSize: 28, fontWeight: '900', color: GREEN },
  tagline: { fontSize: 14, color: '#888', marginTop: 4, fontStyle: 'italic' },
  body: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 14 },
  card: {
    backgroundColor: '#F8FAF8', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E8F0E8',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#555', lineHeight: 22 },
  copyright: { textAlign: 'center', fontSize: 13, color: '#999', marginTop: 20, lineHeight: 20 },
});
