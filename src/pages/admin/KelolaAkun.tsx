import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type AccountRow = {
  id: string;
  username: string;
  karma: number;
  account_age_days: number;
  level: number;
  level_emoji: string;
  level_name: string;
  level_rate: number;
  status: string;
  assigned_to: string | null;
  profiles?: { display_name: string } | null;
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Aktif', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  inactive: { label: 'Nonaktif', bg: 'bg-gray-100', text: 'text-gray-600' },
  banned: { label: 'Banned', bg: 'bg-red-50', text: 'text-red-600' },
  warming: { label: 'Warming', bg: 'bg-amber-50', text: 'text-amber-700' },
};

function formatAge(days: number): string {
  if (days < 30) return `${days}h`;
  if (days < 365) return `${Math.floor(days / 30)}bln`;
  return `${Math.floor(days / 365)}th`;
}

export default function KelolaAkun() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);

  useEffect(() => {
    loadAccounts();
    loadMembers();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const { data } = await supabase
      .from('reddit_accounts')
      .select('*, profiles(display_name)')
      .order('karma', { ascending: false });
    if (data) setAccounts(data);
    setLoading(false);
  }

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('id, display_name').eq('role', 'army');
    if (data) setMembers(data);
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('reddit_accounts').update({ status }).eq('id', id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  const filtered = accounts.filter(a => {
    const matchSearch = !search || a.username.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchLevel = filterLevel === 'all' || a.level.toString() === filterLevel;
    return matchSearch && matchStatus && matchLevel;
  });

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-white">Kelola Akun Reddit 🔑</h1>
            <p className="text-blue-300 text-xs">{accounts.length} akun terdaftar</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            + Tambah
          </button>
        </div>
        <input
          type="text"
          placeholder="🔍 Cari username Reddit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm bg-white/15 text-white placeholder-blue-300 border border-white/20 focus:outline-none focus:bg-white/20"
        />
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {['all','active','warming','inactive','banned'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {s === 'all' ? 'Semua' : STATUS_CFG[s]?.label || s}
          </button>
        ))}
        <div className="w-px bg-gray-200 flex-shrink-0" />
        {['all','0','1','2','3','4','5'].map(l => (
          <button key={l} onClick={() => setFilterLevel(l)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterLevel === l ? 'bg-slate-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {l === 'all' ? 'Lv Semua' : `Lv.${l}`}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-24 space-y-2">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm">Tidak ada akun ditemukan</p>
          </div>
        ) : (
          filtered.map(account => {
            const sc = STATUS_CFG[account.status] || STATUS_CFG.inactive;
            const memberName = (account.profiles as any)?.display_name || '—';
            return (
              <div
                key={account.id}
                className="bg-white rounded-xl p-3.5 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                onClick={() => setSelectedAccount(account)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                      {account.level_emoji}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{account.username}</p>
                      <p className="text-xs text-gray-400">{account.level_emoji} Lv.{account.level} {account.level_name} · {memberName}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-orange-600 font-bold">⬆ {account.karma.toLocaleString()} karma</span>
                  <span className="text-xs text-gray-400">📅 {formatAge(account.account_age_days)}</span>
                  <span className="text-xs text-emerald-600 font-semibold">Rp{(account.level_rate/1000).toFixed(0)}rb/task</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          members={members}
          onClose={() => setSelectedAccount(null)}
          onStatusChange={(status) => { handleStatusChange(selectedAccount.id, status); setSelectedAccount({ ...selectedAccount, status }); }}
        />
      )}

      {showAddModal && (
        <AddAccountModal
          members={members}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { loadAccounts(); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}

function AccountDetailModal({ account, members, onClose, onStatusChange }: {
  account: AccountRow;
  members: { id: string; display_name: string }[];
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const memberName = (account.profiles as any)?.display_name || members.find(m => m.id === account.assigned_to)?.display_name || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm bounce-in p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}>
            {account.level_emoji}
          </div>
          <div>
            <p className="font-black text-gray-800">{account.username}</p>
            <p className="text-sm text-orange-500 font-semibold">Lv.{account.level} {account.level_name}</p>
            <p className="text-xs text-gray-400">Ditugaskan ke: {memberName}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl p-2 text-center bg-orange-50">
            <p className="font-black text-orange-600 text-sm">{account.karma.toLocaleString()}</p>
            <p className="text-xs text-orange-400">Karma</p>
          </div>
          <div className="rounded-xl p-2 text-center bg-emerald-50">
            <p className="font-black text-emerald-600 text-sm">{formatAge(account.account_age_days)}</p>
            <p className="text-xs text-emerald-400">Usia</p>
          </div>
          <div className="rounded-xl p-2 text-center bg-blue-50">
            <p className="font-black text-blue-600 text-sm">Rp{(account.level_rate/1000).toFixed(0)}rb</p>
            <p className="text-xs text-blue-400">Rate</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 mb-2">Ubah Status:</p>
          <div className="flex gap-2 flex-wrap">
            {['active','warming','inactive','banned'].map(s => (
              <button key={s} onClick={() => onStatusChange(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${account.status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                {STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
          Tutup
        </button>
      </div>
    </div>
  );
}

function AddAccountModal({ members, onClose, onAdded }: {
  members: { id: string; display_name: string }[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [username, setUsername] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    await supabase.from('reddit_accounts').insert({
      username: username.startsWith('u/') ? username : `u/${username}`,
      assigned_to: assignedTo || null,
      karma: 0, account_age_days: 0, level: 0, level_name: 'Si Telur',
      level_emoji: '🥚', karma_next_level: 5, status: 'warming', task_rate: 0, level_rate: 8000,
    });
    setSaving(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm bounce-in p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-gray-800 text-lg mb-4">+ Tambah Akun Reddit</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Username Reddit</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="u/username_reddit"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Tugaskan ke (opsional)</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
              <option value="">— Pilih Anggota —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 text-sm">Batal</button>
          <button onClick={handleSave} disabled={saving || !username.trim()}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
