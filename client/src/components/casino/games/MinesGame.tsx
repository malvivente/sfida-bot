import React, { useState } from 'react';
import { Bomb, Gem, Trophy, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { getMinesMultiplier, recordCasinoOutcome } from '../casinoEngine.js';

interface MinesGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

interface TileState {
  index: number;
  revealed: boolean;
  isMine: boolean;
}

export const MinesGame: React.FC<MinesGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [minesCount, setMinesCount] = useState<number>(3);
  const [inRound, setInRound] = useState<boolean>(false);
  const [grid, setGrid] = useState<TileState[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({ index: i, revealed: false, isMine: false }))
  );
  const [diamondsFound, setDiamondsFound] = useState<number>(0);
  const [gameOverResult, setGameOverResult] = useState<'WON' | 'LOST' | null>(null);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);
  const currentMultiplier = getMinesMultiplier(minesCount, diamondsFound);
  const nextMultiplier = getMinesMultiplier(minesCount, diamondsFound + 1);
  const currentPayout = parseFloat((parsedWager * currentMultiplier).toFixed(2));

  const handleStartRound = () => {
    if (inRound) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);

    // Generate mine locations randomly
    const indices = Array.from({ length: 25 }, (_, i) => i);
    const mineIndices = new Set<number>();
    while (mineIndices.size < minesCount) {
      const randIdx = Math.floor(Math.random() * indices.length);
      mineIndices.add(indices[randIdx]);
    }

    const newGrid: TileState[] = Array.from({ length: 25 }, (_, i) => ({
      index: i,
      revealed: false,
      isMine: mineIndices.has(i),
    }));

    setGrid(newGrid);
    setDiamondsFound(0);
    setGameOverResult(null);
    setInRound(true);
  };

  const handleTileClick = (index: number) => {
    if (!inRound) return;
    const tile = grid[index];
    if (tile.revealed) return;

    if (tile.isMine) {
      // Hit a mine!
      triggerNotification('error');
      triggerImpact('heavy');

      // Reveal all tiles
      setGrid((prev) =>
        prev.map((t) => ({
          ...t,
          revealed: true,
        }))
      );
      setInRound(false);
      setGameOverResult('LOST');
      recordCasinoOutcome(false, -parsedWager);
    } else {
      // Found a diamond!
      triggerImpact('light');
      const newDiamonds = diamondsFound + 1;
      setDiamondsFound(newDiamonds);

      setGrid((prev) =>
        prev.map((t) => (t.index === index ? { ...t, revealed: true } : t))
      );

      // Check if all diamonds found
      if (newDiamonds === 25 - minesCount) {
        handleCashout();
      }
    }
  };

  const handleCashout = () => {
    if (!inRound || diamondsFound === 0) return;

    triggerNotification('success');
    triggerImpact('heavy');

    const payout = currentPayout;
    onUpdateBalance(payout);
    recordCasinoOutcome(true, payout - parsedWager);

    // Reveal all remaining
    setGrid((prev) =>
      prev.map((t) => ({
        ...t,
        revealed: true,
      }))
    );
    setInRound(false);
    setGameOverResult('WON');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 5x5 Grid Board Box */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#141829] to-[#0d0f18] border border-emerald-500/30 p-4 shadow-2xl flex flex-col items-center">
        {/* Header Ribbon */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs font-heading font-extrabold">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <Gem className="w-4 h-4" />
            <span>GEMME: {diamondsFound} / {25 - minesCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-rose-400">
            <Bomb className="w-4 h-4" />
            <span>MINE: {minesCount}</span>
          </div>
        </div>

        {/* 5x5 Interactive Tiles */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-[320px] aspect-square">
          {grid.map((t) => {
            return (
              <button
                key={t.index}
                type="button"
                disabled={!inRound && !t.revealed}
                onClick={() => handleTileClick(t.index)}
                className={`rounded-2xl transition-all duration-200 flex items-center justify-center font-bold text-lg select-none active:scale-95 ${
                  t.revealed
                    ? t.isMine
                      ? 'bg-rose-500/30 border border-rose-500/80 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-in zoom-in-75'
                      : 'bg-emerald-500/25 border border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-in zoom-in-75'
                    : inRound
                    ? 'bg-[#1e2338] hover:bg-[#282f4c] border border-white/15 hover:border-emerald-400/50 cursor-pointer shadow-md'
                    : 'bg-[#151928] border border-white/5 opacity-60'
                }`}
              >
                {t.revealed ? (
                  t.isMine ? (
                    <Bomb className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Gem className="w-6 h-6 text-emerald-400 animate-bounce" />
                  )
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic status feedback */}
        {gameOverResult === 'WON' && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-heading font-black uppercase tracking-wider animate-in zoom-in-95">
            🏆 INCASSO COMPLETATO: +{currentPayout} GRAM!
          </div>
        )}
        {gameOverResult === 'LOST' && (
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-heading font-black uppercase tracking-wider animate-in zoom-in-95">
            💥 BOOM! HAI COLPITO UNA MINA
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        {/* Wager row */}
        <div>
          <div className="flex items-center justify-between text-xs font-heading font-extrabold uppercase text-slate-300 mb-1.5">
            <span>IMPORTO PUNTATA</span>
            <span className="text-[11px] font-mono text-emerald-400">
              SALDO: {currentBalance.toFixed(2)} {isDemoMode ? 'CHIP' : 'GRAM'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                disabled={inRound}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <GramIcon className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Quick Multipliers */}
            <div className="flex items-center space-x-1">
              {[0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={inRound}
                  onClick={() => {
                    triggerImpact('light');
                    setWager(amt.toString());
                  }}
                  className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold active:scale-95 disabled:opacity-40"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mines Count Selector */}
        <div>
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            NUMERO DI MINE ({minesCount})
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 3, 5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                disabled={inRound}
                onClick={() => {
                  triggerImpact('light');
                  setMinesCount(m);
                }}
                className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-all active:scale-95 disabled:opacity-50 ${
                  minesCount === m
                    ? 'bg-rose-500/25 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {m} 💣
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        {inRound ? (
          <button
            type="button"
            disabled={diamondsFound === 0}
            onClick={handleCashout}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Trophy className="w-5 h-5 animate-bounce" />
            <span>
              INCASSA ORA {diamondsFound > 0 ? `(${currentPayout} GRAM • ${currentMultiplier.toFixed(2)}x)` : '(SCOPRI ALMENO 1 GEMMA)'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={currentBalance < parsedWager}
            onClick={handleStartRound}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 hover:from-emerald-300 hover:to-teal-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Gem className="w-5 h-5" />
            <span>INIZIA PARTITA ({parsedWager} GRAM)</span>
          </button>
        )}
      </div>
    </div>
  );
};
