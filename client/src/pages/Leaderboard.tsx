import React, { useState, useEffect } from 'react';
import { Trophy, Flame, TrendingUp, Medal, Crown, Sparkles, RefreshCw, Loader2, User } from 'lucide-react';
import { GramIcon } from '../components/GramIcon.js';
import { LeaderboardEntry } from '../types/index.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface LeaderboardProps {
  onBack?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const { userAddress } = useTonClashContract();
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
      const url = `${serverUrl}/api/leaderboard?sortBy=${sortBy}&limit=50${
        userAddress ? `&userAddress=${userAddress}` : ''
      }`;
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
  }, [sortBy, userAddress, serverUrl]);

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
        <span className="flex items-center space-x-1 text-orange-400 font-bold">
          <Flame className="w-3.5 h-3.5 fill-orange-400" />
          <span>{entry.dailyStreak}d</span>
        </span>
      );
    } else if (sortBy === 'profits') {
      return (
        <span className="flex items-center space-x-1 text-cyber-green font-bold">
          <span>+{parseFloat(entry.totalProfitsGram || '0').toFixed(1)}</span>
          <GramIcon className="w-3 h-3 text-cyber-green" />
        </span>
      );
    } else {
      return (
        <span className="flex items-center space-x-1 text-cyber-cyan font-bold">
          <Trophy className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>{entry.duelsWon}W</span>
        </span>
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyber-card via-cyber-card/90 to-cyber-bg border border-cyber-border p-4 shadow-xl text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        {onBack && (
          <div className="flex items-center justify-start mb-2">
            <button
              onClick={() => {
                triggerImpact('light');
                onBack();
              }}
              className="text-xs font-chakra font-bold text-cyber-cyan hover:underline flex items-center space-x-1"
            >
              <span>{t('leaderboard.backToArena')}</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-cyber-cyan" />
            <span className="text-sm font-orbitron font-extrabold tracking-wider text-white">
              {t('leaderboard.title')}
            </span>
          </div>
          <button
            onClick={() => {
              triggerImpact('light');
              fetchLeaderboard(true);
            }}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-cyber-bg/80 border border-cyber-border text-slate-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-slate-400 font-chakra text-left">
          {t('leaderboard.subtitle')}
        </p>
      </div>

      {/* Sort Filter Tabs */}
      <div className="flex items-center space-x-1.5 bg-cyber-card/80 border border-cyber-border rounded-xl p-1 shadow-md">
        <button
          onClick={() => handleTabChange('wins')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center justify-center space-x-1 transition-all ${
            sortBy === 'wins'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabWins')}</span>
        </button>

        <button
          onClick={() => handleTabChange('streak')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center justify-center space-x-1 transition-all ${
            sortBy === 'streak'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabStreak')}</span>
        </button>

        <button
          onClick={() => handleTabChange('profits')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center justify-center space-x-1 transition-all ${
            sortBy === 'profits'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>{t('leaderboard.tabProfits')}</span>
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
          <span className="text-xs font-chakra text-slate-400">{t('leaderboard.loading')}</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-8 text-center bg-cyber-card/40 border border-cyber-border rounded-2xl">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-400 font-chakra">{t('leaderboard.noData')}</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-2">
            {/* 2nd Place */}
            {top2 ? (
              <div className="bg-gradient-to-b from-slate-700/30 to-cyber-card/60 border border-slate-500/40 rounded-2xl p-2.5 text-center flex flex-col items-center relative shadow-lg">
                <div className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-400 flex items-center justify-center text-xs font-bold text-slate-200 mb-1">
                  🥈
                </div>
                <span className="text-xs font-chakra font-bold text-white truncate max-w-full">
                  {top2.username}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra">
                  {top2.duelsWon}W / {top2.duelsPlayed}G
                </span>
                <div className="mt-1 text-xs font-chakra font-bold">
                  {getPrimaryStatDisplay(top2)}
                </div>
              </div>
            ) : (
              <div className="h-24 bg-cyber-card/20 rounded-2xl border border-cyber-border/40" />
            )}

            {/* 1st Place (Crown & Gold) */}
            {top1 ? (
              <div className="bg-gradient-to-b from-amber-500/20 to-cyber-card border-2 border-amber-400 rounded-2xl p-3 text-center flex flex-col items-center relative shadow-neon-amber -translate-y-2">
                <Crown className="w-5 h-5 text-amber-400 absolute -top-3" />
                <div className="w-10 h-10 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-sm font-bold text-amber-300 mb-1">
                  🥇
                </div>
                <span className="text-xs font-chakra font-black text-white truncate max-w-full">
                  {top1.username}
                </span>
                <span className="text-[10px] text-amber-200/70 font-chakra">
                  {top1.duelsWon}W / {top1.duelsPlayed}G ({top1.winRate}%)
                </span>
                <div className="mt-1.5 text-sm font-chakra font-bold">
                  {getPrimaryStatDisplay(top1)}
                </div>
              </div>
            ) : null}

            {/* 3rd Place */}
            {top3 ? (
              <div className="bg-gradient-to-b from-amber-900/30 to-cyber-card/60 border border-amber-700/40 rounded-2xl p-2.5 text-center flex flex-col items-center relative shadow-lg">
                <div className="w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700 flex items-center justify-center text-xs font-bold text-amber-500 mb-1">
                  🥉
                </div>
                <span className="text-xs font-chakra font-bold text-white truncate max-w-full">
                  {top3.username}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra">
                  {top3.duelsWon}W / {top3.duelsPlayed}G
                </span>
                <div className="mt-1 text-xs font-chakra font-bold">
                  {getPrimaryStatDisplay(top3)}
                </div>
              </div>
            ) : (
              <div className="h-24 bg-cyber-card/20 rounded-2xl border border-cyber-border/40" />
            )}
          </div>

          {/* Ranks 4+ List */}
          {remaining.length > 0 && (
            <div className="space-y-1.5">
              {remaining.map((entry) => {
                const isCurrentUser =
                  userAddress &&
                  entry.walletAddress.toLowerCase() === userAddress.toLowerCase();

                return (
                  <div
                    key={entry.walletAddress}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isCurrentUser
                        ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-sm'
                        : 'bg-cyber-card/70 border-cyber-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xs font-orbitron font-bold text-slate-400 w-6 text-center">
                        #{entry.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-xs font-chakra font-bold truncate max-w-[130px] sm:max-w-[160px] ${
                              isCurrentUser ? 'text-cyber-cyan' : 'text-white'
                            }`}
                          >
                            {entry.username}
                          </span>
                          {entry.dailyStreak > 0 && (
                            <span className="flex items-center space-x-0.5 text-[10px] text-orange-400 bg-orange-500/10 px-1 py-0.2 rounded border border-orange-500/20 font-chakra">
                              <Flame className="w-2.5 h-2.5 fill-orange-400" />
                              <span>{entry.dailyStreak}d</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-chakra">
                          {entry.duelsWon}W / {entry.duelsPlayed}G • {entry.winRate}% WR
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-chakra font-bold">
                        {getPrimaryStatDisplay(entry)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-chakra flex items-center justify-end space-x-0.5">
                        <span>{parseFloat(entry.totalProfitsGram || '0').toFixed(1)}</span>
                        <GramIcon className="w-2.5 h-2.5 text-slate-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Pinned User Rank Bar (if user is connected) */}
      {userAddress && userEntry && (
        <div className="sticky bottom-2 z-20 bg-cyber-bg/95 border-2 border-cyber-cyan/70 rounded-xl p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center font-orbitron font-extrabold text-xs text-cyber-cyan shrink-0">
                #{userEntry.rank}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-chakra font-bold text-cyber-cyan uppercase tracking-wider block">
                  {t('leaderboard.yourRank')}
                </span>
                <span className="text-xs font-chakra font-bold text-white truncate block">
                  {userEntry.username}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right shrink-0">
              {userEntry.dailyStreak > 0 && (
                <div className="flex items-center space-x-0.5 text-orange-400 font-chakra text-xs font-bold">
                  <Flame className="w-3 h-3 fill-orange-400" />
                  <span>{userEntry.dailyStreak}d</span>
                </div>
              )}
              <div className="text-xs font-chakra font-bold">
                {getPrimaryStatDisplay(userEntry)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
