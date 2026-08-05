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
  TRICYCLE_FRONT: 'Tricycle Front View',
  TRICYCLE_BACK: 'Tricycle Back (Plate)',
  TRICYCLE_LEFT: 'Tricycle Left Side',
  TRICYCLE_RIGHT: 'Tricycle Right Side',
};

function getDocLabel(docType: string, vehicleType?: string): string {
  const label = DOC_LABELS[docType] ?? docType;
  return vehicleType === 'DELIVERY' ? label.replace('Tricycle', 'Motorcycle') : label;
}

const RIDER_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-gray-100 text-gray-500',
};

const USER_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
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

function VehicleTypeBadge({ vehicleType }: { vehicleType?: string }) {
  const isDelivery = vehicleType === 'DELIVERY';
  return (
    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 mt-1 font-semibold ${isDelivery ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      {isDelivery ? '🏍️ Motorcycle Driver' : '🛺 Tricycle Driver'}
    </span>
  );
}

type RiderTab = 'pending' | 'approved' | 'rejected' | 'all';

export default function RidersPage() {
  const [tab, setTab] = useState<RiderTab>('pending');

  // Pending tab state
  const [expandedRider, setExpandedRider] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // All Riders tab state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedAllRider, setExpandedAllRider] = useState<string | null>(null);

  const qc = useQueryClient();

  // Pending riders query
  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['riders-pending'],
    queryFn: () => api.get('/admin/riders/pending?limit=50'),
  });

  const riderStatusParam: Record<RiderTab, string | undefined> = {
    pending: undefined, all: undefined, approved: 'APPROVED', rejected: 'REJECTED',
  };

  // All / Approved / Rejected riders query
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (cityFilter) params.set('city', cityFilter);
  if (barangayFilter) params.set('barangay', barangayFilter);
  const statusParam = riderStatusParam[tab];
  if (statusParam) params.set('status', statusParam);

  const { data: allRiders, isLoading: allLoading } = useQuery({
    queryKey: ['riders-all', tab, page, search, cityFilter, barangayFilter],
    queryFn: () => api.get(`/admin/riders?${params}`),
    enabled: tab !== 'pending',
    placeholderData: (prev: any) => prev,
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/riders/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders-pending'] });
      qc.invalidateQueries({ queryKey: ['riders-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setExpandedRider(null);
    },
  });

  const deleteRider = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/riders/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders-pending'] });
      qc.invalidateQueries({ queryKey: ['riders-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setRejectingId(null);
      setRejectReason('');
      setExpandedRider(null);
    },
  });

  const hasFilters = search || cityFilter || barangayFilter;
  const totalPages = allRiders ? Math.ceil((allRiders as any).total / 20) : 1;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Riders</h1>
        <p className="text-gray-500 mt-1">Review rider documents and manage approvals</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setTab('pending'); setPage(1); }}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'pending' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Pending Approval
          {((pending as any)?.total ?? 0) > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{(pending as any).total}</span>
          )}
        </button>
        <button
          onClick={() => { setTab('approved'); setPage(1); }}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          ✓ Approved
          {(allRiders as any)?.total != null && tab === 'approved' && (
            <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{(allRiders as any).total}</span>
          )}
        </button>
        <button
          onClick={() => { setTab('rejected'); setPage(1); }}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'rejected' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          ✕ Rejected
          {(allRiders as any)?.total != null && tab === 'rejected' && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{(allRiders as any).total}</span>
          )}
        </button>
        <button
          onClick={() => { setTab('all'); setPage(1); }}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          All Riders
          {(allRiders as any)?.total != null && tab === 'all' && (
            <span className="ml-2 bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5">{(allRiders as any).total}</span>
          )}
        </button>
      </div>

      {/* ── PENDING TAB ──────────────────────────────────────────────────── */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="card text-center text-gray-400 py-12">Loading...</div>
          ) : pending?.data?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-4">✅</p>
              <p className="text-gray-500 font-medium">No pending approvals</p>
            </div>
          ) : pending?.data?.map((rider: any) => (
            <div key={rider.id} className="card">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
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
                    <AddressChip city={rider.user?.city} barangay={rider.user?.barangay} />
                    <VehicleTypeBadge vehicleType={rider.vehicleType} />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
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

              {/* Documents */}
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
                              alt={getDocLabel(doc.type, rider.vehicleType)}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-gray-700">{getDocLabel(doc.type, rider.vehicleType)}</p>
                            <p className={`text-xs mt-0.5 ${doc.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                              {doc.verified ? '✓ Verified' : '⏳ Pending'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const required = ['LICENSE', 'REGISTRATION', 'TRICYCLE_PHOTO', 'PROFILE_PHOTO'];
                    const uploaded = rider.documents?.map((d: any) => d.type) ?? [];
                    const missing = required.filter(r => !uploaded.includes(r));
                    return missing.length > 0 ? (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
                        ⚠️ Missing: {missing.map(m => getDocLabel(m, rider.vehicleType)).join(', ')}
                      </div>
                    ) : (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                        ✅ All required documents submitted
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Reject form */}
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
      )}

      {/* ── APPROVED / REJECTED / ALL TABS ──────────────────────────────── */}
      {(tab === 'all' || tab === 'approved' || tab === 'rejected') && (
        <>
          {/* Search & Filter Bar */}
          <div className="card mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Name / Phone search */}
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

              {/* City filter */}
              <div className="min-w-[160px]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">City / Municipality</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="input pl-9 text-sm w-full"
                    placeholder="e.g. Calapan City"
                    value={cityFilter}
                    onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {/* Barangay filter */}
              <div className="min-w-[160px]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Barangay</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="input pl-9 text-sm w-full"
                    placeholder="e.g. Canubing I"
                    value={barangayFilter}
                    onChange={(e) => { setBarangayFilter(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setCityFilter(''); setBarangayFilter(''); setPage(1); }}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {allLoading ? (
            <div className="card text-center text-gray-400 py-12">Loading...</div>
          ) : allRiders?.data?.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-gray-500 font-medium">No riders found</p>
              {hasFilters && <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {allRiders?.data?.map((rider: any) => {
                const isExpanded = expandedAllRider === rider.id;
                const riderStatus = rider.status as string;
                const userStatus = rider.user?.status as string;
                const joinDate = rider.user?.createdAt
                  ? new Date(rider.user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';
                const profileDoc = rider.documents?.find((d: any) => d.type === 'PROFILE_PHOTO');

                return (
                  <div key={rider.id} className="card">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {profileDoc ? (
                        <img
                          src={profileDoc.fileUrl}
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-200 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewImg(profileDoc.fileUrl)}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                          {rider.user?.firstName?.[0]}{rider.user?.lastName?.[0]}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900">{rider.user?.firstName} {rider.user?.lastName}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RIDER_STATUS_STYLES[riderStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                            {riderStatus}
                          </span>
                          {userStatus && userStatus !== 'ACTIVE' && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${USER_STATUS_STYLES[userStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                              Account: {userStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{rider.user?.phone}{rider.user?.email ? ` · ${rider.user.email}` : ''}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          License: {rider.licenseNumber}
                          {rider.vehicle ? ` · ${rider.vehicle.brand} ${rider.vehicle.model} (${rider.vehicle.plateNumber})` : ''}
                        </p>
                        {/* Address */}
                        <AddressChip city={rider.user?.city} barangay={rider.user?.barangay} />
                        <VehicleTypeBadge vehicleType={rider.vehicleType} />
                      </div>

                      {/* Meta */}
                      <div className="hidden md:flex flex-col items-end gap-1 text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">Joined {joinDate}</p>
                        <p className="text-xs text-gray-500">Wallet: <span className="font-semibold text-gray-700">₱{Number(rider.walletBalance ?? 0).toFixed(2)}</span></p>
                        <p className="text-xs text-gray-400">{rider.documents?.length ?? 0} docs · {rider.user?.loyaltyPoints ?? 0} pts</p>
                      </div>

                      {/* Delete button — Rejected tab only */}
                      {tab === 'rejected' && (
                        <button
                          onClick={() => {
                            if (!window.confirm(`Permanently delete "${rider.user?.firstName} ${rider.user?.lastName}"? This cannot be undone.`)) return;
                            deleteRider.mutate(rider.user?.id);
                          }}
                          disabled={deleteRider.isPending}
                          className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl flex-shrink-0 font-medium disabled:opacity-50"
                        >
                          🗑 Delete
                        </button>
                      )}
                      {/* Toggle */}
                      <button
                        onClick={() => setExpandedAllRider(isExpanded ? null : rider.id)}
                        className="text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 flex-shrink-0"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-5 border-t pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Rider info */}
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Rider Information</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Full Name</span>
                              <span className="font-medium text-gray-800">{rider.user?.firstName} {rider.user?.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Phone</span>
                              <span className="font-medium text-gray-800">{rider.user?.phone}</span>
                            </div>
                            {rider.user?.email && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium text-gray-800">{rider.user.email}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-500">City / Municipality</span>
                              <span className="font-medium text-gray-800">{rider.user?.city || <span className="text-gray-300">—</span>}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Barangay</span>
                              <span className="font-medium text-gray-800">{rider.user?.barangay || <span className="text-gray-300">—</span>}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">License No.</span>
                              <span className="font-medium text-gray-800">{rider.licenseNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Rider Status</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RIDER_STATUS_STYLES[riderStatus] ?? 'bg-gray-100 text-gray-500'}`}>{riderStatus}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Wallet Balance</span>
                              <span className="font-semibold text-gray-800">₱{Number(rider.walletBalance ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Loyalty Points</span>
                              <span className="font-medium text-gray-800">{rider.user?.loyaltyPoints ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Joined</span>
                              <span className="font-medium text-gray-800">{joinDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Vehicle & Documents */}
                        <div>
                          {rider.vehicle && (
                            <>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Vehicle</p>
                              <div className="space-y-2 text-sm mb-6">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Plate Number</span>
                                  <span className="font-medium text-gray-800">{rider.vehicle.plateNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Brand / Model</span>
                                  <span className="font-medium text-gray-800">{rider.vehicle.brand} {rider.vehicle.model}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Color</span>
                                  <span className="font-medium text-gray-800">{rider.vehicle.color}</span>
                                </div>
                              </div>
                            </>
                          )}

                          {rider.documents?.length > 0 && (
                            <>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Documents</p>
                              <div className="grid grid-cols-2 gap-2">
                                {rider.documents.map((doc: any) => (
                                  <div
                                    key={doc.id}
                                    className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
                                    onClick={() => setPreviewImg(doc.fileUrl)}
                                  >
                                    <div className="h-24 bg-gray-100">
                                      <img
                                        src={doc.fileUrl}
                                        alt={getDocLabel(doc.type, rider.vehicleType)}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                    <div className="px-2 py-1.5">
                                      <p className="text-xs font-semibold text-gray-700 truncate">{getDocLabel(doc.type, rider.vehicleType)}</p>
                                      <p className={`text-xs ${doc.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {doc.verified ? '✓ Verified' : '⏳ Pending'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {(allRiders as any)?.total} riders
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
