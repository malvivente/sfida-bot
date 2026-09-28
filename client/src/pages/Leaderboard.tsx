import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Crown, Sparkles, RefreshCw, Loader2, User, ArrowLeft } from 'lucide-react';
import { GramIcon } from '../components/GramIcon.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { LeaderboardEntry } from '../types/index.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface LeaderboardProps {
  onBack?: () => void;
}

/**
 * Format rank: displays #1 to #100.
 * For ranks beyond 100, groups into tiers: 100+, 200+, ... up to 999+.
 */
export function formatRank(rank: number): string {
  if (rank <= 100) return `#${rank}`;
  const tier = Math.floor(rank / 100) * 100;
  if (tier >= 1000) return '999+';
  return `${tier}+`;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const { userAddress } = useTonClashContract();
  const { userId } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  const [sortBy, setSortBy] = useState<'wins' | 'streak' | 'profits'>('wins');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLeaderboard = async (isManual = false) => {
    if (!serverUrl) {
      setIsLoading(false);
      return;
    }
    if (isManual) setIsRefreshing(true);
    try {
      const url = `${serverUrl}/api/leaderboard?sortBy=${sortBy}&limit=100${
        userAddress ? `&userAddress=${userAddress}` : ''
      }${userId ? `&telegramId=${userId}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        if (data?.userEntry) {
          setUserEntry(data.userEntry);
        }
      }
    } catch (err) {
      console.warn('[Leaderboard] Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 15000);
    return () => clearInterval(interval);
  }, [sortBy, userAddress, userId, serverUrl]);

  const handleTabChange = (type: 'wins' | 'streak' | 'profits') => {
    triggerImpact('light');
    setSortBy(type);
    setIsLoading(true);
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const remaining = leaderboard.slice(3);

  const getPrimaryStatDisplay = (entry: LeaderboardEntry) => {
    if (sortBy === 'streak') {
      return (
        <span className="flex items-center space-x-1 text-orange-400 font-heading font-black">
          <Flame className="w-3.5 h-3.5 fill-orange-400" />
          <span>{entry.dailyStreak}d</span>
        </span>
      );
    } else if (sortBy === 'profits') {
      return (
        <span className="flex items-center space-x-1 text-emerald-400 font-heading font-black">
          <span>+{parseFloat(entry.totalProfitsGram || '0').toFixed(1)}</span>
          <GramIcon className="w-3 h-3 text-emerald-400" />
        </span>
      );
    } else {
      return (
        <span className="flex items-center space-x-1 text-cyan-400 font-heading font-black">
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span>{entry.duelsWon}W</span>
        </span>
      );
    }
  };

  const renderAvatar = (entry: LeaderboardEntry, sizeClass: string = 'w-9 h-9', textClass: string = 'text-xs') => (
    <UserAvatar
      photoUrl={entry.photoUrl}
      name={entry.username}
      sizeClass={sizeClass}
      textClass={textClass}
    />
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans select-none pb-12 animate-in fade-in duration-200">
      
      {/* Top Header Row with Back Button */}
      <div className="flex items-center justify-between px-1">
        {onBack ? (
          <button
            onClick={() => {
              triggerImpact('light');
              onBack();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>{t('epic.back')}</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <div className="flex items-center space-x-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-heading font-black text-white uppercase tracking-wider">
            {t('leaderboard.title')}
          </h2>
        </div>

        <button
          onClick={() => {
            triggerImpact('light');
            fetchLeaderboard(true);
          }}
          disabled={isRefreshing}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Sort Filter Tabs */}
      <div className="flex items-center space-x-1.5 bg-[#141724]/90 border border-white/10 rounded-2xl p-1.5 shadow-lg">
        <button
          onClick={() => handleTabChange('wins')}
          className={`flex-1 py-2 rounded-xl text-xs font-heading font-extrabold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
            sortBy === 'wins'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabWins')}</span>
        </button>

        <button
          onClick={() => handleTabChange('streak')}
          className={`flex-1 py-2 rounded-xl text-xs font-heading font-extrabold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
            sortBy === 'streak'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabStreak')}</span>
        </button>

        <button
          onClick={() => handleTabChange('profits')}
          className={`flex-1 py-2 rounded-xl text-xs font-heading font-extrabold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
            sortBy === 'profits'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabProfits')}</span>
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs font-medium text-slate-400">{t('leaderboard.loading')}</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-8 text-center bg-[#141724]/60 border border-white/10 rounded-3xl">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-400 font-medium">{t('leaderboard.noData')}</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-2.5 items-end pt-4 pb-2">
            {/* 2nd Place Silver */}
            {top2 ? (
              <div className="bg-gradient-to-b from-slate-400/15 via-[#1a1e2c] to-[#12141c] border border-slate-400/30 rounded-3xl p-3 text-center flex flex-col items-center relative shadow-lg">
                <div className="relative mb-1 w-12 h-12 flex items-center justify-center shrink-0 mx-auto">
                  {renderAvatar(top2, 'w-12 h-12', 'text-sm')}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-heading font-black text-[10px] flex items-center justify-center shadow-md z-10">
                    2
                  </span>
                </div>
                <span className="text-xs font-heading font-extrabold text-white truncate max-w-full block mt-1">
                  {top2.username.replace(/^@/, '')}
                </span>
                <div className="mt-1 text-xs">
                  {getPrimaryStatDisplay(top2)}
                </div>
              </div>
            ) : <div />}

            {/* 1st Place Gold (Center Hero) */}
            {top1 && (
              <div className="bg-gradient-to-b from-amber-500/25 via-[#231d16] to-[#16131b] border-2 border-amber-400/60 rounded-3xl p-3.5 text-center flex flex-col items-center relative shadow-epic-gold -translate-y-2">
                <Crown className="w-6 h-6 text-amber-300 absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                <div className="relative mb-1 w-16 h-16 flex items-center justify-center shrink-0 mx-auto mt-1">
                  {renderAvatar(top1, 'w-16 h-16', 'text-base')}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-heading font-black text-[11px] flex items-center justify-center shadow-md z-10">
                    1
                  </span>
                </div>
                <span className="text-xs font-heading font-black text-amber-200 truncate max-w-full block mt-1">
                  {top1.username.replace(/^@/, '')}
                </span>
                <div className="mt-1 text-xs font-extrabold">
                  {getPrimaryStatDisplay(top1)}
                </div>
              </div>
            )}

            {/* 3rd Place Bronze */}
            {top3 ? (
              <div className="bg-gradient-to-b from-amber-800/20 via-[#221817] to-[#131118] border border-amber-600/30 rounded-3xl p-3 text-center flex flex-col items-center relative shadow-lg">
                <div className="relative mb-1 w-12 h-12 flex items-center justify-center shrink-0 mx-auto">
                  {renderAvatar(top3, 'w-12 h-12', 'text-sm')}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-amber-100 font-heading font-black text-[10px] flex items-center justify-center shadow-md z-10">
                    3
                  </span>
                </div>
                <span className="text-xs font-heading font-extrabold text-white truncate max-w-full block mt-1">
                  {top3.username.replace(/^@/, '')}
                </span>
                <div className="mt-1 text-xs">
                  {getPrimaryStatDisplay(top3)}
                </div>
              </div>
            ) : <div />}
          </div>

          {/* Remaining Ranks List (4 to 100) */}
          {remaining.length > 0 && (
            <div className="space-y-2 mt-2">
              {remaining.map((entry) => {
                const isCurrentUser =
                  (userAddress && entry.walletAddress === userAddress) ||
                  (userId && entry.telegramId === String(userId));

                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isCurrentUser
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-epic-purple'
                        : 'bg-[#141724]/90 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xs font-heading font-extrabold text-slate-400 w-7 text-center shrink-0">
                        {formatRank(entry.rank)}
                      </span>
                      {renderAvatar(entry, 'w-8 h-8', 'text-xs')}
                      <div className="min-w-0">
                        <span className="text-xs font-heading font-bold text-white truncate block">
                          {entry.username.replace(/^@/, '')}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{entry.duelsWon}W / {entry.duelsPlayed}G</span>
                          <span>•</span>
                          <span>{entry.winRate}% WR</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {getPrimaryStatDisplay(entry)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Current User Rank Bar (if user is ranked) */}
          {userEntry && (
            <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-3 z-30 pointer-events-none">
              <div className="p-3 rounded-2xl bg-[#161a29]/95 backdrop-blur-xl border border-purple-500/50 shadow-2xl flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-heading font-black text-xs">
                    {formatRank(userEntry.rank)}
                  </span>
                  {renderAvatar(userEntry, 'w-8 h-8', 'text-xs')}
                  <div className="min-w-0">
                    <span className="text-xs font-heading font-black text-white truncate block">
                      {t('leaderboard.yourRank')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {userEntry.duelsWon}W / {userEntry.duelsPlayed}G ({userEntry.winRate}% WR)
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {getPrimaryStatDisplay(userEntry)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
