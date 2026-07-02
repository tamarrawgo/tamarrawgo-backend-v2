import { useState } from 'react';
import { Link } from 'react-router-dom';

const PLACES = [
  '/images/places/1.jpg',
  '/images/places/2.jpg',
  '/images/places/3.jpg',
  '/images/places/4.jpg',
  '/images/places/5.jpg',
  '/images/places/6.jpg',
  '/images/places/7.jpg',
  '/images/places/8.jpg',
  '/images/places/9.jpg',
  '/images/places/10.jpg',
  '/images/places/11.jpg',
  '/images/places/12.jpg',
  '/images/places/13.jpg',
];

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
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden flex items-center min-h-[60vh] md:min-h-[80vh] lg:min-h-[100vh]">
        <div className="absolute inset-0">
          <img src="/images/hero2background.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 w-full px-8 md:px-16 lg:px-28 py-20 md:py-28 lg:py-36">
          <div className="max-w-2xl">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[8rem] font-black text-[#0D1F13] leading-[0.9] mb-6 md:mb-10 animate-hero-1" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.5)' }}>
              Your Ride,<br />
              <span className="text-[#1B6B2F]">One Tap<br className="hidden sm:block" /> Away</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed mb-8 md:mb-12 max-w-xl animate-hero-2">
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

      {/* Places Gallery */}
      <section id="explore" className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-4">Discover Oriental Mindoro</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Explore stunning destinations — all reachable by tricycle with TamarrawGo</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {PLACES.map((img, i) => (
            <div
              key={img}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              style={{ minHeight: i === 0 ? '360px' : '180px' }}
              onClick={() => setLightbox(img)}
            >
              <img
                src={img}
                alt={`Oriental Mindoro ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ minHeight: i === 0 ? '360px' : '180px' }}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="material-icons text-white text-lg drop-shadow">zoom_in</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox} alt="Oriental Mindoro" className="w-full max-h-[85vh] object-contain bg-black" />
            <button
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              onClick={() => setLightbox(null)}
            >
              <span className="material-icons text-xl">close</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Legal & Community Section */}
      <section id="legal" className="bg-[#F8FAF8] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-4">Mga Patakaran at Alituntunin</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Para sa kaligtasan at kaginhawahan ng bawat isa.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Panel 1: Passenger Terms */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-[#1B6B2F] px-6 py-5">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Para sa Tamarraw Go Passengers</p>
                <h3 className="text-white text-xl font-black">Passenger Terms and Conditions</h3>
                <p className="text-white/60 text-xs mt-1">Mga Tuntunin at Kundisyon para sa mga Pasahero</p>
              </div>
              <div className="px-6 py-5 space-y-3">
                {[
                  { icon: 'shield', text: 'Ligtas at maayos na biyahe ang aming prayoridad.' },
                  { icon: 'check_circle', text: 'Sumunod sa booking details at instructions.' },
                  { icon: 'location_on', text: 'Maging nasa tamang lugar at oras ng pick-up.' },
                  { icon: 'handshake', text: 'Igalang ang driver at ang kanilang sasakyan.' },
                  { icon: 'payments', text: 'Bayaran ang pamasahe ayon sa napagkasunduan.' },
                  { icon: 'warning', text: 'Ang paglabag sa mga patakaran ay maaaring magresulta sa pagkansela ng biyahe o pagbabawal sa paggamit ng serbisyo.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-icons text-sm text-[#1B6B2F]">{item.icon}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-[#F8FAF8] border-t border-gray-100">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Sa pamamagitan ng paggamit ng Tamarraw GO, ikinukumpirma mo na nabasa at sinasang-ayon mo ang mga tuntunin at kundisyong ito.
                </p>
              </div>
            </div>

            {/* Panel 2: Privacy Policy */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-[#1B6B2F] px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-icons text-white text-lg">lock</span>
                  <h3 className="text-white text-xl font-black">Privacy Policy</h3>
                </div>
                <p className="text-white/60 text-xs">Paano kinokolekta at ginagamit ang personal data.</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-black text-[#1B6B2F] uppercase tracking-wide mb-3">Paano Kinokolekta</p>
                    <ul className="space-y-2">
                      {[
                        'Kapag nag-register o gumawa ng account',
                        'Kapag nag-book ng biyahe',
                        'Kapag nakipag-ugnayan sa aming customer support',
                        'Sa pamamagitan ng cookies at teknolohiyang katulad nito',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-icons text-xs text-[#1B6B2F] mt-0.5">fiber_manual_record</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#1B6B2F] uppercase tracking-wide mb-3">Paano Ginagamit</p>
                    <ul className="space-y-2">
                      {[
                        'Upang maproseso ang iyong booking at biyahe',
                        'Upang tiyakin ang kaligtasan at seguridad',
                        'Upang magbigay ng customer support',
                        'Para sa pag-aanalisa at pagpapabuti ng aming serbisyo',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-icons text-xs text-[#1B6B2F] mt-0.5">check</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-[#E8F5E9] rounded-2xl p-4 text-xs text-[#1B6B2F] leading-relaxed">
                  Ang iyong privacy ay mahalaga sa amin. Ginagamit lamang namin ang iyong data para sa pagbibigay ng mas ligtas at mas maayos na serbisyo. <span className="font-bold">Hindi namin ibinibigay sa third parties nang walang pahintulot.</span>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F8FAF8] border-t border-gray-100">
                <p className="text-xs text-gray-400">Hindi kami nagbebenta ng iyong personal data. Para sa iba pang detalye, basahin ang buong <a href="/privacy" className="text-[#1B6B2F] font-semibold hover:underline">Privacy Policy</a>.</p>
              </div>
            </div>

            {/* Panel 3: Data Privacy Consent */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-[#1B6B2F] px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-icons text-white text-lg">assignment_turned_in</span>
                  <h3 className="text-white text-xl font-black">Data Privacy Consent Form</h3>
                </div>
                <p className="text-white/60 text-xs">Pagsunod sa Philippine Data Privacy Act of 2012</p>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  Sa pamamagitan ng pagpapatuloy, ako ay nagbibigay ng pahintulot sa pagkolekta, paggamit, pag-imbak, at pagproseso ng aking personal data alinsunod sa <span className="font-semibold text-[#0D1F13]">Data Privacy Act of 2012 (Republic Act No. 10173)</span>.
                </p>
                <div className="bg-[#F8FAF8] rounded-2xl p-4 mb-4">
                  <p className="text-xs font-black text-[#0D1F13] mb-3">Ako ay sumasang-ayon na ang aking personal data ay:</p>
                  <ul className="space-y-2">
                    {[
                      'Kokolektahin at gagamitin para sa pagproseso ng aking booking at biyahe',
                      'Gagamitin para sa komunikasyon, updates, at customer support',
                      'Ise-secure at poprotektahan alinsunod sa batas',
                      'Hindi ibabahagi sa third parties maliban kung kinakailangan para sa serbisyo o ayon sa batas',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-icons text-sm text-[#1B6B2F] mt-0.5">check_circle</span>
                        <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl">
                  <div className="w-4 h-4 border-2 border-[#1B6B2F] rounded mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Naaunawaan ko ang aking mga karapatan na ilalim ng Data Privacy Act of 2012, at maaari akong humiling ng access, correction, o deletion ng aking data.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#F8FAF8] border-t border-gray-100">
                <p className="text-xs text-gray-400">Maaari mong bawiin ang pahintulot na ito anumang oras sa pamamagitan ng pag-contact sa amin.</p>
              </div>
            </div>

            {/* Panel 4: Community Guidelines */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-[#1B6B2F] px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-icons text-white text-lg">groups</span>
                  <h3 className="text-white text-xl font-black">Community Guidelines</h3>
                </div>
                <p className="text-white/60 text-xs">Mga ipinagbabawal na gawain para sa parehong driver at pasahero.</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-icons text-sm text-[#1B6B2F]">two_wheeler</span>
                      <p className="text-xs font-black text-[#0D1F13] uppercase tracking-wide">Para sa Driver</p>
                    </div>
                    <ul className="space-y-2">
                      {[
                        'Huwag kanselahin ang booking nang walang valid na dahilan.',
                        'Huwag magtanggi ng biyahe matapos tanggapin.',
                        'Huwag maging bastos, nang-insulto, o diskriminatibo.',
                        'Huwag maningil ng sobrang pamasahe.',
                        'Huwag manigarilyo o gumamit ng bawal na substansya sa loob ng sasakyan.',
                        'Huwag lumabag sa trapiko at mga batas.',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-icons text-xs text-red-500 mt-0.5 flex-shrink-0">cancel</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-icons text-sm text-[#1B6B2F]">person</span>
                      <p className="text-xs font-black text-[#0D1F13] uppercase tracking-wide">Para sa Pasahero</p>
                    </div>
                    <ul className="space-y-2">
                      {[
                        'Huwag mag-book kung wala pong balak tumuloy.',
                        'Huwag magpakansela ng biyahe nang paulit-ulit nang walang dahilan.',
                        'Huwag maging bastos, nang-insulto, o diskriminatibo.',
                        'Huwag manigarilyo o gumamit ng bawal na substansya sa loob ng sasakyan.',
                        'Huwag mag-iwan ng kalat o makapinsalang gamit sa sasakyan.',
                        'Huwag lumabag sa mga patakaran at batas.',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-icons text-xs text-red-500 mt-0.5 flex-shrink-0">cancel</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
                <div className="flex items-start gap-2">
                  <span className="material-icons text-amber-500 text-sm mt-0.5 flex-shrink-0">warning</span>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Ang paglabag sa mga patakaran ay maaaring magresulta sa pagkansela ng biyahe, babala, suspensyon, o permanenteng pagbabawal sa paggamit ng serbisyo.
                  </p>
                </div>
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
          <a
            href="https://drive.usercontent.google.com/download?id=1ce8l7fMfgj_zi3coFJ-0PNLcdPIp4Z9t&export=download&authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <span className="material-icons mr-2">smartphone</span>
            Passenger App
          </a>
          <a
            href="https://drive.usercontent.google.com/download?id=1dPZRjK60aEjeKVqUyPqL62fwIJKzVLSZ&export=download&authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            <span className="material-icons mr-2">two_wheeler</span>
            Rider App
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-6">Android 8.0+ required. iOS coming soon.</p>
      </section>
    </>
  );
}
