import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  APPROVE_RIDER:   { label: 'Rider Approved',       color: 'bg-green-100 text-green-800',  icon: 'check_circle' },
  REJECT_RIDER:    { label: 'Rider Rejected',        color: 'bg-red-100 text-red-800',      icon: 'cancel' },
  DELETE_USER:     { label: 'User Deleted',          color: 'bg-red-100 text-red-800',      icon: 'delete' },
  SUSPEND_USER:    { label: 'User Suspended',        color: 'bg-orange-100 text-orange-800',icon: 'block' },
  ACTIVATE_USER:   { label: 'User Activated',        color: 'bg-blue-100 text-blue-800',    icon: 'person_check' },
  APPROVE_TOPUP:   { label: 'Topup Approved',        color: 'bg-green-100 text-green-800',  icon: 'account_balance_wallet' },
  REJECT_TOPUP:    { label: 'Topup Rejected',        color: 'bg-red-100 text-red-800',      icon: 'money_off' },
  CANCEL_TRIP:     { label: 'Trip Cancelled',        color: 'bg-orange-100 text-orange-800',icon: 'directions_off' },
  RESET_PASSWORD:  { label: 'Password Reset',        color: 'bg-purple-100 text-purple-800',icon: 'lock_reset' },
};

const ACTION_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'APPROVE_RIDER', label: 'Rider Approved' },
  { value: 'REJECT_RIDER', label: 'Rider Rejected' },
  { value: 'DELETE_USER', label: 'User Deleted' },
  { value: 'SUSPEND_USER', label: 'User Suspended' },
  { value: 'ACTIVATE_USER', label: 'User Activated' },
  { value: 'APPROVE_TOPUP', label: 'Topup Approved' },
  { value: 'REJECT_TOPUP', label: 'Topup Rejected' },
  { value: 'CANCEL_TRIP', label: 'Trip Cancelled' },
  { value: 'RESET_PASSWORD', label: 'Password Reset' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DetailCard({ details }: { details: any }) {
  if (!details) return null;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <span key={k} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
          <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span> {String(v)}
        </span>
      ))}
    </div>
  );
}

export default function ActivityLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, page],
    queryFn: () => api.get(`/admin/audit-logs?page=${page}&limit=${limit}${actionFilter ? `&action=${actionFilter}` : ''}`),
    refetchInterval: 30000,
  });

  const logs = (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">All admin actions — last 90 days</p>
        </div>
        <span className="text-sm text-gray-500">{total} records</span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setActionFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              actionFilter === f.value
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <span className="material-icons text-4xl animate-spin">refresh</span>
            <p className="mt-2">Loading...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <span className="material-icons text-5xl">history</span>
            <p className="mt-2 font-medium">No activity logs yet</p>
            <p className="text-sm">Admin actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log: any) => {
              const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-700', icon: 'info' };
              return (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <span className="material-icons text-lg">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                        {log.user && (
                          <span className="text-xs text-gray-500">
                            by <span className="font-medium text-gray-700">{log.user.firstName} {log.user.lastName}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(log.createdAt)}</span>
                      </div>
                      <DetailCard details={log.newValues} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
