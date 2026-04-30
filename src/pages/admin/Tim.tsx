import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type MemberRow = {
  id: string;
  display_name: string;
  created_at: string;
  accountCount: number;
  tasksCompleted: number;
  monthEarnings: number;
  topLevel: number;
  topLevelEmoji: string;
};

type MemberDetail = {
  profile: { id: string; display_name: string; created_at: string };
  accounts: { id: string; username: string; level: number; level_emoji: string; level_name: string; karma: number; status: string }[];
  earnings: { id: string; amount: number; status: string; created_at: string; paid_at: string | null }[];
  tasks: { id: string; subreddit: string; status: string; payment_amount: number; created_at: string }[];
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Tim() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLink] = useState(`${window.location.origin}?invite=${Math.random().toString(36).slice(2, 10).toUpperCase()}`);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, created_at').eq('role', 'army');
    if (!profiles) { setLoading(false); return; }

    const rows: MemberRow[] = await Promise.all(profiles.map(async (p) => {
      const [accsRes, tasksRes, earningsRes] = await Promise.all([
        supabase.from('reddit_accounts').select('level, level_emoji').eq('assigned_to', p.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', p.id).eq('status', 'posted'),
        supabase.from('earnings').select('amount').eq('army_member_id', p.id).gte('created_at', monthStart),
      ]);
      const accs = accsRes.data || [];
      const topLevel = accs.length > 0 ? Math.max(...accs.map((a: any) => a.level)) : 0;
      const topLevelEmoji = accs.find((a: any) => a.level === topLevel)?.level_emoji || '🥚';
      const monthEarnings = (earningsRes.data || []).reduce((s: number, e: any) => s + e.amount, 0);
      return {
        id: p.id, display_name: p.display_name, created_at: p.created_at,
        accountCount: accs.length, tasksCompleted: tasksRes.count || 0,
        monthEarnings, topLevel, topLevelEmoji,
      };
    }));
    setMembers(rows);
    setLoading(false);
  }

  async function loadMemberDetail(memberId: string) {
    setDetailLoading(true);
    const [profileRes, accountsRes, earningsRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', memberId).maybeSingle(),
      supabase.from('reddit_accounts').select('id, username, level, level_emoji, level_name, karma, status').eq('assigned_to', memberId),
      supabase.from('earnings').select('*').eq('army_member_id', memberId).order('created_at', { ascending: false }).limit(20),
      supabase.from('tasks').select('id, subreddit, status, payment_amount, created_at').eq('assigned_to', memberId).order('created_at', { ascending: false }).limit(20),
    ]);
    if (profileRes.data) {
      setSelected({
        profile: profileRes.data,
        accounts: accountsRes.data || [],
        earnings: earningsRes.data || [],
        tasks: tasksRes.data || [],
      });
    }
    setDetailLoading(false);
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Tim</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>{members.length} anggota aktif</p>
        </div>
        <button onClick={handleCopyInvite} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: inviteCopied ? '#dcfce7' : '#0f172a', color: inviteCopied ? '#15803d' : 'white', fontSize: 13, fontWeight: 700 }}>
          {inviteCopied ? '✅ Link Tersalin!' : '+ Undang Anggota'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
          ) : members.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
              <p>Belum ada anggota tim</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                {['Anggota', 'Level', 'Akun Reddit', 'Misi Selesai', 'Pendapatan Bulan Ini', 'Bergabung', ''].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {members.map((member, i) => {
                  const isSelected = selected?.profile.id === member.id;
                  return (
                    <tr key={member.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', background: isSelected ? '#f0f9ff' : 'transparent', cursor: 'pointer' }}
                      onClick={() => loadMemberDetail(member.id)}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '13px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{member.display_name.slice(0, 1)}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{member.display_name}</span>
                      </div></td>
                      <td style={{ padding: '13px 20px', fontSize: 14 }}>{member.topLevelEmoji} Lv.{member.topLevel}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 700, color: '#6366f1', textAlign: 'center' }}>{member.accountCount}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 700, color: '#059669', textAlign: 'center' }}>{member.tasksCompleted}</td>
                      <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 700, color: '#d97706' }}>{member.monthEarnings > 0 ? `Rp${(member.monthEarnings / 1000).toFixed(0)}rb` : '—'}</td>
                      <td style={{ padding: '13px 20px', fontSize: 12, color: '#94a3b8' }}>{formatDate(member.created_at)}</td>
                      <td style={{ padding: '13px 20px' }}><span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Detail →</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected && <MemberDetailPanel detail={selected} loading={detailLoading} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function MemberDetailPanel({ detail, loading, onClose }: { detail: MemberDetail; loading: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'accounts' | 'earnings' | 'tasks'>('accounts');
  const totalEarnings = detail.earnings.reduce((s, e) => s + e.amount, 0);
  const paidEarnings = detail.earnings.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  return (
    <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden', height: 'fit-content', position: 'sticky', top: 20 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800 }}>{detail.profile.display_name.slice(0, 1)}</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>{detail.profile.display_name}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{detail.accounts.length} akun · {detail.tasks.filter(t => t.status === 'posted').length} misi selesai</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#15803d', margin: 0 }}>Rp{(paidEarnings / 1000).toFixed(0)}rb</p>
            <p style={{ fontSize: 10, color: '#86efac', margin: 0 }}>Total Dibayar</p>
          </div>
          <div style={{ background: '#fefce8', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#854d0e', margin: 0 }}>Rp{((totalEarnings - paidEarnings) / 1000).toFixed(0)}rb</p>
            <p style={{ fontSize: 10, color: '#fde047', margin: 0 }}>Belum Dibayar</p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
        {(['accounts', 'earnings', 'tasks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 12, fontWeight: 700, color: tab === t ? '#6366f1' : '#94a3b8', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>
            {t === 'accounts' ? '🔑 Akun' : t === 'earnings' ? '💰 Riwayat' : '📋 Tugas'}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tab === 'accounts' && detail.accounts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#f8fafc' }}>
                <span style={{ fontSize: 18 }}>{a.level_emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{a.username}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Lv.{a.level} {a.level_name} · {a.karma?.toLocaleString()} karma</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: a.status === 'active' ? '#dcfce7' : '#f1f5f9', color: a.status === 'active' ? '#15803d' : '#64748b' }}>{a.status}</span>
              </div>
            ))}
            {tab === 'earnings' && detail.earnings.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#f8fafc' }}>
                <span style={{ fontSize: 16 }}>{e.status === 'paid' ? '✅' : '⏳'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>Rp{e.amount.toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: e.status === 'paid' ? '#dcfce7' : '#fefce8', color: e.status === 'paid' ? '#15803d' : '#854d0e' }}>{e.status === 'paid' ? 'Dibayar' : 'Pending'}</span>
              </div>
            ))}
            {tab === 'tasks' && detail.tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#f8fafc' }}>
                <span style={{ fontSize: 16 }}>{t.status === 'posted' ? '✅' : '📋'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{t.subreddit}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>Rp{(t.payment_amount / 1000).toFixed(0)}rb</span>
              </div>
            ))}
            {tab === 'accounts' && detail.accounts.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 16 }}>Belum ada akun</p>}
            {tab === 'earnings' && detail.earnings.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 16 }}>Belum ada riwayat</p>}
            {tab === 'tasks' && detail.tasks.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 16 }}>Belum ada tugas</p>}
          </div>
        )}
      </div>
    </div>
  );
}
