export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">System configuration and fare management</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fare Configuration</h2>
          <div className="space-y-4">
            {[
              { label: 'Base Fare', value: '₱40.00', desc: 'Minimum starting fare' },
              { label: 'Rate per km', value: '₱15.00', desc: 'Distance charge' },
              { label: 'Rate per minute', value: '₱2.00', desc: 'Time-based charge' },
              { label: 'Minimum Fare', value: '₱50.00', desc: 'Minimum chargeable amount' },
              { label: 'Peak Surge', value: '1.5x', desc: '7-9am, 5-8pm weekdays' },
              { label: 'Night Differential', value: '1.2x', desc: '10pm - 5am' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <span className="font-bold text-primary text-lg">{item.value}</span>
              </div>
            ))}
          </div>
          <button className="mt-4 btn-primary w-full">Update Fare Rates</button>
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
