import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Profile { id: string; display_name: string; role: string; }
interface Props { profile: Profile; }

type StatCard = { label: string; value: string | number; sub: string; color: string; icon: string };
type ActivityRow = { id: string; type: string; description: string; created_at: string };

function relTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function AdminDashboard({ profile }: Props) {
  const [stats, setStats] = useState({ members: 0, accounts: 0, pendingTasks: 0, pendingEarnings: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [membersRes, accountsRes, tasksRes, earningsRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'army'),
      supabase.from('reddit_accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('earnings').select('amount').eq('status', 'pending'),
      supabase.from('tasks').select('id, subreddit, status, created_at').order('created_at', { ascending: false }).limit(20),
    ]);
    const pendingEarnings = (earningsRes.data || []).reduce((s: number, e: any) => s + e.amount, 0);
    setStats({
      members: membersRes.count || 0,
      accounts: accountsRes.count || 0,
      pendingTasks: tasksRes.count || 0,
      pendingEarnings,
    });
    setActivity((activityRes.data || []).map((t: any) => ({
      id: t.id,
      type: t.status,
      description: `Task di ${t.subreddit}`,
      created_at: t.created_at,
    })));
    setLoading(false);
  }

  const statCards: StatCard[] = [
    { label: 'Anggota Aktif',    value: stats.members,      sub: 'prajurit terdaftar',       color: '#6366f1', icon: 'ð¥' },
    { label: 'Akun Reddit',      value: stats.accounts,     sub: 'akun aktif',               color: '#10b981', icon: 'ð' },
    { label: 'Perlu Direview',   value: stats.pendingTasks, sub: 'submission menunggu',      color: '#f59e0b', icon: 'â' },
    { label: 'Belum Dibayar',    value: `Rp${(stats.pendingEarnings/1000).toFixed(0)}rb`, sub: 'total pending payroll', color: '#ef4444', icon: 'ð³' },
  ];

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Menunggu', color: '#64748b' },
    submitted: { label: 'Direview', color: '#3b82f6' },
    approved:  { label: 'Disetujui', color: '#10b981' },
    rejected:  { label: 'Ditolak', color: '#ef4444' },
    posted:    { label: 'Selesai', color: '#10b981' },
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
          Selamat datang, {profile.display_name} Â· Gambaran umum operasi KomentarKu
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, height: 100, animation: 'pulse 1.5s infinite', opacity: 0.6 }} />
            ))
          : statCards.map(card => (
              <div key={card.label} style={{
                background: 'white', borderRadius: 14, padding: '20px 22px',
                boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                borderTop: `3px solid ${card.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{card.icon}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: card.color + '18', color: card.color,
                  }}>{card.label}</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>{card.value}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{card.sub}</p>
              </div>
            ))
        }
      </div>

      {/* Activity Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Aktivitas Terbaru</h2>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{activity.length} task terbaru</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : activity.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>ð­</div>
            <p>Belum ada aktivitas</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Deskripsi', 'Status', 'Waktu'].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.map((row, i) => {
                const sc = STATUS_LABEL[row.type] || { label: row.type, color: '#64748b' };
                return (
                  <tr key={row.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 24px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{row.description}</td>
                    <td style={{ padding: '12px 24px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: sc.color + '15', color: sc.color,
                      }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 24px', fontSize: 12, color: '#94a3b8' }}>{relTime(row.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
