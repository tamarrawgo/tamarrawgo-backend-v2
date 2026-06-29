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

export default function PortalPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
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
      setDocs(profile?.rider?.documents ?? []);
    } catch { }
  };

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    setMessage('');
    try {
      const base64 = await fileToBase64(file);
      await api.post('/riders/upload-file', {
        base64,
        fileName: file.name,
        docType,
      });
      setMessage(`${docType} uploaded successfully!`);
      await loadDocs();
    } catch (err: any) {
      setMessage(err?.message ?? 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_refresh');
    localStorage.removeItem('tg_user');
    navigate('/login');
  };

  const isRider = user?.role === 'RIDER';
  const getDoc = (type: string) => docs.find((d: any) => d.type === type);

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
            <p className="text-sm text-gray-500 mb-6">Upload clear photos of your documents for verification.</p>

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className="material-icons text-base">{message.includes('success') ? 'check_circle' : 'error'}</span>
                {message}
              </div>
            )}

            <div className="space-y-4">
              {DOC_TYPES.map((dt) => {
                const existing = getDoc(dt.key);
                const isUploading = uploading === dt.key;
                return (
                  <div key={dt.key} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-colors ${existing ? 'border-[#1B6B2F] bg-[#E8F5E9]/50' : 'border-gray-200 bg-gray-50'}`}>
                    {existing ? (
                      <img src={existing.fileUrl} alt={dt.label} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        <span className="material-icons text-2xl text-[#1B6B2F]">{dt.icon}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-sm text-[#0D1F13]">{dt.label}</p>
                      <p className={`text-xs mt-0.5 ${existing ? 'text-[#1B6B2F] font-semibold' : 'text-gray-400'}`}>
                        {existing ? 'Uploaded' : 'Not uploaded yet'}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileRefs.current[dt.key] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(dt.key, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => fileRefs.current[dt.key]?.click()}
                      disabled={isUploading}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${existing ? 'bg-white border border-[#1B6B2F] text-[#1B6B2F] hover:bg-[#E8F5E9]' : 'bg-[#1B6B2F] text-white hover:bg-[#145224]'} disabled:opacity-50`}
                    >
                      {isUploading ? 'Uploading...' : existing ? 'Replace' : 'Upload'}
                    </button>
                  </div>
                );
              })}

              {/* Tricycle Photos — expandable */}
              <div className={`rounded-2xl border-2 transition-colors ${TRICYCLE_TYPES.every(t => getDoc(t.key)) ? 'border-[#1B6B2F] bg-[#E8F5E9]/50' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => setTricycleOpen(!tricycleOpen)} className="flex items-center gap-4 p-5 w-full text-left">
                  <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <span className="material-icons text-2xl text-[#1B6B2F]">local_taxi</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-[#0D1F13]">Photos of Tricycle</p>
                    <p className="text-xs mt-0.5 text-gray-400">
                      {TRICYCLE_TYPES.filter(t => getDoc(t.key)).length} of {TRICYCLE_TYPES.length} uploaded
                    </p>
                  </div>
                  <span className="material-icons text-gray-400">{tricycleOpen ? 'expand_less' : 'expand_more'}</span>
                </button>

                {tricycleOpen && (
                  <div className="px-5 pb-5 space-y-3 border-t border-gray-200 pt-4">
                    {TRICYCLE_TYPES.map((dt) => {
                      const existing = getDoc(dt.key);
                      const isUploading = uploading === dt.key;
                      return (
                        <div key={dt.key} className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${existing ? 'border-[#1B6B2F] bg-[#E8F5E9]/30' : 'border-gray-200 bg-white'}`}>
                          {existing ? (
                            <img src={existing.fileUrl} alt={dt.label} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <span className="material-icons text-xl text-gray-400">photo_camera</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-[#0D1F13]">{dt.label}</p>
                            <p className={`text-xs ${existing ? 'text-[#1B6B2F]' : 'text-gray-400'}`}>
                              {existing ? 'Uploaded' : 'Required'}
                            </p>
                          </div>
                          <input type="file" accept="image/*" className="hidden"
                            ref={(el) => { fileRefs.current[dt.key] = el; }}
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(dt.key, file); e.target.value = ''; }}
                          />
                          <button onClick={() => fileRefs.current[dt.key]?.click()} disabled={isUploading}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${existing ? 'bg-white border border-[#1B6B2F] text-[#1B6B2F]' : 'bg-[#1B6B2F] text-white'} disabled:opacity-50`}>
                            {isUploading ? '...' : existing ? 'Replace' : 'Upload'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

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
