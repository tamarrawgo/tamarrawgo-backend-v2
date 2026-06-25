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
          baseFare: Number(res.baseFare),
          ratePerKm: Number(res.ratePerKm),
          ratePerMinute: Number(res.ratePerMinute),
          minimumFare: Number(res.minimumFare),
          peakSurge: Number(res.peakSurge),
          nightSurge: Number(res.nightSurge),
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
    const num = parseFloat(value);
    if (!isNaN(num)) setConfig({ ...config, [field]: num });
  };

  const fields: { key: keyof FareConfig; label: string; desc: string; prefix: string }[] = [
    { key: 'baseFare', label: 'Base Fare', desc: 'Minimum starting fare', prefix: '₱' },
    { key: 'ratePerKm', label: 'Rate per km', desc: 'Distance charge', prefix: '₱' },
    { key: 'ratePerMinute', label: 'Rate per minute', desc: 'Time-based charge', prefix: '₱' },
    { key: 'minimumFare', label: 'Minimum Fare', desc: 'Minimum chargeable amount', prefix: '₱' },
    { key: 'peakSurge', label: 'Peak Surge', desc: '7-9am, 5-8pm weekdays', prefix: '' },
    { key: 'nightSurge', label: 'Night Differential', desc: '10pm - 5am', prefix: '' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">System configuration and fare management</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fare Configuration</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading fare configuration...</div>
          ) : error && !config ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : config ? (
            <>
              <div className="space-y-4">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {f.prefix && <span className="text-primary font-bold text-lg">{f.prefix}</span>}
                      <input
                        type="number"
                        step={f.key.includes('Surge') ? '0.1' : '1'}
                        min="0"
                        value={config[f.key]}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        className="w-24 text-right text-lg font-bold text-primary border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                      {f.key.includes('Surge') && <span className="text-primary font-bold text-lg">x</span>}
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              {success && <p className="text-green-600 text-sm mt-3 font-medium">{success}</p>}

              <button
                className="mt-4 btn-primary w-full disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update Fare Rates'}
              </button>
            </>
          ) : null}
        </div>

        <div className="card">
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
