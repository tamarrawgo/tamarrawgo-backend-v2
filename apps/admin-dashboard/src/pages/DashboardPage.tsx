import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

function StatCard({ title, value, subtitle, icon, iconBg, iconColor, trend }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <span className={`material-icons text-xl ${iconColor}`}>{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
      <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary border-t-transparent" />
    </div>
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-black text-gray-900 mt-0.5">Dashboard Overview</h1>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-gray-700">{now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-xs text-gray-400 mt-0.5">{now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Primary stats */}
      <div className="mb-6">
        <SectionHeader title="Today's Summary" subtitle="Live data, refreshes every 30 seconds" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Passengers"
            value={stats?.totalUsers?.toLocaleString() ?? '0'}
            icon="groups"
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <StatCard
            title="Active Riders"
            value={stats?.activeRiders ?? 0}
            subtitle={`${stats?.totalRiders ?? 0} total registered`}
            icon="two_wheeler"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Today's Bookings"
            value={stats?.todayBookings?.toLocaleString() ?? '0'}
            icon="confirmation_number"
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(stats?.todayRevenue ?? 0)}
            icon="payments"
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
          />
        </div>
      </div>

      {/* Secondary stats */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats?.monthlyRevenue ?? 0)}
            subtitle="This calendar month"
            icon="trending_up"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            title="Pending Approvals"
            value={stats?.pendingRiders ?? 0}
            subtitle="Riders awaiting review"
            icon="hourglass_empty"
            iconBg={stats?.pendingRiders > 0 ? 'bg-orange-50' : 'bg-gray-50'}
            iconColor={stats?.pendingRiders > 0 ? 'text-orange-500' : 'text-gray-400'}
          />
          <StatCard
            title="Open Tickets"
            value={stats?.openTickets ?? 0}
            subtitle="Support tickets"
            icon="support_agent"
            iconBg={stats?.openTickets > 0 ? 'bg-red-50' : 'bg-gray-50'}
            iconColor={stats?.openTickets > 0 ? 'text-red-500' : 'text-gray-400'}
          />
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Revenue Trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
            Revenue
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenue ?? []} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B6B2F" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1B6B2F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #F3F4F6', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
              formatter={(v: any) => [formatCurrency(v), 'Revenue']}
            />
            <Area type="monotone" dataKey="revenue" stroke="#1B6B2F" strokeWidth={2.5} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 4, fill: '#1B6B2F' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
