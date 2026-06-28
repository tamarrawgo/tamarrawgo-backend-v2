import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) { setError('Please fill in all fields'); return; }
    const stripped = phone.trim().replace(/^(\+63|0)/, '');
    const normalizedPhone = '+63' + stripped;
    setLoading(true);
    setError('');
    try {
      const res: any = await api.post('/auth/login', { phone: normalizedPhone, password });
      localStorage.setItem('tg_token', res.accessToken);
      localStorage.setItem('tg_refresh', res.refreshToken);
      const profile: any = await api.get('/users/profile');
      localStorage.setItem('tg_user', JSON.stringify(profile));
      navigate('/portal');
    } catch (err: any) {
      const msg = Array.isArray(err?.message) ? err.message.join('\n') : (err?.message ?? 'Login failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16 bg-gradient-to-br from-[#E8F5E9] via-white to-[#F1F8E9]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="TamarrawGo" className="h-16 w-16 mx-auto rounded-2xl mb-4" />
          <h1 className="text-2xl font-black text-[#0D1F13]">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Login to upload documents or manage your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="material-icons text-base">error</span>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Phone Number</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1B6B2F] transition-colors">
              <span className="text-sm font-bold text-gray-500 mr-2">+63</span>
              <input
                type="tel"
                placeholder="9XXXXXXXXX"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Password</label>
            <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#1B6B2F] transition-colors">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons text-xl">{showPw ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary justify-center disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Don't have an account? Download the app to register.
          </p>
        </form>
      </div>
    </div>
  );
}
