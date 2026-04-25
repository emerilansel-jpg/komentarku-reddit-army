import { useEffect, useState } from 'react';
import { supabase, Earning, Profile } from '../../lib/supabase';

interface PenghasilanProps {
  profile: Profile;
  onWithdraw?: () => void;
}


function formatRp(amount: number): string {
  if (amount >= 1000000) return `Rp${(amount / 1000000).toFixed(1)}jt`;
  if (amount >= 1000) return `Rp${(amount / 1000).toFixed(0)}rb`;
  return `Rp${amount}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Penghasilan({ profile, onWithdraw }: PenghasilanProps) {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, [profile.id]);

  // R17 — realtime referral bonus toast
  useEffect(() => {
    const channel = supabase
      .channel('point_transactions_user_' + profile.id)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'point_transactions',
        filter: 'user_id=eq.' + profile.id,
      }, (payload: any) => {
        const tx = payload.new;
        if (tx && (tx.reason && (tx.reason === 'referral_bonus_referee' || tx.reason === 'referral_bonus_referrer' || tx.reason.startsWith('referral_')))) {
          alert('🎉 Bonus referral! +Rp' + Number(tx.amount).toLocaleString('id-ID'));
          loadEarnings();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  async function loadEarnings() {
    setLoading(true);
    const { data } = await supabase
      .from('earnings')
      .select('*, tasks(subreddit, thread_title)')
      .eq('army_member_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setEarnings(data as Earning[]);
    setLoading(false);
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthEarnings = earnings.filter(e => {
    const d = new Date(e.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalThisMonth = thisMonthEarnings.reduce((sum, e) => sum + e.amount, 0);
  const earnedTotal = earnings
    .filter(e => e.type !== 'withdrawal' && (e.status === 'paid' || e.status === 'pending'))
    .reduce((sum, e) => sum + e.amount, 0);
  const withdrawnTotal = earnings
    .filter(e => e.type === 'withdrawal' && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.amount, 0);
  const availableBalance = Math.max(0, earnedTotal - withdrawnTotal);
  const pendingTotal = earnings.filter(e => e.status === 'pending' && e.type !== 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
  const paidTotal = earnings.filter(e => e.status === 'paid' && e.type !== 'withdrawal').reduce((sum, e) => sum + e.amount, 0);
  const completedCount = earnings.filter(e => e.status === 'paid' && e.type === 'task').length;
  const totalCount = earnings.filter(e => e.type === 'task').length;
  const approvalRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const canWithdraw = availableBalance > 0;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-6 pb-4" style={{
        background: 'linear-gradient(160deg, #78350f 0%, #b45309 50%, #d97706 100%)',
        borderRadius: '0 0 28px 28px'
      }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-white">Penghasilan 💰</h1>
            <p className="text-amber-200 text-sm">
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            💎
          </div>
        </div>

        <div className="rounded-2xl p-4 text-center mb-3"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
          <p className="text-amber-200 text-sm font-medium mb-1">Total Bulan Ini</p>
          <p className="text-4xl font-black text-white">
            {loading ? '...' : `Rp${totalThisMonth.toLocaleString('id-ID')}`}
          </p>
          <p className="text-amber-300 text-xs mt-1">
            {thisMonthEarnings.length} transaksi bulan ini
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <p className="text-white font-black text-base">{completedCount}</p>
            <p className="text-amber-200 text-xs">Misi Selesai</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <p className="text-white font-black text-base">{approvalRate}%</p>
            <p className="text-amber-200 text-xs">Approval Rate</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <p className="text-emerald-300 font-black text-base">{formatRp(availableBalance)}</p>
            <p className="text-amber-200 text-xs">Saldo</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">💳 Saldo & Pencairan</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
              <p className="text-xs text-amber-700 font-medium mb-1">⏳ Pending</p>
              <p className="font-black text-amber-900 text-lg">Rp{pendingTotal.toLocaleString('id-ID')}</p>
              <p className="text-xs text-amber-600">menunggu verifikasi</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <p className="text-xs text-emerald-700 font-medium mb-1">✅ Sudah Dibayar</p>
              <p className="font-black text-emerald-900 text-lg">Rp{paidTotal.toLocaleString('id-ID')}</p>
              <p className="text-xs text-emerald-600">total lifetime</p>
            </div>
          </div>

          <button
            onClick={() => canWithdraw && onWithdraw && onWithdraw()}
            disabled={!canWithdraw}
            className="w-full py-3.5 rounded-xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: canWithdraw ? '0 4px 20px rgba(245,158,11,0.35)' : 'none',
            }}>
            Ajukan Pencairan
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">
            Riwayat Transaksi
          </p>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : earnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="text-4xl mb-3 float-animation">📭</div>
              <p className="text-gray-500 text-sm font-medium">Belum ada riwayat penghasilan</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {earnings.map((earning) => (
                <EarningItem key={earning.id} earning={earning} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function EarningItem({ earning }: { earning: Earning }) {
  const task = earning.tasks as any;
  const isPaid = earning.status === 'paid';

  return (
    <div className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isPaid ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {isPaid ? '✅' : '⏳'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {task?.subreddit ? `${task.subreddit}` : 'Misi Selesai'}
        </p>
        <p className="text-xs text-gray-400">
          {formatDate(earning.paid_at || earning.created_at)}
          {' · '}
          <span className={isPaid ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
            {isPaid ? 'Dibayar' : 'Pending'}
          </span>
        </p>
      </div>
      <div className="flex-shrink-0">
        <p className={`font-black text-sm ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
          +Rp{earning.amount.toLocaleString('id-ID')}
        </p>
      </div>
    </div>
  );
}
