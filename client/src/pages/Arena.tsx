import React, { useState, useEffect } from 'react';
import { QuickdrawCanvas } from '../components/QuickdrawCanvas.js';
import { SpectatorOddsBar } from '../components/SpectatorOddsBar.js';
import { DuelLobby } from '../components/DuelLobby.js';
import { GramIcon } from '../components/GramIcon.js';
import { useSocket } from '../hooks/useSocket.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { MatchData } from '../types/index.js';
import { computeEscrowAddress } from '../utils/escrow.js';
import { ArrowLeft, Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface ArenaProps {
  initialMatchId?: string;
  role?: 'player' | 'spectator';
}

export const Arena: React.FC<ArenaProps> = ({
  initialMatchId,
  role: initialRole = 'player',
}) => {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);
  const [role, setRole] = useState<'player' | 'spectator'>(initialRole);
  const [isReady, setIsReady] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [matchToCancel, setMatchToCancel] = useState<MatchData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    userAddress,
    createMatchOnChain,
    joinMatchOnChain,
    cancelMatchOnChain,
    claimWinnerPayout,
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
  const [clashMasterAddress, setClashMasterAddress] = useState<string | null>(
    (import.meta as any).env?.VITE_CLASH_MASTER_ADDRESS || null
  );
  const [serverPublicKeyBigInt, setServerPublicKeyBigInt] = useState<string | null>(null);

  // Fetch backend config & clash master address from server /health
  useEffect(() => {
    if (!serverUrl) return;
    fetch(`${serverUrl}/health`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.clashMasterAddress) {
          setClashMasterAddress(d.clashMasterAddress);
        }
        if (d?.serverPublicKeyBigInt) {
          setServerPublicKeyBigInt(d.serverPublicKeyBigInt);
        }
      })
      .catch(() => {});
  }, [serverUrl]);

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
        }
      }
    } catch (err) {
      console.warn('Backend match polling failed (offline or pending):', err);
    } finally {
      await minSpinPromise;
      setIsRefreshing(false);
    }
  };

  // Fetch live matches from server if available
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  const socketData = useSocket({
    matchId: activeMatchId || '',
    wallet: userAddress,
    role,
    telegramId: userId,
    username: displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : 'Warrior'),
    serverUrl,
  });

  const handleCreateMatch = async (wagerTon: string): Promise<boolean> => {
    setCreateError(null);

    // 1. Verify wallet is connected
    if (!userAddress) {
      openWalletModal();
      setCreateError('Connect your Tonkeeper Wallet to proceed with the wager and create a duel.');
      return false;
    }

    // 2. Check server URL
    if (!serverUrl) {
      setCreateError('Game server not configured or unreachable. Set backend to create real duels.');
      return false;
    }

    try {
      const playerName = displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : 'Warrior');

      // 3. Register match on backend server
      const res = await fetch(`${serverUrl}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wagerAmountNano: (parseFloat(wagerTon) * 1e9).toString(),
          playerAAddress: userAddress,
          telegramUserId: userId,
          telegramUsername: username,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data?.matchId) {
        throw new Error('Match ID missing in server response.');
      }

      // 4. If Smart Contract is configured, send on-chain transaction (wager + 0.02 fee)
      if (!clashMasterAddress) {
        setCreateError('⚠️ Smart Contract not configured! Run "npm run deploy:contracts" on VPS and set CLASH_MASTER_ADDRESS in .env.');
        return false;
      }

      try {
        setCreateStatus('Confirm transaction in Tonkeeper (wager + fee and deploy gas)...');
        await createMatchOnChain(data.matchId.toString(), wagerTon, clashMasterAddress);
        setCreateStatus('Transaction broadcast! Activating Arena duel...');
        // Confirm deploy to backend to transition room to LOBBY
        await fetch(`${serverUrl}/api/matches/${data.matchId}/confirm-deploy`, {
          method: 'POST',
        }).catch(() => {});
        setCreateStatus(null);
      } catch (txErr: any) {
        setCreateStatus(null);
        console.warn('On-chain transaction cancelled or failed:', txErr);
        // Rollback: delete room from server if user cancelled wallet signature
        await fetch(`${serverUrl}/api/matches/${data.matchId}`, { method: 'DELETE' }).catch(() => {});
        setCreateError('Creation cancelled: transaction not confirmed on Tonkeeper. No funds spent.');
        return false;
      }

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
        wagerAmountNano: (parseFloat(wagerTon) * 1e9).toString(),
        totalBetsA: '0',
        totalBetsB: '0',
        oddsA: 1.0,
        oddsB: 1.0,
        spectatorCount: 0,
      };

      // Update state and save in localStorage
      setMatches((prev) => {
        const updated = [newMatch, ...prev.filter((m) => m.matchId !== newMatch.matchId)];
        try {
          localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated.slice(0, 30)));
        } catch {}
        return updated;
      });

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

  const handleJoinMatch = async (match: MatchData) => {
    // 1. Verify wallet is connected
    if (!userAddress) {
      openWalletModal();
      setCreateError('You must connect your Tonkeeper Wallet to enter this duel.');
      return;
    }

    // 2. RECONNECTION BYPASS: If user is already Player A or Player B, re-enter immediately without duplicate payment!
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

    if (match.state === 'WAITING_FOR_DEPLOY') {
      setCreateError('Room is still awaiting creator deploy confirmation. Please wait a moment.');
      return;
    }

    const wagerTon = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(2);

    // 3. Resolve deterministic escrow contract address
    let escrow = match.escrowAddress;
    if (!escrow && clashMasterAddress && serverPublicKeyBigInt) {
      escrow = computeEscrowAddress(
        clashMasterAddress,
        match.matchId,
        match.playerA.wallet,
        match.wagerAmountNano,
        serverPublicKeyBigInt
      );
    }

    if (!escrow) {
      setCreateError('⚠️ Unable to resolve duel Escrow contract. Verify backend connection.');
      return;
    }

    // 4. Execute on-chain join transaction
    try {
      setCreateStatus('Confirm wager in Tonkeeper to enter the duel...');
      await joinMatchOnChain(escrow, match.matchId, wagerTon);
      setCreateStatus(null);
      setCreateError(null);
    } catch (err: any) {
      setCreateStatus(null);
      console.warn('Join transaction cancelled by wallet:', err);
      setCreateError('Entry cancelled: transaction not confirmed on Tonkeeper. No funds spent.');
      return;
    }

    setActiveMatchId(match.matchId);
    setRole('player');
    setIsReady(false);
  };

  const handleSpectateMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setRole('spectator');
  };

  const currentActiveMatch = matches.find((m) => m.matchId === activeMatchId);
  const isCurrentCreator = currentActiveMatch && userAddress
    ? currentActiveMatch.playerA.wallet.toLowerCase() === userAddress.toLowerCase()
    : false;
  const isMatchPlayer = role === 'player' ||
    Boolean(
      userAddress &&
      currentActiveMatch &&
      (userAddress.toLowerCase() === currentActiveMatch.playerA.wallet.toLowerCase() ||
        (currentActiveMatch.playerB && userAddress.toLowerCase() === currentActiveMatch.playerB.wallet.toLowerCase()))
    );

  const handleReady = () => {
    setIsReady(true);
    socketData.sendReady();
  };

  const handleSpectatorBet = async (side: 'A' | 'B', amountTon: string) => {
    if (isMatchPlayer) {
      setCreateError('Duelists cannot place spectator bets on their own match.');
      return;
    }

    if (!userAddress) {
      openWalletModal();
      setCreateError('You must connect your Tonkeeper Wallet to place a spectator bet.');
      return;
    }

    const amountNano = (parseFloat(amountTon) * 1e9).toString();
    socketData.placeSpectatorBet(side, amountNano);

    const activeMatch = matches.find((m) => m.matchId === activeMatchId);
    if (!activeMatch) return;

    let escrow = activeMatch.escrowAddress;
    if (!escrow && clashMasterAddress && serverPublicKeyBigInt) {
      escrow = computeEscrowAddress(
        clashMasterAddress,
        activeMatch.matchId,
        activeMatch.playerA.wallet,
        activeMatch.wagerAmountNano,
        serverPublicKeyBigInt
      );
    }

    const targetPlayer = side === 'A' ? activeMatch.playerA.wallet : activeMatch.playerB?.wallet;
    if (escrow && targetPlayer) {
      try {
        await placeSpectatorBetOnChain(
          escrow,
          activeMatch.matchId,
          targetPlayer,
          amountTon
        );
      } catch (err: any) {
        console.warn('Onchain bet skipped or pending:', err?.message);
      }
    }
  };

  const handleCancelMatch = (match: MatchData) => {
    setMatchToCancel(match);
  };

  const confirmCancelMatch = async () => {
    if (!matchToCancel) return;
    const match = matchToCancel;
    setIsCancelling(true);
    setCreateError(null);

    const wagerTon = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(2);

    let escrow = match.escrowAddress;
    if (!escrow && clashMasterAddress && serverPublicKeyBigInt) {
      escrow = computeEscrowAddress(
        clashMasterAddress,
        match.matchId,
        match.playerA.wallet,
        match.wagerAmountNano,
        serverPublicKeyBigInt
      );
    }

    try {
      if (escrow) {
        setCreateStatus(`Confirm cancellation in Tonkeeper to receive your refund of ${wagerTon} TON...`);
        await cancelMatchOnChain(escrow, match.matchId);
        setCreateStatus(null);
      }

      // Delete room from server
      if (serverUrl) {
        await fetch(`${serverUrl}/api/matches/${match.matchId}`, { method: 'DELETE' }).catch(() => {});
      }

      // Remove from saved matches
      setMatches((prev) => {
        const updated = prev.filter((m) => m.matchId !== match.matchId);
        try {
          localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (activeMatchId === match.matchId) {
        setActiveMatchId(null);
      }

      setMatchToCancel(null);
      setCancelSuccessMsg(`✅ Duel #${match.matchId} cancelled! Refund of ${wagerTon} TON credited to your wallet.`);
      setTimeout(() => setCancelSuccessMsg(null), 7000);
    } catch (err: any) {
      setCreateStatus(null);
      console.warn('On-chain cancellation error:', err);
      setCreateError('Cancellation aborted: transaction not confirmed on Tonkeeper.');
    } finally {
      setIsCancelling(false);
    }
  };

  const activeWagerTon = currentActiveMatch
    ? (parseFloat(currentActiveMatch.wagerAmountNano) / 1e9).toFixed(2)
    : '1.00';

  const isUserWinner = userAddress && socketData.matchWinner
    ? socketData.matchWinner.toLowerCase() === userAddress.toLowerCase()
    : false;

  // Salvataggio automatico del duello terminato nello storico locale per il profilo
  useEffect(() => {
    if (socketData.roomState !== 'MATCH_SETTLED' || !activeMatchId) return;

    try {
      const storageKey = 'sfidabot_duel_history';
      const raw = localStorage.getItem(storageKey);
      const history: any[] = raw ? JSON.parse(raw) : [];

      if (history.some((h) => h.matchId === activeMatchId)) return;

      const wagerTon = currentActiveMatch
        ? (parseFloat(currentActiveMatch.wagerAmountNano) / 1e9).toFixed(2)
        : '1.00';
      const payoutTon = (parseFloat(wagerTon) * 2 * 0.96).toFixed(2);

      let opponentName = 'Avversario';
      let opponentWallet = '';
      if (currentActiveMatch) {
        if (userAddress && currentActiveMatch.playerA.wallet.toLowerCase() === userAddress.toLowerCase()) {
          opponentName = currentActiveMatch.playerB?.name || 'Player B';
          opponentWallet = currentActiveMatch.playerB?.wallet || '';
        } else {
          opponentName = currentActiveMatch.playerA.name || 'Player A';
          opponentWallet = currentActiveMatch.playerA.wallet;
        }
      }

      const outcome: 'WIN' | 'LOSS' | 'DRAW' = isUserWinner ? 'WIN' : 'LOSS';

      const newRecord = {
        matchId: activeMatchId,
        timestamp: Date.now(),
        opponentName,
        opponentWallet,
        wagerTon,
        payoutTon: isUserWinner ? payoutTon : '0.00',
        outcome,
        reactionTimeMs: socketData.personalReactionTimeMs || undefined,
        score: `${socketData.scoreA} - ${socketData.scoreB}`,
      };

      history.unshift(newRecord);
      localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 50)));
    } catch (err) {
      console.warn('Errore salvataggio storico duelli:', err);
    }
  }, [socketData.roomState, activeMatchId, userAddress, socketData.matchWinner, isUserWinner, currentActiveMatch, socketData.personalReactionTimeMs, socketData.scoreA, socketData.scoreB]);

  const handleClaimPayout = async () => {
    if (!activeMatchId || !userAddress) return;
    setIsClaimingPayout(true);
    setCreateError(null);

    try {
      let res = socketData.resolution;
      if (!res && serverUrl) {
        const resp = await fetch(`${serverUrl}/api/matches/${activeMatchId}/resolution`);
        if (resp.ok) {
          const d = await resp.json();
          if (d?.resolution) res = d.resolution;
        }
      }

      if (!res) {
        throw new Error('Firma di risoluzione della partita non ancora disponibile');
      }

      let escrow = res.escrowAddress || currentActiveMatch?.escrowAddress;
      if (!escrow && clashMasterAddress && serverPublicKeyBigInt && currentActiveMatch) {
        escrow = computeEscrowAddress(
          clashMasterAddress,
          activeMatchId,
          currentActiveMatch.playerA.wallet,
          currentActiveMatch.wagerAmountNano,
          serverPublicKeyBigInt
        );
      }

      if (!escrow) throw new Error('Indirizzo dello Smart Contract non trovato per il payout');

      await claimWinnerPayout(
        escrow,
        activeMatchId,
        userAddress,
        res.timestamp,
        res.signatureCellBoc
      );

      setPayoutClaimed(true);
    } catch (err: any) {
      console.error('Errore durante il ritiro della vincita:', err);
      setCreateError(err?.message || 'Ritiro annullato o transazione non confermata su Tonkeeper.');
    } finally {
      setIsClaimingPayout(false);
    }
  };

  return (
    <div className="w-full">
      {/* Banner Successo Rimborso */}
      {cancelSuccessMsg && (
        <div className="mb-3 p-3 bg-cyber-green/15 border border-cyber-green/50 text-cyber-green rounded-xl text-xs font-chakra font-bold flex items-center space-x-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyber-green" />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Modal di Conferma Annullamento Stanza con Rimborso */}
      {matchToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-cyber-card border border-cyber-pink/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-cyber-pink">
              <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
              <h3 className="font-orbitron font-extrabold text-sm tracking-wider text-white">
                CANCEL DUEL?
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-chakra leading-relaxed">
              Are you sure you want to cancel room <strong className="text-white font-orbitron">#{matchToCancel.matchId}</strong>?
            </p>

            <div className="p-3 bg-cyber-bg/80 border border-cyber-border rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400 font-chakra">Amount to Refund:</span>
              <span className="text-sm font-chakra font-black text-cyber-cyan flex items-center space-x-1">
                <span>{(parseFloat(matchToCancel.wagerAmountNano) / 1e9).toFixed(2)}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan inline" />
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-rajdhani">
              Tonkeeper will prompt you to sign a transaction (0.05 TON gas buffer) and the smart contract will immediately refund your wager to your wallet.
            </p>

            <div className="flex flex-col space-y-2 pt-1">
              <div className="flex items-center space-x-2.5">
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
                      <span>CONFIRM ON-CHAIN</span>
                    </>
                  )}
                </button>
              </div>
              <button
                disabled={isCancelling}
                onClick={async () => {
                  if (!matchToCancel) return;
                  if (serverUrl) {
                    await fetch(`${serverUrl}/api/matches/${matchToCancel.matchId}`, { method: 'DELETE' }).catch(() => {});
                  }
                  setMatches((prev) => {
                    const updated = prev.filter((m) => m.matchId !== matchToCancel.matchId);
                    try {
                      localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated));
                    } catch {}
                    return updated;
                  });
                  if (activeMatchId === matchToCancel.matchId) {
                    setActiveMatchId(null);
                  }
                  setMatchToCancel(null);
                }}
                className="w-full py-1.5 text-[10px] text-slate-400 hover:text-slate-200 font-chakra transition-all"
              >
                Remove from list only (for undeployed rooms)
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
              onClick={() => setActiveMatchId(null)}
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
            playerBName={socketData.playerBName || currentActiveMatch?.playerB?.name || (currentActiveMatch?.playerB ? 'Player B' : 'Waiting for opponent...')}
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
        />
      )}
    </div>
  );
};
