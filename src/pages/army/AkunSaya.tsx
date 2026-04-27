import { useEffect, useState } from 'react';
import { supabase, RedditAccount, Profile } from '../../lib/supabase';
import { getLevelInfo, getKarmaProgress, LEVELS, formatRate } from '../../lib/gamification';
import { refreshAccountKarma, shouldRefreshKarma } from '../../lib/karmaFetch';
import LevelUpModal from '../../components/army/LevelUpModal';
import { Flame, Star, Trophy, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';

interface AkunSayaProps {
  profile: Profile;
  onSignOut: () => void;
}

type QuickWinRow = {
  id: string;
  event_type: string;
  points: number;
  description: string | null;
  created_at: string;
};

type RankData = {
  rank: number;
  total: number;
  totalPoints: number;
  loginStreak: number;
  recentWins: QuickWinRow[];
};

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active: { label: '🟢 Aktif', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  inactive: { label: '⚫ Nonaktif', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  banned: { label: '🔴 Kena Ban', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  warming: { label: '🔥 Warming Up', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

function formatAge(days: number): string {
  if (days < 30) return `${days} hari`;
  if (days < 365) return `${Math.floor(days / 30)} bulan`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}th ${months}bln` : `${years} tahun`;
}

function formatLastFetch(ts: string | null): string {
  if (!ts) return 'Belum pernah';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000 / 60;
  if (diff < 60) return `${Math.round(diff)} menit lalu`;
  if (diff < 1440) return `${Math.round(diff / 60)} jam lalu`;
  return `${Math.round(diff / 1440)} hari lalu`;
}

function relativeTime(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

const WIN_EMOJI: Record<string, string> = {
  login: '📅',
  first_task_view: '👀',
  first_comment: '💬',
  first_submission: '🚀',
  profile_complete: '✅',
  karma_refresh: '🔄',
  level_up: '🎯',
};

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug / Error' },
  { value: 'feature', label: '💡 Feature Request' },
];

export default function AkunSaya({ profile, onSignOut }: AkunSayaProps) {
  const [accounts, setAccounts] = useState<RedditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number } | null>(null);
  const [rankData, setRankData] = useState<RankData | null>(null);

  const [redditUrl, setRedditUrl] = useState(profile.reddit_url || '');
  const [savingRedditUrl, setSavingRedditUrl] = useState(false);
  const [redditUrlSaved, setRedditUrlSaved] = useState(false);
  const [redditUrlError, setRedditUrlError] = useState('');
  const [fetchingRedditData, setFetchingRedditData] = useState(false);
  const [redditAccountData, setRedditAccountData] = useState<{ age: string; karma: number } | null>(null);

  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadRankData();
  }, [profile.id]);

  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach((account) => {
        if (shouldRefreshKarma(account.last_karma_fetch)) {
          autoRefresh(account);
        }
      });
    }
  }, [accounts.length]);

  async function loadRankData() {
    const [
      { data: profileData },
      { data: allProfiles, count },
      { data: recentWins },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('total_points, login_streak')
        .eq('id', profile.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'army')
        .order('total_points', { ascending: false }),
      supabase
        .from('quick_wins')
        .select('id, event_type, points, description, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const totalPoints = profileData?.total_points || 0;
    const loginStreak = profileData?.login_streak || 0;
    const total = count || 0;

    let rank = 0;
    if (allProfiles) {
      const idx = allProfiles.findIndex((p: { id: string }) => p.id === profile.id);
      rank = idx >= 0 ? idx + 1 : 0;
    }

    setRankData({
      rank,
      total,
      totalPoints,
      loginStreak,
      recentWins: recentWins || [],
    });
  }

  async function loadAccounts() {
    setLoading(true);
    const { data } = await supabase
      .from('reddit_accounts')
      .select('*')
      .eq('assigned_to', profile.id)
      .order('level', { ascending: false });
    if (data) setAccounts(data);
    setLoading(false);
  }

  async function autoRefresh(account: RedditAccount) {
    const result = await refreshAccountKarma(account);
    if (result?.leveledUp) {
      setLevelUpData({ newLevel: result.newLevel });
      await loadAccounts();
    }
  }

  async function handleRefresh(account: RedditAccount) {
    setRefreshing(account.id);
    const result = await refreshAccountKarma(account);
    if (result?.leveledUp) {
      setLevelUpData({ newLevel: result.newLevel });
    }
    await loadAccounts();
    setRefreshing(null);
  }

  function extractRedditUsername(url: string): string | null {
    const trimmed = url.trim();
    const match = trimmed.match(/reddit\.com\/user\/([^/?#]+)/i);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{3,20}$/.test(trimmed)) return trimmed;
    return null;
  }

  function formatAccountAge(createdUtc: number): string {
    const ageDays = Math.floor((Date.now() / 1000 - createdUtc) / 86400);
    const years = Math.floor(ageDays / 365);
    const months = Math.floor((ageDays % 365) / 30);
    if (years > 0 && months > 0) return `${years} tahun ${months} bulan`;
    if (years > 0) return `${years} tahun`;
    if (months > 0) return `${months} bulan`;
    return `${ageDays} hari`;
  }

  async function handleFetchAndSaveRedditUrl() {
    const username = extractRedditUsername(redditUrl);
    if (!username) {
      setRedditUrlError('Masukkan URL profil Reddit yang valid (contoh: https://www.reddit.com/user/namauser)');
      return;
    }
    setFetchingRedditData(true);
    setRedditUrlError('');
    setRedditAccountData(null);
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.reddit.com/user/${username}/about.json`)}`;
      let res = null; let json = null;
      const baseUrl = 'https://www.reddit.com/user/' + username + '/about.json';
      const tryUrls = [
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(baseUrl),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(baseUrl),
        baseUrl,
      ];
      for (const u of tryUrls) {
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
          if (!r.ok) continue;
          const t = await r.text();
          if (!t) continue;
          const j = JSON.parse(t);
          if (j && j.error) continue;
          if (!j || !j.data) continue;
          json = j; res = r; break;
        } catch (e) { continue; }
      }
      if (!json) throw new Error('not_found');
      if (json?.error === 404 || !json?.data) throw new Error('not_found');
      const d = json.data;
      const karma = (d.link_karma || 0) + (d.comment_karma || 0);
      const age = formatAccountAge(d.created_utc);
      setRedditAccountData({ age, karma });
      setSavingRedditUrl(true);
      await supabase
        .from('profiles')
        .update({ reddit_url: `https://www.reddit.com/user/${username}` })
        .eq('id', profile.id);
      setSavingRedditUrl(false);
      setRedditUrlSaved(true);
      setTimeout(() => setRedditUrlSaved(false), 4000);
    } catch {
      // Last-ditch: verify user exists via HTML page (Reddit rate-limits JSON for low-karma accounts but HTML 200s)
      try {
        const htmlUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent('https://www.reddit.com/user/' + username);
        const hr = await fetch(htmlUrl);
        if (hr.ok) {
          const html = await hr.text();
          if (!html.includes('"error":404') && !html.includes('Sorry, nobody on Reddit goes by that name')) {
            setRedditAccountData({ age: '—', karma: '—' });
            await supabase.from('profiles').update({ reddit_url: 'https://www.reddit.com/user/' + username }).eq('id', profile.id);
            setSavingRedditUrl(false);
            setRedditUrlSaved(true);
            setTimeout(() => setRedditUrlSaved(false), 4000);
            return;
          }
        }
      } catch (htmlErr) {}
      setRedditUrlError('Akun u/' + username + ' ga ketemu di Reddit, ATAU Reddit lagi rate-limit. Cek manual: reddit.com/user/' + username);
    } finally {
      setFetchingRedditData(false);
    }
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackDesc.trim()) return;
    setFeedbackSubmitting(true);
    setFeedbackError('');
    const { error: err } = await supabase.from('feedback').insert({
      user_id: profile.id,
      type: feedbackType,
      title: feedbackTitle.trim(),
      description: feedbackDesc.trim(),
    });
    setFeedbackSubmitting(false);
    if (err) {
      setFeedbackError('Gagal mengirim laporan. Coba lagi.');
    } else {
      setFeedbackDone(true);
      setFeedbackTitle('');
      setFeedbackDesc('');
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    await supabase.from('profiles').delete().eq('id', profile.id);
    await supabase.auth.signOut();
    onSignOut();
  }

  const totalKarma = accounts.reduce((sum, a) => sum + a.karma, 0);
  const avgApproval = accounts.length > 0
    ? Math.round(accounts.reduce((sum, a) => sum + a.task_rate, 0) / accounts.length)
    : 0;
  const highestLevel = accounts.length > 0 ? Math.max(...accounts.map(a => a.level)) : 0;
  const highestLevelData = LEVELS[highestLevel];

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-6 pb-4" style={{
        background: 'linear-gradient(160deg, #065f46 0%, #059669 60%, #10b981 100%)',
        borderRadius: '0 0 28px 28px'
      }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-white">Akun Saya 👤</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg">{highestLevelData.emoji}</span>
              <p className="text-emerald-200 text-sm font-semibold">{highestLevelData.name}</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            🎮
          </div>
        </div>

        <div className="rounded-2xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
          <div className="flex-1 text-center">
            <p className="text-white font-black text-xl">{accounts.filter(a => a.status === 'active').length}</p>
            <p className="text-emerald-200 text-xs">Akun Aktif</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-white font-black text-xl">{totalKarma.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs">Total Karma</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex-1 text-center">
            <p className="text-white font-black text-xl">{avgApproval}%</p>
            <p className="text-emerald-200 text-xs">Avg Approval</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {rankData && (
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-amber-500" />
              <p className="text-sm font-black text-gray-800">Poin & Peringkat</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', border: '1px solid #fde68a' }}>
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Star size={12} className="text-amber-500" />
                </div>
                <p className="font-black text-amber-700 text-sm">{(rankData.totalPoints).toLocaleString('id-ID')}</p>
                <p className="text-xs text-amber-500 font-medium">Total Poin</p>
              </div>
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
                <p className="font-black text-blue-700 text-sm">#{rankData.rank > 0 ? rankData.rank : '—'}</p>
                <p className="text-xs text-blue-400 font-medium">Peringkat</p>
                <p className="text-[10px] text-blue-400">dari {rankData.total}</p>
              </div>
              <div className="rounded-xl p-2.5 text-center"
                style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa' }}>
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <Flame size={12} className="text-orange-500" />
                </div>
                <p className="font-black text-orange-600 text-sm">{rankData.loginStreak}</p>
                <p className="text-xs text-orange-400 font-medium">Streak</p>
              </div>
            </div>

            {rankData.recentWins.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Aktivitas Terakhir</p>
                <div className="space-y-1.5">
                  {rankData.recentWins.map(win => (
                    <div key={win.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50">
                      <span className="text-base flex-shrink-0">{WIN_EMOJI[win.event_type] || '⭐'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {win.description || win.event_type}
                        </p>
                        <p className="text-[10px] text-gray-400">{relativeTime(win.created_at)}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-600 flex-shrink-0">+{win.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rankData.recentWins.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Belum ada aktivitas poin</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4 float-animation">🤷</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">{profile?.reddit_url?'Profile ke-verify ':'Belum ada akun'}</h3>
            <p className="text-gray-400 text-sm text-center">{profile?.reddit_url?'Profile Reddit udah ke-verify. Admin akan assign tugas dalam 24 jam. Sambil nunggu, build karma dulu di tab Tugas Hari Ini.':'Pastikan profil Reddit kamu sudah terisi di bawah. Admin akan segera assign akun untukmu.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                refreshing={refreshing === account.id}
                onRefresh={() => handleRefresh(account)}
              />
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <p className="text-sm font-black text-gray-800 mb-1">🔗 Akun Reddit Kamu</p>
          <p className="text-xs text-gray-500 mb-3">Wajib diisi. Masukkan URL profil Reddit kamu.</p>
          <input
            type="url"
            value={redditUrl}
            onChange={e => { setRedditUrl(e.target.value); setRedditUrlSaved(false); setRedditUrlError(''); setRedditAccountData(null); }}
            placeholder="https://www.reddit.com/user/username"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 transition mb-2 ${redditUrlError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-emerald-300 focus:border-emerald-400'}`}
          />
          {redditUrlError && (
            <p className="text-xs text-red-500 font-semibold mb-2">{redditUrlError}</p>
          )}
          {redditAccountData && (
            <div className="flex gap-2 mb-2">
              <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <p className="text-xs text-orange-400 font-medium">Account Age</p>
                <p className="text-sm font-black text-orange-600">{redditAccountData.age}</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p className="text-xs text-emerald-400 font-medium">Total Karma</p>
                <p className="text-sm font-black text-emerald-600">{typeof redditAccountData.karma === 'number' ? redditAccountData.karma.toLocaleString() : redditAccountData.karma}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleFetchAndSaveRedditUrl}
            disabled={fetchingRedditData || savingRedditUrl || !redditUrl.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
            {fetchingRedditData ? 'Memverifikasi...' : savingRedditUrl ? 'Menyimpan...' : 'Verifikasi & Simpan'}
          </button>
          {redditUrlSaved && (
            <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-xl bg-emerald-50">
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">URL berhasil disimpan!</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <p className="text-sm font-black text-gray-800 mb-1">📣 Laporan & Saran</p>
          <p className="text-xs text-gray-500 mb-4">Bantu kami jadi lebih baik</p>

          {feedbackDone ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <p className="font-black text-gray-800 mb-1">Terima kasih!</p>
              <p className="text-xs text-gray-500 mb-3">Laporan kamu sudah diterima.</p>
              <button
                onClick={() => setFeedbackDone(false)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Kirim lagi
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Jenis</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFeedbackType(t.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                        feedbackType === t.value
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Judul</label>
                <input
                  type="text"
                  value={feedbackTitle}
                  onChange={e => setFeedbackTitle(e.target.value)}
                  placeholder="Ringkasan singkat"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Deskripsi</label>
                <textarea
                  value={feedbackDesc}
                  onChange={e => setFeedbackDesc(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan secara detail..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition resize-none"
                />
              </div>

              {feedbackError && (
                <p className="text-xs text-red-500 font-semibold">{feedbackError}</p>
              )}

              <button
                type="submit"
                disabled={!feedbackTitle.trim() || !feedbackDesc.trim() || feedbackSubmitting}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: (feedbackTitle.trim() && feedbackDesc.trim()) ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e5e7eb',
                  color: (feedbackTitle.trim() && feedbackDesc.trim()) ? 'white' : '#9ca3af',
                  boxShadow: (feedbackTitle.trim() && feedbackDesc.trim()) ? '0 4px 16px rgba(37,99,235,0.3)' : 'none',
                }}>
                {feedbackSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
            </form>
          )}
        </div>

        <div className="mb-4 px-1">
          {(profile as any)?.referral_code && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
              <div className="text-sm font-bold text-orange-800 mb-2">
                🎁 Kode Referral Kamu
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-2 rounded-lg border border-orange-300 font-mono text-base flex-1 text-center tracking-wider">
                  {(profile as any).referral_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText((profile as any).referral_code);
                    alert('Kode tersalin! Bagikan ke temanmu 🎉');
                  }}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg font-bold text-xs hover:bg-orange-600 active:scale-95 transition-all"
                >
                  📋 Salin
                </button>
              </div>
              <div className="text-xs text-orange-700 mt-2 leading-relaxed">
                Ajak teman daftar pakai kode ini. Kalian berdua dapat <b>Rp1.000</b> setelah dia selesaikan task pertama!
              </div>
            </div>
          )}
        </div>
        <div className="pb-4">
          {<button onClick={()=>supabase.auth.signOut()} className='w-full py-3.5 rounded-2xl font-bold text-sm text-gray-700 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 mb-3'>🚪 Logout</button> !showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-red-600 border-2 border-red-200 bg-red-50 transition-all active:scale-95 hover:bg-red-100">
              🗑️ Hapus Akun
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-black text-red-700">Hapus akun secara permanen?</p>
              </div>
              <p className="text-xs text-red-600 mb-4">
                Semua data kamu akan dihapus dan tidak bisa dipulihkan. Pastikan kamu sudah withdraw semua saldo sebelum menghapus akun.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200 transition-all active:scale-95">
                  Batal
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-500 transition-all active:scale-95 disabled:opacity-60"
                  style={{ boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {levelUpData && (
        <LevelUpModal
          newLevel={levelUpData.newLevel}
          onClose={() => setLevelUpData(null)}
        />
      )}
    </div>
  );
}

interface AccountCardProps {
  account: RedditAccount;
  refreshing: boolean;
  onRefresh: () => void;
}

function AccountCard({ account, refreshing, onRefresh }: AccountCardProps) {
  const statusCfg = statusConfig[account.status];
  const levelInfo = getLevelInfo(account.karma, account.account_age_days);
  const progress = getKarmaProgress(account.karma, account.account_age_days);
  const isMaxLevel = levelInfo.level >= 5;
  const nextLevel = LEVELS[Math.min(levelInfo.level + 1, 5)];

  const karmaNeeded = Math.max(0, nextLevel.karmaMin - account.karma);
  const ageNeeded = Math.max(0, nextLevel.ageMin - account.account_age_days);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '2px solid #fed7aa' }}>
              {levelInfo.emoji}
            </div>
            <div>
              <p className="font-black text-gray-800 text-base">{account.username}</p>
              <p className="text-sm text-orange-500 font-bold">{levelInfo.emoji} Lv.{levelInfo.level} {levelInfo.name}</p>
              <p className="text-xs text-emerald-600 font-semibold">{formatRate(levelInfo.rate)}/misi</p>
            </div>
          </div>
          <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
            {statusCfg.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl p-2.5 text-center" style={{ background: '#fff7ed' }}>
            <p className="font-black text-orange-600 text-sm">{account.karma.toLocaleString()}</p>
            <p className="text-xs text-orange-400 font-medium">Karma</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: '#f0fdf4' }}>
            <p className="font-black text-emerald-600 text-sm">{formatAge(account.account_age_days)}</p>
            <p className="text-xs text-emerald-400 font-medium">Usia Akun</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ background: '#eff6ff' }}>
            <p className="font-black text-blue-600 text-sm">{account.task_rate}%</p>
            <p className="text-xs text-blue-400 font-medium">Approval</p>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)', border: '1px solid #dbeafe' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700">
              {isMaxLevel ? '👑 Level Maksimal!' : `Progress ke Lv.${levelInfo.level + 1} ${nextLevel.emoji} ${nextLevel.name}`}
            </span>
            <span className="text-xs font-black text-blue-800">{progress}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: '#dbeafe' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: isMaxLevel
                  ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
              }}
            />
          </div>
          {!isMaxLevel && (
            <div className="mt-2 flex flex-col gap-0.5">
              {karmaNeeded > 0 && (
                <p className="text-xs text-blue-500">
                  🎯 Butuh <span className="font-bold">{karmaNeeded.toLocaleString()} karma</span> lagi
                </p>
              )}
              {ageNeeded > 0 && (
                <p className="text-xs text-blue-500">
                  📅 Butuh <span className="font-bold">{ageNeeded} hari</span> lagi
                </p>
              )}
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                Naik level → Rate jadi {formatRate(nextLevel.rate)}/misi ✨
              </p>
            </div>
          )}
          {isMaxLevel && (
            <p className="text-xs text-amber-600 font-semibold mt-1">
              🏆 Kamu sudah di level tertinggi! Rate: {formatRate(levelInfo.rate)}/misi
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Karma terakhir: {formatLastFetch(account.last_karma_fetch)}
          </p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: refreshing ? '#f3f4f6' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: refreshing ? '#9ca3af' : 'white',
              boxShadow: refreshing ? 'none' : '0 2px 8px rgba(59,130,246,0.3)'
            }}>
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            {refreshing ? 'Refresh...' : 'Refresh Karma'}
          </button>
        </div>
      </div>

      {account.status === 'warming' && (
        <div className="px-4 pb-4">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <span className="text-base">🔥</span>
            <p className="text-xs text-amber-700 font-medium">
              Akun ini sedang warming up — hindari posting terlalu banyak dulu
            </p>
          </div>
        </div>
      )}

      {account.status === 'banned' && (
        <div className="px-4 pb-4">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <span className="text-base">⚠️</span>
            <p className="text-xs text-red-700 font-medium">
              Akun kena ban — hubungi admin untuk info lebih lanjut
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
