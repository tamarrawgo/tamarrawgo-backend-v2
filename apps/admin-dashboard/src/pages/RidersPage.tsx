import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const DOC_LABELS: Record<string, string> = {
  LICENSE: "Driver's License",
  REGISTRATION: 'OR/CR Document',
  TRICYCLE_PHOTO: 'Tricycle Photo',
  PROFILE_PHOTO: 'Rider Photo',
  INSURANCE: 'Insurance',
  NBI_CLEARANCE: 'NBI Clearance',
};

export default function RidersPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [expandedRider, setExpandedRider] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ['riders-pending'],
    queryFn: () => api.get('/admin/riders/pending?limit=50'),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/riders/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['riders-pending'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); setExpandedRider(null); },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/riders/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['riders-pending'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); setRejectingId(null); setRejectReason(''); setExpandedRider(null); },
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Riders</h1>
        <p className="text-gray-500 mt-1">Review rider documents and manage approvals</p>
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
          <div key={rider.id} className="card">
            {/* Rider Header */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* Profile photo or initials */}
                {rider.documents?.find((d: any) => d.type === 'PROFILE_PHOTO') ? (
                  <img
                    src={rider.documents.find((d: any) => d.type === 'PROFILE_PHOTO').fileUrl}
                    className="w-14 h-14 rounded-full object-cover border-2 border-primary cursor-pointer"
                    onClick={() => setPreviewImg(rider.documents.find((d: any) => d.type === 'PROFILE_PHOTO').fileUrl)}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-primary font-bold text-xl">
                    {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900 text-lg">{rider.user?.firstName} {rider.user?.lastName}</p>
                  <p className="text-sm text-gray-500">{rider.user?.phone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">License: {rider.licenseNumber}</p>
                  {rider.vehicle && (
                    <p className="text-xs text-gray-400">{rider.vehicle.brand} {rider.vehicle.model} · Plate: {rider.vehicle.plateNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${rider.documents?.length > 0 ? 'badge-green' : 'badge-yellow'}`}>
                  {rider.documents?.length ?? 0} docs
                </span>
                <button
                  onClick={() => setExpandedRider(expandedRider === rider.id ? null : rider.id)}
                  className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 font-medium"
                >
                  {expandedRider === rider.id ? '▲ Hide Docs' : '▼ View Docs'}
                </button>
                <button
                  onClick={() => setRejectingId(rider.id)}
                  className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={() => approve.mutate(rider.id)}
                  disabled={approve.isPending}
                  className="text-sm bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-600 font-medium disabled:opacity-50"
                >
                  {approve.isPending ? 'Approving...' : 'Approve ✓'}
                </button>
              </div>
            </div>

            {/* Documents Section */}
            {expandedRider === rider.id && (
              <div className="mt-6 border-t pt-6">
                <p className="font-bold text-gray-700 mb-4">Submitted Documents</p>
                {rider.documents?.length === 0 ? (
                  <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rider.documents?.map((doc: any) => (
                      <div key={doc.id} className="border rounded-xl overflow-hidden">
                        <div
                          className="h-40 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImg(doc.fileUrl)}
                        >
                          <img
                            src={doc.fileUrl}
                            alt={DOC_LABELS[doc.type] ?? doc.type}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-700">{DOC_LABELS[doc.type] ?? doc.type}</p>
                          <p className={`text-xs mt-0.5 ${doc.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                            {doc.verified ? '✓ Verified' : '⏳ Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing docs warning */}
                {(() => {
                  const required = ['LICENSE', 'REGISTRATION', 'TRICYCLE_PHOTO', 'PROFILE_PHOTO'];
                  const uploaded = rider.documents?.map((d: any) => d.type) ?? [];
                  const missing = required.filter(r => !uploaded.includes(r));
                  return missing.length > 0 ? (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
                      ⚠️ Missing: {missing.map(m => DOC_LABELS[m]).join(', ')}
                    </div>
                  ) : (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                      ✅ All required documents submitted
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Reject Modal */}
            {rejectingId === rider.id && (
              <div className="mt-4 border-t pt-4">
                <p className="font-semibold text-gray-700 mb-2">Rejection Reason</p>
                <textarea
                  className="input w-full text-sm mb-3"
                  rows={2}
                  placeholder="e.g. Documents are unclear, license expired..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-3">
                  <button onClick={() => setRejectingId(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                  <button
                    onClick={() => reject.mutate({ id: rider.id, reason: rejectReason || 'Documents incomplete' })}
                    disabled={reject.isPending}
                    className="bg-red-500 text-white text-sm py-2 px-4 rounded-xl hover:bg-red-600 font-medium disabled:opacity-50"
                  >
                    {reject.isPending ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-2xl w-full">
            <img src={previewImg} className="w-full rounded-2xl" alt="Document preview" />
            <button
              className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 font-bold shadow"
              onClick={() => setPreviewImg(null)}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
