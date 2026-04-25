import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react';

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug / Error' },
  { value: 'saran', label: '💡 Saran' },
  { value: 'pertanyaan', label: '❓ Pertanyaan' },
  { value: 'lainnya', label: '📌 Lainnya' },
];

interface FeedbackFormProps {
  userId: string;
  onBack: () => void;
}

export default function FeedbackForm({ userId, onBack }: FeedbackFormProps) {
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('feedback').insert({
      user_id: userId,
      type,
      title: title.trim(),
      description: description.trim(),
      screenshot_url: screenshotUrl.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError('Gagal mengirim laporan. Coba lagi.');
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center"
        style={{ background: '#f0f4ff' }}>
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Terima kasih!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Laporan kamu sudah diterima dan akan kami tinjau segera.
        </p>
        <button
          onClick={onBack}
          className="px-8 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f0f4ff' }}>
      <div className="px-4 pt-5 pb-5"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Laporan & Saran</h1>
            <p className="text-blue-200 text-xs">Bantu kami jadi lebih baik</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-sm font-black text-gray-800 mb-4">Detail Laporan</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Jenis</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                        type === t.value
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Judul</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ringkasan singkat masalah/saran"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Deskripsi</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan secara detail..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  URL Screenshot <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="url"
                  value={screenshotUrl}
                  onChange={e => setScreenshotUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isValid ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e5e7eb',
              color: isValid ? 'white' : '#9ca3af',
              boxShadow: isValid ? '0 4px 16px rgba(37,99,235,0.3)' : 'none',
            }}>
            {submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </form>
      </div>
    </div>
  );
}
