import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '../../lib/supabase';

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
type ActiveTab = 'payroll' | 'withdrawals';

type WithdrawalRequest = {
  id: string;
  user_id: string;
  full_name: string;
  payment_method: string;
  account_number: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function Payroll() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('payroll');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [markingTransferred, setMarkingTransferred] = useState<string | null>(null);

  useEffect(() => {
    loadPayroll();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'withdrawals') loadWithdrawals();
  }, [activeTab]);

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
        memberId: p.id,
        memberName: p.display_name,
        topLevelEmoji: topAcc?.level_emoji || '🥚',
        topLevelName: topAcc?.level_name || 'Si Telur',
        tasksCompleted: tasksRes.count || 0,
        levelRate: topAcc?.level_rate || 8000,
        totalEarned: pendingAmount + paidAmount,
        pendingAmount,
        paidAmount,
        pendingEarningIds: pendingEarnings.map((e: any) => e.id),
      };
    }));
    setRows(payrollRows.filter(r => r.totalEarned > 0 || r.tasksCompleted > 0));
    setLoading(false);
  }

  async function loadWithdrawals() {
    setLoadingWithdrawals(true);
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setWithdrawalRequests(data || []);
    setLoadingWithdrawals(false);
  }

  async function handleMarkPaid(row: PayrollRow) {
    if (row.pendingEarningIds.length === 0) return;
    setMarkingPaid(row.memberId);
    await supabase.from('earnings').update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', row.pendingEarningIds);
    await loadPayroll();
    setMarkingPaid(null);
  }

  async function handleMarkTransferred(req: WithdrawalRequest) {
    setMarkingTransferred(req.id);
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'transferred' })
      .eq('id', req.id);
    await supabase
      .from('earnings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('army_member_id', req.user_id)
      .eq('type', 'withdrawal')
      .eq('status', 'pending');
    await loadWithdrawals();
    setMarkingTransferred(null);
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
    a.download = `payroll-${dateRange}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const totalPending = rows.reduce((s, r) => s + r.pendingAmount, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
  const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'pending');

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(160deg, #78350f 0%, #b45309 50%, #d97706 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-white">Payroll 💳</h1>
            <p className="text-amber-200 text-xs">Kelola pembayaran prajurit</p>
          </div>
          {activeTab === 'payroll' && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              📥 Export CSV
            </button>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('payroll')}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: activeTab === 'payroll' ? 'white' : 'rgba(255,255,255,0.2)', color: activeTab === 'payroll' ? '#b45309' : 'white' }}
          >
            💳 Payroll
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all relative"
            style={{ background: activeTab === 'withdrawals' ? 'white' : 'rgba(255,255,255,0.2)', color: activeTab === 'withdrawals' ? '#b45309' : 'white' }}
          >
            💸 Pencairan
            {pendingWithdrawals.length > 0 && activeTab !== 'withdrawals' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-black">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>
        </div>
        {activeTab === 'payroll' && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-amber-200 text-xs font-medium">⏳ Belum Dibayar</p>
                <p className="text-xl font-black text-white">Rp{(totalPending/1000).toFixed(0)}rb</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-amber-200 text-xs font-medium">✅ Sudah Dibayar</p>
                <p className="text-xl font-black text-white">Rp{(totalPaid/1000).toFixed(0)}rb</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'all'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${dateRange === r ? 'bg-white text-amber-700' : 'text-white'}`}
                  style={{ background: dateRange === r ? 'white' : 'rgba(255,255,255,0.2)' }}
                >
                  {r === 'week' ? '7 Hari' : r === 'month' ? 'Bulan Ini' : 'Semua'}
                </button>
              ))}
            </div>
          </>
        )}
        {activeTab === 'withdrawals' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <p className="text-amber-200 text-xs font-medium">⏳ Menunggu</p>
              <p className="text-xl font-black text-white">{pendingWithdrawals.length}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <p className="text-amber-200 text-xs font-medium">💸 Total Pending</p>
              <p className="text-xl font-black text-white">
                Rp{(pendingWithdrawals.reduce((s, r) => s + r.amount, 0) / 1000).toFixed(0)}rb
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {activeTab === 'payroll' && (
          loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 text-sm">Tidak ada data payroll untuk periode ini</p>
            </div>
          ) : (
            rows.map(row => (
              <div key={row.memberId} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white" style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)' }}>
                      {row.memberName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-black text-gray-800">{row.memberName}</p>
                      <p className="text-xs text-gray-400">{row.topLevelEmoji} {row.topLevelName} · Rp{(row.levelRate/1000).toFixed(0)}rb/misi</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-lg font-black text-gray-800">Rp{(row.totalEarned/1000).toFixed(0)}rb</p>
                      <p className="text-xs text-gray-400">{row.tasksCompleted} misi</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl p-2.5 text-center bg-amber-50">
                      <p className="font-black text-amber-700 text-sm">Rp{(row.pendingAmount/1000).toFixed(0)}rb</p>
                      <p className="text-xs text-amber-500">⏳ Belum Dibayar</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-emerald-50">
                      <p className="font-black text-emerald-700 text-sm">Rp{(row.paidAmount/1000).toFixed(0)}rb</p>
                      <p className="text-xs text-emerald-500">✅ Sudah Dibayar</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkPaid(row)}
                    disabled={row.pendingAmount === 0 || markingPaid === row.memberId}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: row.pendingAmount > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#e5e7eb',
                      color: row.pendingAmount > 0 ? 'white' : '#9ca3af',
                      boxShadow: row.pendingAmount > 0 ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
                    }}
                  >
                    {markingPaid === row.memberId ? '⏳ Memproses...' : row.pendingAmount > 0 ? `💸 Tandai Lunas Rp${(row.pendingAmount/1000).toFixed(0)}rb` : '✅ Sudah Lunas'}
                  </button>
                </div>
              </div>
            ))
          )
        )}
        {activeTab === 'withdrawals' && (
          loadingWithdrawals ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)
          ) : withdrawalRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 text-sm">Belum ada permintaan pencairan</p>
            </div>
          ) : (
            withdrawalRequests.map(req => {
              const isPending = req.status === 'pending';
              const isProcessing = markingTransferred === req.id;
              return (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)' }}>
                          {req.full_name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 text-sm">{req.full_name}</p>
                          <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isPending ? '⏳ Menunggu' : '✅ Ditransfer'}
                      </span>
                    </div>
                    <div className="rounded-xl p-3 mb-3" style={{ background: isPending ? '#fffbeb' : '#f0fdf4', border: `1px solid ${isPending ? '#fde68a' : '#bbf7d0'}` }}>
                      <p className={`text-2xl font-black ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                        Rp{req.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Metode</span>
                        <span className="text-xs font-bold text-gray-700">{req.payment_method}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">No. Rekening / Akun</span>
                        <span className="text-xs font-bold text-gray-700 font-mono">{req.account_number}</span>
                      </div>
                    </div>
                    {isPending && (
                      <button
                        onClick={() => handleMarkTransferred(req)}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                      >
                        {isProcessing ? '⏳ Memproses...' : '✅ Tandai Sudah Transfer'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 bounce-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-800 text-lg mb-1">Export CSV</h3>
            <p className="text-gray-500 text-sm mb-4">
              Export data payroll {rows.length} anggota untuk periode {dateRange === 'week' ? '7 hari terakhir' : dateRange === 'month' ? 'bulan ini' : 'semua waktu'}.
            </p>
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-200 mb-4">
              <p className="text-xs text-gray-500 font-semibold mb-1">Kolom yang diekspor:</p>
              <p className="text-xs text-gray-600">Nama · Level · Tugas Selesai · Rate per Task · Total Earned · Pending · Sudah Dibayar</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 text-sm">Batal</button>
              <button onClick={exportCSV} className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                📥 Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
