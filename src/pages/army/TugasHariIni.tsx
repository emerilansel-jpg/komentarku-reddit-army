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

export default function TugasHariIni({ profile, onKerjakan }: TugasHariIniProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [topAccount, setTopAccount] = useState<RedditAccount | null>(null);
  const [quickWin, setQuickWin] = useState<QuickWinData | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [miniRank, setMiniRank] = useState<MiniRankEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [totalArmy, setTotalArmy] = useState<number>(0);
  const [userPoints, setUserPoints] = useState<number>(profile.total_points || 0);
  const [warpBannerDismissed, setWarpBannerDismissed] = useState(false);

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
      supabase
        .from('profiles')
        .select('id, display_name, total_points')
        .eq('role', 'army')
        .order('total_points', { ascending: false })
        .limit(3),
      supabase
        .from('profiles')
        .select('id, total_points')
        .eq('role', 'army')
        .order('total_points', { ascending: false }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'army'),
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
      const visible = (data as any[]).filter((t) => t.quantity == null || (t.completed_count || 0) < t.quantity);
      const sorted = [...visible].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      setTasks(sorted);
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

  const totalPotential = tasks.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  const levelInfo = topAccount
    ? getLevelInfo(topAccount.karma, topAccount.account_age_days)
    : getLevelInfo(0, 0);

  const MEDALS = ['🥇', '🥈', '🥉'];

  const KARMA_THRESHOLD = 10;
  const karmaDone = !!(topAccount && topAccount.karma >= KARMA_THRESHOLD);

  return (
    <div className="flex flex-col min-h-full">
      <QuickWinToast win={quickWin} onDismiss={() => setQuickWin(null)} />

      <div className="px-4 pt-6 pb-4" style={{
        background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '0 0 28px 28px'
      }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white">
              Halo, {profile.display_name.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">Semangat kerja hari ini!</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {levelInfo.emoji}
            </div>
          </div>
        </div>

        <div className="rounded-xl px-3 py-2 mb-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{levelInfo.emoji}</span>
            <div>
              <p className="text-white text-xs font-black">Lv.{levelInfo.level} {levelInfo.name}</p>
              <p className="text-blue-200 text-xs">Rate: {formatRate(levelInfo.rate)}/misi</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs">Naik level →</p>
            <p className="text-white text-xs font-bold">{levelInfo.nextEmoji} {formatRate(levelInfo.nextRate)}/misi</p>
          </div>
        </div>

        <div className="rounded-2xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
          <div className="flex-1 text-center">
            <p className="text-white font-black text-xl">{tasks.length}</p>
            <p className="text-blue-200 text-xs">Misi Aktif</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-white font-black text-xl">{pendingCount}</p>
            <p className="text-blue-200 text-xs">Belum Selesai</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-emerald-300 font-black text-lg">Rp{(totalPotential / 1000).toFixed(0)}rb</p>
            <p className="text-blue-200 text-xs">Potensi Hari Ini</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        {!warpBannerDismissed && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
            <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-800">Pastikan WARP (1.1.1.1) aktif!</p>
              <p className="text-xs text-amber-700 mt-0.5">Reddit diblokir di Indonesia tanpa WARP. Aktifkan sebelum memulai misi.</p>
            </div>
            <button
              onClick={() => setWarpBannerDismissed(true)}
              className="text-amber-500 text-lg flex-shrink-0 hover:text-amber-700 transition-colors leading-none">
              ×
            </button>
          </div>
        )}
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <p className="text-sm font-black text-gray-800">Peringkat Kamu</p>
            </div>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Lihat Semua →
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
            <div className="text-2xl font-black text-blue-700">
              #{userRank > 0 ? userRank : '—'}
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-500 font-semibold">dari {totalArmy} army</p>
              <p className="text-sm font-black text-blue-800">{userPoints.toLocaleString('id-ID')} poin total</p>
            </div>
            <div className="text-xl">⭐</div>
          </div>

          {miniRank.length > 0 && (
            <div className="space-y-1.5">
              {miniRank.map((entry, idx) => {
                const isMe = entry.id === profile.id;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${isMe ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                    <span className="text-base w-5 text-center flex-shrink-0">{MEDALS[idx]}</span>
                    <span className={`flex-1 text-xs font-semibold truncate ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                      {isMe ? 'Kamu' : entry.display_name}
                    </span>
                    <span className={`text-xs font-black ${isMe ? 'text-blue-600' : 'text-gray-500'}`}>
                      {(entry.total_points || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4 float-animation">🎉</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Tidak ada misi hari ini!</h3>
            <p className="text-gray-400 text-sm text-center">Kamu udah keren banget hari ini.<br />Santai dulu, gas besok!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={"mb-4 p-4 border-2 rounded-xl " + (karmaDone ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-200")}>
              {karmaDone ? (
                <div>
                  <p className="text-sm font-bold text-green-800 mb-1">✅ Karma kamu cukup! Misi bayaran udah kebuka.</p>
                  <p className="text-xs text-green-700">Karma akun utama: {topAccount?.karma ?? 0} (target: 10). Lanjut kerjain misi cuan di bawah 👇</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-orange-900 text-base">🎯 Misi Wajib #1: Bangun Karma Reddit Dulu</p>
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">+Rp5.000</span>
                  </div>
                  <p className="text-xs text-orange-800 mb-2">Sebelum misi cuan kebuka, akun Reddit kamu harus punya karma ≥10 biar ga di-ban. Pilih cara paling gampang:</p>
                  <div className="bg-white/60 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-orange-900">Karma kamu: {topAccount?.karma ?? 0} / 10</span>
                      <span className="text-orange-700">{karmaDone ? '✅ done' : 'progress'}</span>
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: Math.min(100, ((topAccount?.karma ?? 0) / 10) * 100) + '%'}}></div>
                    </div>
                  </div>
                  <details className="bg-white rounded-lg p-2 mb-1.5 cursor-pointer">
                    <summary className="text-xs font-semibold text-orange-900">😂 Cara 1 — Bikin Meme (paling gampang)</summary>
                    <p className="text-xs text-gray-700 mt-1.5 pl-2">Ambil meme viral dari IG/TikTok, post di r/IndonesiaSubs atau r/indonesia_real. Kasih caption lucu pendek. Biasanya dapat 5-50 upvote per post.</p>
                  </details>
                  <details className="bg-white rounded-lg p-2 mb-1.5 cursor-pointer">
                    <summary className="text-xs font-semibold text-orange-900">🎬 Cara 2 — Repost konten viral IG/TikTok</summary>
                    <p className="text-xs text-gray-700 mt-1.5 pl-2">Screen-record video TikTok/Reels yang lucu/menarik (no watermark), upload ke r/Indonesia_real atau r/indonesia. Sertakan kredit creator. Karma datang cepat kalau kontennya beneran fresh.</p>
                  </details>
                  <details className="bg-white rounded-lg p-2 mb-1.5 cursor-pointer">
                    <summary className="text-xs font-semibold text-orange-900">💬 Cara 3 — Komentar Trending</summary>
                    <p className="text-xs text-gray-700 mt-1.5 pl-2">Buka r/indonesia → urutkan by Hot. Komentar natural di 5-10 thread teratas (bukan spam, kasih opini beneran). Upvote 10+ post yang menarik. Tunggu 1-2 hari karma kebangun.</p>
                  </details>
                  <p className="text-xs text-orange-700 mt-2 italic">💡 Setelah karma ≥10, misi cuan di bawah otomatis kebuka + bonus Rp5.000 masuk wallet kamu.</p>
                </div>
              )}
            </div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              {tasks.length} Misi Cuan Aktif
            </p>
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                <div className={karmaDone ? '' : 'pointer-events-none opacity-50'}>
                  <TaskCard task={task} onKerjakan={() => karmaDone && onKerjakan(task)} />
                </div>
                {!karmaDone && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl backdrop-blur-[1px]">
                    <div className="bg-orange-100 border border-orange-300 px-3 py-1.5 rounded-full text-xs font-bold text-orange-800 shadow-sm">
                      🔒 Selesaikan Bangun Karma dulu
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 max-w-md mx-auto">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg">
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
  task: Task;
  onKerjakan: () => void;
}

function TaskCard({ task, onKerjakan }: TaskCardProps) {
  const redditAccount = task.reddit_accounts as { username: string } | null;
  const isActionable = task.status === 'pending' || task.status === 'approved';

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 active:scale-[0.99] task-card-${task.priority}`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-black text-emerald-600">Rp{(task.payment_amount / 1000).toFixed(0)}rb</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.due_time && (
            <span className="text-xs text-gray-400 font-medium">{formatDueTime(task.due_time)}</span>
          )}
        </div>

        {isActionable && (
          <button
            onClick={onKerjakan}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-95"
            style={{
              background: task.status === 'approved'
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: task.status === 'approved'
                ? '0 4px 16px rgba(34,197,94,0.3)'
                : '0 4px 16px rgba(59,130,246,0.3)'
            }}>
            {task.status === 'approved' ? '🚀 Posting Sekarang!' : '✍️ Kerjakan'}
          </button>
        )}

        {(task.status === 'submitted' || task.status === 'posted') && (
          <button
            onClick={onKerjakan}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-gray-600 bg-gray-50 border border-gray-200 transition-all duration-200">
            👁️ Lihat Detail
          </button>
        )}
      </div>
    </div>
  );
}
