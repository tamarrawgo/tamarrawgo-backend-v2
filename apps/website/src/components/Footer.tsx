import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#0D1F13] text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/images/logo.png" alt="TamarrawGo" className="h-10 w-10 rounded-xl" />
              <span className="text-2xl font-black text-[#1B6B2F]">TamarrawGo</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Your reliable tricycle ride-hailing platform in Oriental Mindoro.
              Safe, affordable, and convenient transportation at your fingertips.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              <span className="material-icons text-sm align-middle mr-1">email</span>
              tamarrawgo@gmail.com
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Quick Links</h4>
            <div className="space-y-3">
              <Link to="/" className="block text-sm text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/about" className="block text-sm text-gray-300 hover:text-white transition-colors">About Us</Link>
              <Link to="/login" className="block text-sm text-gray-300 hover:text-white transition-colors">Login</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Legal</h4>
            <div className="space-y-3">
              <Link to="/privacy" className="block text-sm text-gray-300 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-gray-300 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} TamarrawGo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
