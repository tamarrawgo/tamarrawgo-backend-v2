export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
      <h1 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-2">Privacy Policy</h1>
      <p className="text-gray-400 text-sm mb-10">Last updated: June 2026</p>

      <div className="prose max-w-none text-gray-600 leading-relaxed space-y-6">
        <h2 className="text-xl font-bold text-[#0D1F13]">1. Information We Collect</h2>
        <p>We collect information you provide during registration including your name, phone number, email address, and for riders, vehicle details and identification documents. We also collect location data when using the app to facilitate ride bookings.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">2. How We Use Your Information</h2>
        <p>Your information is used to provide ride-hailing services, verify rider identities, calculate fares, process payments, send notifications, and improve our platform. We do not sell your personal information to third parties.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">3. Location Data</h2>
        <p>We collect real-time GPS location during active rides for trip tracking, fare calculation, and safety purposes. Rider location is shared with passengers only during active bookings.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">4. Data Storage & Security</h2>
        <p>Your data is stored securely on cloud servers with encryption. Uploaded documents are stored securely and accessed only by authorized administrators for verification purposes.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">5. Data Retention</h2>
        <p>We retain your account data for as long as your account is active. Trip records are retained for 30 days after completion, then automatically deleted. You may request account deletion at any time.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">6. Contact</h2>
        <p>For privacy concerns, contact us at <a href="mailto:tamarrawgo@gmail.com" className="text-[#1B6B2F] font-bold hover:underline">tamarrawgo@gmail.com</a>.</p>
      </div>
    </div>
  );
}
