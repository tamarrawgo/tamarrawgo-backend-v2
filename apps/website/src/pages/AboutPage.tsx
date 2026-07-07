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

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">

      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl md:text-5xl font-black text-[#0D1F13] mb-3">TAMARRAW GO</h1>
        <p className="text-[#1B6B2F] font-semibold text-lg italic">Safe. Reliable. Affordable. Proudly Filipino.</p>
      </div>

      {/* Vision */}
      <div className="bg-[#E8F5E9] rounded-3xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-[#1B6B2F] mb-4">Vision</h2>
        <p className="text-[#0D1F13] leading-relaxed">
          To become the Philippines' leading homegrown digital mobility platform by delivering safe, reliable, affordable, and innovative transportation solutions that empower communities, uplift transport operators, and connect every Filipino through modern technology.
        </p>
      </div>

      {/* Mission */}
      <div className="border border-[#C8E6C9] rounded-3xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-[#0D1F13] mb-4">Mission</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Tamarraw GO is committed to transforming local transportation through a secure, reliable, and user-friendly digital platform that connects passengers with legitimate and accredited transport service providers.
        </p>
        <p className="text-gray-600 leading-relaxed">
          We strive to improve everyday mobility, create sustainable livelihood opportunities for drivers, support local government initiatives in transport modernization, and continuously develop innovative solutions that benefit the communities we serve.
        </p>
      </div>

      {/* Core Goals */}
      <h2 className="text-2xl font-bold text-[#0D1F13] mb-6 pb-3 border-b-2 border-[#1B6B2F]">Core Goals</h2>
      <div className="space-y-5 mb-14">
        {GOALS.map((g, i) => (
          <div key={i} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1B6B2F] text-white font-bold text-sm flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-[#0D1F13] mb-1">{g.title}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{g.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Core Values */}
      <h2 className="text-2xl font-bold text-[#0D1F13] mb-6 pb-3 border-b-2 border-[#1B6B2F]">Core Values</h2>
      <div className="space-y-5 mb-14">
        {VALUES.map((v, i) => (
          <div key={i} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#1B6B2F] font-black text-lg flex items-center justify-center">
              {v.code}
            </span>
            <div>
              <p className="font-bold text-[#0D1F13] mb-1">{v.name}</p>
              <p className="text-gray-600 text-sm leading-relaxed">{v.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Motto */}
      <div className="bg-[#1B6B2F] rounded-3xl p-10 text-center mb-8">
        <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-3">Company Motto</p>
        <p className="text-white text-2xl md:text-3xl font-black italic">"Isang Pindot, Biyahe Agad."</p>
      </div>

      {/* Brand Promise */}
      <div className="border border-[#C8E6C9] rounded-3xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-[#0D1F13] mb-4">Brand Promise</h2>
        <p className="text-gray-600 leading-relaxed">
          Tamarraw GO is dedicated to providing every Filipino with a trusted digital transportation platform that prioritizes safety, convenience, transparency, and community empowerment. Every booking reflects our commitment to making local transportation smarter, easier, and more accessible for everyone.
        </p>
      </div>

      {/* Contact */}
      <h2 className="text-2xl font-bold text-[#0D1F13] mb-4">Contact Us</h2>
      <p className="text-gray-600 mb-4">Have questions or feedback? We'd love to hear from you.</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 w-fit">
          <span className="material-icons text-[#1B6B2F]">email</span>
          <a href="mailto:tamarrawgo@gmail.com" className="text-[#1B6B2F] font-bold hover:underline">tamarrawgo@gmail.com</a>
        </div>
        <a href="https://m.me/61590194953679" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#E8F5E9] rounded-xl p-4 w-fit hover:bg-[#C8E6C9] transition-colors">
          <span className="material-icons text-[#1B6B2F]">chat</span>
          <span className="text-[#1B6B2F] font-bold">Chat with us on Messenger</span>
        </a>
      </div>
    </div>
  );
}
