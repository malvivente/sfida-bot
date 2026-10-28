import React, { useState } from 'react';
import { Dices, Trophy, ArrowDown, ArrowUp, Zap } from 'lucide-react';
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
  const [diceWon, setDiceWon] = useState<boolean | null>(null);
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
    setDiceWon(null);

    // Rapid random number animation ticker
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      setDiceResult(parseFloat((Math.random() * 99.99).toFixed(2)));
      if (ticks >= 9) {
        clearInterval(interval);
        const { roll, won } = rollDice(diceTarget, diceMode);
        setDiceResult(roll);
        setDiceWon(won);
        setIsRolling(false);
        setDiceHistory((prev) => [{ roll, won }, ...prev.slice(0, 6)]);

        if (won) {
          onUpdateBalance(winPayout);
          triggerNotification('success');
          recordCasinoOutcome(true, winPayout - parsedWager);
        } else {
          triggerNotification('error');
          recordCasinoOutcome(false, -parsedWager);
        }
      }
    }, 60);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Visual Dice Display Box */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181a24] to-[#0f1118] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[175px]">
        {/* Top History Ribbon */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 font-mono">{t('casino.history') || 'CRONOLOGIA:'}</span>
          <div className="flex items-center space-x-1">
            {diceHistory.map((h, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  h.won
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {h.roll.toFixed(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Target condition indicator */}
        <div className="text-xs font-heading font-extrabold tracking-wider uppercase text-slate-400 mt-4 mb-1">
          {t('casino.target') || 'OBIETTIVO'}:{' '}
          <span className="text-amber-300 font-mono">
            {diceMode === 'under' ? '<' : '>'} {diceTarget.toFixed(2)}
          </span>
        </div>

        {/* Animated Rapid Roll Number Display */}
        <div
          className={`text-5xl sm:text-6xl font-mono font-black tracking-tight transition-transform duration-100 my-1 ${
            isRolling
              ? 'text-amber-400 scale-105 animate-pulse'
              : diceWon === true
              ? 'text-emerald-400 scale-110 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]'
              : diceWon === false
              ? 'text-rose-500 scale-100'
              : 'text-white'
          }`}
        >
          {diceResult !== null ? diceResult.toFixed(2) : '50.00'}
        </div>

        {/* Win / Loss Result Banner */}
        {diceWon !== null && !isRolling && (
          <div className="mt-1 animate-in zoom-in-95 duration-150">
            {diceWon ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-heading font-black text-xs uppercase tracking-wider flex items-center space-x-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>{t('casino.won') || 'HAI VINTO'} +{winPayout} GRAM!</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 font-heading font-bold text-xs uppercase tracking-wider">
                {t('casino.lost') || 'NON RIUSCITO'} ({diceResult?.toFixed(2)})
              </span>
            )}
          </div>
        )}

        <div className="text-[11px] font-mono text-slate-400 mt-2">
          {t('casino.winChance') || 'PROBABILITÀ'}: <span className="text-cyan-400 font-bold">{winChance.toFixed(2)}%</span>
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
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{t('casino.rollUnder') || 'SOTTO (<)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setDiceMode('over');
            }}
            className={`py-2 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
              diceMode === 'over'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{t('casino.rollOver') || 'SOPRA (>)'}</span>
          </button>
        </div>

        {/* Probability Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-slate-300">{t('casino.target') || 'OBIETTIVO'}: {diceTarget.toFixed(2)}</span>
            <span className="font-mono text-amber-300 font-bold">{multiplier}x {t('casino.multiplier') || 'MOLTIPLICATORE'}</span>
          </div>
          <input
            type="range"
            min="2"
            max="98"
            step="1"
            value={diceTarget}
            onChange={(e) => setDiceTarget(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-2.5 bg-black/60 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>2.00</span>
            <span>50.00</span>
            <span>98.00</span>
          </div>
        </div>

        {/* Wager Presets & Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-slate-300">{t('casino.wager') || 'PUNTATA IN GRAM'}</span>
            <span className="font-mono text-emerald-400 font-bold">
              {t('casino.profit') || 'VINCITA'}: +{winPayout} G
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-2xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
              />
              <GramIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
            </div>

            <button
              type="button"
              onClick={() => setWager((prev) => Math.max(0.1, parseFloat(prev) / 2).toFixed(1))}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300"
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => setWager((prev) => (parseFloat(prev) * 2).toFixed(1))}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300"
            >
              2x
            </button>
            <button
              type="button"
              onClick={() => setWager(Math.min(currentBalance, 50).toFixed(1))}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Roll Action Button */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling || currentBalance < parsedWager}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span>
            {isRolling
              ? t('casino.rolling') || 'LANCIO IN CORSO...'
              : `${t('casino.rollBtn') || 'LANCIA IL DADO'} (${parsedWager} GRAM)`}
          </span>
        </button>
      </div>
    </div>
  );
};
