import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/riders', label: 'Riders', icon: '🏍️' },
  { path: '/trips', label: 'Trips', icon: '🗺️' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/promotions', label: 'Promotions', icon: '🎁' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-dark text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black text-primary">TamarrawGo</h1>
          <p className="text-xs text-white/50 mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0] ?? 'A'}
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/50">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-sm text-white/50 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
