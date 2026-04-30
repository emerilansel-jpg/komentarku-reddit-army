import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Account = {
  id: string;
  username: string;
  status: string;
  level: number;
  level_emoji: string;
  level_name: string;
  level_rate: number;
  karma: number;
  post_karma: number;
  comment_karma: number;
  age_days: number;
  created_at: string;
  assigned_to: string | null;
  profiles?: { display_name: string } | null;
};

const LEVEL_CONFIGS = [
  { level: 1, emoji: 'ð¥', name: 'Si Telur',   rate: 8000 },
  { level: 2, emoji: 'ð£', name: 'Tukik',      rate: 10000 },
  { level: 3, emoji: 'ð¥', name: 'Piyik',      rate: 12000 },
  { level: 4, emoji: 'ð¦', name: 'Burung',     rate: 15000 },
  { level: 5, emoji: 'ð¦', name: 'Elang',      rate: 20000 },
];

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: 'Aktif',     bg: '#dcfce7', color: '#15803d' },
  inactive: { label: 'Nonaktif',  bg: '#f1f5f9', color: '#475569' },
  banned:   { label: 'Banned',    bg: '#fee2e2', color: '#b91c1c' },
  resting:  { label: 'Istirahat', bg: '#fef9c3', color: '#854d0e' },
};

type ModalMode = 'add' | 'detail';

export default function KelolaAkun() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ mode: ModalMode; account?: Account } | null>(null);
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);

  useEffect(() => { load(); loadMembers(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('reddit_accounts')
      .select('*, profiles(display_name)')
      .order('level', { ascending: false });
    setAccounts((data || []) as Account[]);
    setLoading(false);
  }

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('id, display_name').eq('role', 'army');
    setMembers(data || []);
  }

  const filtered = accounts.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchLevel = filterLevel === 'all' || String(a.level) === filterLevel;
    const matchSearch = !search || a.username.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchLevel && matchSearch;
  });

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('reddit_accounts').update({ status }).eq('id', id);
    load();
  }

  async function handleLevelChange(id: string, level: number) {
    const cfg = LEVEL_CONFIGS.find(l => l.level === level);
    if (!cfg) return;
    await supabase.from('reddit_accounts').update({
      level: cfg.level,
      level_emoji: cfg.emoji,
      level_name: cfg.name,
      level_rate: cfg.rate,
    }).eq('id', id);
    load();
  }

  async function handleAssign(id: string, memberId: string) {
    await supabase.from('reddit_accounts').update({ assigned_to: memberId || null }).eq('id', id);
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus akun ini?')) return;
    await supabase.from('reddit_accounts').delete().eq('id', id);
    load();
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Kelola Akun Reddit</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>{accounts.length} akun terdaftar</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          style={{
            padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#0f172a', color: 'white', fontSize: 13, fontWeight: 700,
          }}>
          + Tambah Akun
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari username..."
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13,
            outline: 'none', background: 'white', width: 200,
          }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="resting">Istirahat</option>
          <option value="banned">Banned</option>
        </select>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="all">Semua Level</option>
          {LEVEL_CONFIGS.map(l => (
            <option key={l.level} value={String(l.level)}>{l.emoji} {l.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>{filtered.length} akun</span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>ð</div>
            <p>Tidak ada akun ditemukan</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Username', 'Level', 'Karma', 'Umur', 'Status', 'Anggota', 'Rate/Misi', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc, i) => {
                const sc = STATUS_CFG[acc.status] || STATUS_CFG.inactive;
                const member = (acc.profiles as { display_name: string } | null)?.display_name || 'â';
                return (
                  <tr key={acc.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{acc.level_emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{acc.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      <select
                        value={acc.level}
                        onChange={e => handleLevelChange(acc.id, parseInt(e.target.value))}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                        {LEVEL_CONFIGS.map(l => (
                          <option key={l.level} value={l.level}>{l.emoji} {l.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: 13, color: '#334155' }}>
                      {acc.karma?.toLocaleString('id-ID') || 'â'}
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {acc.age_days ? `${acc.age_days}h` : 'â'}
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      <select
                        value={acc.status}
                        onChange={e => handleStatusChange(acc.id, e.target.value)}
                        style={{
                          fontSize: 12, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                          background: sc.bg, color: sc.color,
                        }}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      <select
                        value={acc.assigned_to || ''}
                        onChange={e => handleAssign(acc.id, e.target.value)}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                        <option value="">â Belum assigned â</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: 13, fontWeight: 700, color: '#059669' }}>
                      Rp{((acc.level_rate || 8000) / 1000).toFixed(0)}rb
                    </td>
                    <td style={{ padding: '11px 18px' }}>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 600 }}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <AddAccountModal
          members={members}
          onClose={() => setModal(null)}
          onCreated={() => { load(); setModal(null); }}
        />
      )}
    </div>
  );
}

function AddAccountModal({ members, onClose, onCreated }: {
  members: { id: string; display_name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ username: '', status: 'active', level: '1', assigned_to: '', karma: '', age_days: '' });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.username) return;
    setSaving(true);
    const cfg = LEVEL_CONFIGS.find(l => l.level === parseInt(form.level)) || LEVEL_CONFIGS[0];
    await supabase.from('reddit_accounts').insert({
      username: form.username,
      status: form.status,
      level: cfg.level,
      level_emoji: cfg.emoji,
      level_name: cfg.name,
      level_rate: cfg.rate,
      karma: parseInt(form.karma) || 0,
      post_karma: 0,
      comment_karma: parseInt(form.karma) || 0,
      age_days: parseInt(form.age_days) || 0,
      assigned_to: form.assigned_to || null,
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 0, marginBottom: 20 }}>Tambah Akun Reddit</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Username Reddit *', key: 'username', type: 'text', placeholder: 'u/username' },
            { label: 'Total Karma', key: 'karma', type: 'number', placeholder: '0' },
            { label: 'Umur Akun (hari)', key: 'age_days', type: 'number', placeholder: '0' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                onChange={e => set(f.key, e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Level</label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white' }}>
                {LEVEL_CONFIGS.map(l => <option key={l.level} value={l.level}>{l.emoji} {l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475369', display: 'block', marginBottom: 6 }}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white' }}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="resting">Istirahat</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Tugaskan ke</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white' }}>
              <option value="">â Belum assigned â</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !form.username}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving || !form.username ? 0.5 : 1 }}>
            {saving ? 'Menyimpan...' : 'Tambah Akun'}
          </button>
        </div>
      </div>
    </div>
  );
}
