export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
      <h1 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-2">Terms of Service</h1>
      <p className="text-gray-400 text-sm mb-10">Last updated: June 2026</p>

      <div className="prose max-w-none text-gray-600 leading-relaxed space-y-6">
        <h2 className="text-xl font-bold text-[#0D1F13]">1. Acceptance of Terms</h2>
        <p>By using TamarrawGo, you agree to these terms of service. If you do not agree, please do not use the platform.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">2. Services</h2>
        <p>TamarrawGo provides a platform connecting passengers with tricycle riders in Oriental Mindoro. We are a technology platform and do not directly provide transportation services.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">3. User Accounts</h2>
        <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. Rider accounts require document verification and admin approval before activation.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">4. Rider Requirements</h2>
        <p>Riders must possess a valid driver's license, vehicle registration (OR/CR), and undergo verification. Riders must maintain their vehicles in safe operating condition and follow all traffic laws.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">5. Fares & Payments</h2>
        <p>Fares are calculated based on distance and may include surge pricing during peak hours. The platform charges a commission on completed rides. Promo codes are subject to terms and minimum fare requirements.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">6. Cancellation</h2>
        <p>Both passengers and riders may cancel bookings. Excessive cancellations may result in account restrictions.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">7. Safety</h2>
        <p>Users must behave respectfully. Any form of harassment, violence, or dangerous behavior will result in immediate account suspension. Emergency services can be contacted through the SOS feature in the app.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">8. Limitation of Liability</h2>
        <p>TamarrawGo is not liable for incidents during rides, delays, or damages. We provide the platform as-is and make no warranties regarding service availability.</p>

        <h2 className="text-xl font-bold text-[#0D1F13]">9. Contact</h2>
        <p>For questions about these terms, contact <a href="mailto:tamarrawgo@gmail.com" className="text-[#1B6B2F] font-bold hover:underline">tamarrawgo@gmail.com</a>.</p>
      </div>
    </div>
  );
}
