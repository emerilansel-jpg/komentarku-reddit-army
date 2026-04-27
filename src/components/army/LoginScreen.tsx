import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let err: string | null;
    if (mode === 'login') {
      err = await signIn(email, password);
    } else {
      if (!displayName.trim()) {
        setError('Nama tidak boleh kosong');
        setSubmitting(false);
        return;
      }
      err = await signUp(email, password, displayName.trim());
    }

    if (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
  }

  const isLoading = loading || submitting;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="float-animation mb-5">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            ⚔️
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-1 tracking-tight">KomentarKu</h1>
        <p className="text-blue-300 text-sm mb-8 font-medium">Platform Manajemen Komentar 🚀</p>

        <div
          className="w-full rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex rounded-xl overflow-hidden mb-5" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="flex-1 py-2 text-sm font-bold transition-all"
              style={{
                background: mode === 'login' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: mode === 'login' ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="flex-1 py-2 text-sm font-bold transition-all"
              style={{
                background: mode === 'register' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: mode === 'register' ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-blue-200 mb-1">Nama Tampilan</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nama kamu..."
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@kamu.com"
                required
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                required
                minLength={6}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              />
            </div>

            {error && (
              <div className="rounded-xl px-3.5 py-2.5 text-xs text-red-200 font-medium"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
            >
              {isLoading
                ? '⏳ Memuat...'
                : mode === 'login'
                ? '🚀 Masuk'
                : '✨ Buat Akun'}
            </button>
          </form>
        </div>

        <p className="text-blue-400 text-xs text-center mt-5">
          {mode === 'login'
            ? 'Belum punya akun? Klik Daftar di atas'
            : 'Sudah punya akun? Klik Masuk di atas'}
        </p>
      </div>
    </div>
  );
}
