import React from 'react';
import { Trophy, Coins, CheckCircle, Clock } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';

interface MatchDetailProps {
  matchId: string;
}

export const MatchDetail: React.FC<MatchDetailProps> = ({ matchId }) => {
  const { claimSpectatorPayout } = useTonClashContract();

  const handleClaim = async () => {
    try {
      await claimSpectatorPayout('EQA_mock_match_escrow_address', matchId);
      alert('Spectator Totalizer reward claimed successfully!');
    } catch (err: any) {
      alert(`Claim error: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-mono text-cyber-cyan font-bold">MATCH #{matchId}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyber-green/20 text-cyber-green border border-cyber-green/40">
            SETTLED ON TON
          </span>
        </div>

        {/* Winner Spotlight */}
        <div className="bg-cyber-bg/70 border border-cyber-cyan/30 rounded-xl p-4 text-center mb-4">
          <Trophy className="w-10 h-10 text-cyber-amber mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">CyberNeo Reigns Supreme</h3>
          <p className="text-xs text-slate-400 font-mono mt-1">Won 2 - 1 • Reaction: 194.2ms</p>
          <div className="mt-2 text-xs font-mono text-cyber-cyan font-extrabold">
            +1.92 TON Payout (96% Pot)
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2 text-xs font-mono text-slate-300 mb-4 bg-cyber-bg/40 p-3 rounded-xl border border-cyber-border">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Pot (2W):</span>
            <span className="text-white font-bold">2.00 TON</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Player Rake (4%):</span>
            <span className="text-cyber-amber">0.08 TON</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spectator Pool Total:</span>
            <span className="text-white font-bold">5.00 TON</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spectator Rake (6%):</span>
            <span className="text-cyber-amber">0.30 TON</span>
          </div>
          <div className="flex justify-between border-t border-cyber-border pt-1">
            <span className="text-slate-400">Distributable Spectator Pool:</span>
            <span className="text-cyber-green font-bold">4.70 TON (94%)</span>
          </div>
        </div>

        {/* Claim Reward Button */}
        <button
          onClick={handleClaim}
          className="w-full py-3 bg-cyber-cyan text-cyber-bg font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <Coins className="w-4 h-4" />
          <span>CLAIM SPECTATOR WINNINGS (1.88 TON)</span>
        </button>
      </div>
    </div>
  );
};
