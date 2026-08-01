const GOALS = [
  { icon: '👥', title: 'Improve Public Transportation', body: 'Provide passengers with a faster, safer, more convenient, and technology-driven booking experience.' },
  { icon: '🚗', title: 'Empower Drivers', body: 'Create fair, transparent, and sustainable earning opportunities for accredited transport operators and drivers.' },
  { icon: '🏛️', title: 'Support Local Governments', body: 'Partner with LGUs, transport associations, and cooperatives to promote organized, efficient, and modern transportation systems.' },
  { icon: '🛡️', title: 'Promote Safety and Security', body: 'Ensure every trip is supported by secure transactions, verified drivers, and transparent booking records to protect both passengers and drivers.' },
  { icon: '💡', title: 'Drive Digital Innovation', body: 'Continuously enhance the Tamarraw GO platform by embracing emerging technologies, customer feedback, and industry best practices.' },
  { icon: '📍', title: 'Expand Nationwide', body: 'Extend Tamarraw GO services to municipalities, cities, and provinces across the Philippines while maintaining high standards of quality, reliability, and customer satisfaction.' },
  { icon: '🤝', title: 'Strengthen Local Economies', body: 'Support local transport operators, cooperatives, and small businesses by creating economic opportunities and encouraging community-based partnerships.' },
];

const VALUES = [
  { code: 'T', name: 'Trust', body: 'We build confidence through honesty, transparency, and accountability.' },
  { code: 'A', name: 'Accessibility', body: 'We make transportation easier and more convenient for everyone.' },
  { code: 'M', name: 'Modernization', body: 'We embrace technology to improve mobility and public service.' },
  { code: 'A', name: 'Accountability', body: 'We take responsibility for delivering reliable and quality service.' },
  { code: 'R', name: 'Reliability', body: 'We strive to provide dependable transportation solutions every day.' },
  { code: 'R', name: 'Respect', body: 'We value passengers, drivers, partners, and the communities we serve.' },
  { code: 'A', name: 'Advancement', body: 'We continuously innovate and improve for the benefit of all stakeholders.' },
  { code: 'W', name: 'We Move Communities Forward', body: 'We are committed to connecting people, creating opportunities, and helping communities grow through technology.' },
];

