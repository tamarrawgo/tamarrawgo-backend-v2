import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { formatCurrency } from '@tamarrawgo/shared-utils';

const STATUS_COLORS: Record<string, string> = {
  SEARCHING: 'badge-yellow', ACCEPTED: 'badge-blue', RIDER_ARRIVED: 'badge-blue',
  IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-red', EXPIRED: 'badge-gray',
};

const CANCELLABLE = new Set(['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS']);

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-semibold text-sm text-gray-800">{value ?? '—'}</span>
    </div>
  );
}

function TripDetailPanel({ trip, onClose }: { trip: any; onClose: () => void }) {
  const hasCoords = trip.pickupLatitude && trip.pickupLongitude && trip.dropoffLatitude && trip.dropoffLongitude;
  const mapSrc = hasCoords
    ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${trip.pickupLatitude},${trip.pickupLongitude}&destination=${trip.dropoffLatitude},${trip.dropoffLongitude}&mode=driving`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Map */}
        {mapSrc ? (
          <div className="h-64 w-full bg-gray-100">
            <iframe src={mapSrc} className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        ) : (
          <div className="h-40 w-full bg-gray-100 flex items-center justify-center text-gray-400">No coordinates available</div>
        )}

        <div className="p-6 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={`${STATUS_COLORS[trip.status] ?? 'badge-gray'} text-sm`}>{trip.status}</span>
            <span className="text-gray-400 text-xs">{trip.id.slice(0, 8)}...</span>
          </div>

          {/* Locations */}
          <div className="card bg-gray-50 space-y-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center mt-1">
                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
                <div className="w-0.5 h-8 bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Pickup</p>
                  <p className="text-sm font-medium">{trip.pickupAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dropoff</p>
                  <p className="text-sm font-medium">{trip.dropoffAddress || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* People */}
          <div className="card bg-gray-50 space-y-1">
            <h4 className="font-bold text-gray-700 mb-2">People</h4>
            <InfoRow label="Passenger" value={`${trip.passenger?.firstName ?? ''} ${trip.passenger?.lastName ?? ''}`.trim() || '—'} />
            <InfoRow label="Passenger Phone" value={trip.passenger?.phone} />
            <InfoRow label="Rider" value={trip.rider?.user ? `${trip.rider.user.firstName} ${trip.rider.user.lastName}` : '—'} />
            <InfoRow label="Rider Phone" value={trip.rider?.user?.phone} />
          </div>

          {/* Fare & Payment */}
          <div className="card bg-gray-50 space-y-1">
            <h4 className="font-bold text-gray-700 mb-2">Fare & Payment</h4>
            <InfoRow label="Estimated Fare" value={formatCurrency(Number(trip.estimatedFare ?? 0))} />
            <InfoRow label="Final Fare" value={trip.finalFare ? formatCurrency(Number(trip.finalFare)) : '—'} />
            <InfoRow label="Distance" value={trip.estimatedDistance ? `${Number(trip.estimatedDistance).toFixed(2)} km` : '—'} />
            <InfoRow label="Passenger Count" value={trip.passengerCount ?? 1} />
            <InfoRow label="Promo Code" value={trip.promoCode || 'None'} />
            {trip.payment && (
              <>
                <InfoRow label="Payment Status" value={trip.payment.status} />
                <InfoRow label="Commission" value={trip.payment.commission ? formatCurrency(Number(trip.payment.commission)) : '—'} />
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="card bg-gray-50 space-y-1">
            <h4 className="font-bold text-gray-700 mb-2">Timeline</h4>
            <InfoRow label="Created" value={new Date(trip.createdAt).toLocaleString()} />
            {trip.acceptedAt && <InfoRow label="Accepted" value={new Date(trip.acceptedAt).toLocaleString()} />}
            {trip.arrivedAt && <InfoRow label="Rider Arrived" value={new Date(trip.arrivedAt).toLocaleString()} />}
            {trip.completedAt && <InfoRow label="Completed" value={new Date(trip.completedAt).toLocaleString()} />}
            {trip.cancelledAt && <InfoRow label="Cancelled" value={new Date(trip.cancelledAt).toLocaleString()} />}
            {trip.cancellationReason && <InfoRow label="Cancel Reason" value={trip.cancellationReason} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['trips', page, status],
    queryFn: () => api.get(`/admin/trips?page=${page}&limit=20${status ? `&status=${status}` : ''}`) as any,
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: (tripId: string) => api.patch(`/admin/trips/${tripId}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Trip Monitoring</h1>
          <p className="text-gray-500 mt-1">{(data as any)?.total ?? 0} total trips</p>
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-48">
          <option value="">All Status</option>
          {['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Passenger', 'Rider', 'From', 'To', 'Fare', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-4 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : (data as any)?.data?.map((trip: any) => (
              <tr key={trip.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedTrip(trip)}>
                <td className="px-5 py-4 font-medium">{trip.passenger?.firstName} {trip.passenger?.lastName}</td>
                <td className="px-5 py-4 text-gray-500">{trip.rider?.user?.firstName ?? '—'} {trip.rider?.user?.lastName ?? ''}</td>
                <td className="px-5 py-4 text-gray-500 max-w-32 truncate">{trip.pickupAddress}</td>
                <td className="px-5 py-4 text-gray-500 max-w-32 truncate">{trip.dropoffAddress}</td>
                <td className="px-5 py-4 font-semibold text-primary">{formatCurrency(Number(trip.estimatedFare))}</td>
                <td className="px-5 py-4"><span className={STATUS_COLORS[trip.status] ?? 'badge-gray'}>{trip.status}</span></td>
                <td className="px-5 py-4 text-gray-400">{new Date(trip.createdAt).toLocaleString()}</td>
                <td className="px-5 py-4">
                  {CANCELLABLE.has(trip.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Cancel this booking for ${trip.passenger?.firstName}?`)) {
                          cancelMutation.mutate(trip.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">Page {page} of {(data as any)?.totalPages ?? 1}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= ((data as any)?.totalPages ?? 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {selectedTrip && <TripDetailPanel trip={selectedTrip} onClose={() => setSelectedTrip(null)} />}
    </div>
  );
}
