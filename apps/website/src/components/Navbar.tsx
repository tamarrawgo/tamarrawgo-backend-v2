import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  function goTo(id: string, e: React.MouseEvent) {
    e.preventDefault();
    setOpen(false);
    if (isHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-md ${isHome ? 'bg-white/80' : 'bg-white shadow-sm'}`}>
      <div className="w-full px-6 lg:px-16">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="TamarrawGo" className="h-12 w-12 rounded-xl" />
            <span className="text-2xl font-black text-[#1B6B2F]">TamarrawGo</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            <Link to="/" className="nav-link text-base font-semibold text-gray-600 hover:text-[#1B6B2F] transition-colors">Home</Link>
            <a href="/#how-it-works" onClick={(e) => goTo('how-it-works', e)} className="nav-link text-base font-semibold text-gray-600 hover:text-[#1B6B2F] transition-colors">How It Works</a>
            <a href="/#explore" onClick={(e) => goTo('explore', e)} className="nav-link text-base font-semibold text-gray-600 hover:text-[#1B6B2F] transition-colors">Explore</a>
            <a href="/#legal" onClick={(e) => goTo('legal', e)} className="nav-link text-base font-semibold text-gray-600 hover:text-[#1B6B2F] transition-colors">Patakaran</a>
            <Link to="/about" className="nav-link text-base font-semibold text-gray-600 hover:text-[#1B6B2F] transition-colors">About</Link>
            <Link to="/login" className="bg-[#1B6B2F] text-white px-7 py-3 rounded-xl font-bold text-base hover:bg-[#145224] transition-colors">
              Login / Upload Docs
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-gray-700">
            <span className="material-icons text-3xl">{open ? 'close' : 'menu'}</span>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-6 space-y-3 border-t border-gray-100 pt-4">
            <Link to="/" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Home</Link>
            <a href="/#how-it-works" onClick={(e) => goTo('how-it-works', e)} className="block px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">How It Works</a>
            <a href="/#explore" onClick={(e) => goTo('explore', e)} className="block px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Explore</a>
            <a href="/#legal" onClick={(e) => goTo('legal', e)} className="block px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Patakaran</a>
            <Link to="/about" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">About</Link>
            <Link to="/login" onClick={() => setOpen(false)} className="block bg-[#1B6B2F] text-white text-center px-4 py-3 rounded-xl font-bold">Login / Upload Docs</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
