import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const DOC_TYPES = [
  { key: 'LICENSE', label: "Driver's License", icon: 'badge' },
  { key: 'REGISTRATION', label: 'OR/CR Document', icon: 'description' },
  { key: 'NBI_CLEARANCE', label: 'NBI or Police Clearance', icon: 'verified_user' },
  { key: 'MEDICAL_CERT', label: 'Medical Certificate', icon: 'medical_services' },
  { key: 'PROFILE_PHOTO', label: 'Your Photo (Selfie)', icon: 'person' },
];

const TRICYCLE_TYPES = [
  { key: 'TRICYCLE_FRONT', label: 'Front View' },
  { key: 'TRICYCLE_BACK', label: 'Back (with Plate Number)' },
  { key: 'TRICYCLE_LEFT', label: 'Left Side' },
  { key: 'TRICYCLE_RIGHT', label: 'Right Side' },
];

const ALL_KEYS = [...DOC_TYPES.map(d => d.key), ...TRICYCLE_TYPES.map(d => d.key)];

export default function PortalPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Record<string, { file: File; preview: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [message, setMessage] = useState('');
  const [tricycleOpen, setTricycleOpen] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const stored = localStorage.getItem('tg_user');
    if (!stored) { navigate('/login'); return; }
    setUser(JSON.parse(stored));
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const profile: any = await api.get('/users/profile');
      setUser(profile);
      localStorage.setItem('tg_user', JSON.stringify(profile));
      setSavedDocs(profile?.rider?.documents ?? []);
    } catch { }
  };

  const stageFile = (docType: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setStagedFiles(prev => ({ ...prev, [docType]: { file, preview } }));
    setMessage('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage('');
    let uploaded = 0;
    const entries = Object.entries(stagedFiles);
    try {
      for (const [docType, { file }] of entries) {
        setSaveProgress(`Uploading ${uploaded + 1} of ${entries.length}...`);
        const base64 = await fileToBase64(file);
        await api.post('/riders/upload-file', { base64, fileName: file.name, docType });
        uploaded++;
      }
      setStagedFiles({});
      setMessage(`All ${uploaded} documents saved successfully!`);
      await loadDocs();
    } catch (err: any) {
      setMessage(`Failed at document ${uploaded + 1}: ${err?.message ?? 'Upload error'}`);
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_refresh');
    localStorage.removeItem('tg_user');
    navigate('/login');
  };

  const isRider = user?.role === 'RIDER';
  const getSaved = (type: string) => savedDocs.find((d: any) => d.type === type);
  const getStaged = (type: string) => stagedFiles[type];
  const hasFile = (type: string) => !!getSaved(type) || !!getStaged(type);
  const allFilled = ALL_KEYS.every(k => hasFile(k));
  const stagedCount = Object.keys(stagedFiles).length;

  const renderDocRow = (dt: { key: string; label: string; icon?: string }, compact = false) => {
    const saved = getSaved(dt.key);
    const staged = getStaged(dt.key);
    const hasIt = !!saved || !!staged;
    const imgSrc = staged?.preview ?? saved?.fileUrl;

    return (
      <div key={dt.key} className={`flex items-center gap-${compact ? '3' : '4'} p-${compact ? '4' : '5'} rounded-${compact ? 'xl' : '2xl'} border-2 transition-colors ${hasIt ? 'border-[#1B6B2F] bg-[#E8F5E9]/50' : 'border-gray-200 bg-gray-50'}`}>
        {imgSrc ? (
          <img src={imgSrc} alt={dt.label} className={`${compact ? 'w-12 h-12 rounded-lg' : 'w-14 h-14 rounded-xl'} object-cover`} />
        ) : (
          <div className={`${compact ? 'w-12 h-12 rounded-lg' : 'w-14 h-14 rounded-xl'} bg-white border border-gray-200 flex items-center justify-center`}>
            <span className={`material-icons ${compact ? 'text-xl text-gray-400' : 'text-2xl text-[#1B6B2F]'}`}>{dt.icon ?? 'photo_camera'}</span>
          </div>
        )}
        <div className="flex-1">
          <p className={`font-bold ${compact ? 'text-sm' : 'text-sm'} text-[#0D1F13]`}>{dt.label}</p>
          <p className={`text-xs mt-0.5 ${hasIt ? 'text-[#1B6B2F] font-semibold' : 'text-gray-400'}`}>
            {staged ? 'Ready to save' : saved ? 'Saved' : 'Required'}
          </p>
        </div>
        <input type="file" accept="image/*" className="hidden"
          ref={(el) => { fileRefs.current[dt.key] = el; }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) stageFile(dt.key, f); e.target.value = ''; }}
        />
        <button onClick={() => fileRefs.current[dt.key]?.click()} disabled={saving}
          className={`${compact ? 'px-4 py-2 rounded-lg text-xs' : 'px-5 py-2.5 rounded-xl text-sm'} font-bold transition-colors ${hasIt ? 'bg-white border border-[#1B6B2F] text-[#1B6B2F] hover:bg-[#E8F5E9]' : 'bg-[#1B6B2F] text-white hover:bg-[#145224]'} disabled:opacity-50`}>
          {hasIt ? 'Change' : 'Select'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center text-2xl font-black text-[#1B6B2F]">
                {user?.firstName?.[0] ?? '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0D1F13]">{user?.firstName} {user?.lastName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user?.role === 'RIDER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {user?.role}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {user?.status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
              <span className="material-icons text-base">logout</span>
              Logout
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Phone</p>
              <p className="font-semibold">{user?.phone}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Email</p>
              <p className="font-semibold">{user?.email ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Document Upload (Riders only) */}
        {isRider ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-[#0D1F13] mb-2">Document Upload</h3>
            <p className="text-sm text-gray-500 mb-6">Select all required documents first, then click "Save Documents" to upload them all at once.</p>

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className="material-icons text-base">{message.includes('success') ? 'check_circle' : 'error'}</span>
                {message}
              </div>
            )}

            <div className="space-y-4">
              {DOC_TYPES.map((dt) => renderDocRow(dt))}

              {/* Tricycle Photos — expandable */}
              <div className={`rounded-2xl border-2 transition-colors ${TRICYCLE_TYPES.every(t => hasFile(t.key)) ? 'border-[#1B6B2F] bg-[#E8F5E9]/50' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => setTricycleOpen(!tricycleOpen)} className="flex items-center gap-4 p-5 w-full text-left">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <span className="material-icons text-2xl text-[#1B6B2F]">local_taxi</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#0D1F13]">Photos of Tricycle</p>
                    <p className="text-xs mt-0.5 text-gray-400">
                      {TRICYCLE_TYPES.filter(t => hasFile(t.key)).length} of {TRICYCLE_TYPES.length} selected
                    </p>
                  </div>
                  <span className="material-icons text-gray-400">{tricycleOpen ? 'expand_less' : 'expand_more'}</span>
                </button>

                {tricycleOpen && (
                  <div className="px-5 pb-5 space-y-3 border-t border-gray-200 pt-4">
                    {TRICYCLE_TYPES.map((dt) => renderDocRow(dt, true))}
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{ALL_KEYS.filter(k => hasFile(k)).length} of {ALL_KEYS.length} documents ready</span>
                {!allFilled && <span className="text-yellow-600">All fields required</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#1B6B2F] h-2 rounded-full transition-all" style={{ width: `${(ALL_KEYS.filter(k => hasFile(k)).length / ALL_KEYS.length) * 100}%` }} />
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveAll}
              disabled={!allFilled || saving || stagedCount === 0}
              className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${allFilled && stagedCount > 0 ? 'bg-[#1B6B2F] text-white hover:bg-[#145224] cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {saving ? (
                <>{saveProgress}</>
              ) : (
                <>
                  <span className="material-icons">cloud_upload</span>
                  Save Documents ({stagedCount} new)
                </>
              )}
            </button>

            {user?.rider?.status === 'PENDING' && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <span className="material-icons text-yellow-600 mt-0.5">info</span>
                <div>
                  <p className="text-sm font-bold text-yellow-800">Account Pending Approval</p>
                  <p className="text-xs text-yellow-600 mt-1">Your account is awaiting admin review. Please make sure all documents are uploaded.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-3xl text-[#1B6B2F]">check_circle</span>
            </div>
            <h3 className="text-lg font-bold text-[#0D1F13] mb-2">You're All Set!</h3>
            <p className="text-sm text-gray-500">Your passenger account is active. Use the app to book rides.</p>
          </div>
        )}
      </div>
    </div>
  );
}
