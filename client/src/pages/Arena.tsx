import React, { useState, useEffect } from 'react';
import { QuickdrawCanvas } from '../components/QuickdrawCanvas.js';
import { SpectatorOddsBar } from '../components/SpectatorOddsBar.js';
import { DuelLobby } from '../components/DuelLobby.js';
import { GramIcon } from '../components/GramIcon.js';
import { useSocket } from '../hooks/useSocket.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { MatchData, UserBalance, FeeConfig } from '../types/index.js';
import { Address } from '@ton/ton';
import { ArrowLeft, Trash2, AlertTriangle, Loader2, CheckCircle2, ArrowDownLeft, AlertCircle } from 'lucide-react';

interface ArenaProps {
  initialMatchId?: string;
  role?: 'player' | 'spectator';
  onClearDeepMatch?: () => void;
}

export const Arena: React.FC<ArenaProps> = ({
  initialMatchId,
  role: initialRole = 'player',
  onClearDeepMatch,
}) => {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);
  const [role, setRole] = useState<'player' | 'spectator'>(initialRole);
  const [isReady, setIsReady] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [matchToCancel, setMatchToCancel] = useState<MatchData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // In-bot balance & fee configuration
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [feeConfigData, setFeeConfigData] = useState<FeeConfig | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    userAddress,
    sendDepositTransaction,
    openWalletModal,
    placeSpectatorBetOnChain,
  } = useTonClashContract();
  const { userId, username, fullName, displayName } = useTelegram();

  // Sync initialMatchId when navigation passes a match to open
  useEffect(() => {
    if (initialMatchId) {
      setActiveMatchId(initialMatchId);
      setRole(initialRole);
    }
  }, [initialMatchId, initialRole]);

  const [isClaimingPayout, setIsClaimingPayout] = useState(false);
  const [payoutClaimed, setPayoutClaimed] = useState(false);

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  const fetchUserBalance = async () => {
    if (!userAddress || !serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/balance?telegramId=${userId || ''}&username=${username || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.account) {
          setUserBalance(data.account);
        }
      }
    } catch {}
  };

  const fetchFeeConfig = async () => {
    if (!serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/config/fees`);
      if (res.ok) {
        const data = await res.json();
        if (data?.config) {
          setFeeConfigData(data.config);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchFeeConfig();
  }, [serverUrl]);

  useEffect(() => {
    fetchUserBalance();
  }, [userAddress, serverUrl]);

  // Persistent match feed: restored from localStorage and/or synced with backend API
  const [matches, setMatches] = useState<MatchData[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_saved_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMatches = async () => {
    setIsRefreshing(true);
    const minSpinPromise = new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const url = serverUrl ? `${serverUrl}/api/matches?_t=${Date.now()}` : `/api/matches?_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.matches && Array.isArray(data.matches)) {
          setMatches(data.matches);
          try {
            localStorage.setItem('sfidabot_saved_matches', JSON.stringify(data.matches.slice(0, 30)));
          } catch {}

          if (activeMatchId && !data.matches.some((m: MatchData) => m.matchId === activeMatchId)) {
            setActiveMatchId(null);
            onClearDeepMatch?.();
          }
        }
      }
    } catch (err) {
      console.warn('Backend match polling failed (offline or pending):', err);
    } finally {
      await minSpinPromise;
      setIsRefreshing(false);
    }
  };

  // Fetch live matches from server
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [serverUrl, activeMatchId]);

  const socketData = useSocket({
    matchId: activeMatchId || '',
    wallet: userAddress,
    role,
    telegramId: userId,
    username: displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : 'Warrior'),
    serverUrl,
  });

  useEffect(() => {
    if (
      socketData.feedMessage?.includes('Match not found') ||
      socketData.feedMessage?.includes('already closed')
    ) {
      setActiveMatchId(null);
      onClearDeepMatch?.();
    }
  }, [socketData.feedMessage, onClearDeepMatch]);

  // Handle Real On-Chain Deposit from Tonkeeper
  const handleQuickDeposit = async () => {
    if (!userAddress) {
      openWalletModal();
      return;
    }
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setDepositLoading(true);
    setDepositMsg(null);
    try {
      let targetDepositAddress = '';
      try {
        const addrRes = await fetch(`${serverUrl}/api/treasury/address`);
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          targetDepositAddress = addrData.depositAddress;
        }
      } catch {}

      if (!targetDepositAddress) {
        targetDepositAddress = 'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
      }

      setDepositMsg({ type: 'success', text: 'Confirm the deposit transaction in your Tonkeeper wallet...' });

      let friendlyWallet = userAddress;
      try {
        friendlyWallet = Address.parse(userAddress).toString({ bounceable: false });
      } catch {}

      const txResult = await sendDepositTransaction(
        targetDepositAddress,
        depositAmount,
        `Sfida Deposit: ${friendlyWallet}`
      );

      const boc = txResult?.boc;
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountGram: depositAmount, boc }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        setDepositMsg({ type: 'success', text: `Deposit confirmed! +${depositAmount} GRAM added to your balance!` });
        setTimeout(() => {
          setShowDepositModal(false);
          setDepositMsg(null);
        }, 2000);
      } else {
        setDepositMsg({ type: 'error', text: data?.error || 'Deposit verification failed.' });
      }
    } catch (err: any) {
      setDepositMsg({ type: 'error', text: err?.message || 'Transaction rejected in wallet.' });
    } finally {
      setDepositLoading(false);
    }
  };

  // Create match using in-bot balance
  const handleCreateMatch = async (wagerGram: string): Promise<boolean> => {
    setCreateError(null);

    if (!userAddress) {
      openWalletModal();
      setCreateError('Connect your Tonkeeper Wallet to proceed with the wager and create a duel.');
      return false;
    }

    if (!serverUrl) {
      setCreateError('Game server not configured or unreachable.');
      return false;
    }

    try {
      const playerName = displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : 'Warrior');

      // Call server to create match with in-bot balance
      const res = await fetch(`${serverUrl}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wagerAmountNano: (parseFloat(wagerGram) * 1e9).toString(),
          playerAAddress: userAddress,
          telegramUserId: userId,
          telegramUsername: username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'INSUFFICIENT_BALANCE') {
          setDepositAmount(data.missingGram || '1.0');
          setShowDepositModal(true);
        }
        throw new Error(data?.message || data?.error || `Server returned HTTP ${res.status}`);
      }

      if (!data?.matchId) {
        throw new Error('Match ID missing in server response.');
      }

      // Refresh balance
      fetchUserBalance();

      const newMatch: MatchData = {
        matchId: data.matchId.toString(),
        escrowAddress: data.escrowAddress,
        state: 'LOBBY',
        currentRound: 1,
        playerA: {
          wallet: userAddress,
          name: playerName,
          ready: true,
          score: 0,
        },
        playerB: null,
        wagerAmountNano: (parseFloat(wagerGram) * 1e9).toString(),
        totalBetsA: '0',
        totalBetsB: '0',
        oddsA: 1.0,
        oddsB: 1.0,
        spectatorCount: 0,
      };

      setMatches((prev) => [newMatch, ...prev.filter((m) => m.matchId !== newMatch.matchId)]);
      setActiveMatchId(data.matchId.toString());
      setRole('player');
      setIsReady(false);
      return true;
    } catch (err: any) {
      console.warn('Match creation error:', err);
      setCreateError(err?.message || 'Connection error with game server. Please try again.');
      return false;
    }
  };

  // Join match using in-bot balance
  const handleJoinMatch = async (match: MatchData) => {
    if (!userAddress) {
      openWalletModal();
      setCreateError('You must connect your Tonkeeper Wallet to enter this duel.');
      return;
    }

    const isAlreadyPlayer = Boolean(
      userAddress && (
        (match.playerA?.wallet && match.playerA.wallet.toLowerCase() === userAddress.toLowerCase()) ||
        (match.playerB?.wallet && match.playerB.wallet.toLowerCase() === userAddress.toLowerCase())
      )
    );

    if (isAlreadyPlayer) {
      setActiveMatchId(match.matchId);
      setRole('player');
      setIsReady(false);
      setCreateError(null);
      return;
    }

    const wagerGram = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(2);
    setCreateStatus('Joining duel and reserving wager from balance...');
    try {
      const res = await fetch(`${serverUrl}/api/matches/${match.matchId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerBAddress: userAddress,
          telegramUserId: userId,
          telegramUsername: displayName || username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'INSUFFICIENT_BALANCE') {
          setDepositAmount(data.missingGram || wagerGram);
          setShowDepositModal(true);
        }
        throw new Error(data?.message || data?.error || 'Failed to join match');
      }

      setCreateStatus(null);
      fetchUserBalance();
      setActiveMatchId(match.matchId);
      setRole('player');
      setIsReady(false);
    } catch (err: any) {
      setCreateStatus(null);
      setCreateError(err?.message || 'Error joining match.');
    }
  };

  const handleSpectateMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setRole('spectator');
  };

  const handleSpectatorBet = async (target: 'A' | 'B', amountGram: string) => {
    if (isMatchPlayer) {
      setCreateError('You are a fighter in this duel: spectator bets are disabled for duelists.');
      return;
    }

    if (!userAddress) {
      openWalletModal();
      return;
    }

    const amountNano = BigInt(Math.round(parseFloat(amountGram) * 1e9));
    socketData.placeSpectatorBet(target, amountNano.toString());
  };

  const handleReady = () => {
    setIsReady(true);
    socketData.sendReady();
  };

  const handleClaimPayout = async () => {
    setIsClaimingPayout(true);
    setTimeout(() => {
      setIsClaimingPayout(false);
      setPayoutClaimed(true);
      fetchUserBalance();
    }, 1000);
  };

  const handleCancelMatch = (match: MatchData) => {
    setMatchToCancel(match);
  };

  const confirmCancelMatch = async () => {
    if (!matchToCancel) return;
    const matchIdToCancel = matchToCancel.matchId;
    setIsCancelling(true);
    try {
      if (serverUrl) {
        const res = await fetch(`${serverUrl}/api/matches/${matchIdToCancel}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Failed to cancel match');
        }
      }
      fetchUserBalance();
      setCancelSuccessMsg(`Match #${matchIdToCancel} cancelled. Wager and fee refunded to your balance!`);
      setMatches((prev) => {
        const updated = prev.filter((m) => m.matchId !== matchIdToCancel);
        try {
          localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated.slice(0, 30)));
        } catch {}
        return updated;
      });
      if (activeMatchId === matchIdToCancel) {
        setActiveMatchId(null);
        onClearDeepMatch?.();
      }
      setMatchToCancel(null);
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err: any) {
      console.warn('Error cancelling match:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const currentActiveMatch = matches.find((m) => m.matchId === activeMatchId);
  const activeWagerTon = currentActiveMatch
    ? (parseFloat(currentActiveMatch.wagerAmountNano) / 1e9).toString()
    : '1';

  const isUserWinner = Boolean(
    socketData.roomState === 'MATCH_SETTLED' &&
    userAddress &&
    socketData.matchWinner &&
    socketData.matchWinner.toLowerCase() === userAddress.toLowerCase()
  );

  const isCurrentCreator = Boolean(
    currentActiveMatch &&
    userAddress &&
    currentActiveMatch.playerA.wallet.toLowerCase() === userAddress.toLowerCase()
  );

  const isMatchPlayer = Boolean(
    currentActiveMatch &&
    userAddress &&
    (currentActiveMatch.playerA.wallet.toLowerCase() === userAddress.toLowerCase() ||
      (currentActiveMatch.playerB && currentActiveMatch.playerB.wallet.toLowerCase() === userAddress.toLowerCase()))
  );

  const availableBalanceGram = userBalance?.balanceGram || userBalance?.balanceTon || '0.00';

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Toast Confirmation Banner */}
      {cancelSuccessMsg && (
        <div className="bg-cyber-green/15 border border-cyber-green/50 text-cyber-green rounded-xl p-3.5 flex items-center space-x-2 text-xs font-chakra animate-fade-in shadow-neon-green">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyber-green" />
          <span className="font-semibold">{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Cancel Match Modal */}
      {matchToCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-pink/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-orbitron font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-cyber-pink animate-pulse" />
              <span>CANCEL DUEL & REFUND</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra leading-relaxed">
              Are you sure you want to cancel room <strong className="text-white font-orbitron">#{matchToCancel.matchId}</strong>?
            </p>

            <div className="p-3 bg-cyber-bg/80 border border-cyber-border rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400 font-chakra">Amount to Refund:</span>
              <span className="text-sm font-chakra font-black text-cyber-cyan flex items-center space-x-1">
                <span>{(parseFloat(matchToCancel.wagerAmountNano) / 1e9 + (feeConfigData?.creationFeeGram || 0.02)).toFixed(2)}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan inline" />
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-rajdhani">
              The wager and creation fee will be refunded immediately back to your in-bot balance (0 gas).
            </p>

            <div className="flex space-x-2.5 pt-1">
              <button
                disabled={isCancelling}
                onClick={() => setMatchToCancel(null)}
                className="flex-1 py-2.5 bg-cyber-border text-slate-300 rounded-xl font-chakra font-bold text-xs uppercase hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                BACK
              </button>
              <button
                disabled={isCancelling}
                onClick={confirmCancelMatch}
                className="flex-1 py-2.5 bg-cyber-pink hover:bg-cyber-pink/90 text-white rounded-xl font-orbitron font-bold text-xs uppercase shadow-[0_0_15px_rgba(255,0,85,0.4)] transition-all active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>REFUNDING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>CONFIRM CANCEL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-cyan/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <ArrowDownLeft className="w-4 h-4 text-cyber-cyan" />
              <span>DEPOSIT GRAM TO IN-BOT BALANCE</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              Deposit GRAM via Tonkeeper into your balance for instant duels and 2X rematches.
            </p>

            {depositMsg && (
              <div className={`p-2.5 rounded-xl border text-xs font-chakra flex items-center space-x-2 ${
                depositMsg.type === 'success' ? 'bg-cyber-green/20 border-cyber-green text-cyber-green' : 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink'
              }`}>
                {depositMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{depositMsg.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 font-chakra">
                <span>Amount (GRAM):</span>
                <span>Current: {availableBalanceGram} GRAM</span>
              </div>
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
                onClick={handleQuickDeposit}
                disabled={depositLoading}
                className="flex-1 py-2.5 bg-cyber-cyan text-cyber-bg text-xs font-orbitron font-bold rounded-xl shadow-neon-cyan hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM DEPOSIT</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMatchId ? (
        <div className="space-y-4">
          {/* Top Header Controls: Back to Lobby + Cancel Duel if Creator */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => {
                setActiveMatchId(null);
                onClearDeepMatch?.();
              }}
              className="flex items-center space-x-1.5 text-xs font-orbitron font-bold text-slate-400 hover:text-cyber-cyan transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK TO LOBBY</span>
            </button>

            {role === 'player' && isCurrentCreator && currentActiveMatch && !currentActiveMatch.playerB && (
              <button
                onClick={() => handleCancelMatch(currentActiveMatch)}
                className="flex items-center space-x-1 text-[11px] font-orbitron font-bold text-cyber-pink hover:text-white bg-cyber-pink/15 hover:bg-cyber-pink/30 border border-cyber-pink/40 px-2.5 py-1 rounded-lg transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-cyber-pink" />
                <span>CANCEL & REFUND</span>
              </button>
            )}
          </div>

          {/* Quickdraw Dueling Arena */}
          <QuickdrawCanvas
            roomState={socketData.roomState}
            currentRound={socketData.currentRound}
            scoreA={socketData.scoreA}
            scoreB={socketData.scoreB}
            lastSignal={socketData.lastSignal}
            feedMessage={socketData.feedMessage}
            lastReactionTimeMs={socketData.lastReactionTimeMs}
            countdownSeconds={socketData.countdownSeconds}
            forfeitCountdown={socketData.forfeitCountdown}
            roundWinner={socketData.roundWinner}
            matchWinner={socketData.matchWinner}
            matchWinnerName={socketData.matchWinnerName}
            playerAName={socketData.playerAName || currentActiveMatch?.playerA.name || 'Player A'}
            playerBName={socketData.playerBName || currentActiveMatch?.playerB?.name || (currentActiveMatch?.playerB ? 'Player B' : 'Player B')}
            role={role}
            isReady={isReady}
            onReady={handleReady}
            onTap={socketData.sendTap}
            isCreator={isCurrentCreator}
            onCancelMatch={currentActiveMatch && !currentActiveMatch.playerB ? () => handleCancelMatch(currentActiveMatch) : undefined}
            wagerTon={socketData.activeWagerTon || activeWagerTon}
            isWinner={isUserWinner}
            onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
            isClaimingPayout={isClaimingPayout}
            payoutClaimed={payoutClaimed}
            onReturnToLobby={() => {
              setActiveMatchId(null);
              setPayoutClaimed(false);
              fetchUserBalance();
            }}
            rematchOffer={socketData.rematchOffer}
            onRequestRematch={socketData.requestRematch}
            onAcceptRematch={socketData.acceptRematch}
            onDeclineRematch={socketData.declineRematch}
          />

          {/* Spectator Totalizer Betting Bar */}
          <SpectatorOddsBar
            oddsA={socketData.oddsA}
            oddsB={socketData.oddsB}
            totalBetsA={socketData.totalBetsA}
            totalBetsB={socketData.totalBetsB}
            playerAName={socketData.playerAName || currentActiveMatch?.playerA.name || 'Player A'}
            playerBName={socketData.playerBName || currentActiveMatch?.playerB?.name || (currentActiveMatch?.playerB ? 'Player B' : 'Player B')}
            onBet={handleSpectatorBet}
            disabled={socketData.roomState === 'MATCH_SETTLED'}
            isPlayer={isMatchPlayer}
          />
        </div>
      ) : (
        <DuelLobby
          matches={matches}
          onCreateMatch={handleCreateMatch}
          onJoinMatch={handleJoinMatch}
          onSpectateMatch={handleSpectateMatch}
          onCancelMatch={handleCancelMatch}
          onRefreshMatches={fetchMatches}
          isRefreshing={isRefreshing}
          createStatus={createStatus}
          createError={createError}
          onClearError={() => {
            setCreateError(null);
            setCreateStatus(null);
          }}
          userAddress={userAddress}
          onOpenWallet={openWalletModal}
          userBalanceGram={availableBalanceGram}
          creationFeeGram={feeConfigData?.creationFeeGram || 0.02}
          onOpenDeposit={(missing) => {
            if (missing) setDepositAmount(missing);
            setShowDepositModal(true);
          }}
        />
      )}
    </div>
  );
};
