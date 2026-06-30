import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const navItems = [
  { path: '/dashboard', label: 'Dashboard',  icon: 'dashboard' },
  { path: '/users',     label: 'Users',       icon: 'groups' },
  { path: '/riders',    label: 'Riders',      icon: 'badge' },
  { path: '/trips',     label: 'Trips',       icon: 'route' },
  { path: '/payments',  label: 'Payments',    icon: 'payments' },
  { path: '/topup-requests', label: 'Topup Requests', icon: 'account_balance_wallet' },
  { path: '/promotions',label: 'Promotions',  icon: 'local_offer' },
  { path: '/complaints',label: 'Complaints',  icon: 'report_problem' },
  { path: '/reports',   label: 'Reports',     icon: 'assessment' },
  { path: '/settings',  label: 'Settings',    icon: 'settings' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const currentPage = navItems.find((i) => location.pathname.startsWith(i.path))?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark text-white flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-primary">TamarrawGo</h1>
            <p className="text-xs text-white/50 mt-1">Admin Dashboard</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <span className="material-icons">close</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="material-icons text-xl">{item.icon}</span>
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
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <span className="material-icons text-base">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <span className="material-icons text-2xl">menu</span>
          </button>
          <h2 className="text-lg font-bold text-gray-900">{currentPage}</h2>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
