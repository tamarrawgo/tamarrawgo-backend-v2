import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const GREEN = '#1B6B2F';

const GOALS = [
  { title: 'Improve Public Transportation', body: 'Provide passengers with a faster, safer, more convenient, and technology-driven booking experience.' },
  { title: 'Empower Drivers', body: 'Create fair, transparent, and sustainable earning opportunities for accredited transport operators and drivers.' },
  { title: 'Support Local Governments', body: 'Partner with Local Government Units (LGUs), transport associations, and cooperatives to promote organized, efficient, and modern transportation systems.' },
  { title: 'Promote Safety and Security', body: 'Ensure every trip is supported by secure transactions, verified drivers, and transparent booking records to protect both passengers and drivers.' },
  { title: 'Drive Digital Innovation', body: 'Continuously enhance the Tamarraw GO platform by embracing emerging technologies, customer feedback, and industry best practices.' },
  { title: 'Expand Nationwide', body: 'Extend Tamarraw GO services to municipalities, cities, and provinces across the Philippines while maintaining high standards of quality, reliability, and customer satisfaction.' },
  { title: 'Strengthen Local Economies', body: 'Support local transport operators, cooperatives, and small businesses by creating economic opportunities and encouraging community-based partnerships.' },
];

const VALUES = [
  { code: 'T', name: 'Trust', body: 'We earn the confidence of our passengers, drivers, partners, and stakeholders through integrity, honesty, transparency, and accountability.' },
  { code: 'A', name: 'Accessibility', body: 'We make transportation more accessible, convenient, and inclusive for every Filipino through technology.' },
  { code: 'M', name: 'Modernization', body: 'We embrace innovation and digital transformation to improve mobility and public transportation services.' },
  { code: 'A', name: 'Accountability', body: 'We take responsibility for delivering dependable, ethical, and high-quality services in every transaction.' },
  { code: 'R', name: 'Reliability', body: 'We are committed to providing consistent, efficient, and dependable transportation solutions every day.' },
  { code: 'R', name: 'Respect', body: 'We value every passenger, driver, employee, partner, and community by treating everyone with fairness, dignity, and professionalism.' },
  { code: 'A', name: 'Advancement', body: 'We continuously innovate, learn, and improve to create better experiences and long-term value for all stakeholders.' },
  { code: 'W', name: 'We Move Communities Forward', body: 'We believe transportation is more than mobility—it is a bridge to opportunities, economic growth, and stronger communities. Through innovation and collaboration, we are committed to moving the Philippines forward, one ride at a time.' },
];

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
          <Text style={styles.tagline}>Safe. Reliable. Affordable. Proudly Filipino.</Text>
        </View>

        {/* Vision */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vision</Text>
          <Text style={styles.cardText}>
            To become the Philippines' leading homegrown digital mobility platform by delivering safe, reliable, affordable, and innovative transportation solutions that empower communities, uplift transport operators, and connect every Filipino through modern technology.
          </Text>
        </View>

        {/* Mission */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mission</Text>
          <Text style={styles.cardText}>
            Tamarraw GO is committed to transforming local transportation through a secure, reliable, and user-friendly digital platform that connects passengers with legitimate and accredited transport service providers.{'\n\n'}
            We strive to improve everyday mobility, create sustainable livelihood opportunities for drivers, support local government initiatives in transport modernization, and continuously develop innovative solutions that benefit the communities we serve.
          </Text>
        </View>

        {/* Core Goals */}
        <Text style={styles.sectionTitle}>Core Goals</Text>
        {GOALS.map((g, i) => (
          <View key={i} style={styles.goalItem}>
            <Text style={styles.goalNumber}>{i + 1}</Text>
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>{g.title}</Text>
              <Text style={styles.goalBody}>{g.body}</Text>
            </View>
          </View>
        ))}

        {/* Core Values */}
        <Text style={styles.sectionTitle}>Core Values</Text>
        {VALUES.map((v, i) => (
          <View key={i} style={styles.valueItem}>
            <View style={styles.valueBadge}>
              <Text style={styles.valueCode}>{v.code}</Text>
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueName}>{v.name}</Text>
              <Text style={styles.valueBody}>{v.body}</Text>
            </View>
          </View>
        ))}

        {/* Motto */}
        <View style={styles.mottoBox}>
          <Text style={styles.mottoLabel}>Company Motto</Text>
          <Text style={styles.mottoText}>"Isang Pindot, Biyahe Agad."</Text>
        </View>

        {/* Brand Promise */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Brand Promise</Text>
          <Text style={styles.cardText}>
            Tamarraw GO is dedicated to providing every Filipino with a trusted digital transportation platform that prioritizes safety, convenience, transparency, and community empowerment. Every booking reflects our commitment to making local transportation smarter, easier, and more accessible for everyone.
          </Text>
        </View>

        <Text style={styles.copyright}>© 2026 TAMARRAW GO{'\n'}Moving the Philippines Forward, One Ride at a Time.</Text>
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
  content: { padding: 20, paddingBottom: 48 },
  logoSection: { alignItems: 'center', marginBottom: 24 },
  appName: { fontSize: 28, fontWeight: '900', color: GREEN },
  tagline: { fontSize: 13, color: '#888', marginTop: 4, fontStyle: 'italic', textAlign: 'center' },
  card: {
    backgroundColor: '#F8FAF8', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E8F0E8',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: GREEN, marginBottom: 8 },
  cardText: { fontSize: 14, color: '#555', lineHeight: 22 },
  sectionTitle: {
    fontSize: 17, fontWeight: '800', color: '#1A1A1A',
    marginTop: 8, marginBottom: 12, paddingBottom: 6,
    borderBottomWidth: 2, borderBottomColor: GREEN,
  },
  goalItem: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  goalNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN,
    color: '#fff', fontWeight: '800', fontSize: 14,
    textAlign: 'center', lineHeight: 28, flexShrink: 0,
  },
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  goalBody: { fontSize: 13, color: '#666', lineHeight: 20 },
  valueItem: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  valueBadge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8F0E8',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  valueCode: { fontSize: 16, fontWeight: '900', color: GREEN },
  valueContent: { flex: 1 },
  valueName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  valueBody: { fontSize: 13, color: '#666', lineHeight: 20 },
  mottoBox: {
    backgroundColor: GREEN, borderRadius: 14, padding: 20,
    alignItems: 'center', marginVertical: 14,
  },
  mottoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  mottoText: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', fontStyle: 'italic' },
  copyright: { textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 16, lineHeight: 20 },
});
