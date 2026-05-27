import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export default function RidersPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ['riders-pending'],
    queryFn: () => api.get('/admin/riders/pending?limit=50'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/riders/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['riders-pending'] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/admin/riders/${id}/reject`, { reason: 'Documents incomplete' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['riders-pending'] }),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Riders</h1>
        <p className="text-gray-500 mt-1">Manage rider registrations and approvals</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'pending' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          Pending Approval {pending?.total > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pending.total}</span>}
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          All Riders
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center text-gray-400 py-12">Loading...</div>
        ) : pending?.data?.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-gray-500 font-medium">No pending approvals</p>
          </div>
        ) : pending?.data?.map((rider: any) => (
          <div key={rider.id} className="card flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-primary font-bold text-lg">
                {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-gray-900">{rider.user?.firstName} {rider.user?.lastName}</p>
                <p className="text-sm text-gray-500">{rider.user?.phone} · License: {rider.licenseNumber}</p>
                {rider.vehicle && (
                  <p className="text-xs text-gray-400 mt-0.5">{rider.vehicle.brand} {rider.vehicle.model} · {rider.vehicle.plateNumber}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <span className="badge badge-yellow">{rider.documents?.length ?? 0} docs</span>
              <button onClick={() => reject.mutate(rider.id)} className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 font-medium">
                Reject
              </button>
              <button onClick={() => approve.mutate(rider.id)} className="text-sm bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 font-medium">
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
