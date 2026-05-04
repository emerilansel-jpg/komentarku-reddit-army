import { useEffect, useState } from 'react';
import { supabase, Task, Profile, RedditAccount } from '../../lib/supabase';
import StatusBadge from '../../components/army/StatusBadge';
import PriorityBadge from '../../components/army/PriorityBadge';
import { getLevelInfo, formatRate } from '../../lib/gamification';
import QuickWinToast, { QuickWinData } from '../../components/army/QuickWinToast';
import Leaderboard from '../../components/army/Leaderboard';
import { checkLoginStreak } from '../../lib/quickWins';

interface TugasHariIniProps {
  profile: Profile;
  onKerjakan: (task: Task) => void;
}

function formatDueTime(dueTime: string | null): string {
  if (!dueTime) return '';
  const date = new Date(dueTime);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (diff < 0) return '⚠️ Terlambat';
  if (hours < 1) return `⏰ ${minutes}m lagi`;
  if (hours < 24) return `⏰ ${hours}j ${minutes}m lagi`;
  return `📅 ${date.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };

type MiniRankEntry = {
  id: string;
  display_name: string;
  total_points: number;
};

type GatedTask = Task & {
  min_karma?: number;
  min_account_age_days?: number;
  draft_content?: string | null;
  quantity?: number | null;
  completed_count?: number | null;
};

export default function TugasHariIni({ profile, onKerjakan }: TugasHariIniProps) {
  const [tasks, setTasks] = useState<GatedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [topAccount, setTopAccount] = useState<RedditAccount | null>(null);
  const [quickWin, setQuickWin] = useState<QuickWinData | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [miniRank, setMiniRank] = useState<MiniRankEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [totalArmy, setTotalArmy] = useState<number>(0);
  const [userPoints, setUserPoints] = useState<number>(profile.total_points || 0);
  const [warpDismissed, setWarpDismissed] = useState(false);

  useEffect(() => {
    loadTasks();
    loadTopAccount();
    runLoginStreak();
    loadLeaderboardData();
  }, [profile.id]);

  async function runLoginStreak() {
    const result = await checkLoginStreak(profile.id);
    if (result.toastData) {
      setQuickWin(result.toastData);
      const { data } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', profile.id)
        .maybeSingle();
      if (data) setUserPoints(data.total_points || 0);
    }
  }

  async function loadLeaderboardData() {
    const [{ data: top }, { data: all }, { count }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, total_points').eq('role', 'army').order('total_points', { ascending: false }).limit(3),
      supabase.from('profiles').select('id, total_points').eq('role', 'army').order('total_points', { ascending: false }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'army'),
    ]);
    if (top) setMiniRank(top);
    if (count) setTotalArmy(count);
    if (all) {
      const idx = all.findIndex((e: { id: string }) => e.id === profile.id);
      setUserRank(idx >= 0 ? idx + 1 : 0);
    }
  }

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, reddit_accounts(*)')
      .or(`assigned_to.eq.${profile.id},assigned_to.is.null`)
      .neq('status', 'posted')
      .order('created_at', { ascending: false });
    if (data) {
      const visible = (data as GatedTask[]).filter(
        (t) => t.quantity == null || (t.completed_count || 0) < (t.quantity || 0)
      );
      setTasks(visible);
    }
    setLoading(false);
  }

  async function loadTopAccount() {
    const { data } = await supabase
      .from('reddit_accounts')
      .select('*')
      .eq('assigned_to', profile.id)
      .order('level', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setTopAccount(data);
  }

  const userKarma = topAccount?.karma ?? 0;
  const userAccountAge = topAccount?.account_age_days ?? 0;

  const accessibleTasks = tasks.filter((t) => {
    const minK = t.min_karma ?? 0;
    const minA = t.min_account_age_days ?? 0;
    return userKarma >= minK && userAccountAge >= minA;
  });
  const lockedTasks = tasks.filter((t) => {
    const minK = t.min_karma ?? 0;
    const minA = t.min_account_age_days ?? 0;
    return userKarma < minK || userAccountAge < minA;
  });

  const sortedAccessible = [...accessibleTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const sortedLocked = [...lockedTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const levelInfo = topAccount ? getLevelInfo(topAccount.karma, topAccount.account_age_days) : getLevelInfo(0, 0);
  const totalPotential = accessibleTasks.reduce((sum, t) => sum + (t.payment_amount || 0), 0);

  const nextUnlock = sortedLocked.length > 0
    ? sortedLocked.reduce((closest, t) => {
        const tNeed = Math.max(0, (t.min_karma ?? 0) - userKarma) + Math.max(0, (t.min_account_age_days ?? 0) - userAccountAge);
        const cNeed = Math.max(0, (closest.min_karma ?? 0) - userKarma) + Math.max(0, (closest.min_account_age_days ?? 0) - userAccountAge);
        return tNeed < cNeed ? t : closest;
      })
    : null;

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <QuickWinToast win={quickWin} onDismiss={() => setQuickWin(null)} />

      {/* ── HEADER ── */}
      <div
        className="px-4 pt-5 pb-4"
        style={{
          background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
          borderRadius: '0 0 24px 24px',
        }}
      >
        {/* Row 1: name + earnings */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-white leading-tight">
              Halo, {profile.display_name.split(' ')[0]}! 👋
            </h1>
            <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-1 mt-0.5">
              <span className="text-yellow-300 text-xs font-bold">
                🏆 #{userRank > 0 ? userRank : '—'} dari {totalArmy} army
              </span>
            </button>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-lg leading-tight">
              Rp{userPoints.toLocaleString('id-ID')}
            </p>
            <p className="text-blue-200 text-xs">Total penghasilan</p>
          </div>
        </div>

        {/* Row 2: karma + age chips */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            ⚡ {userKarma} karma
          </span>
          <span
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            📅 Akun {userAccountAge} hari
          </span>
        </div>

        {/* Row 3: mission summary bar */}
        {!loading && tasks.length > 0 && (
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex-1 text-center">
              <p className="text-white font-black text-lg">{accessibleTasks.length}</p>
              <p className="text-blue-200 text-xs">Misi Aktif</p>
            </div>
            {totalPotential > 0 && (
              <>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex-1 text-center">
                  <p className="text-emerald-300 font-black text-lg">
                    Rp{(totalPotential / 1000).toFixed(0)}rb
                  </p>
                  <p className="text-blue-200 text-xs">Bisa kamu raih</p>
                </div>
              </>
            )}
            {lockedTasks.length > 0 && (
              <>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex-1 text-center">
                  <p className="text-white font-black text-lg">{lockedTasks.length}</p>
                  <p className="text-blue-200 text-xs">Terkunci 🔒</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 px-4 py-4 pb-24 space-y-3">

        {/* WARP reminder */}
        {!warpDismissed && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
          >
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="flex-1 text-xs font-semibold text-amber-800">
              Pastikan <strong>Cloudflare WARP</strong> aktif sebelum mulai misi
            </p>
            <button
              onClick={() => setWarpDismissed(true)}
              className="text-amber-400 text-xl leading-none font-bold flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {/* ── KARMA → PAY TIER BAND ── */}
        {!loading && tasks.length > 0 && (
          <div
            className="bg-white rounded-2xl px-4 py-3"
            style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
          >
            <p className="text-xs font-bold text-gray-700 mb-2.5">
              💰 Makin besar karma = bayaran makin besar
            </p>
            <div className="flex items-stretch gap-1.5">
              {[
                { label: 'Starter', karma: '0 karma', pay: 'Rp2rb', bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
                { label: 'Basic', karma: '10+ karma', pay: 'Rp5rb', bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
                { label: 'Lanjutan', karma: '50+ karma', pay: 'Rp15rb', bg: '#fdf4ff', border: '#d8b4fe', text: '#7e22ce' },
                { label: 'Premium', karma: '100+ karma', pay: 'Rp15rb+', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
              ].map((tier, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-xl py-2 px-1 text-center"
                  style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
                >
                  <p className="text-xs font-black" style={{ color: tier.text }}>{tier.pay}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{tier.karma}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING SKELETON ── */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-9 bg-gray-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Semua misi selesai!</h3>
            <p className="text-gray-400 text-sm">
              Kamu luar biasa hari ini 💪
              <br />
              Kembali lagi besok!
            </p>
          </div>
        ) : (
          <>
            {/* ── SECTION 1: MISI TERSEDIA ── */}
            {sortedAccessible.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span className="text-sm font-bold text-emerald-600">✅ Misi Tersedia</span>
                  <span className="flex-1 h-px bg-emerald-100" />
                  <span
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"
                  >
                    {sortedAccessible.length} misi
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {sortedAccessible.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onKerjakan={() => onKerjakan(task)}
                      userKarma={userKarma}
                      userAccountAge={userAccountAge}
                      locked={false}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* ── KARMA BUILDER (no accessible tasks) ── */
              <div
                className="bg-white rounded-2xl p-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">
                    🎯
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-sm leading-snug">
                      Langkah Pertama: Bangun Karma Reddit
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Misi cuan akan terbuka setelah karma & umur akun cukup
                    </p>
                  </div>
                </div>

                {nextUnlock && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-orange-800">Progress ke misi berikutnya</span>
                      <span className="font-black text-orange-600">
                        {userKarma} / {nextUnlock.min_karma ?? 0} karma
                      </span>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2.5">
                      <div
                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (nextUnlock.min_karma ?? 0) > 0
                            ? (userKarma / (nextUnlock.min_karma ?? 1)) * 100
                            : 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-orange-700 mt-1.5">
                      🔓 Butuh{' '}
                      <strong>
                        {Math.max(0, (nextUnlock.min_karma ?? 0) - userKarma)} karma lagi
                      </strong>{' '}
                      untuk unlock misi {nextUnlock.subreddit}
                    </p>
                  </div>
                )}

                <p className="text-xs font-bold text-gray-600 mb-2">Cara cepat dapat karma:</p>
                <div className="space-y-2">
                  <div
                    className="flex items-start gap-2.5 rounded-xl p-3"
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                  >
                    <span className="text-base flex-shrink-0">🐾</span>
                    <div>
                      <p className="text-xs font-bold text-blue-800">
                        Post konten menarik di subreddit populer
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        r/aww, r/dogs, r/gaming, r/food — foto/video viral = karma cepat naik
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-start gap-2.5 rounded-xl p-3"
                    style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}
                  >
                    <span className="text-base flex-shrink-0">💬</span>
                    <div>
                      <p className="text-xs font-bold text-purple-800">
                        Komentar tulus di r/indonesia (Hot)
                      </p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        5–10 komentar berkualitas per hari = karma naik konsisten
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRESS TO NEXT UNLOCK ── */}
            {sortedAccessible.length > 0 && sortedLocked.length > 0 && nextUnlock && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-green-700">🚀 Unlock bayaran lebih besar</p>
                  <span className="text-xs font-black text-green-600">
                    {userKarma} / {nextUnlock.min_karma ?? 0} karma
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-1.5 mb-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (nextUnlock.min_karma ?? 0) > 0
                        ? (userKarma / (nextUnlock.min_karma ?? 1)) * 100
                        : 0)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-green-700">
                  Tambah{' '}
                  <strong>{Math.max(0, (nextUnlock.min_karma ?? 0) - userKarma)} karma</strong>{' '}
                  → buka misi{' '}
                  <strong className="text-green-800">{nextUnlock.subreddit}</strong>
                </p>
              </div>
            )}

            {/* ── SECTION 2: MISI TERKUNCI ── */}
            {sortedLocked.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-sm font-bold text-gray-400">🔒 Butuh Karma Lebih Tinggi</span>
                  <span className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {sortedLocked.length} misi
                  </span>
                </div>
                <p className="text-xs text-gray-400 px-1 mb-2.5">
                  Naikkan karma untuk membuka — bayarannya jauh lebih besar 💰
                </p>
                <div className="flex flex-col gap-3">
                  {sortedLocked.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onKerjakan={() => {}}
                      userKarma={userKarma}
                      userAccountAge={userAccountAge}
                      locked={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── LEADERBOARD WIDGET ── */}
            <div
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <span className="text-sm font-black text-gray-800">Papan Peringkat</span>
                </div>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Lihat Semua →
                </button>
              </div>

              <div
                className="flex items-center gap-3 mb-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #bfdbfe',
                }}
              >
                <div className="text-xl font-black text-blue-700">
                  #{userRank > 0 ? userRank : '—'}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-500 font-semibold">dari {totalArmy} army</p>
                  <p className="text-sm font-black text-blue-800">
                    Rp{userPoints.toLocaleString('id-ID')}
                  </p>
                </div>
                <span className="text-xl">⭐</span>
              </div>

              {miniRank.length > 0 && (
                <div className="space-y-1.5">
                  {miniRank.map((entry, idx) => {
                    const isMe = entry.id === profile.id;
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                          isMe ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-base w-5 text-center flex-shrink-0">
                          {MEDALS[idx]}
                        </span>
                        <span
                          className={`flex-1 text-xs font-semibold truncate ${
                            isMe ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {isMe ? 'Kamu' : entry.display_name}
                        </span>
                        <span
                          className={`text-xs font-black ${isMe ? 'text-blue-600' : 'text-gray-500'}`}
                        >
                          {(entry.total_points || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── LEADERBOARD MODAL ── */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 max-w-md mx-auto">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg"
            >
              ←
            </button>
            <span className="text-sm font-bold text-gray-600">Kembali</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Leaderboard currentUserId={profile.id} />
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: GatedTask;
  onKerjakan: () => void;
  userKarma: number;
  userAccountAge: number;
  locked: boolean;
}

function TaskCard({ task, onKerjakan, userKarma, userAccountAge, locked }: TaskCardProps) {
  const redditAccount = task.reddit_accounts as { username: string } | null;
  const isActionable = !locked && (task.status === 'pending' || task.status === 'approved');

  const minKarma = task.min_karma ?? 0;
  const minAge = task.min_account_age_days ?? 0;
  const needsKarma = minKarma > 0;
  const needsAge = minAge > 0;
  const karmaOk = userKarma >= minKarma;
  const ageOk = userAccountAge >= minAge;

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
        locked ? 'opacity-60' : 'active:scale-[0.99]'
      }`}
      style={{
        boxShadow: locked ? '0 1px 6px rgba(0,0,0,0.04)' : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {task.subreddit}
              </span>
              {redditAccount && (
                <span className="text-xs text-gray-400 truncate">{redditAccount.username}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-snug">
              {truncate(task.thread_title, 60)}
            </p>
          </div>
          {/* Payment — prominent */}
          <div className="text-right flex-shrink-0">
            <p className="text-base font-black text-emerald-600">
              Rp{task.payment_amount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Status + priority + due */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.due_time && (
            <span className="text-xs text-gray-400 font-medium">
              {formatDueTime(task.due_time)}
            </span>
          )}
        </div>

        {/* Requirement chips — clean, no confusing shortfall math */}
        {(needsKarma || needsAge) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {needsKarma && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  karmaOk
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-red-50 text-red-500 border border-red-200'
                }`}
              >
                ⚡ {karmaOk ? `Karma ✓` : `Butuh ${minKarma} karma`}
              </span>
            )}
            {needsAge && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  ageOk
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                📅 {ageOk ? `Umur akun ✓` : `Akun min. ${minAge} hari`}
              </span>
            )}
          </div>
        )}

        {/* Action button */}
        {locked ? (
          <div className="w-full py-2.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-100 border border-gray-200 text-center cursor-not-allowed select-none">
            🔒 Belum Terbuka
          </div>
        ) : (
          <>
            {isActionable && (
              <button
                onClick={onKerjakan}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-95"
                style={{
                  background:
                    task.status === 'approved'
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  boxShadow:
                    task.status === 'approved'
                      ? '0 4px 16px rgba(34,197,94,0.3)'
                      : '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                {task.status === 'approved' ? '🚀 Posting Sekarang!' : '✍️ Kerjakan'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
