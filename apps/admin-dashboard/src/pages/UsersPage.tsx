import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=20&search=${search}`),
    placeholderData: (prev) => prev,
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'badge-green', SUSPENDED: 'badge-red',
      PENDING_VERIFICATION: 'badge-yellow', INACTIVE: 'badge-gray',
    };
    return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} total passengers</p>
        </div>
        <input
          className="input w-72"
          placeholder="Search by name, phone, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Phone', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-6 py-4 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : data?.data?.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 text-gray-500">{user.phone}</td>
                <td className="px-6 py-4 text-gray-500">{user.email ?? '—'}</td>
                <td className="px-6 py-4"><span className="badge badge-blue">{user.role}</span></td>
                <td className="px-6 py-4">{statusBadge(user.status)}</td>
                <td className="px-6 py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {user.status === 'ACTIVE' ? (
                    <button onClick={() => suspend.mutate(user.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Suspend</button>
                  ) : (
                    <button onClick={() => activate.mutate(user.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
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
