import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Welcome to TAMARRAW GO. These Terms and Conditions govern your access to and use of the TAMARRAW GO mobile application, website, and related services. By registering, accessing, or using TAMARRAW GO, you agree to be bound by these Terms and Conditions.
        </Text>
        <Text style={styles.intro}>
          If you do not agree with any part of these Terms, please do not use the platform.
        </Text>

        <Text style={styles.sectionTitle}>1. About TAMARRAW GO</Text>
        <Text style={styles.body}>
          TAMARRAW GO is a technology platform that connects passengers with independent drivers for transportation services. TAMARRAW GO does not own or operate transportation vehicles and is not an employer of drivers. Drivers using the platform operate as independent service providers.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.body}>
          To use TAMARRAW GO, you must:{'\n\n'}
          {'•'} Be at least 18 years old or of legal age under applicable laws{'\n'}
          {'•'} Provide accurate and complete registration information{'\n'}
          {'•'} Maintain the security of your account credentials{'\n'}
          {'•'} Comply with all applicable laws and regulations
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.body}>
          Users are responsible for:{'\n\n'}
          {'•'} Keeping account information accurate and up to date{'\n'}
          {'•'} Maintaining the confidentiality of login credentials{'\n'}
          {'•'} All activities conducted under their account{'\n\n'}
          TAMARRAW GO reserves the right to suspend or terminate accounts that provide false information or violate these Terms.
        </Text>

        <Text style={styles.sectionTitle}>4. Ride Booking Services</Text>
        <Text style={styles.body}>
          Passengers may request transportation services through the platform. By booking a ride, you acknowledge that:{'\n\n'}
          {'•'} Driver availability is not guaranteed{'\n'}
          {'•'} Estimated arrival times may vary due to traffic, weather, or other circumstances{'\n'}
          {'•'} Fare estimates may change based on actual trip conditions
        </Text>

        <Text style={styles.sectionTitle}>5. Driver Responsibilities</Text>
        <Text style={styles.body}>
          Drivers agree to:{'\n\n'}
          {'•'} Maintain valid licenses and required documents{'\n'}
          {'•'} Operate vehicles safely and lawfully{'\n'}
          {'•'} Treat passengers respectfully and professionally{'\n'}
          {'•'} Maintain vehicle cleanliness and roadworthiness{'\n'}
          {'•'} Comply with all transportation and traffic regulations{'\n\n'}
          Failure to comply may result in suspension or permanent removal from the platform.
        </Text>

        <Text style={styles.sectionTitle}>6. Passenger Responsibilities</Text>
        <Text style={styles.body}>
          Passengers agree to:{'\n\n'}
          {'•'} Provide accurate pickup and destination information{'\n'}
          {'•'} Treat drivers respectfully{'\n'}
          {'•'} Follow safety instructions during rides{'\n'}
          {'•'} Avoid damaging vehicles or engaging in unlawful behavior{'\n\n'}
          Passengers may be held responsible for damages caused during a trip.
        </Text>

        <Text style={styles.sectionTitle}>7. Payments and Fees</Text>
        <Text style={styles.body}>
          Users agree that:{'\n\n'}
          {'•'} Applicable fares and fees will be displayed within the app{'\n'}
          {'•'} Additional charges may apply for tolls, parking fees, waiting time, or other approved costs{'\n'}
          {'•'} All payments must be completed using available payment methods offered by the platform{'\n\n'}
          TAMARRAW GO reserves the right to modify fares, fees, and pricing structures at any time.
        </Text>

        <Text style={styles.sectionTitle}>8. Cancellation Policy</Text>
        <Text style={styles.body}>
          Passengers and drivers may cancel rides subject to platform policies. Cancellation fees may apply if:{'\n\n'}
          {'•'} A driver has already been assigned{'\n'}
          {'•'} The driver is en route or has arrived at the pickup location{'\n'}
          {'•'} Repeated cancellations occur without valid reason
        </Text>

        <Text style={styles.sectionTitle}>9. Safety and Conduct</Text>
        <Text style={styles.body}>
          Users must not:{'\n\n'}
          {'•'} Engage in harassment, discrimination, threats, or violence{'\n'}
          {'•'} Carry illegal substances or prohibited items{'\n'}
          {'•'} Commit fraud, impersonation, or deceptive activities{'\n'}
          {'•'} Use the platform for unlawful purposes{'\n\n'}
          TAMARRAW GO may investigate incidents and take appropriate action, including account suspension or termination.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law:{'\n\n'}
          {'•'} TAMARRAW GO acts solely as a technology platform{'\n'}
          {'•'} TAMARRAW GO is not responsible for the conduct of passengers or drivers{'\n'}
          {'•'} TAMARRAW GO shall not be liable for indirect, incidental, special, or consequential damages arising from the use of the platform{'\n\n'}
          Users assume responsibility for risks associated with transportation services arranged through the platform.
        </Text>

        <Text style={styles.sectionTitle}>11. Lost and Found</Text>
        <Text style={styles.body}>
          TAMARRAW GO may assist in facilitating communication regarding lost items. However:{'\n\n'}
          {'•'} Recovery of lost property is not guaranteed{'\n'}
          {'•'} TAMARRAW GO is not responsible for lost, stolen, or damaged personal belongings
        </Text>

        <Text style={styles.sectionTitle}>12. Account Suspension and Termination</Text>
        <Text style={styles.body}>
          TAMARRAW GO may suspend or permanently terminate accounts that:{'\n\n'}
          {'•'} Violate these Terms and Conditions{'\n'}
          {'•'} Provide false or misleading information{'\n'}
          {'•'} Engage in illegal or fraudulent activities{'\n'}
          {'•'} Endanger the safety of other users
        </Text>

        <Text style={styles.sectionTitle}>13. Intellectual Property</Text>
        <Text style={styles.body}>
          All trademarks, logos, designs, software, content, and branding associated with TAMARRAW GO are the property of TAMARRAW GO and may not be copied, reproduced, or used without written permission.
        </Text>

        <Text style={styles.sectionTitle}>14. Privacy</Text>
        <Text style={styles.body}>
          Use of the platform is also governed by the TAMARRAW GO Privacy Policy. By using the platform, you consent to the collection and processing of personal information as described in the Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>15. Modifications to the Service</Text>
        <Text style={styles.body}>
          TAMARRAW GO reserves the right to:{'\n\n'}
          {'•'} Modify platform features{'\n'}
          {'•'} Add or remove services{'\n'}
          {'•'} Update pricing structures{'\n'}
          {'•'} Change these Terms and Conditions at any time{'\n\n'}
          Updated terms will become effective upon publication within the app or website.
        </Text>

        <Text style={styles.sectionTitle}>16. Governing Law</Text>
        <Text style={styles.body}>
          These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Philippines. Any disputes arising from the use of TAMARRAW GO shall be resolved in accordance with applicable Philippine laws.
        </Text>

        <Text style={styles.sectionTitle}>17. Contact Information</Text>
        <Text style={styles.body}>
          For questions, concerns, or support requests, please contact:{'\n\n'}
          TAMARRAW GO Support Team{'\n'}
          Email: tamarrawgo@gmail.com{'\n'}
          Location: Oriental Mindoro, Philippines
        </Text>

        <Text style={styles.footer}>
          By creating an account or using TAMARRAW GO, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.{'\n\n'}
          TAMARRAW GO{'\n'}
          "Proudly Mindoreño. Moving Mindoro Forward."
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
  body: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 8 },
  footer: { textAlign: 'center', fontSize: 13, color: '#999', marginTop: 24, lineHeight: 20 },
});
