import { useEffect, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';

interface AdminDashboardProps {
  profile: Profile;
}

type Stats = {
  totalArmy: number;
  totalAccounts: number;
  activeAccounts: number;
  todayTasks: number;
  weekTasks: number;
  monthTasks: number;
  monthPayout: number;
  pendingApprovals: number;
};

type Activity = {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, string>;
  created_at: string;
};

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

const actionLabels: Record<string, { icon: string; label: string; color: string }> = {
  task_approved: { icon: '✅', label: 'Task disetujui', color: 'text-emerald-600' },
  task_submitted: { icon: '📤', label: 'Task dikirim', color: 'text-blue-600' },
  task_posted: { icon: '🚀', label: 'Task diposting', color: 'text-emerald-700' },
  task_created: { icon: '📝', label: 'Task dibuat', color: 'text-gray-600' },
  account_added: { icon: '🔑', label: 'Akun ditambah', color: 'text-orange-600' },
  earnings_paid: { icon: '💸', label: 'Pembayaran dilakukan', color: 'text-amber-600' },
};

export default function AdminDashboard({ profile }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadActivity();
  }, []);

  async function loadStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [armyRes, accountsRes, todayRes, weekRes, monthRes, payoutRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'army'),
      supabase.from('reddit_accounts').select('id,status', { count: 'exact' }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'posted').gte('updated_at', todayStart),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'posted').gte('updated_at', weekStart),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'posted').gte('updated_at', monthStart),
      supabase.from('earnings').select('amount').gte('created_at', monthStart),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    ]);

    const accountData = accountsRes.data || [];
    const monthPayout = (payoutRes.data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);

    setStats({
      totalArmy: armyRes.count || 0,
      totalAccounts: accountData.length,
      activeAccounts: accountData.filter((a: { status: string }) => a.status === 'active').length,
      todayTasks: todayRes.count || 0,
      weekTasks: weekRes.count || 0,
      monthTasks: monthRes.count || 0,
      monthPayout,
      pendingApprovals: pendingRes.count || 0,
    });
    setLoading(false);
  }

  async function loadActivity() {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setActivity(data);
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-6 pb-5"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-blue-300 text-sm font-medium">Selamat datang,</p>
            <h1 className="text-2xl font-black text-white">{profile.display_name} 🛡️</h1>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.12)' }}>📊</div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 h-20 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : stats && (
          <>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tim & Akun</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon="👥" label="Anggota Army" value={stats.totalArmy.toString()} sub="aktif terdaftar" color="blue" />
                <StatCard icon="🔑" label="Akun Reddit" value={`${stats.activeAccounts}/${stats.totalAccounts}`} sub="aktif / total" color="emerald" />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Misi Selesai</p>
              <div className="grid grid-cols-3 gap-2">
                <MiniStatCard label="Hari Ini" value={stats.todayTasks.toString()} color="#3b82f6" />
                <MiniStatCard label="7 Hari" value={stats.weekTasks.toString()} color="#8b5cf6" />
                <MiniStatCard label="Bulan Ini" value={stats.monthTasks.toString()} color="#10b981" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon="💰" label="Payout Bulan Ini" value={`Rp${(stats.monthPayout/1000).toFixed(0)}rb`} sub="total dibayarkan" color="amber" />
              <StatCard
                icon="⏳"
                label="Perlu Review"
                value={stats.pendingApprovals.toString()}
                sub="menunggu approval"
                color="red"
                highlight={stats.pendingApprovals > 0}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Aktivitas Terbaru</p>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {activity.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Belum ada aktivitas</div>
                ) : (
                  activity.map((item, idx) => {
                    const cfg = actionLabels[item.action] || { icon: '📌', label: item.action, color: 'text-gray-600' };
                    const meta = item.metadata || {};
                    return (
                      <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${idx < activity.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <span className="text-lg mt-0.5 flex-shrink-0">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {meta.army_member && <span>{meta.army_member} · </span>}
                            {meta.subreddit || meta.username || ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.created_at)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, highlight }: { icon: string; label: string; value: string; sub: string; color: string; highlight?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-50 to-blue-100/60 border-blue-200',
    emerald: 'from-emerald-50 to-emerald-100/60 border-emerald-200',
    amber: 'from-amber-50 to-amber-100/60 border-amber-200',
    red: 'from-red-50 to-red-100/60 border-red-200',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-800', emerald: 'text-emerald-800', amber: 'text-amber-800', red: 'text-red-800',
  };
  return (
    <div className={`rounded-2xl p-3.5 border bg-gradient-to-br ${colors[color]} ${highlight ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className={`text-xl font-black ${textColors[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <p className="text-lg font-black" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
    </div>
  );
}
