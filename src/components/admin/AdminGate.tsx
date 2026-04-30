import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Admin email is fixed — user only needs to enter password
const ADMIN_EMAIL = 'n311311@gmail.com';

export default function AdminGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password,
    });
    if (authErr) {
      setError('Password salah.');
      setLoading(false);
    }
    // On success: Supabase onAuthStateChange fires → App re-renders → AdminShell shown
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
            disabled={loading || !password.trim()}
            className="w-full bg-white text-blue-800 font-bold py-3 rounded-xl text-sm hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            {loading ? 'Masuk...' : 'Masuk →'}
          </button>
        </form>
      </div>
    </div>
  );
}
