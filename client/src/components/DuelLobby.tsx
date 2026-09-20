import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame } from 'lucide-react';
import { MatchData } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

interface DuelLobbyProps {
  matches: MatchData[];
  onCreateMatch: (wagerTon: string) => void;
  onJoinMatch: (matchId: string, wagerTon: string) => void;
  onSpectateMatch: (matchId: string) => void;
}

export const DuelLobby: React.FC<DuelLobbyProps> = ({
  matches,
  onCreateMatch,
  onJoinMatch,
  onSpectateMatch,
}) => {
  const { triggerImpact } = useHaptics();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wagerChoice, setWagerChoice] = useState<string>('1');

  const handleCreate = () => {
    triggerImpact('heavy');
    onCreateMatch(wagerChoice);
    setShowCreateModal(false);
  };

  const handleShare = (matchId: string, wager: string) => {
    triggerImpact('light');
    const text = encodeURIComponent(
      `⚔️ I challenge you to a Cyber Quickdraw Duel for ${wager} TON! Tap faster across 3 rounds to take the pot!`
    );
    const url = encodeURIComponent(`https://t.me/sfida_arena_bot?start=duel_${matchId}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Create Duel Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/20 via-cyber-card to-cyber-pink/20 border border-cyber-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <span>INSTANT 1V1 DUELS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Best of 3 • 4% Rake • Zero-House Risk
          </p>
        </div>

        <button
          onClick={() => {
            triggerImpact('medium');
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-cyber-cyan text-cyber-bg font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE</span>
        </button>
      </div>

      {/* Active Matches Feed */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
          ARENA MATCH FEED ({matches.length})
        </h3>

        {matches.length === 0 ? (
          <div className="text-center py-10 bg-cyber-card border border-cyber-border rounded-2xl">
            <Swords className="w-10 h-10 text-cyber-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-400 font-mono">No active duels in the lobby.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-xs text-cyber-cyan underline font-mono"
            >
              Create the first duel
            </button>
          </div>
        ) : (
          matches.map((m) => {
            const wagerTon = (Number(BigInt(m.wagerAmountNano || '0')) / 1e9).toFixed(1);
            return (
              <div
                key={m.matchId}
                className="bg-cyber-card border border-cyber-border rounded-2xl p-3.5 hover:border-cyber-cyan/50 transition-all shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-cyber-cyan font-bold">
                      #{m.matchId}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                        m.state === 'BETTING_WINDOW'
                          ? 'bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 animate-pulse'
                          : m.state === 'LOBBY'
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                          : 'bg-cyber-muted/20 text-slate-300'
                      }`}
                    >
                      {m.state}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-extrabold text-white">
                    {wagerTon} TON POT
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 mb-3 bg-cyber-bg/60 p-2 rounded-xl border border-cyber-border">
                  <span className="truncate max-w-[120px] font-mono">{m.playerA.name}</span>
                  <span className="text-cyber-muted font-bold">VS</span>
                  <span className="truncate max-w-[120px] font-mono">
                    {m.playerB ? m.playerB.name : 'Waiting...'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {!m.playerB ? (
                    <button
                      onClick={() => onJoinMatch(m.matchId, wagerTon)}
                      className="flex-1 py-2 bg-cyber-cyan text-cyber-bg font-bold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>ACCEPT ({wagerTon} TON)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSpectateMatch(m.matchId)}
                      className="flex-1 py-2 bg-cyber-border text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider hover:border-cyber-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>SPECTATE & BET</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleShare(m.matchId, wagerTon)}
                    className="p-2 bg-cyber-bg border border-cyber-border rounded-xl text-slate-300 hover:text-cyber-cyan active:scale-95 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Duel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">CREATE 1V1 QUICKDRAW DUEL</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select stake amount. Winner receives 96% of the 2W pot.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {['0.5', '1', '2', '5', '10', '25'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    triggerImpact('light');
                    setWagerChoice(amt);
                  }}
                  className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                    wagerChoice === amt
                      ? 'bg-cyber-cyan text-cyber-bg border-cyber-cyan shadow-neon-cyan'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:border-cyber-cyan/50'
                  }`}
                >
                  {amt} TON
                </button>
              ))}
            </div>

            <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-2.5 mb-4 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Player Stake:</span>
                <span className="text-white font-bold">{wagerChoice} TON</span>
              </div>
              <div className="flex justify-between">
                <span>Creation Micro-Fee:</span>
                <span className="text-cyber-amber">+0.02 TON (gas subsidy)</span>
              </div>
              <div className="flex justify-between border-t border-cyber-border pt-1 text-cyber-cyan">
                <span>Winner Payout:</span>
                <span className="font-bold">{(parseFloat(wagerChoice) * 1.92).toFixed(2)} TON (96%)</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-cyber-cyan text-cyber-bg font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95"
              >
                INITIALIZE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
