import { useState } from 'react';
import AdminShell from '../../pages/admin/AdminShell';

const ADMIN_PASSWORD = 'peta';

export default function AdminGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const urlPass = new URLSearchParams(window.location.search).get('pass');
  const [unlocked, setUnlocked] = useState(urlPass === ADMIN_PASSWORD);

  if (unlocked) {
    return <AdminShell profile={{ id: 'admin', display_name: 'Admin', role: 'admin' }} />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
    } else {
      setError('Password salah.');
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)' }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-80 shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚔️</div>
          <h1 className="text-white font-bold text-xl">PeTa Admin</h1>
          <p className="text-blue-200 text-sm mt-1">Masukkan password untuk lanjut</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password..."
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-sm bg-white/20 text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400 border border-white/20"
          />
          {error && <p className="text-red-300 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full bg-white text-blue-800 font-bold py-3 rounded-xl text-sm hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            Masuk →
          </button>
        </form>
      </div>
    </div>
  );
}
