export type LevelInfo = {
  level: number;
  emoji: string;
  name: string;
  rate: number;
  karmaThreshold: number;
  ageThreshold: number;
  nextLevelKarma: number;
  nextLevelAge: number;
  nextEmoji: string;
  nextName: string;
  nextRate: number;
};

export const LEVELS = [
  { level: 0, emoji: '🥚', name: 'Si Telur', rate: 8000, karmaMin: 0, ageMin: 0 },
  { level: 1, emoji: '🦴', name: 'Cave Baby', rate: 10000, karmaMin: 5, ageMin: 3 },
  { level: 2, emoji: '🔥', name: 'Cave Teen', rate: 12000, karmaMin: 100, ageMin: 30 },
  { level: 3, emoji: '⚔️', name: 'Village Warrior', rate: 15000, karmaMin: 500, ageMin: 90 },
  { level: 4, emoji: '🏙️', name: 'City Slicker', rate: 18000, karmaMin: 2000, ageMin: 180 },
  { level: 5, emoji: '👑', name: 'Reddit Legend', rate: 25000, karmaMin: 10000, ageMin: 365 },
];

export function calculateLevel(karma: number, ageDays: number): number {
  if (karma >= 10000 && ageDays >= 365) return 5;
  if (karma >= 2000 || ageDays >= 365) return 4;
  if (karma >= 500 || ageDays >= 180) return 3;
  if (karma >= 100 || ageDays >= 90) return 2;
  if (karma >= 5 || ageDays >= 3) return 1;
  return 0;
}

export function getLevelInfo(karma: number, ageDays: number): LevelInfo {
  const level = calculateLevel(karma, ageDays);
  const current = LEVELS[level];
  const next = LEVELS[Math.min(level + 1, 5)];

  return {
    level,
    emoji: current.emoji,
    name: current.name,
    rate: current.rate,
    karmaThreshold: current.karmaMin,
    ageThreshold: current.ageMin,
    nextLevelKarma: next.karmaMin,
    nextLevelAge: next.ageMin,
    nextEmoji: next.emoji,
    nextName: next.name,
    nextRate: next.rate,
  };
}

export function getKarmaProgress(karma: number, ageDays: number): number {
  const level = calculateLevel(karma, ageDays);
  if (level >= 5) return 100;

  const current = LEVELS[level];
  const next = LEVELS[level + 1];

  const karmaProgress = next.karmaMin > 0
    ? Math.min((karma - current.karmaMin) / (next.karmaMin - current.karmaMin), 1)
    : 1;

  const ageProgress = next.ageMin > 0
    ? Math.min((ageDays - current.ageMin) / (next.ageMin - current.ageMin), 1)
    : 1;

  return Math.round(Math.max(karmaProgress, ageProgress) * 100);
}

export function formatRate(rate: number): string {
  return `Rp${(rate / 1000).toFixed(0)}.000`;
}
