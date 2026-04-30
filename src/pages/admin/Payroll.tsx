import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type PayrollRow = {
  memberId: string;
  memberName: string;
  topLevelEmoji: string;
  topLevelName: string;
  tasksCompleted: number;
  levelRate: number;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  pendingEarningIds: string[];
};

type DateRange = 'week' | 'month' | 'all';

export default function Payroll() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => { loadPayroll(); }, [dateRange]);

  function getRangeStart(): string {
    const now = new Date();
    if (dateRange === 'week') return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (dateRange === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return '2020-01-01T00:00:00Z';
  }

  async function loadPayroll() {
    setLoading(true);
    const rangeStart = getRangeStart();
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').eq('role', 'army');
    if (!profiles) { setLoading(false); return; }

    const payrollRows: PayrollRow[] = await Promise.all(profiles.map(async (p) => {
      const [tasksRes, earningsRes, accountsRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assigned_to', p.id).eq('status', 'posted').gte('updated_at', rangeStart),
        supabase.from('earnings').select('id, amount, status')
          .eq('army_member_id', p.id).gte('created_at', rangeStart),
        supabase.from('reddit_accounts').select('level, level_emoji, level_name, level_rate').eq('assigned_to', p.id),
      ]);
      const accs = accountsRes.data || [];
      const topAcc = accs.reduce((best: any, a: any) => (!best || a.level > best.level ? a : best), null);
      const earnings = earningsRes.data || [];
      const pendingEarnings = earnings.filter((e: any) => e.status === 'pending');
      const pendingAmount = pendingEarnings.reduce((s: number, e: any) => s + e.amount, 0);
      const paidAmount = earnings.filter((e: any) => e.status === 'paid').reduce((s: number, e: any) => s + e.amount, 0);
      return {
        memberId: p.id, memberName: p.display_name,
        topLevelEmoji: topAcc?.level_emoji || '🥚',
        topLevelName: topAcc?.level_name || 'Si Telur',
        tasksCompleted: tasksRes.count || 0,
        levelRate: topAcc?.level_rate || 8000,
        totalEarned: pendingAmount + paidAmount,
        pendingAmount, paidAmount,
        pendingEarningIds: pendingEarnings.map((e: any) => e.id),
      };
    }));

    setRows(payrollRows.filter(r => r.totalEarned > 0 || r.tasksCompleted > 0));
    setLoading(false);
  }

  async function handleMarkPaid(row: PayrollRow) {
    if (row.pendingEarningIds.length === 0) return;
    setMarkingPaid(row.memberId);
    await supabase.from('earnings').update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', row.pendingEarningIds);
    await loadPayroll();
    setMarkingPaid(null);
  }

  function exportCSV() {
    const header = 'Nama,Level,Tugas Selesai,Rate per Task,Total Earned,Pending,Sudah Dibayar';
    const csvRows = rows.map(r =>
      `"${r.memberName}","${r.topLevelEmoji} ${r.topLevelName}",${r.tasksCompleted},${r.levelRate},${r.totalEarned},${r.pendingAmount},${r.paidAmount}`
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPending = rows.reduce((s, r) => s + r.pendingAmount, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Payroll</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Kelola pembayaran prajurit</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['week', 'month', 'all'] as DateRange[]).map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: dateRange === r ? '#0f172a' : 'white',
                color: dateRange === r ? 'white' : '#64748b',
                boxShadow: dateRange === r ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
              }}>
              {r === 'week' ? '7 Hari' : r === 'month' ? 'Bulan Ini' : 'Semua'}
            </button>
          ))}
          <button onClick={exportCSV}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Anggota', value: rows.length, sub: 'dengan aktivitas', color: '#6366f1', icon: '👥' },
          { label: 'Belum Dibayar', value: `Rp${(totalPending / 1000).toFixed(0)}rb`, sub: 'perlu ditransfer', color: '#f59e0b', icon: '⏳' },
          { label: 'Sudah Dibayar', value: `Rp${(totalPaid / 1000).toFixed(0)}rb`, sub: 'periode ini', color: '#10b981', icon: '✅' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${card.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: card.color }}>{card.label}</span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>{card.value}</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <p>Tidak ada data payroll untuk periode ini</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Anggota', 'Level', 'Tugas Selesai', 'Rate/Misi', 'Total Earned', 'Belum Dibayar', 'Sudah Dibayar', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isMarking = markingPaid === row.memberId;
                return (
                  <tr key={row.memberId} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#b45309,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 800 }}>
                          {row.memberName.slice(0, 1)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{row.memberName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 13, color: '#334155' }}>
                      {row.topLevelEmoji} {row.topLevelName}
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
                      {row.tasksCompleted}
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 13, color: '#64748b' }}>
                      Rp{(row.levelRate / 1000).toFixed(0)}rb
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                      Rp{(row.totalEarned / 1000).toFixed(0)}rb
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706', background: '#fef9c3', padding: '3px 10px', borderRadius: 12 }}>
                        Rp{(row.pendingAmount / 1000).toFixed(0)}rb
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: 12 }}>
                        Rp{(row.paidAmount / 1000).toFixed(0)}rb
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <button
                        onClick={() => handleMarkPaid(row)}
                        disabled={row.pendingAmount === 0 || isMarking}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: row.pendingAmount > 0 ? 'pointer' : 'default',
                          fontSize: 12, fontWeight: 700,
                          background: row.pendingAmount > 0 ? '#fef9c3' : '#f1f5f9',
                          color: row.pendingAmount > 0 ? '#854d0e' : '#94a3b8',
                          opacity: isMarking ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                        }}>
                        {isMarking ? '⏳...' : row.pendingAmount > 0 ? '💸 Tandai Lunas' : '✅ Lunas'}
                      </button>
                    </td>
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
