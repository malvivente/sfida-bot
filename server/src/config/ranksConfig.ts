export type UserRank = 'wood' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'obsidian';

export interface RankDefinition {
  id: UserRank;
  name: string;
  nameIt: string;
  minXp: number;
  feeGram: number; // Creation & participation fee in GRAM
  rewardGram: number; // Bonus GRAM rewarded upon reaching this tier
  rewardTickets: number; // Free raffle tickets rewarded upon reaching this tier
  badgeColor: string;
  textColor: string;
  borderColor: string;
  bgGradient: string;
  glowShadow: string;
  iconName: string;
}

export const RANKS_CONFIG: Record<UserRank, RankDefinition> = {
  wood: {
    id: 'wood',
    name: 'Wood',
    nameIt: 'Legno',
    minXp: 0,
    feeGram: 0.10,
    rewardGram: 0,
    rewardTickets: 0,
    badgeColor: '#8B5A2B',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-800/50',
    bgGradient: 'from-amber-950/80 to-yellow-950/60',
    glowShadow: 'shadow-[0_0_8px_rgba(180,83,9,0.3)]',
    iconName: 'Shield',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    nameIt: 'Bronzo',
    minXp: 100,
    feeGram: 0.08,
    rewardGram: 0.20,
    rewardTickets: 3,
    badgeColor: '#CD7F32',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-600/60',
    bgGradient: 'from-amber-900/80 via-amber-800/60 to-yellow-950/60',
    glowShadow: 'shadow-[0_0_10px_rgba(205,127,50,0.4)]',
    iconName: 'Award',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    nameIt: 'Argento',
    minXp: 350,
    feeGram: 0.06,
    rewardGram: 0.50,
    rewardTickets: 7,
    badgeColor: '#C0C0C0',
    textColor: 'text-slate-200',
    borderColor: 'border-slate-300/60',
    bgGradient: 'from-slate-600/80 via-slate-500/60 to-slate-800/60',
    glowShadow: 'shadow-[0_0_12px_rgba(192,192,192,0.4)]',
    iconName: 'ShieldCheck',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    nameIt: 'Oro',
    minXp: 900,
    feeGram: 0.04,
    rewardGram: 1.50,
    rewardTickets: 15,
    badgeColor: '#FBBF24',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-400/70',
    bgGradient: 'from-yellow-600/80 via-amber-500/70 to-yellow-700/60',
    glowShadow: 'shadow-[0_0_14px_rgba(251,191,36,0.5)]',
    iconName: 'Crown',
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    nameIt: 'Platino',
    minXp: 2200,
    feeGram: 0.02,
    rewardGram: 3.50,
    rewardTickets: 30,
    badgeColor: '#22D3EE',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-400/70',
    bgGradient: 'from-cyan-600/80 via-teal-500/70 to-blue-700/60',
    glowShadow: 'shadow-[0_0_15px_rgba(34,211,238,0.55)]',
    iconName: 'Sparkles',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    nameIt: 'Diamante',
    minXp: 5000,
    feeGram: 0.01,
    rewardGram: 8.00,
    rewardTickets: 60,
    badgeColor: '#38BDF8',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-400/80',
    bgGradient: 'from-sky-500/90 via-blue-600/80 to-indigo-700/70',
    glowShadow: 'shadow-[0_0_18px_rgba(56,189,248,0.7)]',
    iconName: 'Gem',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    nameIt: 'Ossidiana',
    minXp: 12000,
    feeGram: 0.01,
    rewardGram: 20.00,
    rewardTickets: 150,
    badgeColor: '#A855F7',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-400/90',
    bgGradient: 'from-purple-600/90 via-fuchsia-600/80 to-indigo-950',
    glowShadow: 'shadow-[0_0_22px_rgba(168,85,247,0.85)]',
    iconName: 'Flame',
  },
};

export const RANKS_LIST: UserRank[] = ['wood', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'obsidian'];

export function getRankFromXp(xp: number): UserRank {
  for (let i = RANKS_LIST.length - 1; i >= 0; i--) {
    const rank = RANKS_LIST[i];
    if (xp >= RANKS_CONFIG[rank].minXp) {
      return rank;
    }
  }
  return 'wood';
}

export function getUserFee(rank: UserRank): number {
  return RANKS_CONFIG[rank]?.feeGram ?? 0.10;
}

export function getNextRankProgress(xp: number): {
  currentRank: UserRank;
  nextRank: UserRank | null;
  progressPercent: number;
  xpInCurrentTier: number;
  xpNeededForNextTier: number;
} {
  const currentRank = getRankFromXp(xp);
  const rankIndex = RANKS_LIST.indexOf(currentRank);
  const nextRank = rankIndex < RANKS_LIST.length - 1 ? RANKS_LIST[rankIndex + 1] : null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressPercent: 100,
      xpInCurrentTier: xp - RANKS_CONFIG[currentRank].minXp,
      xpNeededForNextTier: 0,
    };
  }

  const currentMin = RANKS_CONFIG[currentRank].minXp;
  const nextMin = RANKS_CONFIG[nextRank].minXp;
  const xpInTier = Math.max(0, xp - currentMin);
  const xpNeeded = nextMin - currentMin;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInTier / xpNeeded) * 100)));

  return {
    currentRank,
    nextRank,
    progressPercent,
    xpInCurrentTier: xpInTier,
    xpNeededForNextTier: xpNeeded,
  };
}
