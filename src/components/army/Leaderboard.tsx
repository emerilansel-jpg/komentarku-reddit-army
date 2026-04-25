import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, TrendingUp } from 'lucide-react';

type LeaderboardEntry = {
  id: string;
  display_name: string;
  total_points: number;
  level: number;
};

interface LeaderboardProps {
  currentUserId: string;
  compact?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ currentUserId, compact = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, total_points, level')
        .eq('role', 'army')
        .order('total_points', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'army'),
    ]);
    if (data) setEntries(data);
    setTotalCount(count || 0);
    setLoading(false);
  }

  const userRank = entries.findIndex(e => e.id === currentUserId) + 1;
  const userEntry = entries.find(e => e.id === currentUserId);
  const aboveEntry = userRank > 1 ? entries[userRank - 2] : null;
  const pointsNeeded = aboveEntry && userEntry
    ? aboveEntry.total_points - userEntry.total_points
    : 0;

  const displayEntries = compact ? entries.slice(0, 3) : entries;

  if (loading) {
    return (
      <div className="space-y-2 px-4 pt-4">
        {Array(compact ? 3 : 5).fill(0).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        {displayEntries.map((entry, idx) => {
          const isMe = entry.id === currentUserId;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${isMe ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
              <span className="text-base w-6 text-center flex-shrink-0">{MEDALS[idx] || `#${idx + 1}`}</span>
              <span className={`flex-1 text-sm font-semibold truncate ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                {isMe ? 'Kamu' : entry.display_name}
              </span>
              <span className={`text-xs font-black ${isMe ? 'text-blue-600' : 'text-gray-500'}`}>
                {(entry.total_points || 0).toLocaleString('id-ID')} poin
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-5 pb-5"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #92400e 60%, #d97706 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Trophy size={20} className="text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Leaderboard</h2>
              <p className="text-amber-300 text-xs">{totalCount} prajurit aktif</p>
            </div>
          </div>
        </div>

        {userRank > 0 && userEntry && (
          <div className="bg-white/15 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">Posisi kamu</p>
                <p className="text-white font-black text-lg">Peringkat #{userRank} <span className="text-amber-300 text-sm font-semibold">dari {totalCount}</span></p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Total poin</p>
                <p className="text-yellow-300 font-black text-lg">{(userEntry.total_points || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
            {pointsNeeded > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-xs">Progress ke #{userRank - 1}</span>
                  <span className="text-amber-300 text-xs font-bold">+{pointsNeeded.toLocaleString('id-ID')} poin lagi</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all"
                    style={{
                      width: `${Math.max(5, Math.min(95, (userEntry.total_points / (aboveEntry?.total_points || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-2">
        {entries.map((entry, idx) => {
          const isMe = entry.id === currentUserId;
          const isTop3 = idx < 3;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                isMe
                  ? 'border-blue-200 bg-blue-50'
                  : isTop3
                  ? 'border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50'
                  : 'border-gray-100 bg-white'
              }`}
              style={{ boxShadow: isTop3 ? '0 2px 8px rgba(245,158,11,0.1)' : '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span className="text-xl w-8 text-center flex-shrink-0">
                {MEDALS[idx] || <span className="text-sm font-black text-gray-400">#{idx + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isMe ? 'text-blue-700' : isTop3 ? 'text-amber-800' : 'text-gray-800'}`}>
                  {isMe ? `${entry.display_name} (Kamu)` : entry.display_name}
                </p>
                <p className="text-xs text-gray-400">Level {entry.level || 1}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-black ${isTop3 ? 'text-amber-600' : 'text-gray-700'}`}>
                  {(entry.total_points || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-400">poin</p>
              </div>
              {idx === 0 && (
                <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-yellow-400 to-amber-500 flex-shrink-0" />
              )}
            </div>
          );
        })}

        {userRank === 0 && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-blue-50 border border-blue-200">
            <TrendingUp size={18} className="text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-600 font-semibold">
              Kamu belum masuk top 10. Terus kerjakan task untuk naik peringkat!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
