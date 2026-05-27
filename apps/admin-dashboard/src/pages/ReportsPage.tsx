import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

export default function ReportsPage() {
  const { data: revenue } = useQuery({
    queryKey: ['revenue-30'],
    queryFn: () => api.get('/admin/reports/revenue?days=30'),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Revenue and system analytics</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Daily Revenue (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={revenue ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Bar dataKey="revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