export default function AboutPage() {
  return (
    <div className="bg-white">

      {/* ── Hero Banner ── */}
      <div className="relative bg-[#0D3320] overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #1B6B2F 0%, transparent 60%), radial-gradient(circle at 80% 20%, #F5C800 0%, transparent 50%)' }} />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-16 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
              <img src="/images/logo.png" alt="TamarrawGo" className="h-16 w-16 rounded-2xl shadow-lg" />
              <div>
                <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">TAMARRAW <span className="text-[#F5C800]">GO</span></h1>
              </div>
            </div>
            <p className="text-[#F5C800] font-bold text-lg lg:text-xl tracking-widest uppercase mb-4">We Move Communities Forward</p>
            <p className="text-green-200 text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              Safe. Reliable. Affordable. Proudly Filipino. — The homegrown digital mobility platform of Oriental Mindoro.
            </p>
          </div>
          <div className="flex-shrink-0">
            <img src="/images/tamarrawgo.png" alt="TamarrawGo" className="h-48 lg:h-64 object-contain drop-shadow-2xl" />
          </div>
        </div>
      </div>

      {/* ── Vision & Mission ── */}
      <div className="max-w-6xl mx-auto px-6 lg:px-16 py-16">
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Vision */}
          <div className="bg-[#0D3320] rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1B6B2F] rounded-full -translate-y-1/2 translate-x-1/2 opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">👁️</span>
                <h2 className="text-2xl font-black text-[#F5C800] uppercase tracking-wide">Vision</h2>
              </div>
              <p className="text-green-100 leading-relaxed text-sm lg:text-base">
                To become the Philippines' leading homegrown digital mobility platform by delivering safe, reliable, affordable, and innovative transportation solutions that empower communities, uplift transport operators, and connect every Filipino through modern technology.
              </p>
            </div>
          </div>

          {/* Mission */}
          <div className="bg-[#1B6B2F] rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0D3320] rounded-full translate-y-1/2 -translate-x-1/2 opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🎯</span>
                <h2 className="text-2xl font-black text-[#F5C800] uppercase tracking-wide">Mission</h2>
              </div>
              <p className="text-green-100 leading-relaxed text-sm lg:text-base mb-3">
                Tamarraw GO is committed to transforming local transportation through a secure, reliable, and user-friendly digital platform that connects passengers with legitimate and accredited transport service providers.
              </p>
              <p className="text-green-100 leading-relaxed text-sm lg:text-base">
                We strive to improve everyday mobility, create sustainable livelihood opportunities for drivers, support local government initiatives in transport modernization, and continuously develop innovative solutions that benefit the communities we serve.
              </p>
            </div>
          </div>
        </div>

        {/* ── Core Goals ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0D1F13] uppercase tracking-wide mb-2">Core Goals</h2>
            <div className="w-20 h-1 bg-[#F5C800] mx-auto rounded-full" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {GOALS.map((g, i) => (
              <div key={i} className="bg-[#F0FAF2] border border-[#C8E6C9] rounded-2xl p-5 hover:shadow-md hover:border-[#1B6B2F] transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1B6B2F] text-white font-black text-sm flex items-center justify-center group-hover:bg-[#F5C800] group-hover:text-[#0D1F13] transition-colors">
                    {i + 1}
                  </span>
                  <span className="text-2xl">{g.icon}</span>
                </div>
                <p className="font-bold text-[#0D1F13] text-sm mb-2">{g.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Core Values ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#0D1F13] uppercase tracking-wide mb-2">Core Values</h2>
            <div className="w-20 h-1 bg-[#F5C800] mx-auto rounded-full" />
          </div>

          {/* TAMARRAW letter tiles row */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {VALUES.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-[#F5C800] text-[#0D1F13] font-black text-xl lg:text-2xl flex items-center justify-center shadow-md">
                  {v.code}
                </div>
              </div>
            ))}
          </div>

          {/* Values cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#1B6B2F] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-[#0D3320] text-[#F5C800] font-black text-base flex items-center justify-center flex-shrink-0">
                    {v.code}
                  </span>
                  <p className="font-bold text-[#0D1F13] text-sm">{v.name}</p>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Motto Banner ── */}
        <div className="bg-gradient-to-r from-[#0D3320] to-[#1B6B2F] rounded-3xl p-10 text-center mb-10">
          <p className="text-[#F5C800] text-xs font-bold uppercase tracking-widest mb-3">Company Motto</p>
          <p className="text-white text-2xl md:text-3xl font-black italic">"Isang Pindot, Biyahe Agad."</p>
          <p className="text-green-300 text-sm mt-3">One tap. Ride immediately.</p>
        </div>

        {/* ── Brand Promise ── */}
        <div className="border-2 border-[#1B6B2F] rounded-3xl p-8 mb-10">
          <h2 className="text-xl font-black text-[#0D1F13] mb-3 uppercase tracking-wide">Brand Promise</h2>
          <p className="text-gray-600 leading-relaxed">
            Tamarraw GO is dedicated to providing every Filipino with a trusted digital transportation platform that prioritizes safety, convenience, transparency, and community empowerment. Every booking reflects our commitment to making local transportation smarter, easier, and more accessible for everyone.
          </p>
        </div>

        {/* ── Contact ── */}
        <div>
          <h2 className="text-xl font-black text-[#0D1F13] mb-4 uppercase tracking-wide">Contact Us</h2>
          <p className="text-gray-500 mb-5">Have questions or feedback? We'd love to hear from you.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:tamarrawgo@gmail.com"
              className="flex items-center gap-3 bg-[#F0FAF2] border border-[#C8E6C9] rounded-2xl px-6 py-4 hover:border-[#1B6B2F] transition-colors">
              <span className="material-icons text-[#1B6B2F]">email</span>
              <span className="text-[#1B6B2F] font-bold">tamarrawgo@gmail.com</span>
            </a>
            <a href="https://m.me/61590194953679" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#0D3320] rounded-2xl px-6 py-4 hover:bg-[#1B6B2F] transition-colors">
              <span className="material-icons text-[#F5C800]">chat</span>
              <span className="text-white font-bold">Chat with us on Messenger</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
