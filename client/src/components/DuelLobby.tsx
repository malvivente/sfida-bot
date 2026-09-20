import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame } from 'lucide-react';
import { MatchData } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';

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
    const text = `⚔️ Ti sfido a Cyber Quickdraw per ${wager} TON! Premi più veloce su 3 round per vincere il piatto!`;
    const url = `https://t.me/SfidaRobot?start=duel_${matchId}`;
    shareToTelegram(url, text);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Create Duel Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/20 via-cyber-card to-cyber-pink/20 border border-cyber-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-base font-orbitron font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <span>SFIDE 1V1 LIVE</span>
          </h2>
          <p className="text-xs font-rajdhani text-slate-300 mt-0.5">
            Best of 3 • Payout Istantaneo al Vincitore
          </p>
        </div>

        <button
          onClick={() => {
            triggerImpact('medium');
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>CREA</span>
        </button>
      </div>

      {/* Active Matches Feed */}
      <div className="space-y-3">
        <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider px-1">
          SFIDE ATTIVE NELL'ARENA ({matches.length})
        </h3>

        {matches.length === 0 ? (
          <div className="text-center py-10 bg-cyber-card border border-cyber-border rounded-2xl p-6">
            <Swords className="w-12 h-12 text-cyber-cyan/40 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-slate-300 font-rajdhani font-semibold">Nessun duello attivo nella lobby.</p>
            <p className="text-xs text-slate-500 font-rajdhani mt-1">Crea la prima sfida e sfida i tuoi amici!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-5 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold text-xs uppercase tracking-wider rounded-xl shadow-neon-cyan active:scale-95 transition-all"
            >
              CREA LA PRIMA SFIDA
            </button>
          </div>
        ) : (
          matches.map((m) => {
            const wagerTon = (Number(BigInt(m.wagerAmountNano || '0')) / 1e9).toFixed(1);
            const netWinTon = (parseFloat(wagerTon) * 1.92).toFixed(2);
            return (
              <div
                key={m.matchId}
                className="bg-cyber-card border border-cyber-border rounded-2xl p-3.5 hover:border-cyber-cyan/50 transition-all shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-chakra text-cyber-cyan font-bold">
                      #{m.matchId}
                    </span>
                    <span
                      className={`text-[10px] font-chakra px-2 py-0.5 rounded-full uppercase ${
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

                  <span className="text-xs font-chakra font-extrabold text-white">
                    PIATTO: {wagerTon} TON
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 mb-3 bg-cyber-bg/60 p-2.5 rounded-xl border border-cyber-border">
                  <span className="truncate max-w-[120px] font-chakra font-semibold">{m.playerA.name}</span>
                  <span className="text-cyber-muted font-bold font-orbitron text-[10px]">VS</span>
                  <span className="truncate max-w-[120px] font-chakra">
                    {m.playerB ? m.playerB.name : 'In attesa...'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {!m.playerB ? (
                    <button
                      onClick={() => onJoinMatch(m.matchId, wagerTon)}
                      className="flex-1 py-2 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>ACCETTA ({wagerTon} TON)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSpectateMatch(m.matchId)}
                      className="flex-1 py-2 bg-cyber-border text-slate-200 font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:border-cyber-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyber-cyan" />
                      <span>SPETTATORE</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleShare(m.matchId, wagerTon)}
                    title="Condividi su Telegram"
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
            <h3 className="text-base font-orbitron font-bold text-white mb-1">CREA SFIDA 1V1 QUICKDRAW</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-4">
              Scegli la puntata. Chi vince 2 round su 3 si aggiudica il montepremi.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {['0.5', '1', '2', '5', '10', '25'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    triggerImpact('light');
                    setWagerChoice(amt);
                  }}
                  className={`py-2.5 rounded-xl font-chakra text-xs font-bold border transition-all ${
                    wagerChoice === amt
                      ? 'bg-cyber-cyan text-cyber-bg border-cyber-cyan shadow-neon-cyan'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:border-cyber-cyan/50'
                  }`}
                >
                  {amt} TON
                </button>
              ))}
            </div>

            <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3 mb-4 text-xs font-chakra text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span>La tua puntata:</span>
                <span className="text-white font-bold">{wagerChoice} TON</span>
              </div>
              <div className="flex justify-between">
                <span>Contributo gas contratto:</span>
                <span className="text-cyber-amber">+0.02 TON</span>
              </div>
              <div className="flex justify-between border-t border-cyber-border pt-1.5 text-cyber-cyan">
                <span className="font-bold">Vincita Netta:</span>
                <span className="font-extrabold text-sm text-cyber-cyan">+{(parseFloat(wagerChoice) * 1.92).toFixed(2)} TON</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-orbitron font-semibold text-slate-400 hover:text-white"
              >
                ANNULLA
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95"
              >
                CREA SFIDA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
