import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame } from 'lucide-react';
import { MatchData } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from './GramIcon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { useTelegram } from '../hooks/useTelegram.js';

interface DuelLobbyProps {
  matches: MatchData[];
  onCreateMatch: (wagerGram: string) => void;
  onJoinMatch: (matchId: string, wagerGram: string) => void;
  onSpectateMatch: (matchId: string) => void;
}

export const DuelLobby: React.FC<DuelLobbyProps> = ({
  matches,
  onCreateMatch,
  onJoinMatch,
  onSpectateMatch,
}) => {
  const { triggerImpact } = useHaptics();
  const { botUsername } = useTelegram();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wagerChoice, setWagerChoice] = useState<string>('5');

  const parsedWager = parseFloat(wagerChoice || '0');
  const isOverMax = parsedWager > GAME_CONFIG.MAX_WAGER;
  const netWinnerPayout = (parsedWager * 1.92).toFixed(2);

  const handleCreate = () => {
    if (parsedWager <= 0 || isOverMax) return;
    triggerImpact('heavy');
    onCreateMatch(wagerChoice);
    setShowCreateModal(false);
  };

  const handleShare = (matchId: string, wager: string) => {
    triggerImpact('light');
    const text = `⚔️ Ti sfido a Cyber Quickdraw per ${wager} GRAM! Premi più veloce su 3 round per vincere il piatto!`;
    const url = `https://t.me/${botUsername}?start=duel_${matchId}`;
    shareToTelegram(url, text);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setWagerChoice(val);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Create Duel Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/20 via-cyber-card to-cyber-pink/20 border border-cyber-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-base font-orbitron font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <span>SFIDE 1V1 LIVE</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
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
            <p className="text-sm text-slate-300 font-semibold">Nessun duello attivo nella lobby.</p>
            <p className="text-xs text-slate-500 mt-1">Crea la prima sfida e invita i tuoi amici!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-5 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold text-xs uppercase tracking-wider rounded-xl shadow-neon-cyan active:scale-95 transition-all"
            >
              CREA LA PRIMA SFIDA
            </button>
          </div>
        ) : (
          matches.map((m) => {
            const wagerGram = (Number(BigInt(m.wagerAmountNano || '0')) / 1e9).toFixed(1);
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

                  <div className="flex items-center space-x-1 text-xs font-chakra font-extrabold text-white">
                    <span>PIATTO: {wagerGram}</span>
                    <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                  </div>
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
                      onClick={() => onJoinMatch(m.matchId, wagerGram)}
                      className="flex-1 py-2 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span className="flex items-center space-x-1">
                        <span>ACCETTA ({wagerGram}</span>
                        <GramIcon className="w-3 h-3 text-cyber-bg inline-block" />
                        <span>)</span>
                      </span>
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
                    onClick={() => handleShare(m.matchId, wagerGram)}
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
            <p className="text-xs text-slate-300 mb-4">
              Scegli la puntata. Chi vince 2 round su 3 si aggiudica il montepremi.
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra mb-1.5">
              <span>Importo predefinito:</span>
              <span className="flex items-center space-x-1">
                <span>Max: {GAME_CONFIG.MAX_WAGER}</span>
                <GramIcon className="w-3 h-3 text-slate-400" />
              </span>
            </div>

            {/* Presets Grid (up to 100 GRAM) */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {GAME_CONFIG.PRESET_DUEL_WAGERS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    triggerImpact('light');
                    setWagerChoice(amt);
                  }}
                  className={`py-2 rounded-xl font-chakra text-xs font-bold border transition-all flex items-center justify-center space-x-0.5 ${
                    wagerChoice === amt
                      ? 'bg-cyber-cyan text-cyber-bg border-cyber-cyan shadow-neon-cyan'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:border-cyber-cyan/50'
                  }`}
                >
                  <span>{amt}</span>
                  <GramIcon className={`w-3 h-3 ${wagerChoice === amt ? 'text-cyber-bg' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center space-x-2 bg-cyber-bg/70 border border-cyber-border rounded-xl px-3 py-1.5 mb-3">
              <span className="text-xs text-slate-400 font-chakra">Altro importo:</span>
              <input
                type="text"
                inputMode="decimal"
                value={wagerChoice}
                onChange={handleCustomInput}
                placeholder={`1 - ${GAME_CONFIG.MAX_WAGER}`}
                className="flex-1 bg-transparent text-sm font-chakra font-bold text-white text-right focus:outline-none"
              />
              <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
            </div>

            {isOverMax && (
              <p className="text-[11px] text-cyber-pink font-chakra mb-3">
                Attenzione: L'importo massimo consentito è {GAME_CONFIG.MAX_WAGER} GRAM.
              </p>
            )}

            {/* Stake Breakdown */}
            <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3 mb-4 text-xs font-chakra text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center">
                <span>La tua puntata:</span>
                <span className="text-white font-bold flex items-center space-x-1">
                  <span>{wagerChoice || '0'}</span>
                  <GramIcon className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Contributo gas contratto:</span>
                <span className="text-cyber-amber flex items-center space-x-1">
                  <span>+0.02</span>
                  <GramIcon className="w-3 h-3 text-cyber-amber" />
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-cyber-border pt-1.5 text-cyber-cyan">
                <span className="font-bold">Vincita Netta:</span>
                <span className="font-extrabold text-sm text-cyber-cyan flex items-center space-x-1">
                  <span>+{netWinnerPayout}</span>
                  <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                </span>
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
                disabled={!wagerChoice || parsedWager <= 0 || isOverMax}
                className={`flex-1 py-2.5 font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider transition-all ${
                  !wagerChoice || parsedWager <= 0 || isOverMax
                    ? 'bg-cyber-border text-cyber-muted cursor-not-allowed'
                    : 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan active:scale-95'
                }`}
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
