import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ReportedUserRow {
  reportedUserId: string;
  count: number;
  user: { id: string; firstName: string; lastName: string; phone: string; role: string; status: string } | null;
}

interface Complaint {
  id: string;
  userType: string;
  type: string;
  details: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; phone: string; role: string };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

export default function ComplaintsPage() {
  const [tab, setTab] = useState<'ALL' | 'PASSENGER' | 'RIDER'>('ALL');
  const [rows, setRows] = useState<ReportedUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<ReportedUserRow | null>(null);
  const [userComplaints, setUserComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReportedUsers = async (userType: string, p: number) => {
    setLoading(true);
    try {
      const params = userType === 'ALL' ? `?page=${p}&limit=15` : `?userType=${userType}&page=${p}&limit=15`;
      const res: any = await api.get(`/admin/complaints/reported-users${params}`);
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); fetchReportedUsers(tab, 1); }, [tab]);
  useEffect(() => { fetchReportedUsers(tab, page); }, [page]);

  const openUserDrawer = async (row: ReportedUserRow) => {
    setSelectedUser(row);
    setLoadingComplaints(true);
    setEditingId(null);
    try {
      const res: any = await api.get(`/admin/complaints/user/${row.reportedUserId}`);
      setUserComplaints(Array.isArray(res) ? res : []);
    } catch {
      setUserComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editStatus) return;
    setSaving(true);
    try {
      await api.patch(`/admin/complaints/${id}`, { status: editStatus, adminNotes: editNotes || undefined });
      setEditingId(null);
      if (selectedUser) openUserDrawer(selectedUser);
    } catch {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">Complaints</h1>
        <p className="text-gray-500 mt-1">Users reported by riders and passengers</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'PASSENGER', 'RIDER'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === t ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'ALL' ? 'All' : t === 'PASSENGER' ? 'By Passengers' : 'By Riders'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">{total} reported users</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No reported users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Name</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Phone</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Role</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Reports</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.reportedUserId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openUserDrawer(row)}
                      className="font-medium text-primary hover:underline text-left"
                    >
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Unknown'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{row.user?.phone ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${row.user?.role === 'RIDER' ? 'badge-blue' : 'badge-purple'}`}>
                      {row.user?.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      row.count >= 3 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {row.count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${row.user?.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                      {row.user?.status ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 15 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Previous</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={rows.length < 15} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* User Complaints Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setSelectedUser(null)} />
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-900">Reports & Complaints</h2>
              <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Reported User Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center text-red-600 font-black text-xl">
                  {selectedUser.user?.firstName?.[0]}{selectedUser.user?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {selectedUser.user?.firstName} {selectedUser.user?.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${selectedUser.user?.role === 'RIDER' ? 'badge-blue' : 'badge-purple'}`}>
                      {selectedUser.user?.role}
                    </span>
                    <span className={`badge ${selectedUser.user?.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                      {selectedUser.user?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="card bg-gray-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Phone</p>
                    <p className="font-semibold">{selectedUser.user?.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Reports</p>
                    <p className="font-black text-red-600 text-lg">{selectedUser.count}</p>
                  </div>
                </div>
              </div>

              {/* Complaints List */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3">Complaints ({userComplaints.length})</h4>
                {loadingComplaints ? (
                  <div className="text-center py-6 text-gray-400">Loading complaints...</div>
                ) : userComplaints.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">No complaints found</div>
                ) : (
                  <div className="space-y-3">
                    {userComplaints.map((c) => (
                      <div key={c.id} className="border rounded-xl p-4 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{c.type}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              by {c.user.firstName} {c.user.lastName} ({c.user.phone})
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-2">{c.details}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {editingId === c.id ? (
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                          ) : (
                            <button
                              onClick={() => { setEditingId(c.id); setEditStatus(c.status); setEditNotes(c.adminNotes ?? ''); }}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              Update Status
                            </button>
                          )}
                        </div>

                        {editingId === c.id && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="REVIEWED">Reviewed</option>
                              <option value="RESOLVED">Resolved</option>
                            </select>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Admin notes..."
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none"
                            />
                            <button
                              onClick={() => handleUpdate(c.id)}
                              disabled={saving}
                              className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}

                        {c.adminNotes && editingId !== c.id && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-gray-400">Admin Notes:</p>
                            <p className="text-xs text-gray-600">{c.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
