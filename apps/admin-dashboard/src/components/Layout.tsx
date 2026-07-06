import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { api } from '../services/api';

const navItems = [
  { path: '/dashboard',    label: 'Dashboard',       icon: 'dashboard' },
  { path: '/users',        label: 'Users',            icon: 'groups' },
  { path: '/riders',       label: 'Riders',           icon: 'badge' },
  { path: '/trips',        label: 'Trips',            icon: 'route' },
  { path: '/payments',     label: 'Revenue',          icon: 'payments' },
  { path: '/topup-requests', label: 'Topup Requests', icon: 'account_balance_wallet' },
  { path: '/promotions',   label: 'Promotions',       icon: 'local_offer' },
  { path: '/complaints',   label: 'Complaints',       icon: 'report_problem' },
  { path: '/reports',      label: 'Reports',          icon: 'assessment' },
  { path: '/activity-log', label: 'Activity Log',     icon: 'history' },
  { path: '/settings',     label: 'Settings',         icon: 'settings' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: pendingTopups } = useQuery({
    queryKey: ['topup-requests-pending-count'],
    queryFn: () => api.get('/admin/topup-requests?status=PENDING&limit=1'),
    refetchInterval: 30000,
  });
  const pendingTopupCount = (pendingTopups as any)?.total ?? 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  const currentPage = navItems.find((i) => location.pathname.startsWith(i.path))?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base">🛺</span>
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-tight">TamarrawGo</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/30 hover:text-white">
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <div className="h-px bg-white/5 mx-4" />

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-icons text-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.path === '/topup-requests' && pendingTopupCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-tight">
                      {pendingTopupCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="h-px bg-white/5 mx-4" />

        {/* User */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {user?.firstName?.[0] ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-white/30 hover:text-red-400 transition-colors px-1 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            <span className="material-icons text-base">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 lg:px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <span className="material-icons text-2xl">menu</span>
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">{currentPage}</h2>
            <p className="text-xs text-gray-400 hidden sm:block">TamarrawGo Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              System Online
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
