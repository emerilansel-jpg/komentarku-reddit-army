import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type TaskRow = {
  id: string;
  subreddit: string;
  thread_title: string;
  thread_url: string | null;
  admin_brief: string | null;
  priority: string;
  status: string;
  due_time: string | null;
  payment_amount: number;
  task_type: string;
  max_quantity: number;
  reward_amount: number;
  created_at: string;
  profiles?: { display_name: string } | null;
  reddit_accounts?: { username: string } | null;
};

const PRIORITY_CFG: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: 'Urgent', bg: '#fee2e2', color: '#b91c1c' },
  normal: { label: 'Normal', bg: '#fef9c3', color: '#854d0e' },
  low:    { label: 'Rendah', bg: '#f1f5f9', color: '#475569' },
};

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Menunggu',  bg: '#f1f5f9', color: '#475569' },
  submitted: { label: 'Direview',  bg: '#dbeafe', color: '#1d4ed8' },
  approved:  { label: 'Disetujui', bg: '#dcfce7', color: '#15803d' },
  rejected:  { label: 'Ditolak',   bg: '#fee2e2', color: '#b91c1c' },
  posted:    { label: 'Selesai',   bg: '#d1fae5', color: '#065f46' },
};

const TASK_TYPE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  vote:    { label: 'Vote',    bg: '#dbeafe', color: '#1d4ed8' },
  comment: { label: 'Comment', bg: '#dcfce7', color: '#15803d' },
  thread:  { label: 'Thread',  bg: '#ede9fe', color: '#6d28d9' },
};

const REWARD_BY_TYPE: Record<string, number> = { vote: 1000, comment: 10000, thread: 50000 };

function fmtRp(n: number) { return `Rp${(n / 1000).toFixed(0)}rb`; }

