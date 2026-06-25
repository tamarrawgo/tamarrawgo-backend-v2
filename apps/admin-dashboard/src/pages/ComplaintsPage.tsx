import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ComplaintUser {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

interface Complaint {
  id: string;
  userType: string;
  type: string;
  details: string;
  status: string;
  adminNotes: string | null;
  bookingId: string | null;
  createdAt: string;
  user: ComplaintUser;
  reportedUser: ComplaintUser | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

export default function ComplaintsPage() {
  const [tab, setTab] = useState<'ALL' | 'PASSENGER' | 'RIDER'>('ALL');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchComplaints = async (userType: string, p: number) => {
    setLoading(true);
    try {
      const params = userType === 'ALL' ? `?page=${p}&limit=15` : `?userType=${userType}&page=${p}&limit=15`;
      const res: any = await api.get(`/admin/complaints${params}`);
      setComplaints(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); fetchComplaints(tab, 1); }, [tab]);
  useEffect(() => { fetchComplaints(tab, page); }, [page]);

  const handleUpdate = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);
    try {
      await api.patch(`/admin/complaints/${selected.id}`, { status: newStatus, adminNotes: adminNotes || undefined });
      setSelected(null);
      setAdminNotes('');
      fetchComplaints(tab, page);
    } catch {
      alert('Failed to update complaint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">Complaints</h1>
        <p className="text-gray-500 mt-1">Manage rider and passenger complaints</p>
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
            {t === 'ALL' ? 'All' : t === 'PASSENGER' ? 'Passengers' : 'Riders'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">{total} total</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No complaints found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Reported User</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{c.user.firstName} {c.user.lastName}</p>
                    <p className="text-xs text-gray-400">{c.user.phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      c.userType === 'PASSENGER' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {c.userType}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {c.reportedUser ? (
                      <div>
                        <p className="font-medium text-red-700">{c.reportedUser.firstName} {c.reportedUser.lastName}</p>
                        <p className="text-xs text-gray-400">{c.reportedUser.phone}</p>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{c.type}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{c.details}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { setSelected(c); setNewStatus(c.status); setAdminNotes(c.adminNotes ?? ''); }}
                      className="text-primary hover:underline font-medium text-xs"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={complaints.length < 15}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Review Complaint</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">From</span>
                <span className="text-sm font-medium">{selected.user.firstName} {selected.user.lastName} ({selected.userType})</span>
              </div>
              {selected.reportedUser && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Reported</span>
                  <span className="text-sm font-medium text-red-700">{selected.reportedUser.firstName} {selected.reportedUser.lastName} ({selected.reportedUser.phone})</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium">{selected.type}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Details</span>
                <p className="text-sm text-gray-800 mt-1 bg-gray-50 rounded-lg p-3">{selected.details}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="PENDING">Pending</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this complaint..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
