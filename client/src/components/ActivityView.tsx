import React, { useState, useEffect } from 'react';
import { Swords, Trophy, Flame, TrendingUp, ArrowRight, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { MatchData, DuelHistoryRecord, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { GramIcon } from './GramIcon.js';
import { GameIcon } from './GameIcon.js';
import { UserAvatar } from './UserAvatar.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { areAddressesEqual } from '../utils/ton.js';

interface ActivityViewProps {
  onResumeMatch: (matchId: string) => void;
  onGoToHome: () => void;
}

const getGameIcon = (type?: GameType) => {
  switch (type) {
    case 'roulette': return '🎯';
    case 'blackjack': return '🃏';
    case 'bridge': return '🌉';
    case 'chrono': return '⏱️';
    case 'split': return '🤝';
    default: return '⚔️';
  }
};

export const ActivityView: React.FC<ActivityViewProps> = ({ onResumeMatch, onGoToHome }) => {
  const { userId, username, displayName } = useTelegram();
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  // Match History
  const [history, setHistory] = useState<DuelHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_duel_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Matches
  const [activeMatches, setActiveMatches] = useState<MatchData[]>([]);

  useEffect(() => {
    const targetKey = userAddress || (userId ? `tg_${userId}` : '');
    if (!targetKey || !serverUrl) return;

    // Fetch history
    fetch(`${serverUrl}/api/users/${targetKey}/history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.history && Array.isArray(data.history)) {
          setHistory(data.history);
          try {
            localStorage.setItem('sfidabot_duel_history', JSON.stringify(data.history));
          } catch {}
        }
      })
      .catch(() => {});

    // Fetch active matches
    fetch(`${serverUrl}/api/users/${targetKey}/active-matches`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.matches && Array.isArray(data.matches)) {
          setActiveMatches(data.matches);
        }
      })
      .catch(() => {});
  }, [userAddress, userId, serverUrl]);

  const duelsPlayed = history.length;
  const duelsWon = history.filter((h) => h.outcome === 'WIN').length;
  const winRate = duelsPlayed > 0 ? ((duelsWon / duelsPlayed) * 100).toFixed(0) : '0';
  const totalProfitsGram = history
    .reduce((acc, h) => {
      if (h.outcome === 'WIN') {
        const p = parseFloat(h.payoutGram || h.payoutTon);
        return acc + (isNaN(p) ? 0 : p);
      }
      return acc;
    }, 0)
    .toFixed(2);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-heading font-black text-white uppercase tracking-wider">
              {t('nav.activity')}
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              {t('profile.duelsCount', { count: duelsPlayed })}
            </span>
          </div>
        </div>

        {/* Total Profits Tag */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-heading font-extrabold text-emerald-400">
            +{totalProfitsGram}
          </span>
          <GramIcon className="w-3 h-3 text-emerald-400" />
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-[#141724]/90 border border-white/10 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider">
            {t('leaderboard.wins')}
          </span>
          <span className="text-lg font-heading font-black text-amber-300 mt-0.5">
            {duelsWon}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#141724]/90 border border-white/10 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider">
            {t('leaderboard.winRate')}
          </span>
          <span className="text-lg font-heading font-black text-cyan-400 mt-0.5">
            {winRate}%
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#141724]/90 border border-white/10 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider">
            {t('profile.availableGram')}
          </span>
          <span className="text-lg font-heading font-black text-white mt-0.5 flex items-center space-x-0.5">
            <span>{duelsPlayed}</span>
          </span>
        </div>
      </div>

      {/* ACTIVE DUELS (Matches in progress needing attention) */}
      {activeMatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 px-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider">
              {t('profile.activeDuelsTitle')}
            </h3>
          </div>

          <div className="space-y-2">
            {activeMatches.map((m) => {
              const wager = (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
              const opponent =
                m.playerA.wallet === userAddress || (userId && (m.playerA as any)?.telegramUserId === String(userId))
                  ? m.playerB?.name || 'In attesa...'
                  : m.playerA.name;
              const gIcon = getGameIcon(m.gameType);

              return (
                <div
                  key={m.matchId}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171b29] to-[#12141c] border border-cyan-400/40 flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                      {gIcon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-heading font-black text-white">
                          vs {opponent.replace(/^@/, '')}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 text-[9px] font-extrabold uppercase">
                          {m.state}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-300 mt-0.5">
                        <span>Piatto: {wager}</span>
                        <GramIcon className="w-3 h-3 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerImpact('medium');
                      onResumeMatch(m.matchId);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all flex items-center space-x-1"
                  >
                    <span>{t('profile.resume')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT DUEL HISTORY */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 px-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider">
            {t('profile.recentHistoryTitle')}
          </h3>
        </div>

        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map((record, idx) => {
              const isWin = record.outcome === 'WIN';
              const isDraw = record.outcome === 'DRAW';
              const wager = record.wagerGram || record.wagerTon || '1.00';
              const payout = record.payoutGram || record.payoutTon || '0.00';
              const gMeta = GAMES_METADATA[(record.gameType as GameType) || 'roulette'];
              const gIcon = getGameIcon(record.gameType);
              const dateStr = record.timestamp
                ? new Date(record.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={`${record.timestamp}-${idx}`}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isWin
                      ? 'bg-[#121e19]/90 border-emerald-500/30'
                      : isDraw
                      ? 'bg-[#191924]/90 border-slate-600/40'
                      : 'bg-[#1a1215]/90 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isWin ? 'bg-emerald-500/20 text-emerald-300' : isDraw ? 'bg-slate-700/30 text-slate-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      <GameIcon type={record.gameType} className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-heading font-extrabold text-white">
                          {gMeta?.title || 'Duello'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          vs {record.opponentName ? record.opponentName.replace(/^@/, '') : 'Avversario'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{dateStr}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-heading font-black flex items-center justify-end space-x-0.5 ${
                        isWin ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-rose-400'
                      }`}
                    >
                      <span>{isWin ? `+${payout}` : isDraw ? '0.00' : `-${wager}`}</span>
                      <GramIcon className="w-3 h-3" />
                    </div>
                    <span
                      className={`text-[9px] font-heading font-bold uppercase ${
                        isWin ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? t('profile.win') : isDraw ? t('profile.draw') : t('profile.loss')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-[#141724]/80 border border-white/10 text-center space-y-3">
            <Swords className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              {t('profile.noMatches')}
            </p>
            <button
              onClick={() => {
                triggerImpact('medium');
                onGoToHome();
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-epic-purple active:scale-95 transition-all inline-flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{t('epic.playNow')}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
