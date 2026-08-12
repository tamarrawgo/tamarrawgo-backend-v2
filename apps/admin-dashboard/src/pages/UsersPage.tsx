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

type RoleFilter = 'ALL' | 'RIDER' | 'PASSENGER';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '', barangay: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, cityFilter, roleFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (cityFilter) params.set('city', cityFilter);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      return api.get(`/admin/users?${params}`);
    },
    placeholderData: (prev) => prev,
  });

  const filteredUsers = (data?.data ?? []);

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/suspend`),
    onSuccess: () => { setSelectedUser(null); qc.refetchQueries({ queryKey: ['users'] }); },
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/activate`),
    onSuccess: () => { setSelectedUser(null); qc.refetchQueries({ queryKey: ['users'] }); },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      setSelectedUser(null);
      qc.refetchQueries({ queryKey: ['users'] });
    },
  });

  const topup = useMutation({
    mutationFn: ({ riderId, amount }: { riderId: string; amount: number }) =>
      api.post(`/admin/riders/${riderId}/topup`, { amount }),
    onSuccess: () => { qc.refetchQueries({ queryKey: ['users'] }); },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/admin/users/${id}`, data),
    onSuccess: (res: any) => {
      const updated = res.user ?? res;
      setSelectedUser((prev: any) => ({ ...prev, ...updated }));
      setEditMode(false);
      qc.refetchQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => { alert(err?.message ?? 'Failed to update profile'); },
  });

  const startEdit = () => {
    setEditForm({
      firstName: selectedUser?.firstName ?? '',
      lastName: selectedUser?.lastName ?? '',
      phone: selectedUser?.phone ?? '',
      email: selectedUser?.email ?? '',
      city: selectedUser?.city ?? '',
      barangay: selectedUser?.barangay ?? '',
    });
    setEditMode(true);
  };

  const handleTopup = (rider: any) => {
    const input = window.prompt(`Add topup balance for ${selectedUser?.firstName} ${selectedUser?.lastName}\nCurrent balance: ₱${Number(rider?.walletBalance ?? 0).toFixed(2)}\n\nEnter amount (₱):`);
    if (!input) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
    topup.mutate({ riderId: rider.id, amount });
  };

  const handleDelete = (user: any) => {
    if (!window.confirm(`Permanently delete "${user.firstName} ${user.lastName}"?\n\nThis cannot be undone.`)) return;
    deleteUser.mutate(user.id);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'badge-green', SUSPENDED: 'badge-red',
      PENDING_VERIFICATION: 'badge-yellow', INACTIVE: 'badge-gray',
    };
    return <span className={`badge ${map[status] ?? 'badge-gray'}`}>{status}</span>;
  };

  const verifyBadge = (verificationStatus: string) => {
    const map: Record<string, string> = {
      VERIFIED: 'badge-green', REJECTED: 'badge-red', PENDING: 'badge-yellow',
    };
    const label: Record<string, string> = {
      VERIFIED: '✓ Verified', REJECTED: '✕ ID Rejected', PENDING: '⏳ ID Pending',
    };
    return <span className={`badge ${map[verificationStatus] ?? 'badge-gray'}`}>{label[verificationStatus] ?? verificationStatus}</span>;
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{filteredUsers.length} of {data?.total ?? 0} total users</p>
        </div>
        <div className="flex gap-2">
          <input
            className="input w-64"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <input
            className="input w-44"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          { key: 'RIDER', label: 'Riders' },
          { key: 'PASSENGER', label: 'Passengers' },
          { key: 'ALL', label: 'All Users' },
        ] as { key: RoleFilter; label: string }[]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => { setRoleFilter(opt.key); setPage(1); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
              roleFilter === opt.key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Phone', 'Email', 'Role', 'Wallet', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No users found</td></tr>
            ) : filteredUsers.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setSelectedUser(user); setEditMode(false); }}
                    className="font-medium text-primary hover:underline text-left"
                  >
                    {user.firstName} {user.lastName}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-500">{user.phone}</td>
                <td className="px-6 py-4 text-gray-500">{user.email ?? '—'}</td>
                <td className="px-6 py-4"><span className="badge badge-blue">{user.role}</span></td>
                <td className="px-6 py-4">
                  {user.role === 'RIDER' && user.rider ? (
                    <span className={`text-sm font-semibold ${Number(user.rider.walletBalance ?? 0) < 100 ? 'text-red-500' : 'text-gray-800'}`}>
                      ₱{Number(user.rider.walletBalance ?? 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4 flex flex-wrap gap-1 items-center">
                  {statusBadge(user.status)}
                  {user.role === 'PASSENGER' && user.verificationStatus && verifyBadge(user.verificationStatus)}
                </td>
                <td className="px-6 py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {user.role === 'ADMIN' ? (
                    <span className="text-xs text-gray-400 font-medium">Protected</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      {user.status === 'ACTIVE' ? (
                        <button onClick={() => suspend.mutate(user.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Suspend</button>
                      ) : (
                        <button onClick={() => activate.mutate(user.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Activate</button>
                      )}
                      <button onClick={() => handleDelete(user)} className="text-gray-400 hover:text-red-600 text-xs font-medium">Delete</button>
                    </div>
                  )}
                </td>
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

      {/* User Profile Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => { setSelectedUser(null); setEditMode(false); }} />

          {/* Drawer */}
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-900">{editMode ? 'Edit Profile' : 'User Profile'}</h2>
              <div className="flex items-center gap-2">
                {!editMode && selectedUser.role !== 'ADMIN' && (
                  <button onClick={startEdit} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">✏️ Edit</button>
                )}
                <button onClick={() => { setSelectedUser(null); setEditMode(false); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 font-bold">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + Basic Info */}
              <div className="flex items-center gap-5">
                {(() => {
                  const photoUrl = selectedUser.profilePhoto
                    ?? selectedUser.rider?.documents?.find((d: any) => d.type === 'PROFILE_PHOTO')?.fileUrl;
                  return photoUrl ? (
                    <img
                      src={photoUrl}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary cursor-pointer"
                      onClick={() => setPreviewImg(photoUrl)}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-50 border-2 border-primary flex items-center justify-center text-primary font-black text-2xl">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                    </div>
                  );
                })()}
                <div className="flex-1">
                  {editMode ? (
                    <div className="flex gap-2 mb-1">
                      <input className="input flex-1 text-sm font-bold" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First Name" />
                      <input className="input flex-1 text-sm font-bold" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last Name" />
                    </div>
                  ) : (
                    <h3 className="text-2xl font-black text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge badge-blue">{selectedUser.role}</span>
                    {statusBadge(selectedUser.status)}
                    {selectedUser.role === 'PASSENGER' && selectedUser.verificationStatus && verifyBadge(selectedUser.verificationStatus)}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="card bg-gray-50 space-y-3">
                <h4 className="font-bold text-gray-700">Contact Information</h4>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Phone</p>
                      <input className="input w-full text-sm" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Email</p>
                      <input className="input w-full text-sm" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">City</p>
                      <input className="input w-full text-sm" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="City" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Barangay</p>
                      <input className="input w-full text-sm" value={editForm.barangay} onChange={e => setEditForm(f => ({ ...f, barangay: e.target.value }))} placeholder="Barangay" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">Phone</p>
                      <p className="font-semibold">{selectedUser.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="font-semibold">{selectedUser.email ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Joined</p>
                      <p className="font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">User ID</p>
                      <p className="font-semibold text-xs text-gray-500">{selectedUser.id?.slice(0, 8)}...</p>
                    </div>
                    {selectedUser.city && (
                      <div>
                        <p className="text-gray-400">City</p>
                        <p className="font-semibold">{selectedUser.city}</p>
                      </div>
                    )}
                    {selectedUser.barangay && (
                      <div>
                        <p className="text-gray-400">Barangay</p>
                        <p className="font-semibold">{selectedUser.barangay}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rider-specific info */}
              {selectedUser.rider && (
                <>
                  <div className="card bg-gray-50 space-y-3">
                    <h4 className="font-bold text-gray-700">Rider Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className="font-semibold">{selectedUser.rider.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rating</p>
                        <p className="font-semibold">⭐ {Number(selectedUser.rider.rating ?? 5).toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Online Status</p>
                        <p className="font-semibold">{selectedUser.rider.onlineStatus ?? 'OFFLINE'}</p>
                      </div>
                    </div>
                    {/* Topup Balance */}
                    <div className="flex items-center justify-between bg-green-50 rounded-xl p-3 mt-3 border border-green-200">
                      <div>
                        <p className="text-xs text-gray-500">Topup Balance</p>
                        <p className="font-black text-xl text-primary">₱{Number(selectedUser.rider.walletBalance ?? 0).toFixed(2)}</p>
                        {Number(selectedUser.rider.walletBalance ?? 0) < 100 && (
                          <p className="text-xs text-red-500 font-semibold mt-0.5">⚠ Below ₱100 — cannot receive bookings</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleTopup(selectedUser.rider)}
                        disabled={topup.isPending}
                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-600 disabled:opacity-50"
                      >
                        {topup.isPending ? 'Adding...' : '+ Add Balance'}
                      </button>
                    </div>
                  </div>

                  {/* Vehicle */}
                  {selectedUser.rider.vehicle && (
                    <div className="card bg-gray-50 space-y-3">
                      <h4 className="font-bold text-gray-700">Vehicle</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-gray-400">Brand/Model</p><p className="font-semibold">{selectedUser.rider.vehicle.brand} {selectedUser.rider.vehicle.model}</p></div>
                        <div><p className="text-gray-400">Plate No.</p><p className="font-semibold">{selectedUser.rider.vehicle.plateNumber}</p></div>
                        <div><p className="text-gray-400">Year</p><p className="font-semibold">{selectedUser.rider.vehicle.year ?? '—'}</p></div>
                        <div><p className="text-gray-400">Color</p><p className="font-semibold">{selectedUser.rider.vehicle.color ?? '—'}</p></div>
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {selectedUser.rider.documents?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-700 mb-3">Uploaded Documents ({selectedUser.rider.documents.length})</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedUser.rider.documents.map((doc: any) => (
                          <div key={doc.id} className="border rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImg(doc.fileUrl)}>
                            <div className="h-32 bg-gray-100">
                              <img src={doc.fileUrl} alt={getDocLabel(doc.type, selectedUser.rider?.vehicleType)} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-semibold text-gray-700">{getDocLabel(doc.type, selectedUser.rider?.vehicleType)}</p>
                              <p className={`text-xs mt-0.5 ${doc.verified ? 'text-green-600' : 'text-yellow-600'}`}>{doc.verified ? '✓ Verified' : '⏳ Pending'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser.rider.documents?.length === 0 && (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm">No documents uploaded yet</p>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons — hidden for Super Admin */}
              {selectedUser.role === 'ADMIN' ? (
                <div className="mt-2 text-center text-sm text-gray-400 py-2">Super Admin account is protected</div>
              ) : editMode ? (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => updateUser.mutate({ id: selectedUser.id, data: editForm })}
                    disabled={updateUser.isPending}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary-600 text-sm disabled:opacity-50"
                  >
                    {updateUser.isPending ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              ) : (
              <>
              <div className="flex gap-3 pt-2">
                {selectedUser.status === 'ACTIVE' ? (
                  <button onClick={() => suspend.mutate(selectedUser.id)} className="flex-1 border border-red-200 text-red-600 py-2.5 rounded-xl font-semibold hover:bg-red-50 text-sm">Suspend</button>
                ) : (
                  <button onClick={() => activate.mutate(selectedUser.id)} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary-600 text-sm">Activate</button>
                )}
                <button
                  onClick={() => handleDelete(selectedUser)}
                  disabled={deleteUser.isPending}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 text-sm disabled:opacity-50"
                >
                  {deleteUser.isPending ? 'Deleting...' : '🗑 Delete User'}
                </button>
              </div>
              <button
                onClick={() => {
                  const newPass = window.prompt(`Reset password for ${selectedUser.firstName} ${selectedUser.lastName}\n\nEnter new password (min 8 characters):`);
                  if (!newPass) return;
                  if (newPass.length < 8) { alert('Password must be at least 8 characters'); return; }
                  api.patch(`/admin/users/${selectedUser.id}/reset-password`, { newPassword: newPass })
                    .then(() => alert('Password reset successfully!'))
                    .catch((err: any) => alert(err?.message ?? 'Failed to reset password'));
                }}
                className="w-full mt-2 border border-yellow-300 text-yellow-700 py-2.5 rounded-xl font-semibold hover:bg-yellow-50 text-sm"
              >
                🔑 Reset Password
              </button>
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {previewImg && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-2xl w-full">
            <img src={previewImg} className="w-full rounded-2xl" alt="Document preview" />
            <button className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow" onClick={() => setPreviewImg(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