export default function TaskQueue() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => { loadTasks(); loadMembers(); loadAccounts(); }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(display_name), reddit_accounts(username)')
      .order('created_at', { ascending: false });
    setTasks((data || []) as TaskRow[]);
    setLoading(false);
  }

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('id, display_name').eq('role', 'army');
    setMembers(data || []);
  }

  async function loadAccounts() {
    const { data } = await supabase.from('reddit_accounts').select('id, username').eq('status', 'active');
    setAccounts(data || []);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus task ini?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const statuses = ['all', 'pending', 'submitted', 'approved', 'posted', 'rejected'];
  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const counts: Record<string, number> = { all: tasks.length };
  statuses.slice(1).forEach(s => { counts[s] = tasks.filter(t => t.status === s).length; });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Task Queue</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            {tasks.length} misi total Â· {counts.pending || 0} belum dikerjakan
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#0f172a', color: 'white', fontSize: 13, fontWeight: 700 }}>
          + Buat Task
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: filterStatus === s ? '#0f172a' : 'white',
              color: filterStatus === s ? 'white' : '#64748b',
              boxShadow: filterStatus === s ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
            }}>
            {s === 'all' ? 'Semua' : STATUS_CFG[s]?.label || s}
            <span style={{ marginLeft: 5, opacity: 0.7 }}>({counts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>ð­</div>
            <p>Tidak ada task</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Subreddit', 'Thread', 'Tipe', 'Prioritas', 'Status', 'Anggota', 'Reward', 'Deadline', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => {
                const pc = PRIORITY_CFG[task.priority] || PRIORITY_CFG.normal;
                const sc = STATUS_CFG[task.status] || STATUS_CFG.pending;
                const tc = TASK_TYPE_CFG[task.task_type] || TASK_TYPE_CFG.comment;
                const member = (task.profiles as { display_name: string } | null)?.display_name || 'â';
                const deadline = task.due_time ? new Date(task.due_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'â';
                return (
                  <tr key={task.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 12 }}>{task.subreddit}</span>
                    </td>
                    <td style={{ padding: '11px 16px', maxWidth: 220 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.thread_title}
                      </div>
                      {task.thread_url && (
                        <a href={task.thread_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>ð Buka</a>
                      )}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: tc.bg, color: tc.color }}>{tc.label}</span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: pc.bg, color: pc.color }}>{pc.label}</span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: '#334155' }}>{member}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                      {fmtRp(task.reward_amount || task.payment_amount)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{deadline}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <button onClick={() => handleDelete(task.id)}
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

      {showCreate && (
        <CreateTaskModal
          members={members}
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadTasks(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ members, accounts, onClose, onCreated }: {
  members: { id: string; display_name: string }[];
  accounts: { id: string; username: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    subreddit: '', thread_title: '', thread_url: '',
    admin_brief: '', priority: 'normal', assigned_to: '',
    reddit_account_id: '', due_hours: '24',
    task_type: 'comment', max_quantity: '1',
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }
  const reward = REWARD_BY_TYPE[form.task_type] || 10000;

  async function handleSave() {
    if (!form.subreddit || !form.thread_title) return;
    setSaving(true);
    const dueTime = new Date(Date.now() + parseInt(form.due_hours) * 3600000).toISOString();
    await supabase.from('tasks').insert({
      subreddit: form.subreddit.startsWith('r/') ? form.subreddit : `r/${form.subreddit}`,
      thread_title: form.thread_title,
      thread_url: form.thread_url || null,
      admin_brief: form.admin_brief || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      reddit_account_id: form.reddit_account_id || null,
      payment_amount: reward,
      reward_amount: reward,
      task_type: form.task_type,
      max_quantity: parseInt(form.max_quantity) || 1,
      due_time: dueTime,
      status: 'pending',
    });
    setSaving(false);
    onCreated();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, boxSizing: 'border-box', outline: 'none', background: 'white',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 0, marginBottom: 20 }}>Buat Task Baru</h3>

        {/* Task Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Jenis Task</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {Object.entries(TASK_TYPE_CFG).map(([type, cfg]) => {
              const active = form.task_type === type;
              return (
                <button key={type} type="button" onClick={() => set('task_type', type)}
                  style={{
                    padding: '10px 0', borderRadius: 10, border: `2px solid ${active ? cfg.color : '#e2e8f0'}`,
                    background: active ? cfg.bg : 'white', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, color: active ? cfg.color : '#94a3b8',
                  }}>
                  <div>{cfg.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>Rp{REWARD_BY_TYPE[type] / 1000}rb</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
            ð° Reward per slot: Rp{reward.toLocaleString('id-ID')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Subreddit *</label>
            <input value={form.subreddit} onChange={e => set('subreddit', e.target.value)} placeholder="r/indonesia" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Max Quantity</label>
            <input type="number" min="1" value={form.max_quantity} onChange={e => set('max_quantity', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Judul Thread *</label>
          <input value={form.thread_title} onChange={e => set('thread_title', e.target.value)} placeholder="Judul thread Reddit..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>URL Thread</label>
          <input value={form.thread_url} onChange={e => set('thread_url', e.target.value)} placeholder="https://reddit.com/r/..." style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Brief / Instruksi Khusus</label>
          <textarea value={form.admin_brief} onChange={e => set('admin_brief', e.target.value)}
            placeholder="Tuliskan arahan untuk prajurit..." rows={3}
            style={{ ...inputStyle, resize: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Prioritas</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} style={inputStyle}>
              <option value="high">Urgent</option>
              <option value="normal">Normal</option>
              <option value="low">Rendah</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Deadline (jam)</label>
            <input type="number" value={form.due_hours} onChange={e => set('due_hours', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Tugaskan ke</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={inputStyle}>
              <option value="">â Auto-assign â</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Akun Reddit</label>
            <select value={form.reddit_account_id} onChange={e => set('reddit_account_id', e.target.value)} style={inputStyle}>
              <option value="">â Pilih akun â</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !form.subreddit || !form.thread_title}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving || !form.subreddit || !form.thread_title ? 0.5 : 1 }}>
            {saving ? 'Menyimpan...' : 'Buat Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
