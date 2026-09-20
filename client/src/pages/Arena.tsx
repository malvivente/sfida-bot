import React, { useState, useEffect } from 'react';
import { QuickdrawCanvas } from '../components/QuickdrawCanvas.js';
import { SpectatorOddsBar } from '../components/SpectatorOddsBar.js';
import { DuelLobby } from '../components/DuelLobby.js';
import { useSocket } from '../hooks/useSocket.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { MatchData } from '../types/index.js';
import { ArrowLeft } from 'lucide-react';

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

  const { userAddress, createMatchOnChain, openWalletModal, placeSpectatorBetOnChain } = useTonClashContract();
  const { userId, username, fullName } = useTelegram();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
  const [clashMasterAddress, setClashMasterAddress] = useState<string | null>(
    (import.meta as any).env?.VITE_CLASH_MASTER_ADDRESS || null
  );

  // Fetch backend config & clash master address from server /health
  useEffect(() => {
    if (!serverUrl) return;
    fetch(`${serverUrl}/health`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.clashMasterAddress) {
          setClashMasterAddress(d.clashMasterAddress);
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
      if (clashMasterAddress) {
        try {
          await createMatchOnChain(data.matchId.toString(), wagerTon, clashMasterAddress);
        } catch (txErr: any) {
          console.warn('Transazione on-chain annullata o fallita:', txErr);
          // Rollback: elimina la partita dal server se l'utente ha rifiutato la firma nel wallet
          await fetch(`${serverUrl}/api/matches/${data.matchId}`, { method: 'DELETE' }).catch(() => {});
          setCreateError('Creazione annullata: transazione non confermata su Tonkeeper. Nessun fondo speso.');
          return false;
        }
      }

      const newMatch: MatchData = {
        matchId: data.matchId.toString(),
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

  const handleJoinMatch = (matchId: string, _wagerTon: string) => {
    setActiveMatchId(matchId);
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
    const amountNano = (parseFloat(amountTon) * 1e9).toString();
    socketData.placeSpectatorBet(side, amountNano);

    if (userAddress && activeMatchId) {
      try {
        await placeSpectatorBetOnChain(
          'EQA_mock_match_escrow_address',
          activeMatchId,
          userAddress,
          amountTon
        );
      } catch (err: any) {
        console.warn('Onchain bet skipped or pending:', err.message);
      }
    }
  };

  const handleCancelMatch = (matchId: string) => {
    setMatches((prev) => {
      const updated = prev.filter((m) => m.matchId !== matchId);
      try {
        localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (serverUrl) {
      fetch(`${serverUrl}/api/matches/${matchId}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleClearAllMatches = () => {
    setMatches([]);
    try {
      localStorage.removeItem('sfidabot_saved_matches');
    } catch {}
  };

  return (
    <div className="w-full">
      {activeMatchId ? (
        <div className="space-y-4">
          {/* Back to Lobby */}
          <button
            onClick={() => setActiveMatchId(null)}
            className="flex items-center space-x-1.5 text-xs font-orbitron font-bold text-slate-400 hover:text-cyber-cyan transition-all mb-2 px-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>TORNA ALLA LOBBY</span>
          </button>

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
            role={role}
            isReady={isReady}
            onReady={handleReady}
            onTap={socketData.sendTap}
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
          createError={createError}
          onClearError={() => setCreateError(null)}
          userAddress={userAddress}
        />
      )}
    </div>
  );
};
