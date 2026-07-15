import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const VERIFY_STATUS_STYLES: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-600',
  UNVERIFIED: 'bg-gray-100 text-gray-500',
};

const VERIFY_STATUS_LABELS: Record<string, string> = {
  VERIFIED: '✓ Verified',
  PENDING: '⏳ Pending Review',
  REJECTED: '✕ Rejected',
  UNVERIFIED: 'Unverified',
};

function AddressChip({ city, barangay }: { city?: string; barangay?: string }) {
  if (!city && !barangay) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 mt-1">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {[barangay, city].filter(Boolean).join(', ')}
    </span>
  );
}

export default function PassengersPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  // Pending tab state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // All tab state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedAllId, setExpandedAllId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['passengers-pending'],
    queryFn: () => api.get('/admin/passengers/pending?limit=50'),
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);

  const { data: allPassengers, isLoading: allLoading } = useQuery({
    queryKey: ['passengers-all', page, search],
    queryFn: () => api.get(`/admin/passengers?${params}`),
    enabled: tab === 'all',
    placeholderData: (prev: any) => prev,
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/passengers/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passengers-pending'] });
      qc.invalidateQueries({ queryKey: ['passengers-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setExpandedId(null);
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/passengers/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passengers-pending'] });
      qc.invalidateQueries({ queryKey: ['passengers-all'] });
      setRejectingId(null);
      setRejectReason('');
      setExpandedId(null);
    },
  });

  const totalPages = allPassengers ? Math.ceil(allPassengers.total / 20) : 1;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Passengers</h1>
        <p className="text-gray-500 mt-1">Review passenger identity documents and manage verifications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'pending' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Pending Approval
          {(pending?.total ?? 0) > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pending.total}</span>
          )}
        </button>
        <button
          onClick={() => { setTab('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          All Passengers
          {allPassengers?.total != null && tab === 'all' && (
            <span className="ml-2 bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5">{allPassengers.total}</span>
          )}
        </button>
      </div>

      {/* ── PENDING TAB ─────────────────────────────────────────────────── */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="card text-center text-gray-400 py-12">Loading...</div>
          ) : pending?.data?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-4">✅</p>
              <p className="text-gray-500 font-medium">No pending verifications</p>
            </div>
          ) : pending?.data?.map((passenger: any) => (
            <div key={passenger.id} className="card">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {passenger.profilePhoto ? (
                    <img
                      src={passenger.profilePhoto}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary cursor-pointer"
                      onClick={() => setPreviewImg(passenger.profilePhoto)}
                      alt=""
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-primary font-bold text-xl">
                      {passenger.firstName?.[0]}{passenger.lastName?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{passenger.firstName} {passenger.lastName}</p>
                    <p className="text-sm text-gray-500">{passenger.phone}</p>
                    {passenger.email && <p className="text-xs text-gray-400 mt-0.5">{passenger.email}</p>}
                    <AddressChip city={passenger.city} barangay={passenger.barangay} />
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <button
                    onClick={() => setExpandedId(expandedId === passenger.id ? null : passenger.id)}
                    className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    {expandedId === passenger.id ? '▲ Hide Docs' : '▼ View Docs'}
                  </button>
                  <button
                    onClick={() => setRejectingId(passenger.id)}
                    className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve.mutate(passenger.id)}
                    disabled={approve.isPending}
                    className="text-sm bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-600 font-medium disabled:opacity-50"
                  >
                    {approve.isPending ? 'Approving...' : 'Approve ✓'}
                  </button>
                </div>
              </div>

              {/* Documents */}
              {expandedId === passenger.id && (
                <div className="mt-6 border-t pt-6">
                  <p className="font-bold text-gray-700 mb-4">Submitted Documents</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selfie */}
                    <div className="border rounded-xl overflow-hidden">
                      <div
                        className="h-48 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => passenger.profilePhoto && setPreviewImg(passenger.profilePhoto)}
                      >
                        {passenger.profilePhoto ? (
                          <img
                            src={passenger.profilePhoto}
                            alt="Selfie"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="text-4xl">🤳</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-700">Selfie Photo</p>
                        <p className={`text-xs mt-0.5 ${passenger.profilePhoto ? 'text-green-600' : 'text-red-500'}`}>
                          {passenger.profilePhoto ? '✓ Uploaded' : '✕ Missing'}
                        </p>
                      </div>
                    </div>

                    {/* Valid ID */}
                    <div className="border rounded-xl overflow-hidden">
                      <div
                        className="h-48 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => passenger.validIdUrl && setPreviewImg(passenger.validIdUrl)}
                      >
                        {passenger.validIdUrl ? (
                          <img
                            src={passenger.validIdUrl}
                            alt="Valid ID"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="text-4xl">🪪</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-700">Valid ID</p>
                        <p className={`text-xs mt-0.5 ${passenger.validIdUrl ? 'text-green-600' : 'text-red-500'}`}>
                          {passenger.validIdUrl ? '✓ Uploaded' : '✕ Missing'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {passenger.profilePhoto && passenger.validIdUrl ? (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                      ✅ Both documents submitted — ready for review
                    </div>
                  ) : (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
                      ⚠️ Missing: {[!passenger.profilePhoto && 'Selfie', !passenger.validIdUrl && 'Valid ID'].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Reject form */}
              {rejectingId === passenger.id && (
                <div className="mt-4 border-t pt-4">
                  <p className="font-semibold text-gray-700 mb-2">Rejection Reason</p>
                  <textarea
                    className="input w-full text-sm mb-3"
                    rows={2}
                    placeholder="e.g. ID photo is blurry, selfie doesn't show face clearly..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setRejectingId(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                    <button
                      onClick={() => reject.mutate({ id: passenger.id, reason: rejectReason || 'Documents could not be verified' })}
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
      )}

      {/* ── ALL PASSENGERS TAB ──────────────────────────────────────────── */}
      {tab === 'all' && (
        <>
          {/* Search */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Search</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="input pl-9 text-sm w-full"
                    placeholder="Name, phone, or email..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); }}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {allLoading ? (
            <div className="card text-center text-gray-400 py-12">Loading...</div>
          ) : allPassengers?.data?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-gray-500 font-medium">No passengers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPassengers?.data?.map((p: any) => {
                const isExpanded = expandedAllId === p.id;
                const joinDate = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';
                return (
                  <div key={p.id} className="card">
                    <div className="flex items-center gap-4">
                      {p.profilePhoto ? (
                        <img
                          src={p.profilePhoto}
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-200 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewImg(p.profilePhoto)}
                          alt=""
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                          {p.firstName?.[0]}{p.lastName?.[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900">{p.firstName} {p.lastName}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VERIFY_STATUS_STYLES[p.verificationStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                            {VERIFY_STATUS_LABELS[p.verificationStatus] ?? p.verificationStatus}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{p.phone}{p.email ? ` · ${p.email}` : ''}</p>
                        <AddressChip city={p.city} barangay={p.barangay} />
                      </div>

                      <div className="hidden md:flex flex-col items-end gap-1 text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">Joined {joinDate}</p>
                        <p className="text-xs text-gray-400">{p.loyaltyPoints ?? 0} pts</p>
                      </div>

                      <button
                        onClick={() => setExpandedAllId(isExpanded ? null : p.id)}
                        className="text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 flex-shrink-0"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 border-t pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Passenger Information</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Full Name</span>
                              <span className="font-medium text-gray-800">{p.firstName} {p.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone</span>
                              <span className="font-medium text-gray-800">{p.phone}</span>
                            </div>
                            {p.email && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium text-gray-800">{p.email}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-500">City</span>
                              <span className="font-medium text-gray-800">{p.city || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Verification</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VERIFY_STATUS_STYLES[p.verificationStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                                {VERIFY_STATUS_LABELS[p.verificationStatus] ?? p.verificationStatus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Joined</span>
                              <span className="font-medium text-gray-800">{joinDate}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Documents</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div
                              className="border rounded-xl overflow-hidden cursor-pointer hover:opacity-90"
                              onClick={() => p.profilePhoto && setPreviewImg(p.profilePhoto)}
                            >
                              <div className="h-28 bg-gray-100">
                                {p.profilePhoto
                                  ? <img src={p.profilePhoto} alt="Selfie" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">🤳</div>
                                }
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-semibold text-gray-700">Selfie</p>
                                <p className={`text-xs ${p.profilePhoto ? 'text-green-600' : 'text-gray-400'}`}>
                                  {p.profilePhoto ? '✓ Uploaded' : 'Not uploaded'}
                                </p>
                              </div>
                            </div>
                            <div
                              className="border rounded-xl overflow-hidden cursor-pointer hover:opacity-90"
                              onClick={() => p.validIdUrl && setPreviewImg(p.validIdUrl)}
                            >
                              <div className="h-28 bg-gray-100">
                                {p.validIdUrl
                                  ? <img src={p.validIdUrl} alt="Valid ID" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">🪪</div>
                                }
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-semibold text-gray-700">Valid ID</p>
                                <p className={`text-xs ${p.validIdUrl ? 'text-green-600' : 'text-gray-400'}`}>
                                  {p.validIdUrl ? '✓ Uploaded' : 'Not uploaded'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {allPassengers?.total} passengers
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
