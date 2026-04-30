import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Submission = {
  id: string;
  subreddit: string;
  thread_title: string;
  screenshot_url: string | null;
  admin_brief: string | null;
  submitted_at: string | null;
  created_at: string;
  status: string;
  profiles?: { display_name: string } | null;
  reddit_accounts?: { username: string } | null;
  task_type?: string;
  payment_amount?: number;
  reward_amount?: number;
};

const STATUS_FILTER = ['all', 'submitted', 'approved', 'rejected'] as const;
const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  submitted: { label: 'Direview', bg: '#dbeafe', color: '#1d4ed8' },
  approved:  { label: 'Disetujui', bg: '#dcfce7', color: '#15803d' },
  rejected:  { label: 'Ditolak', bg: '#fee2e2', color: '#b91c1c' },
  pending:   { label: 'Menunggu', bg: '#f1f5f9', color: '#475569' },
};

function relTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function ApprovalQueue() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [processing, setProcessing] = useState<string | null>(null);
  const [preview, setPreview] = useState<Submission | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(display_name), reddit_accounts(username)')
      .in('status', ['submitted', 'approved', 'rejected'])
      .order('created_at', { ascending: false });
    setItems((data || []) as Submission[]);
    setLoading(false);
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setProcessing(id);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    if (action === 'approve') {
      const task = items.find(t => t.id === id);
      if (task) {
        const amount = task.reward_amount || task.payment_amount || 0;
        if (amount > 0) {
          const profile = task.profiles as { display_name: string } | null;
          if (profile) {
            const { data: pData } = await supabase.from('profiles').select('id').eq('display_name', profile.display_name).maybeSingle();
            if (pData) {
              await supabase.from('earnings').insert({
                army_member_id: pData.id,
                task_id: id,
                amount,
                status: 'pending',
              });
            }
          }
        }
      }
    }
    setProcessing(null);
    setPreview(null);
    load();
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const counts = {
    all: items.length,
    submitted: items.filter(i => i.status === 'submitted').length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length,
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Antrian Persetujuan</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Review dan setujui submission dari anggota</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTER.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: filter === s ? '#0f172a' : 'white',
              color: filter === s ? 'white' : '#64748b',
              boxShadow: filter === s ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {s === 'all' ? 'Semua' : STATUS_LABEL[s]?.label || s}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📽</div>
            <p>Tidak ada submission</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Anggota', 'Subreddit', 'Thread', 'Akun Reddit', 'Waktu', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const sc = STATUS_LABEL[item.status] || STATUS_LABEL.pending;
                const member = (item.profiles as { display_name: string } | null)?.display_name || '—';
                const account = (item.reddit_accounts as { username: string } | null)?.username || '—';
                const isProcessing = processing === item.id;
                return (
                  <tr key={item.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0,
                        }}>{member.slice(0, 1)}</div>
                        {member}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 12 }}>{item.subreddit}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: '#334155', maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.thread_title}</div>
                      {item.screenshot_url && (
                        <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}>📷 Lihat screenshot</a>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: '#64748b' }}>{account}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{relTime(item.created_at)}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      {item.status === 'submitted' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleAction(item.id, 'approve')}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700,
                              opacity: isProcessing ? 0.5 : 1,
                            }}>
                            {isProcessing ? '...' : '✓ Setuju'}
                          </button>
                          <button
                            onClick={() => handleAction(item.id, 'reject')}
                            disabled={isProcessing}
                            style={{
                              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#fee2e2', color: '#b91c1c', fontSize: 12, fontWeight: 700,
                              opacity: isProcessing ? 0.5 : 1,
                            }}>
                            {isProcessing ? '...' : '✗ Tolak'}
                          </button>
                          {item.admin_brief && (
                            <button
                              onClick={() => setPreview(item)}
                              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 700 }}>
                              Brief
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Brief Preview Modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setPreview(null)}>
          <div style={{ background: 'white', borderRadius: 18, padding: 28, maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 0, marginBottom: 12 }}>Brief Task</h3>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 16 }}>
              {preview.admin_brief}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPreview(null); handleAction(preview.id, 'approve'); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#dcfce7', color: '#15803d', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                ✓ Setuju
              </button>
              <button onClick={() => { setPreview(null); handleAction(preview.id, 'reject'); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                ✗ Tolak
              </button>
              <button onClick={() => setPreview(null)}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
