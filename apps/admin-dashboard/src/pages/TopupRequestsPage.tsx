import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

function formatCurrency(amount: number) {
  return `₱${Number(amount).toFixed(2)}`;
}

export default function TopupRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['topup-requests', statusFilter],
    queryFn: () => api.get(`/admin/topup-requests?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`),
    refetchInterval: 15000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['topup-requests-pending-count'],
    queryFn: () => api.get('/admin/topup-requests?status=PENDING&limit=1'),
    refetchInterval: 30000,
  });
  const pendingCount = (pendingData as any)?.total ?? 0;

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/topup-requests/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topup-requests'] });
      qc.invalidateQueries({ queryKey: ['topup-requests-pending-count'] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/admin/topup-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topup-requests'] });
      qc.invalidateQueries({ queryKey: ['topup-requests-pending-count'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  const requests = (data as any)?.data ?? [];

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">
          Topup Requests
          {pendingCount > 0 && (
            <span className="ml-3 bg-red-500 text-white text-sm font-bold rounded-full px-3 py-1 align-middle">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <p className="text-gray-500 mt-1">Review rider wallet topup requests with payment receipts</p>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          { key: 'PENDING', label: 'Pending' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: '', label: 'All' },
        ] as { key: typeof statusFilter; label: string }[]).map((opt) => (
          <button
            key={opt.label}
            onClick={() => setStatusFilter(opt.key)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
              statusFilter === opt.key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
            {opt.key === 'PENDING' && pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center text-gray-400 py-12">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-gray-500 font-medium">No topup requests found</p>
          </div>
        ) : (
          requests.map((req: any) => {
            const ocrMismatch = req.ocrAmount && Math.abs(Number(req.ocrAmount) - Number(req.amount)) > 1;
            return (
              <div key={req.id} className="card">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex items-start gap-4">
                    {req.status === 'PENDING' ? (
                      <img
                        src={req.receiptUrl}
                        className="w-20 h-20 rounded-xl object-cover border border-gray-200 cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewImg(req.receiptUrl)}
                        alt="Receipt"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                        <span className="material-icons text-2xl">image_not_supported</span>
                        <span className="text-[10px] mt-0.5">Deleted</span>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        {req.rider?.user?.firstName} {req.rider?.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{req.rider?.user?.phone}</p>
                      <p className="text-2xl font-black text-primary mt-1">{formatCurrency(req.amount)}</p>
                      {req.referenceNumber && (
                        <p className="text-xs text-gray-400 mt-1">Ref: {req.referenceNumber}</p>
                      )}
                      {req.ocrAmount && (
                        <p className={`text-xs mt-1 font-medium ${ocrMismatch ? 'text-red-600' : 'text-green-600'}`}>
                          Receipt shows: {formatCurrency(req.ocrAmount)} {ocrMismatch ? '⚠️ Mismatch' : '✓ Matches'}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`badge ${
                      req.status === 'APPROVED' ? 'badge-green' : req.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 font-medium"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => approve.mutate(req.id)}
                          disabled={approve.isPending}
                          className="text-sm bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-600 font-medium disabled:opacity-50"
                        >
                          {approve.isPending ? 'Approving...' : 'Approve ✓'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {req.status === 'REJECTED' && req.rejectionReason && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    Reason: {req.rejectionReason}
                  </div>
                )}

                {rejectingId === req.id && (
                  <div className="mt-4 border-t pt-4">
                    <p className="font-semibold text-gray-700 mb-2">Rejection Reason</p>
                    <textarea
                      className="input w-full text-sm mb-3"
                      rows={2}
                      placeholder="e.g. Receipt doesn't match the claimed amount, blurry image..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setRejectingId(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                      <button
                        onClick={() => reject.mutate({ id: req.id, reason: rejectReason || 'Receipt could not be verified' })}
                        disabled={reject.isPending}
                        className="bg-red-500 text-white text-sm py-2 px-4 rounded-xl hover:bg-red-600 font-medium disabled:opacity-50"
                      >
                        {reject.isPending ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {previewImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-2xl w-full">
            <img src={previewImg} className="w-full rounded-2xl" alt="Receipt preview" />
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
