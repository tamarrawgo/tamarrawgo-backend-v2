import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const STATUS_COLORS: Record<string, string> = {
  SEARCHING: 'badge-yellow', ACCEPTED: 'badge-blue', RIDER_ARRIVED: 'badge-blue',
  IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-red', EXPIRED: 'badge-gray',
};

export default function TripsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['trips', page, status],
    queryFn: () => api.get(`/admin/trips?page=${page}&limit=20${status ? `&status=${status}` : ''}`),
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Trip Monitoring</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} total trips</p>
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-48">
          <option value="">All Status</option>
          {['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Passenger', 'Rider', 'From', 'To', 'Fare', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-5 py-4 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : data?.data?.map((trip: any) => (
              <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 font-medium">{trip.passenger?.firstName} {trip.passenger?.lastName}</td>
                <td className="px-5 py-4 text-gray-500">{trip.rider?.user?.firstName ?? '—'} {trip.rider?.user?.lastName ?? ''}</td>
                <td className="px-5 py-4 text-gray-500 max-w-32 truncate">{trip.pickupAddress}</td>
                <td className="px-5 py-4 text-gray-500 max-w-32 truncate">{trip.dropoffAddress}</td>
                <td className="px-5 py-4 font-semibold text-primary">{formatCurrency(Number(trip.estimatedFare))}</td>
                <td className="px-5 py-4"><span className={STATUS_COLORS[trip.status] ?? 'badge-gray'}>{trip.status}</span></td>
                <td className="px-5 py-4 text-gray-400">{new Date(trip.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Page {page} of {data?.totalPages ?? 1}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.totalPages ?? 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
