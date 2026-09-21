import React, { useState, useEffect } from 'react';
import { Zap, Trophy, TrendingUp, History, Swords, Sparkles, Wallet, ArrowRight, ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { GramIcon } from '../components/GramIcon.js';
import { DuelHistoryRecord, UserStats, UserBalance, MatchData } from '../types/index.js';

interface ProfileProps {
  onResumeDuel?: (matchId: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onResumeDuel }) => {
  const { userAddress, openWalletModal } = useTonClashContract();
  const { userId, username, fullName, displayName, photoUrl, isPremium } = useTelegram();

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
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);

  // Deposit / Withdraw modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [withdrawAmount, setWithdrawAmount] = useState('1.0');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch permanent database data, active matches, and internal balance
  const fetchUserData = async () => {
    if (!userAddress || !serverUrl) return;

    try {
      // 1. Fetch match history from server DB
      const historyRes = await fetch(`${serverUrl}/api/users/${userAddress}/history`);
      if (historyRes.ok) {
        const hData = await historyRes.json();
        if (hData?.history && Array.isArray(hData.history)) {
          setHistory(hData.history);
          try {
            localStorage.setItem('sfidabot_duel_history', JSON.stringify(hData.history));
          } catch {}
        }
      }

      // 2. Fetch stats from server DB
      const statsRes = await fetch(`${serverUrl}/api/users/${userAddress}/stats`);
      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData?.stats) {
          setServerStats(sData.stats);
        }
      }

      // 3. Fetch active matches for user
      const activeRes = await fetch(`${serverUrl}/api/users/${userAddress}/active-matches`);
      if (activeRes.ok) {
        const aData = await activeRes.json();
        if (aData?.matches && Array.isArray(aData.matches)) {
          setActiveMatches(aData.matches);
        }
      }

      // 4. Fetch internal balance
      const balRes = await fetch(`${serverUrl}/api/users/${userAddress}/balance?telegramId=${userId || ''}&username=${encodeURIComponent(username || '')}`);
      if (balRes.ok) {
        const bData = await balRes.json();
        if (bData?.account) {
          setUserBalance(bData.account);
        }
      }
    } catch (err) {
      console.warn('[Profile] Error syncing with database:', err);
    }
  };

  useEffect(() => {
    if (!userAddress) return;
    fetchUserData();
    const interval = setInterval(fetchUserData, 10000);
    return () => clearInterval(interval);
  }, [userAddress, serverUrl]);

  // Deposit handler
  const handleDeposit = async () => {
    if (!userAddress || !serverUrl) return;
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setBalanceLoading(true);
    setBalanceMsg(null);
    try {
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountTon: depositAmount }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        setBalanceMsg({ type: 'success', text: `Successfully deposited ${depositAmount} TON into internal balance!` });
        setTimeout(() => {
          setShowDepositModal(false);
          setBalanceMsg(null);
        }, 2000);
      } else {
        setBalanceMsg({ type: 'error', text: data?.error || 'Deposit failed.' });
      }
    } catch (err: any) {
      setBalanceMsg({ type: 'error', text: err?.message || 'Network error during deposit.' });
    } finally {
      setBalanceLoading(false);
    }
  };

  // Withdraw handler
  const handleWithdraw = async () => {
    if (!userAddress || !serverUrl) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return;

    setBalanceLoading(true);
    setBalanceMsg(null);
    try {
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountTon: withdrawAmount }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        setBalanceMsg({ type: 'success', text: `Withdrew ${withdrawAmount} TON to ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}!` });
        setTimeout(() => {
          setShowWithdrawModal(false);
          setBalanceMsg(null);
        }, 2000);
      } else {
        setBalanceMsg({ type: 'error', text: data?.error || 'Withdrawal failed. Check balance.' });
      }
    } catch (err: any) {
      setBalanceMsg({ type: 'error', text: err?.message || 'Network error during withdrawal.' });
    } finally {
      setBalanceLoading(false);
    }
  };

  const duelsPlayed = serverStats ? serverStats.duelsPlayed : history.length;
  const duelsWon = serverStats ? serverStats.duelsWon : history.filter((h) => h.outcome === 'WIN').length;

  const validReactions = history
    .map((h) => h.reactionTimeMs)
    .filter((ms): ms is number => typeof ms === 'number' && ms > 0);
  const bestReaction = serverStats?.bestReaction && serverStats.bestReaction !== '-'
    ? serverStats.bestReaction
    : (validReactions.length > 0 ? `${Math.min(...validReactions)}` : '-');

  const totalProfitsTon = serverStats ? serverStats.totalProfitsTon : history
    .reduce((acc, h) => {
      if (h.outcome === 'WIN') {
        const p = parseFloat(h.payoutTon);
        return acc + (isNaN(p) ? 0 : p);
      }
      return acc;
    }, 0)
    .toFixed(2);

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
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}` : 'Wallet not connected'}
              </span>
            </div>
          </div>
        </div>

        {/* In-Bot Internal Balance Card */}
        <div className="bg-gradient-to-r from-cyber-bg via-cyber-card to-cyber-bg border border-cyber-cyan/40 rounded-xl p-3.5 mb-4 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-chakra text-slate-400 uppercase tracking-wider">In-Bot Balance</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  if (!userAddress) { openWalletModal(); return; }
                  setShowDepositModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan text-[11px] font-chakra font-bold uppercase transition-all flex items-center space-x-1"
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => {
                  if (!userAddress) { openWalletModal(); return; }
                  setShowWithdrawModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyber-border/80 hover:bg-cyber-border border border-cyber-border text-slate-300 text-[11px] font-chakra font-bold uppercase transition-all flex items-center space-x-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-chakra font-black text-white">
              {userBalance?.balanceTon || '0.00'}
            </span>
            <GramIcon className="w-4 h-4 text-cyber-cyan inline" />
            <span className="text-[11px] text-slate-400 font-rajdhani ml-2">TON Available</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Trophy className="w-3.5 h-3.5 text-cyber-amber" />
              <span>1V1 VICTORIES</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-white">
              {duelsWon}
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">
              {duelsPlayed} Duels Played
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Zap className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>BEST REACTION</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-cyan">
              {bestReaction === '-' ? '- ms' : `${bestReaction}ms`}
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">Personal best reaction</div>
          </div>
        </div>

        {/* Total Profits */}
        <div className="bg-gradient-to-r from-cyber-cyan/10 to-transparent border border-cyber-cyan/30 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyber-cyan/20 text-cyber-cyan">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-chakra text-slate-400 block">TOTAL WINNINGS CREDITED</span>
              <div className="text-base font-chakra font-extrabold text-cyber-cyan flex items-center space-x-1">
                <span>+{totalProfitsTon}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE DUELS SECTION (Matches where user is already registered) */}
      {activeMatches.length > 0 && (
        <div className="bg-cyber-card border border-cyber-cyan/50 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-orbitron font-bold text-cyber-cyan uppercase tracking-wider flex items-center space-x-1.5">
              <Swords className="w-4 h-4 text-cyber-cyan animate-pulse" />
              <span>ACTIVE DUELS IN PROGRESS ({activeMatches.length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {activeMatches.map((m) => {
              const wagerTon = (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2);
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
                      vs <strong className="text-slate-200">{opponent}</strong> • Wager: {wagerTon} TON
                    </span>
                  </div>

                  <button
                    onClick={() => onResumeDuel?.(m.matchId)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyber-cyan to-blue-500 text-cyber-bg font-orbitron font-extrabold rounded-xl text-xs uppercase shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1"
                  >
                    <span>RESUME</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match History (Permanent Server Database Record) */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="w-4 h-4 text-cyber-cyan" />
            <span>PERMANENT DUEL HISTORY (DATABASE)</span>
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 bg-cyber-bg/40 border border-cyber-border/60 rounded-xl p-4">
            <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-slate-300 font-semibold font-rajdhani">No duels completed yet</p>
            <p className="text-[11px] text-slate-500 font-rajdhani mt-0.5">
              Enter the Arena to challenge opponents and record your earnings in the database!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const isWin = item.outcome === 'WIN';
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={item.matchId}
                  className={`bg-cyber-bg/60 border rounded-xl p-3 flex items-center justify-between text-xs font-chakra transition-all ${
                    isWin ? 'border-cyber-green/40 hover:border-cyber-green' : 'border-cyber-pink/30 hover:border-cyber-pink'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-orbitron font-extrabold ${
                          isWin ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-pink/20 text-cyber-pink'
                        }`}
                      >
                        {item.outcome}
                      </span>
                      <span className="text-white font-bold tracking-wide">VS {item.opponentName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-rajdhani">
                      Score: <strong className="text-slate-200">{item.score}</strong>
                      {item.reactionTimeMs ? ` • Your Reaction: ${item.reactionTimeMs}ms` : ''} • {dateStr}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`font-extrabold font-chakra text-sm flex items-center space-x-1 ${
                        isWin ? 'text-cyber-green' : 'text-cyber-pink'
                      }`}
                    >
                      <span>{isWin ? `+${item.payoutTon}` : `-${item.wagerTon}`}</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-cyan/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <ArrowDownLeft className="w-4 h-4 text-cyber-cyan" />
              <span>DEPOSIT TO IN-BOT BALANCE</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              Deposit TON into your internal balance for instant one-click duels and 2X rematches.
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
              <label className="text-xs text-slate-400 font-chakra block">Amount (TON):</label>
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
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-cyber-pink" />
              <span>WITHDRAW FROM IN-BOT BALANCE</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              Withdraw funds back to your connected TON wallet ({userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}).
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
                <span>Amount (TON):</span>
                <span>Available: {userBalance?.balanceTon || '0.00'} TON</span>
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
                {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>WITHDRAW</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
