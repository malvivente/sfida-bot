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
    openWalletModal,
    placeSpectatorBetOnChain,
  } = useTonClashContract();
  const { userId, username, fullName } = useTelegram();

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
    if (!serverUrl) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${serverUrl}/api/matches`);
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
      setIsRefreshing(false);
    }
  };

  // Fetch live matches from server if available
  useEffect(() => {
    if (!serverUrl) return;
    fetchMatches();
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  const socketData = useSocket({
    matchId: activeMatchId || '',
    wallet: userAddress,
    role,
    telegramId: userId,
    username: fullName || (username ? `@${username}` : (userAddress ? `Warrior_${userAddress.slice(-4)}` : 'CyberDuelist')),
    serverUrl,
  });

  const handleCreateMatch = async (wagerTon: string): Promise<boolean> => {
    setCreateError(null);

    // 1. Verificare che il wallet sia connesso
    if (!userAddress) {
      openWalletModal();
      setCreateError('Connetti il tuo Wallet Tonkeeper per procedere con la puntata e creare la sfida.');
      return false;
    }

    // 2. Se il server backend non è ancora configurato o non è raggiungibile
    if (!serverUrl) {
      setCreateError('Server di gioco non ancora configurato o non raggiungibile. Imposta il backend per creare sfide reali.');
      return false;
    }

    try {
      const playerName = fullName || (username ? `@${username}` : `Player_${userAddress.slice(-4)}`);

      // 3. Registra la partita sul server backend
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
        throw new Error('ID partita mancante nella risposta del server.');
      }

      // 4. Se lo Smart Contract è configurato, invia la transazione on-chain (puntata + 0.02 fee)
      if (!clashMasterAddress) {
        setCreateError('⚠️ Smart Contract non configurato! Esegui prima "npm run deploy:contracts" sulla VPS e imposta CLASH_MASTER_ADDRESS nel .env per addebitare la puntata e la fee reale.');
        return false;
      }

      try {
        setCreateStatus('Conferma la transazione in Tonkeeper (puntata + fee e gas di deploy)...');
        await createMatchOnChain(data.matchId.toString(), wagerTon, clashMasterAddress);
        setCreateStatus(null);
      } catch (txErr: any) {
        setCreateStatus(null);
        console.warn('Transazione on-chain annullata o fallita:', txErr);
        // Rollback: elimina la partita dal server se l'utente ha rifiutato la firma nel wallet
        await fetch(`${serverUrl}/api/matches/${data.matchId}`, { method: 'DELETE' }).catch(() => {});
        setCreateError('Creazione annullata: transazione non confermata su Tonkeeper. Nessun fondo speso.');
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

      // Aggiorna stato e salva in localStorage
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
      setCreateError(err?.message || 'Errore di connessione con il server di gioco. Riprova più tardi.');
      return false;
    }
  };

  const handleJoinMatch = async (match: MatchData) => {
    // 1. Il giocatore B deve obbligatoriamente connettere il wallet
    if (!userAddress) {
      openWalletModal();
      setCreateError('Devi connettere il tuo Wallet Tonkeeper per accettare la sfida e depositare la puntata.');
      return;
    }

    const wagerTon = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(2);

    // 2. Risolvi l'indirizzo deterministico dell'escrow
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
      setCreateError('⚠️ Impossibile determinare il contratto Escrow della sfida. Verifica che il backend sia attivo.');
      return;
    }

    // 3. Esegui la transazione on-chain verso MatchEscrow (con buffer gas 0.05 TON)
    try {
      setCreateStatus('Conferma la puntata su Tonkeeper per partecipare al duello...');
      await joinMatchOnChain(escrow, match.matchId, wagerTon);
      setCreateStatus(null);
      setCreateError(null);
    } catch (err: any) {
      setCreateStatus(null);
      console.warn('Transazione di ingresso annullata dal wallet:', err);
      setCreateError('Ingresso annullato: transazione non confermata su Tonkeeper. Nessun fondo speso.');
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

  const handleReady = () => {
    setIsReady(true);
    socketData.sendReady();
  };

  const handleSpectatorBet = async (side: 'A' | 'B', amountTon: string) => {
    if (!userAddress) {
      openWalletModal();
      setCreateError('Devi connettere il tuo Wallet Tonkeeper per piazzare una scommessa.');
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
        setCreateStatus(`Conferma l'annullamento su Tonkeeper per ricevere il rimborso di ${wagerTon} GRAM...`);
        await cancelMatchOnChain(escrow, match.matchId);
        setCreateStatus(null);
      }

      // Elimina la partita dal server
      if (serverUrl) {
        await fetch(`${serverUrl}/api/matches/${match.matchId}`, { method: 'DELETE' }).catch(() => {});
      }

      // Rimuovi dai match salvati e dallo stato
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
      setCancelSuccessMsg(`✅ Sfida #${match.matchId} annullata! Il rimborso di ${wagerTon} GRAM è stato accreditato sul tuo wallet.`);
      setTimeout(() => setCancelSuccessMsg(null), 7000);
    } catch (err: any) {
      setCreateStatus(null);
      console.warn('Errore cancellazione on-chain:', err);
      setCreateError('Annullamento interrotto: transazione non confermata su Tonkeeper.');
    } finally {
      setIsCancelling(false);
    }
  };

  const currentActiveMatch = matches.find((m) => m.matchId === activeMatchId);
  const isCurrentCreator = currentActiveMatch && userAddress
    ? currentActiveMatch.playerA.wallet.toLowerCase() === userAddress.toLowerCase()
    : false;

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
                ANNULLARE LA SFIDA?
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-chakra leading-relaxed">
              Sei sicuro di voler annullare la stanza <strong className="text-white font-orbitron">#{matchToCancel.matchId}</strong>?
            </p>

            <div className="p-3 bg-cyber-bg/80 border border-cyber-border rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400 font-chakra">Importo da Rimborsare:</span>
              <span className="text-sm font-chakra font-black text-cyber-cyan flex items-center space-x-1">
                <span>{(parseFloat(matchToCancel.wagerAmountNano) / 1e9).toFixed(2)}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan inline" />
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-rajdhani">
              Tonkeeper ti chiederà di firmare una transazione (0.05 TON di gas) e lo smart contract rimborserà immediatamente la tua puntata sul tuo wallet.
            </p>

            <div className="flex flex-col space-y-2 pt-1">
              <div className="flex items-center space-x-2.5">
                <button
                  disabled={isCancelling}
                  onClick={() => setMatchToCancel(null)}
                  className="flex-1 py-2.5 bg-cyber-border text-slate-300 rounded-xl font-chakra font-bold text-xs uppercase hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  INDIETRO
                </button>
                <button
                  disabled={isCancelling}
                  onClick={confirmCancelMatch}
                  className="flex-1 py-2.5 bg-cyber-pink hover:bg-cyber-pink/90 text-white rounded-xl font-orbitron font-bold text-xs uppercase shadow-[0_0_15px_rgba(255,0,85,0.4)] transition-all active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>RIMBORSO...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>CONFERMA ON-CHAIN</span>
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
                Rimuovi solo dalla lista (per stanze non deployate)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMatchId ? (
        <div className="space-y-4">
          {/* Top Header Controls: Torna alla Lobby + Annulla Sfida se Creatore */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={() => setActiveMatchId(null)}
              className="flex items-center space-x-1.5 text-xs font-orbitron font-bold text-slate-400 hover:text-cyber-cyan transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>TORNA ALLA LOBBY</span>
            </button>

            {role === 'player' && isCurrentCreator && currentActiveMatch && !currentActiveMatch.playerB && (
              <button
                onClick={() => handleCancelMatch(currentActiveMatch)}
                className="flex items-center space-x-1 text-[11px] font-orbitron font-bold text-cyber-pink hover:text-white bg-cyber-pink/15 hover:bg-cyber-pink/30 border border-cyber-pink/40 px-2.5 py-1 rounded-lg transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-cyber-pink" />
                <span>ANNULLA E RIMBORSA</span>
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
            role={role}
            isReady={isReady}
            onReady={handleReady}
            onTap={socketData.sendTap}
            isCreator={isCurrentCreator}
            onCancelMatch={currentActiveMatch && !currentActiveMatch.playerB ? () => handleCancelMatch(currentActiveMatch) : undefined}
          />

          {/* Spectator Totalizer Betting Bar */}
          <SpectatorOddsBar
            oddsA={socketData.oddsA}
            oddsB={socketData.oddsB}
            totalBetsA={socketData.totalBetsA}
            totalBetsB={socketData.totalBetsB}
            onBet={handleSpectatorBet}
            disabled={socketData.roomState === 'MATCH_SETTLED'}
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
