import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: 'speed', title: 'Fast Booking', desc: 'Book a tricycle ride in seconds. Get matched with nearby riders instantly.' },
  { icon: 'shield', title: 'Safe & Secure', desc: 'All riders are verified and approved. Real-time trip tracking for your safety.' },
  { icon: 'payments', title: 'Fair Pricing', desc: 'Transparent fare calculation based on distance. No hidden charges.' },
  { icon: 'star', title: 'Rate & Review', desc: 'Rate your rides and help maintain quality service for everyone.' },
];

const STEPS = [
  { num: '1', title: 'Download the App', desc: 'Get the TamarrawGo Passenger or Rider app on your Android device.', icon: 'download' },
  { num: '2', title: 'Create Your Account', desc: 'Register with your phone number. Riders upload documents for verification.', icon: 'person_add' },
  { num: '3', title: 'Book & Ride', desc: 'Set your pickup and destination. A nearby rider will accept your booking.', icon: 'local_taxi' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex items-center bg-no-repeat bg-[#f0f5f0]"
        style={{ backgroundImage: `url('/images/Hero.png')`, backgroundSize: '100% auto', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#f0f5f0]/70 md:bg-[#f0f5f0]/50" />
        <div className="relative z-10 w-full px-5 md:px-10 lg:px-16 py-20 md:py-32 lg:py-44">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[6rem] font-black text-[#0D1F13] leading-none mb-5 md:mb-8 animate-hero-1">
              Your Ride,<br />
              <span className="text-[#1B6B2F]">One Tap Away</span>
            </h1>
            <p className="text-base sm:text-lg md:text-2xl text-gray-700 leading-relaxed mb-8 md:mb-12 max-w-lg animate-hero-2">
              TamarrawGo connects you with reliable tricycle riders in your area.
              Book a ride, track in real-time, and arrive safely at your destination.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-hero-3">
              <a href="#download" className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4">
                <span className="material-icons mr-2">android</span>
                Download App
              </a>
              <Link to="/login" className="btn-outline bg-white/80 backdrop-blur-sm text-base md:text-lg px-6 md:px-8 py-3 md:py-4">
                <span className="material-icons mr-2">upload_file</span>
                Upload Documents
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-4">Why Choose TamarrawGo?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">The most convenient way to get around Oriental Mindoro</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] flex items-center justify-center mb-5">
                <span className="material-icons text-2xl text-[#1B6B2F]">{f.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-[#0D1F13] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#F8FAF8] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Get started in 3 easy steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="w-20 h-20 rounded-full bg-[#1B6B2F] text-white flex items-center justify-center mx-auto mb-6 text-3xl font-black shadow-lg shadow-[#1B6B2F]/30">
                  {s.num}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-2xl text-[#1B6B2F]">{s.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-[#0D1F13] mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Riders CTA */}
      <section className="bg-[#1B6B2F] text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-6">Earn With TamarrawGo</h2>
              <p className="text-white/80 text-lg leading-relaxed mb-8">
                Are you a tricycle rider in Oriental Mindoro? Join TamarrawGo and start earning more.
                Set your own schedule, get more passengers, and grow your income.
              </p>
              <ul className="space-y-4 mb-10">
                {['Flexible schedule — ride when you want', 'Loyalty rewards — earn points per trip', 'Direct earnings — transparent commission'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/90">
                    <span className="material-icons text-[#A5D6A7]">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="btn-white">
                <span className="material-icons mr-2">two_wheeler</span>
                Apply as Rider
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-white/10 flex items-center justify-center">
                <img src="/images/logo.png" alt="TamarrawGo" className="w-48 lg:w-64 rounded-3xl opacity-90" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28 text-center scroll-mt-20">
        <h2 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-4">Download TamarrawGo</h2>
        <p className="text-gray-500 max-w-lg mx-auto mb-10">Available for Android. Get the app and start booking rides today.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/apk/passenger-app-release.apk" download className="btn-primary">
            <span className="material-icons mr-2">smartphone</span>
            Passenger App
          </a>
          <a href="/apk/rider-app-release.apk" download className="btn-outline">
            <span className="material-icons mr-2">two_wheeler</span>
            Rider App
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-6">Android 8.0+ required. iOS coming soon.</p>
      </section>
    </>
  );
}
