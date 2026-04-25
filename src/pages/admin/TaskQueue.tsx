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

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  high: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50', border: 'border-l-red-500' },
  normal: { label: 'Normal', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-400' },
  low: { label: 'Rendah', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-l-gray-300' },
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Menunggu', bg: 'bg-gray-100', text: 'text-gray-600' },
  submitted: { label: 'Direview', bg: 'bg-blue-50', text: 'text-blue-600' },
  approved: { label: 'Disetujui', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: 'Ditolak', bg: 'bg-red-50', text: 'text-red-600' },
  posted: { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const TASK_TYPE_CFG: Record<string, { label: string; bg: string; text: string; reward: number }> = {
  vote: { label: 'Vote', bg: 'bg-blue-100', text: 'text-blue-700', reward: 1000 },
  comment: { label: 'Comment', bg: 'bg-green-100', text: 'text-green-700', reward: 10000 },
  thread: { label: 'Thread', bg: 'bg-violet-100', text: 'text-violet-700', reward: 50000 },
};

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + '...' : s; }
function fmtRp(n: number) { return n >= 1000 ? `Rp${(n / 1000).toFixed(0)}rb` : `Rp${n}`; }

export default function TaskQueue() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; username: string }[]>([]);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTasks();
    loadMembers();
    loadAccounts();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(display_name), reddit_accounts(username)')
      .order('created_at', { ascending: false });
    if (data) {
      setTasks(data);
      loadSlotCounts(data.map((t: TaskRow) => t.id));
    }
    setLoading(false);
  }

  async function loadSlotCounts(taskIds: string[]) {
    if (!taskIds.length) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, assigned_to')
      .in('id', taskIds);
    const counts: Record<string, number> = {};
    if (data) {
      data.forEach((t: { id: string; assigned_to: string | null }) => {
        if (t.assigned_to) counts[t.id] = (counts[t.id] || 0) + 1;
      });
    }
    setSlotCounts(counts);
  }

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('id, display_name').eq('role', 'army');
    if (data) setMembers(data);
  }

  async function loadAccounts() {
    const { data } = await supabase.from('reddit_accounts').select('id, username').eq('status', 'active');
    if (data) setAccounts(data);
  }

  async function handleDelete(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-black text-white">Task Queue</h1>
            <p className="text-blue-300 text-xs">{tasks.length} misi · {tasks.filter(t => t.status === 'pending').length} belum dikerjakan</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            + Buat Task
          </button>
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {['all', 'pending', 'submitted', 'approved', 'posted', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {s === 'all' ? 'Semua' : STATUS_CFG[s]?.label || s}
            {s !== 'all' && (
              <span className="ml-1 opacity-70">({tasks.filter(t => t.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-24 space-y-2">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">Tidak ada task</p>
          </div>
        ) : (
          filtered.map(task => {
            const pc = PRIORITY_CFG[task.priority] || PRIORITY_CFG.normal;
            const sc = STATUS_CFG[task.status] || STATUS_CFG.pending;
            const tc = TASK_TYPE_CFG[task.task_type] || TASK_TYPE_CFG.comment;
            const memberName = (task.profiles as { display_name: string } | null)?.display_name || '—';
            const accountName = (task.reddit_accounts as { username: string } | null)?.username || '—';
            const filled = slotCounts[task.id] || (task.profiles ? 1 : 0);
            const maxQ = task.max_quantity || 1;
            const slotFull = filled >= maxQ;
            return (
              <div key={task.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${pc.border} overflow-hidden`}
                style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{task.subreddit}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>{pc.label}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{truncate(task.thread_title, 55)}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600 flex-shrink-0">{fmtRp(task.reward_amount || task.payment_amount)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: maxQ }).map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < filled ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <span className={`text-xs font-semibold ${slotFull ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {filled}/{maxQ} slot
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">👤 {memberName}</span>
                      <span className="text-xs text-gray-400">{accountName}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors">
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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

  const REWARD_BY_TYPE: Record<string, number> = {
    vote: 1000,
    comment: 10000,
    thread: 50000,
  };

  function set(key: string, val: string) {
    if (key === 'task_type') {
      setForm(f => ({ ...f, task_type: val }));
    } else {
      setForm(f => ({ ...f, [key]: val }));
    }
  }

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

  return (
    <div className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-2xl mx-auto p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-gray-800 text-lg mb-4">Buat Task Baru</h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">Jenis Task</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(REWARD_BY_TYPE).map(([type]) => {
                const cfg = TASK_TYPE_CFG[type];
                const active = form.task_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('task_type', type)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? `${cfg.bg} ${cfg.text} border-current` : 'bg-white text-gray-400 border-gray-200'}`}>
                    <div>{cfg.label}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${active ? cfg.text : 'text-gray-400'}`}>
                      {type === 'vote' ? 'Rp1rb' : type === 'comment' ? 'Rp10rb' : 'Rp50rb'}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 bg-emerald-50 rounded-xl px-3 py-2">
              <span className="text-xs text-emerald-600 font-semibold">Reward per slot:</span>
              <span className="text-sm font-black text-emerald-700">Rp{reward.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Subreddit *</label>
              <input value={form.subreddit} onChange={e => set('subreddit', e.target.value)} placeholder="r/indonesia"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Max Quantity</label>
              <input type="number" min="1" max="100" value={form.max_quantity} onChange={e => set('max_quantity', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Judul Thread *</label>
            <input value={form.thread_title} onChange={e => set('thread_title', e.target.value)} placeholder="Judul thread Reddit..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">URL Thread</label>
            <input value={form.thread_url} onChange={e => set('thread_url', e.target.value)} placeholder="https://reddit.com/r/..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Brief / Instruksi Khusus</label>
            <textarea value={form.admin_brief} onChange={e => set('admin_brief', e.target.value)}
              placeholder="Tuliskan arahan untuk prajurit..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Prioritas</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
                <option value="high">Urgent</option>
                <option value="normal">Normal</option>
                <option value="low">Rendah</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Deadline (jam)</label>
              <input type="number" value={form.due_hours} onChange={e => set('due_hours', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Tugaskan ke</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
                <option value="">— Auto-assign —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Akun Reddit</label>
              <select value={form.reddit_account_id} onChange={e => set('reddit_account_id', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
                <option value="">— Pilih akun —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 text-sm">Batal</button>
          <button onClick={handleSave} disabled={saving || !form.subreddit || !form.thread_title}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
            {saving ? 'Menyimpan...' : 'Buat Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
