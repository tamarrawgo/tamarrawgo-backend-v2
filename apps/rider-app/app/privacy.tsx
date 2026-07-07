import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Welcome to TAMARRAW GO. Your privacy is important to us. This Privacy Policy explains how TAMARRAW GO collects, uses, stores, and protects your personal information when you use our mobile application, website, and related services.
        </Text>
        <Text style={styles.intro}>
          By using TAMARRAW GO, you agree to the collection and use of information in accordance with this Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>

        <Text style={styles.subTitle}>Personal Information</Text>
        <Text style={styles.body}>
          When you create an account, we may collect:{'\n\n'}
          {'•'} Full Name{'\n'}
          {'•'} Mobile Number{'\n'}
          {'•'} Email Address{'\n'}
          {'•'} Profile Photo (optional){'\n'}
          {'•'} Date of Birth (if required){'\n'}
          {'•'} Government-issued Identification (for driver verification)
        </Text>

        <Text style={styles.subTitle}>Location Information</Text>
        <Text style={styles.body}>
          To provide transportation services, we collect:{'\n\n'}
          {'•'} Current GPS location{'\n'}
          {'•'} Pickup and drop-off locations{'\n'}
          {'•'} Route and trip information{'\n\n'}
          Location services may continue during active rides to ensure trip accuracy and safety.
        </Text>

        <Text style={styles.subTitle}>Driver Information</Text>
        <Text style={styles.body}>
          For driver accounts, we may collect:{'\n\n'}
          {'•'} Driver's License Information{'\n'}
          {'•'} Vehicle Registration Details{'\n'}
          {'•'} Vehicle Information{'\n'}
          {'•'} Insurance Information (if applicable){'\n'}
          {'•'} Driver Verification Documents
        </Text>

        <Text style={styles.subTitle}>Device Information</Text>
        <Text style={styles.body}>
          We may automatically collect:{'\n\n'}
          {'•'} Device Model{'\n'}
          {'•'} Operating System{'\n'}
          {'•'} IP Address{'\n'}
          {'•'} App Version{'\n'}
          {'•'} Device Identifiers
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use collected information to:{'\n\n'}
          {'•'} Create and manage user accounts{'\n'}
          {'•'} Process ride bookings{'\n'}
          {'•'} Match passengers with drivers{'\n'}
          {'•'} Facilitate payments{'\n'}
          {'•'} Improve app performance{'\n'}
          {'•'} Provide customer support{'\n'}
          {'•'} Enhance safety and security{'\n'}
          {'•'} Detect fraud and unauthorized activities{'\n'}
          {'•'} Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>3. Sharing of Information</Text>
        <Text style={styles.body}>
          TAMARRAW GO does not sell your personal information.
        </Text>

        <Text style={styles.subTitle}>Drivers and Passengers</Text>
        <Text style={styles.body}>
          To facilitate rides, limited information may be shared, including:{'\n\n'}
          {'•'} Name{'\n'}
          {'•'} Profile Photo{'\n'}
          {'•'} Pickup and Drop-off Details{'\n'}
          {'•'} Contact Information (when necessary)
        </Text>

        <Text style={styles.subTitle}>Service Providers</Text>
        <Text style={styles.body}>
          We may share data with trusted third-party providers that help us operate our services, including:{'\n\n'}
          {'•'} Payment processors{'\n'}
          {'•'} Cloud storage providers{'\n'}
          {'•'} Customer support services{'\n'}
          {'•'} Security and fraud prevention providers
        </Text>

        <Text style={styles.subTitle}>Legal Authorities</Text>
        <Text style={styles.body}>
          We may disclose information when required by law or to protect public safety, legal rights, and the integrity of our platform.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.body}>
          We implement reasonable administrative, technical, and physical safeguards to protect your personal information against unauthorized access, disclosure, alteration, or destruction.{'\n\n'}
          However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.body}>
          We retain personal information only for as long as necessary to:{'\n\n'}
          {'•'} Provide our services{'\n'}
          {'•'} Resolve disputes{'\n'}
          {'•'} Enforce agreements{'\n'}
          {'•'} Comply with legal requirements{'\n\n'}
          After the retention period, information may be securely deleted or anonymized.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.body}>
          Subject to applicable laws, you may have the right to:{'\n\n'}
          {'•'} Access your personal information{'\n'}
          {'•'} Correct inaccurate information{'\n'}
          {'•'} Request deletion of your account{'\n'}
          {'•'} Withdraw consent where applicable{'\n'}
          {'•'} Request a copy of your stored data{'\n\n'}
          Requests may be subject to identity verification and legal limitations.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.body}>
          TAMARRAW GO services are intended for individuals who are at least 18 years old or of legal age to enter into agreements under applicable laws. We do not knowingly collect personal information from children without proper consent.
        </Text>

        <Text style={styles.sectionTitle}>8. Cookies and Analytics</Text>
        <Text style={styles.body}>
          Our app and website may use cookies, analytics tools, and similar technologies to:{'\n\n'}
          {'•'} Improve user experience{'\n'}
          {'•'} Analyze platform performance{'\n'}
          {'•'} Monitor service usage{'\n'}
          {'•'} Enhance security{'\n\n'}
          Users may manage certain permissions through their device settings.
        </Text>

        <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
        <Text style={styles.body}>
          TAMARRAW GO may contain links or integrations with third-party services. We are not responsible for the privacy practices of third-party platforms. Users are encouraged to review the privacy policies of those services separately.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Privacy Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. Any changes will become effective upon posting the revised version within the application or website. Continued use of TAMARRAW GO after updates constitutes acceptance of the revised Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>11. Data Privacy Compliance</Text>
        <Text style={styles.body}>
          TAMARRAW GO is committed to protecting user information in accordance with the applicable provisions of the Data Privacy Act of 2012 and other relevant laws and regulations.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.body}>
          For questions, concerns, or privacy-related requests, please contact:{'\n\n'}
          TAMARRAW GO Support Team{'\n'}
          Email: tamarrawgo@gmail.com{'\n'}
          Location: Oriental Mindoro, Philippines
        </Text>

        <Text style={styles.footer}>
          By using TAMARRAW GO, you acknowledge that you have read, understood, and agreed to this Privacy Policy.{'\n\n'}
          TAMARRAW GO{'\n'}
          Proudly Mindoreño. Built for Mindoro.
        </Text>
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
  intro: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 8 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  body: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 8 },
  footer: { textAlign: 'center', fontSize: 13, color: '#999', marginTop: 24, lineHeight: 20 },
});
