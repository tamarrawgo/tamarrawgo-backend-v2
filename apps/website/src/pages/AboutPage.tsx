export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
      <h1 className="text-3xl md:text-4xl font-black text-[#0D1F13] mb-6">About TamarrawGo</h1>

      <div className="prose max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg">
          TamarrawGo is a tricycle ride-hailing platform built for the communities of Oriental Mindoro, Philippines.
          Named after the Tamaraw — the iconic and endangered buffalo found only in Mindoro — our platform embodies
          the strength, resilience, and local pride of the Mindoro people.
        </p>

        <div className="bg-[#E8F5E9] rounded-3xl p-8 my-8">
          <h2 className="text-2xl font-bold text-[#1B6B2F] mb-4">Our Mission</h2>
          <p className="text-[#0D1F13]">
            To provide safe, affordable, and reliable tricycle transportation to every community in Oriental Mindoro
            through technology, while empowering local riders with better earning opportunities.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-[#0D1F13] mt-12">What We Do</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="material-icons text-[#1B6B2F] mt-0.5">check_circle</span>
            <span>Connect passengers with verified, nearby tricycle riders through our mobile app</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="material-icons text-[#1B6B2F] mt-0.5">check_circle</span>
            <span>Provide real-time GPS tracking for safe and transparent rides</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="material-icons text-[#1B6B2F] mt-0.5">check_circle</span>
            <span>Offer fair and transparent pricing based on distance</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="material-icons text-[#1B6B2F] mt-0.5">check_circle</span>
            <span>Empower riders with tools to manage earnings, track performance, and grow their income</span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-[#0D1F13] mt-12">Contact Us</h2>
        <p>
          Have questions or feedback? We'd love to hear from you.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 w-fit">
            <span className="material-icons text-[#1B6B2F]">email</span>
            <a href="mailto:tamarrawgo@gmail.com" className="text-[#1B6B2F] font-bold hover:underline">tamarrawgo@gmail.com</a>
          </div>
          <a href="https://m.me/61590194953679" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#E8F5E9] rounded-xl p-4 w-fit hover:bg-[#C8E6C9] transition-colors">
            <span className="material-icons text-[#1B6B2F]">chat</span>
            <span className="text-[#1B6B2F] font-bold">Chat with us on Messenger</span>
          </a>
        </div>
      </div>
    </div>
  );
}
