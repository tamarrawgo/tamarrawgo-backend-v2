import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

export default function PaymentsPage() {
  const { data } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments/history?limit=50'),
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Payment transaction history</p>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['ID', 'Amount', 'Method', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data?.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{p.id.slice(0, 8)}...</td>
                <td className="px-6 py-4 font-bold text-primary">{formatCurrency(Number(p.amount))}</td>
                <td className="px-6 py-4"><span className="badge badge-blue">{p.method}</span></td>
                <td className="px-6 py-4"><span className={p.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}>{p.status}</span></td>
                <td className="px-6 py-4 text-gray-400">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
