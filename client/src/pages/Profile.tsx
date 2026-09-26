import React, { useState, useEffect } from 'react';
import { Flame, Trophy, TrendingUp, History, Swords, Sparkles, Wallet, ArrowRight, ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { GramIcon } from '../components/GramIcon.js';
import { DuelHistoryRecord, UserStats, UserBalance, MatchData } from '../types/index.js';
import { Address } from '@ton/ton';
import { useI18n } from '../i18n/index.js';

interface ProfileProps {
  onResumeDuel?: (matchId: string) => void;
  onOpenLeaderboard?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onResumeDuel, onOpenLeaderboard }) => {
  const { userAddress, openWalletModal, sendDepositTransaction } = useTonClashContract();
  const { userId, username, fullName, displayName, photoUrl, isPremium } = useTelegram();
  const { isFullscreen, topInset } = useTelegramViewport();

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
      const historyRes = await fetch(`${serverUrl}/api/users/${targetKey}/history?telegramId=${userId || ''}`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (data?.history) {
          setHistory(data.history);
          localStorage.setItem('sfidabot_duel_history', JSON.stringify(data.history));
        }
      }

      // 2. Fetch server user stats
      const statsRes = await fetch(`${serverUrl}/api/users/${targetKey}/stats?telegramId=${userId || ''}`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data?.stats) {
          setServerStats(data.stats);
        }
      }

      // 3. Fetch user internal balance
      const balRes = await fetch(
        `${serverUrl}/api/users/${targetKey}/balance?telegramId=${userId || ''}&username=${encodeURIComponent(username || '')}&fullName=${encodeURIComponent(fullName || '')}&photoUrl=${encodeURIComponent(photoUrl || '')}`
      );
      if (balRes.ok) {
        const data = await balRes.json();
        if (data?.account) {
          setUserBalance(data.account);
          try {
            localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
          } catch {}
        }
      }

      // 4. Fetch user active matches (if wallet is connected)
      if (userAddress) {
        const activeRes = await fetch(`${serverUrl}/api/users/${userAddress}/active-matches`);
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (data?.matches) {
            setActiveMatches(data.matches);
          }
        }
      }
    } catch (err) {
      console.warn('[Profile] Error syncing with database:', err);
    }
  };

  useEffect(() => {
    if (!userAddress && !userId) return;
    fetchUserData();
    const interval = setInterval(fetchUserData, 10000);
    return () => clearInterval(interval);
  }, [userAddress, userId, serverUrl]);

  // Real Deposit handler via TonConnect
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
      // 1. Fetch target deposit address from server
      let targetDepositAddress = '';
      try {
        const addrRes = await fetch(`${serverUrl}/api/treasury/address`);
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          targetDepositAddress = addrData.depositAddress;
        }
      } catch (e) {
        console.warn('Could not fetch treasury address, using fallback:', e);
      }

      if (!targetDepositAddress) {
        targetDepositAddress = 'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
      }

      setBalanceMsg({ type: 'success', text: 'Confirm the deposit transaction in your Tonkeeper wallet...' });

      // 2. Real on-chain TonConnect transaction
      let friendlyWallet = userAddress;
      try {
        friendlyWallet = Address.parse(userAddress).toString({ bounceable: false });
      } catch {}

      const txResult = await sendDepositTransaction(
        targetDepositAddress,
        depositAmount,
        'Sfida deposit'
      );

      // 3. Confirm to server
      const boc = txResult?.boc;
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountGram: depositAmount,
          boc,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        try {
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
        } catch {}
        setBalanceMsg({ type: 'success', text: `Deposit confirmed! +${depositAmount} GRAM added to your balance!` });
        setTimeout(() => {
          setShowDepositModal(false);
          setBalanceMsg(null);
        }, 2500);
      } else {
        setBalanceMsg({ type: 'error', text: data?.error || 'Deposit verification failed.' });
      }
    } catch (err: any) {
      setBalanceMsg({ type: 'error', text: err?.message || 'Transaction was rejected or cancelled in wallet.' });
    } finally {
      setBalanceLoading(false);
    }
  };

  // Withdraw handler
  const handleWithdraw = async () => {
    if (!userAddress || !serverUrl) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;

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

  const { t } = useI18n();

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

  const displayBalance = userBalance?.balanceGram || userBalance?.balanceTon || '0.00';

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Profile Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-cyber-bg border border-cyber-cyan shadow-neon-cyan shrink-0 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName || fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyber-cyan/15 text-cyber-cyan font-orbitron font-bold text-lg">
                {(displayName || fullName || 'W').charAt(0).toUpperCase()}
              </div>
            )}
            {isPremium && (
              <div className="absolute top-0 right-0 bg-cyber-amber text-cyber-bg p-0.5 rounded-bl-md" title="Telegram Premium">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-base font-orbitron font-bold text-white truncate">{displayName || fullName}</h2>
              {isPremium && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 rounded-full font-bold">
                  ★ PREMIUM
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs font-chakra text-slate-400 mt-0.5">
              {username && <span className="text-cyber-cyan font-bold">@{username}</span>}
              {userId && <span className="text-slate-500 font-mono text-[11px]">ID: {userId}</span>}
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-chakra text-slate-400 mt-1">
              <Wallet className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}` : t('profile.walletNotConnected')}
              </span>
            </div>
          </div>
        </div>

        {/* In-Bot Internal Balance Card */}
        <div className="bg-gradient-to-r from-cyber-bg via-cyber-card to-cyber-bg border border-cyber-cyan/40 rounded-xl p-3.5 mb-4 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-chakra text-slate-400 uppercase tracking-wider">{t('profile.balance')}</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  if (!userAddress) { openWalletModal(); return; }
                  setShowDepositModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan text-[11px] font-chakra font-bold uppercase transition-all flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>{t('profile.deposit')}</span>
              </button>
              <button
                onClick={() => {
                  if (!userAddress) { openWalletModal(); return; }
                  setShowWithdrawModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyber-border/80 hover:bg-cyber-border border border-cyber-border text-slate-300 text-[11px] font-chakra font-bold uppercase transition-all flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>{t('profile.withdraw')}</span>
              </button>
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-chakra font-black text-white">
              {displayBalance}
            </span>
            <GramIcon className="w-4 h-4 text-cyber-cyan inline" />
            <span className="text-[11px] text-slate-400 font-rajdhani ml-2">{t('profile.availableGram')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {/* Victories Card */}
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
                <Trophy className="w-3.5 h-3.5 text-cyber-amber shrink-0" />
                <span className="truncate uppercase font-bold text-slate-300">{t('profile.duelVictories')}</span>
              </div>
              <div className="text-sm sm:text-base font-chakra font-extrabold text-white leading-tight">
                {t('profile.victoriesCount', { won: duelsWon, played: duelsPlayed })}
              </div>
            </div>
            <div className="text-xs font-chakra font-bold text-cyber-cyan mt-2">
              {t('profile.winRate', { rate: winRateFormatted })}
            </div>
          </div>

          {/* Daily Win Streak Card */}
          <div className="bg-cyber-bg/60 border border-orange-500/30 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1 text-xs font-chakra mb-1 text-orange-400">
                <Flame className="w-3.5 h-3.5 fill-orange-400 shrink-0" />
                <span className="font-extrabold font-orbitron text-white text-[11px] sm:text-xs tracking-wider truncate">
                  {t('profile.streakTitle', { streak: dailyStreak })}
                </span>
              </div>
              <div className="text-[11px] font-chakra text-slate-400">
                {hasWonToday ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <span>{t('profile.streakCompleted')}</span>
                  </span>
                ) : (
                  <span>{t('profile.streakAction')}</span>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-chakra text-slate-400">
                <span className="text-cyber-green font-bold shrink-0">
                  {t('profile.streakUnit', { days: prevMilestone })} ✓
                </span>
                <div className="flex-1 mx-1.5 h-1.5 bg-cyber-bg rounded-full overflow-hidden border border-cyber-border">
                  <div
                    style={{ width: `${streakProgressPct}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                  />
                </div>
                <span className="text-amber-300 font-bold shrink-0">
                  {t('profile.streakUnit', { days: nextMilestone })} 🎁
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-chakra text-center truncate font-medium">
                {t('profile.streakGoal', { days: nextMilestone, reward: (nextMilestone * 0.5).toFixed(0) })}
              </div>
            </div>
          </div>
        </div>

        {/* Total Profits */}
        <div className="bg-gradient-to-r from-cyber-cyan/10 to-transparent border border-cyber-cyan/30 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyber-cyan/20 text-cyber-cyan">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-chakra text-slate-400 block">{t('profile.totalWinningsCredited')}</span>
              <div className="text-base font-chakra font-extrabold text-cyber-cyan flex items-center space-x-1">
                <span>+{totalProfitsGram}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                <span className="text-xs font-bold text-slate-400">GRAM</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Global Leaderboard button */}
        {onOpenLeaderboard && (
          <button
            onClick={onOpenLeaderboard}
            className="w-full mt-3 py-2.5 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 hover:border-amber-400 rounded-xl text-amber-300 font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{t('profile.viewLeaderboard')}</span>
          </button>
        )}
      </div>

      {/* ACTIVE DUELS SECTION (Matches where user is already registered) */}
      {activeMatches.length > 0 && (
        <div className="bg-cyber-card border border-cyber-cyan/50 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-orbitron font-bold text-cyber-cyan uppercase tracking-wider flex items-center space-x-1.5">
              <Swords className="w-4 h-4 text-cyber-cyan animate-pulse" />
              <span>{t('profile.activeDuelsTitle')} ({activeMatches.length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {activeMatches.map((m) => {
              const wagerGram = (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
              const opponent =
                userAddress && m.playerA.wallet.toLowerCase() === userAddress.toLowerCase()
                  ? (m.playerB?.name || 'Waiting for opponent')
                  : m.playerA.name;

              return (
                <div
                  key={m.matchId}
                  className="bg-cyber-bg/80 border border-cyber-border hover:border-cyber-cyan rounded-xl p-3 flex items-center justify-between text-xs font-chakra transition-all"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-orbitron font-bold text-white">MATCH #{m.matchId}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40">
                        {m.state}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      vs <strong className="text-slate-200">{opponent}</strong> • Wager: {wagerGram} GRAM
                    </span>
                  </div>

                  <button
                    onClick={() => onResumeDuel?.(m.matchId)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyber-cyan to-blue-500 text-cyber-bg font-orbitron font-extrabold rounded-xl text-xs uppercase shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1"
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
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 truncate">
            <History className="w-4 h-4 text-cyber-cyan shrink-0" />
            <span className="truncate">{t('profile.recentHistoryTitle')}</span>
          </h3>
          <span className="text-xs font-chakra text-slate-500 shrink-0 font-medium">
            {t('profile.duelsCount', { count: history.length })}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-chakra text-xs">
            {t('profile.noMatches')}
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((item, index) => {
              const isWin = item.outcome === 'WIN';
              const dateStr = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={index}
                  className="bg-cyber-bg/60 border border-cyber-border/80 rounded-xl p-3 flex items-center justify-between text-xs font-chakra"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-bold font-orbitron text-[11px] px-1.5 py-0.2 rounded border ${
                          isWin
                            ? 'bg-cyber-green/15 text-cyber-green border-cyber-green/40'
                            : 'bg-cyber-pink/15 text-cyber-pink border-cyber-pink/40'
                        }`}
                      >
                        {item.outcome}
                      </span>
                      <span className="text-white font-bold">vs {item.opponentName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Score: {item.score}
                      {item.reactionTimeMs ? ` • Reaction: ${item.reactionTimeMs}ms` : ''} • {dateStr}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`font-extrabold font-chakra text-sm flex items-center space-x-1 ${
                        isWin ? 'text-cyber-green' : 'text-cyber-pink'
                      }`}
                    >
                      <span>{isWin ? `+${item.payoutGram || item.payoutTon}` : `-${item.wagerGram || item.wagerTon}`}</span>
                      <GramIcon className={`w-3.5 h-3.5 ${isWin ? 'text-cyber-green' : 'text-cyber-pink'}`} />
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">#{item.matchId}</span>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{
            paddingTop: `${modalTopOffset}px`,
            paddingBottom: `${modalBottomOffset}px`
          }}
        >
          <div 
            className="bg-cyber-card border border-cyber-cyan/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
            style={{
              maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)`
            }}
          >
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <ArrowDownLeft className="w-4 h-4 text-cyber-cyan" />
              <span>DEPOSIT GRAM TO IN-BOT BALANCE</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              Deposit GRAM into your in-bot balance for instant zero-gas duels and 2X rematches. Funds are securely held in custody.
            </p>

            {balanceMsg && (
              <div className={`p-2.5 rounded-xl border text-xs font-chakra flex items-center space-x-2 ${
                balanceMsg.type === 'success' ? 'bg-cyber-green/20 border-cyber-green text-cyber-green' : 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink'
              }`}>
                {balanceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{balanceMsg.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-chakra block">Amount (GRAM):</label>
              <div className="flex items-center space-x-2 bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-sm font-chakra font-bold text-white focus:outline-none"
                />
                <GramIcon className="w-4 h-4 text-cyber-cyan" />
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border text-xs font-chakra font-bold text-slate-400 hover:text-white rounded-xl"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeposit}
                disabled={balanceLoading}
                className="flex-1 py-2.5 bg-cyber-cyan text-cyber-bg text-xs font-orbitron font-bold rounded-xl shadow-neon-cyan hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM DEPOSIT</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{
            paddingTop: `${modalTopOffset}px`,
            paddingBottom: `${modalBottomOffset}px`
          }}
        >
          <div 
            className="bg-cyber-card border border-cyber-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
            style={{
              maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)`
            }}
          >
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-cyber-pink" />
              <span>WITHDRAW GRAM TO WALLET</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              Withdraw funds back to your connected wallet ({userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}).
            </p>

            {balanceMsg && (
              <div className={`p-2.5 rounded-xl border text-xs font-chakra flex items-center space-x-2 ${
                balanceMsg.type === 'success' ? 'bg-cyber-green/20 border-cyber-green text-cyber-green' : 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink'
              }`}>
                {balanceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{balanceMsg.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-chakra text-slate-400">
                <span>Amount (GRAM):</span>
                <span>Available: {displayBalance} GRAM</span>
              </div>
              <div className="flex items-center space-x-2 bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 bg-transparent text-sm font-chakra font-bold text-white focus:outline-none"
                />
                <GramIcon className="w-4 h-4 text-cyber-cyan" />
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border text-xs font-chakra font-bold text-slate-400 hover:text-white rounded-xl"
              >
                CANCEL
              </button>
              <button
                onClick={handleWithdraw}
                disabled={balanceLoading}
                className="flex-1 py-2.5 bg-cyber-pink text-white text-xs font-orbitron font-bold rounded-xl shadow-neon-pink hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>WITHDRAW GRAM</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
