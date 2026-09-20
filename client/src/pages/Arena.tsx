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

  const { userAddress, placeSpectatorBetOnChain } = useTonClashContract();
  const { userId, username, fullName } = useTelegram();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  // Persistent match feed: restored from localStorage and/or synced with backend API
  const [matches, setMatches] = useState<MatchData[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_saved_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch live matches from server if available
  useEffect(() => {
    if (!serverUrl) return;

    const fetchMatches = async () => {
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
      }
    };

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
  });

  const handleCreateMatch = async (wagerTon: string) => {
    const newId = (Date.now() % 1000000).toString();
    const playerName = fullName || (username ? `@${username}` : (userAddress ? `Player_${userAddress.slice(-4)}` : 'Tu'));

    const newMatch: MatchData = {
      matchId: newId,
      state: 'LOBBY',
      currentRound: 1,
      playerA: {
        wallet: userAddress || 'EQ_pending_wallet',
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

    // Update local state and persist to localStorage so it doesn't vanish on app exit
    setMatches((prev) => {
      const updated = [newMatch, ...prev.filter((m) => m.matchId !== newId)];
      try {
        localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated.slice(0, 30)));
      } catch {}
      return updated;
    });

    // Notify backend server if available
    if (serverUrl) {
      try {
        await fetch(`${serverUrl}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wagerAmountNano: (parseFloat(wagerTon) * 1e9).toString(),
            playerAAddress: userAddress || 'EQ_pending_wallet',
            telegramUserId: userId,
            telegramUsername: username,
          }),
        });
      } catch (err) {
        console.warn('Could not post match to server (offline):', err);
      }
    }

    setActiveMatchId(newId);
    setRole('player');
    setIsReady(false);
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
        />
      )}
    </div>
  );
};
