import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

function StatCard({ title, value, subtitle, icon, color }: any) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/admin/dashboard'),
    refetchInterval: 30000,
  });

  const { data: revenue } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: () => api.get('/admin/reports/revenue?days=30'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Passengers" value={stats?.totalUsers?.toLocaleString() ?? 0} icon="👥" color="bg-blue-50" />
        <StatCard title="Active Riders" value={stats?.activeRiders ?? 0} subtitle={`${stats?.totalRiders ?? 0} total`} icon="🏍️" color="bg-orange-50" />
        <StatCard title="Today's Bookings" value={stats?.todayBookings?.toLocaleString() ?? 0} icon="🗺️" color="bg-green-50" />
        <StatCard title="Today's Revenue" value={formatCurrency(stats?.todayRevenue ?? 0)} icon="💰" color="bg-purple-50" />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <StatCard title="Monthly Revenue" value={formatCurrency(stats?.monthlyRevenue ?? 0)} icon="📈" color="bg-yellow-50" />
        <StatCard title="Pending Approvals" value={stats?.pendingRiders ?? 0} subtitle="Riders awaiting review" icon="⏳" color="bg-red-50" />
        <StatCard title="Open Tickets" value={stats?.openTickets ?? 0} subtitle="Support tickets" icon="🎫" color="bg-indigo-50" />
      </div>

      {/* Revenue Chart */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue ?? []}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={2} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
