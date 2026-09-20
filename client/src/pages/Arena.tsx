import React, { useState } from 'react';
import { QuickdrawCanvas } from '../components/QuickdrawCanvas.js';
import { SpectatorOddsBar } from '../components/SpectatorOddsBar.js';
import { DuelLobby } from '../components/DuelLobby.js';
import { useSocket } from '../hooks/useSocket.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
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

  // Mock initial matches for the lobby feed
  const [matches] = useState<MatchData[]>([
    {
      matchId: '1001',
      state: 'LOBBY',
      currentRound: 1,
      playerA: { wallet: 'EQD...a1', name: 'CyberNeo', ready: true, score: 0 },
      playerB: null,
      wagerAmountNano: '1000000000',
      totalBetsA: '2000000000',
      totalBetsB: '1500000000',
      oddsA: 1.64,
      oddsB: 2.19,
      spectatorCount: 4,
    },
    {
      matchId: '1002',
      state: 'BETTING_WINDOW',
      currentRound: 1,
      playerA: { wallet: 'EQD...b2', name: 'GlitchMaster', ready: true, score: 0 },
      playerB: { wallet: 'EQD...c3', name: 'VaporBlade', ready: true, score: 0 },
      wagerAmountNano: '5000000000',
      totalBetsA: '8000000000',
      totalBetsB: '12000000000',
      oddsA: 2.35,
      oddsB: 1.57,
      spectatorCount: 16,
    },
  ]);

  const socketData = useSocket({
    matchId: activeMatchId || '',
    wallet: userAddress,
    role,
    username: userAddress ? `Warrior_${userAddress.slice(-4)}` : 'CyberDuelist',
  });

  const handleCreateMatch = (wagerTon: string) => {
    const newId = (Date.now() % 1000000).toString();
    setActiveMatchId(newId);
    setRole('player');
    setIsReady(false);
    console.log(`Created match #${newId} with stake: ${wagerTon} TON`);
  };

  const handleJoinMatch = (matchId: string, wagerTon: string) => {
    setActiveMatchId(matchId);
    setRole('player');
    setIsReady(false);
    console.log(`Joined match #${matchId} with stake: ${wagerTon} TON`);
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
            className="flex items-center space-x-1 text-xs font-mono text-slate-400 hover:text-cyber-cyan transition-all mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>EXIT TO LOBBY</span>
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
