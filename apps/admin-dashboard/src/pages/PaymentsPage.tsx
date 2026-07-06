import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-stats'],
    queryFn: () => api.get('/admin/revenue-stats'),
    refetchInterval: 30000,
  });

  const reset = useMutation({
    mutationFn: () => api.post('/admin/revenue-reset', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenue-stats'] }); setConfirming(false); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
    </div>
  );

  const current = data?.current;
  const previousPeriods: any[] = data?.previousPeriods ?? [];
  const lastResetAt = data?.lastResetAt ? new Date(data.lastResetAt).toLocaleString() : null;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Revenue & Commissions</h1>
          <p className="text-gray-500 mt-1">
            {lastResetAt ? `Current period started: ${lastResetAt}` : 'All-time totals — no reset yet'}
          </p>
        </div>
        <div>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
            >
              Reset Revenue & Commission
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-sm text-red-700 font-medium">Are you sure? This cannot be undone.</span>
              <button
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
                className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-4 py-1.5"
              >
                {reset.isPending ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Period */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Current Period</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <StatCard title="Total Revenue" value={formatCurrency(current?.revenue ?? 0)} sub="Total fares collected" />
          <StatCard title="Total Commission (20%)" value={formatCurrency(current?.commission ?? 0)} sub="Platform earnings" />
        </div>
      </div>

      {/* Previous Periods */}
      {previousPeriods.length > 0 ? (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-400">Previous Periods</h2>
          {previousPeriods.map((period: any, index: number) => (
            <div key={index} className="opacity-60">
              <p className="text-sm font-medium text-gray-400 mb-3">
                Period {previousPeriods.length - index} — Reset on {new Date(period.resetAt).toLocaleString()}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <StatCard title="Total Revenue" value={formatCurrency(period.revenue ?? 0)} sub="Total fares collected" />
                <StatCard title="Total Commission (20%)" value={formatCurrency(period.commission ?? 0)} sub="Platform earnings" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mt-6">Previous period data will appear here after the first reset.</p>
      )}
    </div>
  );
}
