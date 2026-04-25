import { supabase, RedditAccount } from './supabase';
import { calculateLevel, getLevelInfo, LEVELS } from './gamification';

export type KarmaFetchResult = {
  karma: number;
  ageDays: number;
  newLevel: number;
  previousLevel: number;
  leveledUp: boolean;
};

export async function fetchRedditKarma(username: string): Promise<{ karma: number; ageDays: number } | null> {
  const cleanUsername = username.replace(/^u\//, '');
  try {
    const res = await fetch(`https://www.reddit.com/user/${cleanUsername}/about.json`, {
      headers: { 'User-Agent': 'RedditArmy/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data) return null;

    const karma = (data.link_karma || 0) + (data.comment_karma || 0);
    const createdUtc = data.created_utc || 0;
    const ageDays = Math.floor((Date.now() / 1000 - createdUtc) / 86400);

    return { karma, ageDays };
  } catch {
    return null;
  }
}

export async function refreshAccountKarma(account: RedditAccount): Promise<KarmaFetchResult | null> {
  const result = await fetchRedditKarma(account.username);
  if (!result) return null;

  const { karma, ageDays } = result;
  const previousLevel = account.level;
  const newLevel = calculateLevel(karma, ageDays);
  const levelInfo = getLevelInfo(karma, ageDays);
  const leveledUp = newLevel > previousLevel;

  const nextLevelData = LEVELS[Math.min(newLevel + 1, 5)];

  await supabase
    .from('reddit_accounts')
    .update({
      karma,
      account_age_days: ageDays,
      level: newLevel,
      level_name: levelInfo.name,
      level_emoji: levelInfo.emoji,
      level_rate: levelInfo.rate,
      karma_next_level: nextLevelData.karmaMin,
      last_karma_fetch: new Date().toISOString(),
    })
    .eq('id', account.id);

  return { karma, ageDays, newLevel, previousLevel, leveledUp };
}

export function shouldRefreshKarma(lastFetch: string | null): boolean {
  if (!lastFetch) return true;
  const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
  return hoursSince >= 24;
}
