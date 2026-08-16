import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface FareConfig {
  id: string;
  baseFare: number;
  ratePerKm: number;
  ratePerMinute: number;
  minimumFare: number;
  peakSurge: number;
  nightSurge: number;
  deliveryBaseFare: number;
  deliveryRatePerKm: number;
  pabiliBaseFare: number;
  pabiliRatePerKm: number;
  pabiliServiceFee: number;
  commissionRate: number;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<FareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/admin/fare-config')
      .then((res: any) => {
        setConfig({
          id: res.id,
          commissionRate: Math.round(Number(res.commissionRate ?? 0.20) * 100),
          baseFare: Number(res.baseFare),
          ratePerKm: Number(res.ratePerKm),
          ratePerMinute: Number(res.ratePerMinute),
          minimumFare: Number(res.minimumFare),
          peakSurge: Number(res.peakSurge),
          nightSurge: Number(res.nightSurge),
          deliveryBaseFare: Number(res.deliveryBaseFare ?? 80),
          deliveryRatePerKm: Number(res.deliveryRatePerKm ?? 12),
          pabiliBaseFare: Number(res.pabiliBaseFare ?? 60),
          pabiliRatePerKm: Number(res.pabiliRatePerKm ?? 10),
          pabiliServiceFee: Number(res.pabiliServiceFee ?? 20),
        });
      })
      .catch(() => setError('Failed to load fare configuration'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch('/admin/fare-config', {
        baseFare: config.baseFare,
        ratePerKm: config.ratePerKm,
        ratePerMinute: config.ratePerMinute,
        minimumFare: config.minimumFare,
        peakSurge: config.peakSurge,
        nightSurge: config.nightSurge,
        deliveryBaseFare: config.deliveryBaseFare,
        deliveryRatePerKm: config.deliveryRatePerKm,
        pabiliBaseFare: config.pabiliBaseFare,
        pabiliRatePerKm: config.pabiliRatePerKm,
        pabiliServiceFee: config.pabiliServiceFee,
        commissionRate: config.commissionRate / 100,
      });
      setSuccess('Fare rates updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update fare rates');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof FareConfig, value: string) => {
    if (!config) return;
    let num = parseFloat(value);
    if (isNaN(num)) return;
    if (field === 'commissionRate') num = Math.min(Math.max(Math.round(num), 10), 20);
    setConfig({ ...config, [field]: num });
  };

  const Field = ({ field, label, desc, isSurge = false }: { field: keyof FareConfig; label: string; desc: string; isSurge?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <div className="flex items-center gap-1">
        {!isSurge && <span className="text-primary font-bold text-lg">₱</span>}
        <input
          type="number"
          step={isSurge ? '0.1' : '1'}
          min="0"
          value={config?.[field] ?? ''}
          onChange={(e) => updateField(field, e.target.value)}
          className="w-24 text-right text-lg font-bold text-primary border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
        {isSurge && <span className="text-primary font-bold text-lg">x</span>}
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">System configuration and fare management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Ride Fare */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🛺 Ride Fare</h2>
            <p className="text-xs text-gray-400 mb-4">Standard tricycle rides — passenger bookings</p>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : error && !config ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : config ? (
              <>
                <Field field="baseFare" label="Base Fare" desc="Minimum starting fare" />
                <Field field="ratePerKm" label="Rate per km" desc="Distance charge" />
                <Field field="ratePerMinute" label="Rate per minute" desc="Time-based charge" />
                <Field field="minimumFare" label="Minimum Fare" desc="Minimum chargeable amount" />
                <Field field="peakSurge" label="Peak Surge" desc="7–9am, 5–8pm weekdays" isSurge />
                <Field field="nightSurge" label="Night Differential" desc="10pm – 5am" isSurge />
              </>
            ) : null}
          </div>

          {/* Delivery Fare */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-1">📦 Delivery Fare</h2>
            <p className="text-xs text-gray-400 mb-4">Lalamove-style motorcycle delivery — small packages</p>
            {config ? (
              <>
                <Field field="deliveryBaseFare" label="Base Fare" desc="Minimum charge per delivery" />
                <Field field="deliveryRatePerKm" label="Rate per km" desc="Distance charge for delivery" />
                <div className="mt-3 bg-blue-50 rounded-lg px-4 py-2 text-xs text-blue-700">
                  Formula: <strong>Base Fare + (Distance × Rate/km)</strong>
                </div>
              </>
            ) : null}
          </div>

          {/* Pabili Fare */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🛒 Pabili Fare</h2>
            <p className="text-xs text-gray-400 mb-4">Grab Pabili-style errand — rider buys items for passenger</p>
            {config ? (
              <>
                <Field field="pabiliBaseFare" label="Base Fare" desc="Minimum delivery fee" />
                <Field field="pabiliRatePerKm" label="Rate per km" desc="Distance charge" />
                <Field field="pabiliServiceFee" label="Service / Errand Fee" desc="Flat fee for doing the shopping" />
                <div className="mt-3 bg-purple-50 rounded-lg px-4 py-2 text-xs text-purple-700">
                  Formula: <strong>Base Fare + (Distance × Rate/km) + Service Fee</strong> — item budget paid directly to rider
                </div>
              </>
            ) : null}
          </div>

          {/* Commission */}
          {config && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-1">💰 Commission Rate</h2>
              <p className="text-xs text-gray-400 mb-4">Platform cut from each completed trip (10–20%)</p>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-800">Commission %</p>
                  <p className="text-xs text-gray-400">Applied on rider payout after each trip</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="20"
                    value={config.commissionRate}
                    onChange={(e) => updateField('commissionRate', e.target.value)}
                    className="w-20 text-right text-lg font-bold text-primary border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  <span className="text-primary font-bold text-lg">%</span>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg px-4 py-2 text-xs text-yellow-700">
                Range: 10% – 20%. Changes take effect on the next completed trip.
              </div>
            </div>
          )}

          {config && (
            <div>
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              {success && <p className="text-green-600 text-sm mb-2 font-medium">{success}</p>}
              <button
                className="btn-primary w-full disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update All Fare Rates'}
              </button>
            </div>
          )}
        </div>

        <div className="card h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">System Info</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Platform', 'TamarrawGo v1.0.0'],
              ['Backend', 'NestJS + PostgreSQL'],
              ['Real-time', 'Socket.IO'],
              ['Maps', 'Google Maps Platform'],
              ['Notifications', 'Firebase FCM'],
              ['Deployment', 'Railway'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
