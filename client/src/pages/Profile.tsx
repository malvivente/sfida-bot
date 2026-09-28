import React, { useState, useEffect } from 'react';
import { Flame, Trophy, TrendingUp, History, Swords, Sparkles, Wallet, ArrowRight, ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { GramIcon } from '../components/GramIcon.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { DuelHistoryRecord, UserStats, UserBalance, MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { useI18n } from '../i18n/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

interface ProfileProps {
  onResumeDuel?: (matchId: string) => void;
  onOpenLeaderboard?: () => void;
  onGoToDuels?: () => void;
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

export const Profile: React.FC<ProfileProps> = ({ onResumeDuel, onOpenLeaderboard, onGoToDuels }) => {
  const { userAddress, openWalletModal, sendDepositTransaction } = useTonClashContract();
  const { userId, username, fullName, displayName, photoUrl, isPremium } = useTelegram();
  const { isFullscreen, topInset } = useTelegramViewport();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 12;
  const modalBottomOffset = isFullscreen ? 24 : 12;

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  const [history, setHistory] = useState<DuelHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_duel_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [serverStats, setServerStats] = useState<UserStats | null>(null);
  const [activeMatches, setActiveMatches] = useState<MatchData[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_user_balance');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Deposit / Withdraw modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [withdrawAmount, setWithdrawAmount] = useState('1.0');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch permanent database data, active matches, and internal balance
  const fetchUserData = async () => {
    const targetKey = userAddress || (userId ? `tg_${userId}` : '');
    if (!targetKey || !serverUrl) return;
    try {
      // 1. Fetch user history
      const historyRes = await fetch(`${serverUrl}/api/users/${targetKey}/history`);
      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (histData?.history && Array.isArray(histData.history)) {
          setHistory(histData.history);
          try {
            localStorage.setItem('sfidabot_duel_history', JSON.stringify(histData.history));
          } catch {}
        }
      }

      // 2. Fetch server calculated stats
      const statsRes = await fetch(`${serverUrl}/api/users/${targetKey}/stats`);
      if (statsRes.ok) {
        const stData = await statsRes.json();
        if (stData?.stats) {
          setServerStats(stData.stats);
        }
      }

      // 3. Fetch active matches
      const activeRes = await fetch(`${serverUrl}/api/users/${targetKey}/active-matches`);
      if (activeRes.ok) {
        const actData = await activeRes.json();
        if (actData?.matches && Array.isArray(actData.matches)) {
          setActiveMatches(actData.matches);
        }
      }

      // 4. Fetch in-bot balance
      const balRes = await fetch(`${serverUrl}/api/users/${targetKey}/balance?telegramId=${userId || ''}&username=${encodeURIComponent(username || '')}&fullName=${encodeURIComponent(fullName || '')}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        if (balData?.account) {
          setUserBalance(balData.account);
          try {
            localStorage.setItem('sfidabot_user_balance', JSON.stringify(balData.account));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[Profile] Error fetching live user data:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
    const interval = setInterval(fetchUserData, 12000);
    return () => clearInterval(interval);
  }, [userAddress, userId, serverUrl]);

  // Deposit handler via TonConnect
  const handleDeposit = async () => {
    if (!userAddress) {
      openWalletModal();
      return;
    }
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setBalanceLoading(true);
    setBalanceMsg(null);
    try {
      const success = await sendDepositTransaction(depositAmount);
      if (success) {
        setBalanceMsg({ type: 'success', text: t('profile.depositSubmitted', { amount: depositAmount }) });
        setTimeout(() => {
          fetchUserData();
          setShowDepositModal(false);
          setBalanceMsg(null);
        }, 2000);
      } else {
        setBalanceMsg({ type: 'error', text: t('profile.depositCancelled') });
      }
    } catch (err: any) {
      setBalanceMsg({ type: 'error', text: err?.message || t('profile.depositRejected') });
    } finally {
      setBalanceLoading(false);
    }
  };

  // Withdraw handler
  const handleWithdraw = async () => {
    if (!userAddress || !serverUrl) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (amt < 1.0) {
      setBalanceMsg({ type: 'error', text: 'Prelievo minimo: 1.00 GRAM (per evitare lo spreco di fee di rete).' });
      return;
    }

    const currentBal = parseFloat(userBalance?.balanceGram || userBalance?.balanceTon || '0');
    if (currentBal < amt) {
      setBalanceMsg({ type: 'error', text: `Insufficient balance! You have ${currentBal.toFixed(2)} GRAM.` });
      return;
    }

    setBalanceLoading(true);
    setBalanceMsg(null);
    try {
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountGram: withdrawAmount }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        try {
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
        } catch {}
        const txNote = data.txHash ? ' (sent on-chain)' : '';
        setBalanceMsg({ type: 'success', text: `Successfully withdrew ${withdrawAmount} GRAM${txNote} to your wallet!` });
        setTimeout(() => {
          setShowWithdrawModal(false);
          setBalanceMsg(null);
        }, 2500);
      } else {
        setBalanceMsg({ type: 'error', text: data?.message || data?.error || 'Withdrawal failed. Check balance.' });
      }
    } catch (err: any) {
      setBalanceMsg({ type: 'error', text: err?.message || 'Network error during withdrawal.' });
    } finally {
      setBalanceLoading(false);
    }
  };

  const duelsPlayed = serverStats ? serverStats.duelsPlayed : history.length;
  const duelsWon = serverStats ? serverStats.duelsWon : history.filter((h) => h.outcome === 'WIN').length;
  const winRateFormatted = duelsPlayed > 0 ? ((duelsWon / duelsPlayed) * 100).toFixed(1) : '0.0';

  const dailyStreak = serverStats?.dailyStreak || 0;
  const hasWonToday = serverStats?.hasWonToday || false;

  const MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];
  const nextMilestone = MILESTONES.find((m) => m > dailyStreak) || (dailyStreak + 30);
  const prevMilestones = MILESTONES.filter((m) => m <= dailyStreak);
  const prevMilestone = prevMilestones.length > 0 ? prevMilestones[prevMilestones.length - 1] : 0;
  const streakProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((dailyStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100))
  );

  const totalProfitsGram = serverStats
    ? (serverStats.totalProfitsGram || serverStats.totalProfitsTon)
    : history
        .reduce((acc, h) => {
          if (h.outcome === 'WIN') {
            const p = parseFloat(h.payoutGram || h.payoutTon);
            return acc + (isNaN(p) ? 0 : p);
          }
          return acc;
        }, 0)
        .toFixed(2);

  const displayBalance = userBalance
    ? (parseFloat(userBalance.balanceGram || userBalance.balanceTon || '0')).toFixed(2)
    : '0.00';

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans select-none pb-12 animate-in fade-in duration-200">
      
      {/* Profile Overview Card */}
      <div className="bg-[#141724]/90 border border-white/10 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="relative">
            <UserAvatar
              photoUrl={photoUrl}
              name={displayName || fullName || username}
              sizeClass="w-14 h-14"
              roundedClass="rounded-2xl"
              className="ring-2 ring-purple-500/50 shadow-md"
            />
            {isPremium && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-heading font-black text-[10px] flex items-center justify-center shadow-md">
                ★
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-base font-heading font-black text-white truncate">
                {displayName || fullName || username}
              </h2>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              {username && <span className="text-purple-300 font-bold">@{username}</span>}
              {userId && <span className="text-slate-500 font-mono text-[11px]">ID: {userId}</span>}
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
              <Wallet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate font-mono">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : t('profile.walletNotConnected')}
              </span>
            </div>
          </div>
        </div>

        {/* In-Bot Internal Balance Card */}
        <div className="bg-gradient-to-r from-purple-950/40 via-[#181a29] to-indigo-950/40 border border-purple-500/40 rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-extrabold text-slate-400 uppercase tracking-wider">
              {t('profile.balance')}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  triggerImpact('medium');
                  if (!userAddress) { openWalletModal(); return; }
                  setShowDepositModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>{t('profile.deposit')}</span>
              </button>
              <button
                onClick={() => {
                  triggerImpact('medium');
                  if (!userAddress) { openWalletModal(); return; }
                  setShowWithdrawModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-heading font-extrabold text-[11px] uppercase tracking-wider active:scale-95 transition-all flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{t('profile.withdraw')}</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-heading font-black text-white">
              {displayBalance}
            </span>
            <GramIcon className="w-4 h-4 text-purple-400 inline" />
            <span className="text-xs text-slate-400 font-medium ml-2">{t('profile.availableGram')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {/* Victories Card */}
          <div className="bg-[#10131d]/90 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1 font-semibold">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate uppercase font-heading font-bold text-slate-300">{t('profile.duelVictories')}</span>
              </div>
              <div className="text-sm sm:text-base font-heading font-black text-white leading-tight">
                {t('profile.victoriesCount', { won: duelsWon, played: duelsPlayed })}
              </div>
            </div>
            <div className="text-xs font-heading font-black text-cyan-400 mt-2">
              {t('profile.winRate', { rate: winRateFormatted })}
            </div>
          </div>

          {/* Daily Win Streak Card */}
          <div className="bg-[#10131d]/90 border border-orange-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center space-x-1 text-xs mb-1 text-orange-400 font-semibold">
                <Flame className="w-3.5 h-3.5 fill-orange-400 shrink-0" />
                <span className="font-heading font-black text-white text-[11px] sm:text-xs tracking-wider truncate">
                  {t('profile.streakTitle', { streak: dailyStreak })}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {hasWonToday ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
                    <span>{t('profile.streakCompleted')}</span>
                  </span>
                ) : (
                  <span>{t('profile.streakAction')}</span>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="text-emerald-400 font-bold shrink-0">
                  {t('profile.streakUnit', { days: prevMilestone })} ✓
                </span>
                <div className="flex-1 mx-1.5 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    style={{ width: `${streakProgressPct}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                  />
                </div>
                <span className="text-amber-300 font-bold shrink-0">
                  {t('profile.streakUnit', { days: nextMilestone })} 🎁
                </span>
              </div>
              <div className="text-[9px] text-slate-400 text-center truncate font-medium">
                {t('profile.streakGoal', { days: nextMilestone, reward: (nextMilestone * 0.5).toFixed(0) })}
              </div>
            </div>
          </div>
        </div>

        {/* Total Profits */}
        <div className="bg-[#10131d]/90 border border-emerald-500/30 rounded-2xl p-3.5 flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">{t('profile.totalWinningsCredited')}</span>
              <div className="text-base font-heading font-black text-emerald-400 flex items-center space-x-1">
                <span>+{totalProfitsGram}</span>
                <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-400">GRAM</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Global Leaderboard button */}
        {onOpenLeaderboard && (
          <button
            onClick={() => {
              triggerImpact('medium');
              onOpenLeaderboard();
            }}
            className="w-full mt-3 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-400/40 hover:border-amber-400 rounded-2xl text-amber-300 font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{t('profile.viewLeaderboard')}</span>
          </button>
        )}
      </div>

      {/* ACTIVE DUELS SECTION */}
      {activeMatches.length > 0 && (
        <div className="bg-[#141724]/90 border border-cyan-400/40 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-heading font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Swords className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{t('profile.activeDuelsTitle')} ({activeMatches.length})</span>
          </h3>

          <div className="space-y-2">
            {activeMatches.map((m) => {
              const wagerGram = (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
              const opponent =
                userAddress && m.playerA.wallet.toLowerCase() === userAddress.toLowerCase()
                  ? (m.playerB?.name || 'In attesa...')
                  : m.playerA.name;
              const gIcon = getGameIcon(m.gameType);

              return (
                <div
                  key={m.matchId}
                  className="bg-[#10131d]/90 border border-white/10 hover:border-cyan-400/40 rounded-2xl p-3.5 flex items-center justify-between text-xs transition-all shadow-md"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{gIcon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-heading font-bold text-white">MATCH #{m.matchId}</span>
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-heading font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          {m.state}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                        vs <strong className="text-white">{opponent.replace(/^@/, '')}</strong> • Piatto: {wagerGram} GRAM
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onResumeDuel?.(m.matchId)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-heading font-black rounded-xl text-xs uppercase shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1"
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

      {/* Match History */}
      <div className="bg-[#141724]/90 border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-heading font-black text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 truncate">
            <History className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">{t('profile.recentHistoryTitle')}</span>
          </h3>
          <span className="text-xs text-slate-400 shrink-0 font-medium">
            {t('profile.duelsCount', { count: history.length })}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#10131d]/60 border border-white/5 text-center space-y-3">
            <Swords className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              {t('profile.noMatches')}
            </p>
            {onGoToDuels && (
              <button
                type="button"
                onClick={() => {
                  triggerImpact('medium');
                  onGoToDuels();
                }}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all inline-flex items-center space-x-1.5"
              >
                <Swords className="w-4 h-4" />
                <span>{t('activity.playNow')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((item, index) => {
              const isWin = item.outcome === 'WIN';
              const isDraw = item.outcome === 'DRAW';
              const dateStr = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recente';
              const gIcon = getGameIcon(item.gameType);

              return (
                <div
                  key={index}
                  className="bg-[#10131d]/90 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">{gIcon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-heading font-extrabold text-[10px] px-2 py-0.5 rounded-full border ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : isDraw
                              ? 'bg-slate-700/30 text-slate-300 border-slate-600/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                          }`}
                        >
                          {isWin ? 'VITTORIA' : isDraw ? 'PAREGGIO' : 'SCONFITTA'}
                        </span>
                        <span className="text-white font-heading font-bold">vs {item.opponentName.replace(/^@/, '')}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`font-heading font-black text-xs flex items-center space-x-0.5 ${
                        isWin ? 'text-emerald-400' : isDraw ? 'text-slate-400' : 'text-rose-400'
                      }`}
                    >
                      <span>{isWin ? `+${item.payoutGram || item.payoutTon}` : isDraw ? '0.00' : `-${item.wagerGram || item.wagerTon}`}</span>
                      <GramIcon className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{
            paddingTop: `${modalTopOffset}px`,
            paddingBottom: `${modalBottomOffset}px`
          }}
        >
          <div 
            className="bg-[#111420]/95 border border-white/15 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
            style={{
              maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)`
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-black text-white flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4 text-purple-400" />
                <span>DEPOSITA GRAM SUL SALDO</span>
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Deposita GRAM sul tuo saldo interno per sfide istantanee senza transazioni continue e rivincite 2X rapide.
            </p>

            {balanceMsg && (
              <div className={`p-2.5 rounded-2xl border text-xs flex items-center space-x-2 ${
                balanceMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}>
                {balanceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{balanceMsg.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-heading font-extrabold uppercase">Importo (GRAM):</label>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-sm font-heading font-black text-white focus:outline-none"
                />
                <GramIcon className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-xs font-heading font-extrabold text-slate-300 hover:text-white rounded-2xl active:scale-95"
              >
                ANNULLA
              </button>
              <button
                onClick={handleDeposit}
                disabled={balanceLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-heading font-black rounded-2xl shadow-epic-purple hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFERMA DEPOSITO</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{
            paddingTop: `${modalTopOffset}px`,
            paddingBottom: `${modalBottomOffset}px`
          }}
        >
          <div 
            className="bg-[#111420]/95 border border-white/15 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
            style={{
              maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)`
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-black text-white flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
                <span>PRELEVA GRAM NEL WALLET</span>
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Preleva fondi verso il tuo portafoglio TON collegato ({userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}).
            </p>

            {balanceMsg && (
              <div className={`p-2.5 rounded-2xl border text-xs flex items-center space-x-2 ${
                balanceMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}>
                {balanceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{balanceMsg.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                <span>Importo (Min 1.00 GRAM):</span>
                <span>Disponibile: {displayBalance} GRAM</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-sm font-heading font-black text-white focus:outline-none"
                />
                <GramIcon className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-xs font-heading font-extrabold text-slate-300 hover:text-white rounded-2xl active:scale-95"
              >
                ANNULLA
              </button>
              <button
                onClick={handleWithdraw}
                disabled={balanceLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-heading font-black rounded-2xl shadow-epic-purple hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>PRELEVA GRAM</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
