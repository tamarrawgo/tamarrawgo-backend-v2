import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundImage: 'url(/Images/Login_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-dark/55" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🛺</span>
            </div>
            <span className="text-white text-2xl font-black tracking-tight">TamarrawGo</span>
          </div>
          <p className="text-white/40 text-sm">Admin Control Center</p>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-6xl font-black text-white leading-[1.05] mb-6">
              Manage your<br />
              <span className="text-primary">ride-hailing</span><br />
              platform
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Monitor trips, manage riders, track revenue, and keep your operations running smoothly.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { icon: 'bar_chart', label: 'Real-time Analytics', desc: 'Live revenue and trip monitoring' },
              { icon: 'badge', label: 'Rider Management', desc: 'Approvals, documents, and wallets' },
              { icon: 'support_agent', label: 'Support System', desc: 'Complaints and ticket resolution' },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-icons text-primary text-2xl">{f.icon}</span>
                </div>
                <div>
                  <p className="text-white text-base font-bold">{f.label}</p>
                  <p className="text-white/40 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2026 TamarrawGo. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🛺</span>
            </div>
            <span className="text-dark text-2xl font-black">TamarrawGo</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">Welcome back</h2>
              <p className="text-gray-400 text-sm mt-1">Sign in to your admin account</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                <span className="material-icons text-base flex-shrink-0">error_outline</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-lg">person</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-lg">lock</span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <span className="material-icons text-lg">{showPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-icons text-base">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
