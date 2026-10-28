import React, { useState } from 'react';
import { Dices, Trophy, ShieldCheck, ArrowDown, ArrowUp, RefreshCw, Zap } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { calculateDicePayout, rollDice, recordCasinoOutcome } from '../casinoEngine.js';

interface DiceGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

export const DiceGame: React.FC<DiceGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [diceTarget, setDiceTarget] = useState<number>(50.0);
  const [diceMode, setDiceMode] = useState<'under' | 'over'>('under');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceHistory, setDiceHistory] = useState<Array<{ roll: number; won: boolean }>>([
    { roll: 48.21, won: true },
    { roll: 77.12, won: false },
    { roll: 12.05, won: true },
  ]);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);

  // Win chance & multiplier
  const winChance = diceMode === 'under' ? diceTarget : 100 - diceTarget;
  const multiplier = calculateDicePayout(winChance);
  const winPayout = parseFloat((parsedWager * multiplier).toFixed(2));

  const handleRoll = () => {
    if (isRolling) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    setIsRolling(true);

    setTimeout(() => {
      const { roll, won } = rollDice(diceTarget, diceMode);
      setDiceResult(roll);
      setIsRolling(false);
      setDiceHistory((prev) => [{ roll, won }, ...prev.slice(0, 7)]);

      if (won) {
        onUpdateBalance(winPayout);
        triggerNotification('success');
        recordCasinoOutcome(true, winPayout - parsedWager);
      } else {
        triggerNotification('error');
        recordCasinoOutcome(false, -parsedWager);
      }
    }, 450);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Visual Dice Display Box */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181a24] to-[#0f1118] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[170px]">
        {/* Top History Ribbon */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 font-mono">STORICO:</span>
          <div className="flex items-center space-x-1">
            {diceHistory.map((h, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  h.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {h.roll.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute top-3 right-3 flex items-center space-x-1 text-[10px] font-mono text-amber-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RTP 96.0%</span>
        </div>

        {/* Target condition indicator */}
        <div className="text-xs font-heading font-extrabold tracking-wider uppercase text-slate-400 mt-3 mb-1">
          OBIETTIVO: <span className="text-amber-300">{diceMode === 'under' ? '<' : '>'} {diceTarget.toFixed(2)}</span>
        </div>

        {/* Big Roll Number Display */}
        <div className="flex items-baseline space-x-1 my-1">
          <span
            className={`text-5xl font-mono font-black tracking-tighter ${
              diceResult === null
                ? 'text-white'
                : (diceMode === 'under' ? diceResult < diceTarget : diceResult > diceTarget)
                ? 'text-emerald-400'
                : 'text-rose-500'
            }`}
          >
            {isRolling ? (Math.random() * 99).toFixed(2) : diceResult !== null ? diceResult.toFixed(2) : '50.00'}
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          PROBABILITÀ DI VINCITA: <span className="text-cyan-400 font-bold">{winChance.toFixed(2)}%</span>
        </div>
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-4 shadow-xl">
        {/* Under / Over Mode Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/10 gap-1">
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setDiceMode('under');
            }}
            className={`py-2 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
              diceMode === 'under'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>ROTOLA SOTTO (UNDER)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setDiceMode('over');
            }}
            className={`py-2 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
              diceMode === 'over'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>ROTOLA SOPRA (OVER)</span>
          </button>
        </div>

        {/* Target Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-heading font-bold text-slate-300">
            <span>SOGLIA TARGET</span>
            <span className="font-mono text-amber-300">{diceTarget.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="2"
            max="98"
            step="1"
            value={diceTarget}
            onChange={(e) => setDiceTarget(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-black/60 rounded-lg appearance-none"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 font-heading block uppercase">MOLTIPLICATORE</span>
            <span className="text-sm font-mono font-black text-amber-400">{multiplier.toFixed(2)}x</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 font-heading block uppercase">VINCITA POTENZIALE</span>
            <span className="text-sm font-mono font-black text-emerald-400">{winPayout} G</span>
          </div>
        </div>

        {/* Wager row */}
        <div>
          <div className="flex items-center justify-between text-xs font-heading font-extrabold uppercase text-slate-300 mb-1.5">
            <span>IMPORTO PUNTATA</span>
            <span className="text-[11px] font-mono text-amber-400">
              SALDO: {currentBalance.toFixed(2)} {isDemoMode ? 'CHIP' : 'GRAM'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                disabled={isRolling}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <GramIcon className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* Quick Multipliers */}
            <div className="flex items-center space-x-1">
              {[0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isRolling}
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

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={isRolling || currentBalance < parsedWager}
          onClick={handleRoll}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
        >
          <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'LANCIO DADO...' : `LANCIA DADO (${parsedWager} GRAM)`}</span>
        </button>
      </div>
    </div>
  );
};
