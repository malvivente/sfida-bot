import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Trophy, AlertTriangle, Play, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { generateCrashPoint, recordCasinoOutcome } from '../casinoEngine.js';

interface CrashGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

export const CrashGame: React.FC<CrashGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [gameState, setGameState] = useState<'IDLE' | 'FLYING' | 'CRASHED' | 'CASHED_OUT'>('IDLE');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashHistory, setCrashHistory] = useState<number[]>([1.84, 1.12, 4.25, 1.03, 2.15, 8.40]);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);

  const crashPointRef = useRef<number>(1.0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);

  // Clean animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleStartFlight = () => {
    if (gameState === 'FLYING') return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    // Deduct wager
    onUpdateBalance(-parsedWager);

    const point = generateCrashPoint();
    crashPointRef.current = point;
    setCrashedAt(null);
    setCashedOutAt(null);
    setCurrentMultiplier(1.0);
    setGameState('FLYING');

    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsedSec = (now - startTimeRef.current) / 1000;
      // Exponential curve: mult(t) = e^(0.075 * t^1.1)
      const mult = parseFloat(Math.pow(Math.E, 0.08 * Math.pow(elapsedSec, 1.15)).toFixed(2));

      if (mult >= crashPointRef.current) {
        // BOOM Crash!
        const finalCrash = crashPointRef.current;
        setCurrentMultiplier(finalCrash);
        setCrashedAt(finalCrash);
        setGameState('CRASHED');
        triggerNotification('error');
        recordCasinoOutcome(false, -parsedWager);
        setCrashHistory((prev) => [finalCrash, ...prev.slice(0, 9)]);
        return;
      }

      setCurrentMultiplier(mult);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const handleCashout = () => {
    if (gameState !== 'FLYING') return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const mult = currentMultiplier;
    const profit = parseFloat((parsedWager * mult).toFixed(2));

    setCashedOutAt(mult);
    setGameState('CASHED_OUT');
    triggerNotification('success');
    triggerImpact('heavy');

    // Credit win
    onUpdateBalance(profit);
    recordCasinoOutcome(true, profit - parsedWager);
    setCrashHistory((prev) => [mult, ...prev.slice(0, 9)]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Crash Visual Arena Box */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141829] to-[#0d0f18] border border-cyan-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
        {/* Live Multiplier History Ribbon */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar max-w-[80%]">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider shrink-0">HISTORY:</span>
            {crashHistory.map((m, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                  m >= 2.0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RTP 96.0%</span>
          </div>
        </div>

        {/* Dynamic Flight Canvas / Visualization */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center my-6 space-y-2">
          {gameState === 'FLYING' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 animate-pulse mb-2 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                <Rocket className="w-9 h-9 animate-bounce" />
              </div>
              <span className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-400 tracking-wider">
                {currentMultiplier.toFixed(2)}x
              </span>
              <span className="text-[11px] font-heading font-black text-cyan-400 uppercase tracking-widest animate-pulse">
                IN VOLO...
              </span>
            </div>
          )}

          {gameState === 'CRASHED' && (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-2 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                <AlertTriangle className="w-9 h-9 animate-ping" />
              </div>
              <span className="text-4xl sm:text-5xl font-mono font-black text-rose-500 tracking-wider">
                @{crashedAt?.toFixed(2)}x
              </span>
              <span className="text-xs font-heading font-black text-rose-400 uppercase tracking-widest mt-1">
                💥 IL RAZZO È ESPLOSO!
              </span>
            </div>
          )}

          {gameState === 'CASHED_OUT' && (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mb-2 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <Trophy className="w-9 h-9 animate-bounce" />
              </div>
              <span className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-wider">
                +{cashedOutAt?.toFixed(2)}x
              </span>
              <span className="text-xs font-heading font-black text-emerald-300 uppercase tracking-widest mt-1">
                INCASSATO: +{(parsedWager * (cashedOutAt || 1)).toFixed(2)} GRAM
              </span>
            </div>
          )}

          {gameState === 'IDLE' && (
            <div className="flex flex-col items-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-1">
                <Rocket className="w-7 h-7" />
              </div>
              <span className="text-3xl font-mono font-black text-white">1.00x</span>
              <span className="text-[11px] text-slate-400 font-heading uppercase tracking-wider">
                IMPOSTA LA PUNTATA E DECOLLA
              </span>
            </div>
          )}
        </div>

        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none" />
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        {/* Wager amount row */}
        <div>
          <div className="flex items-center justify-between text-xs font-heading font-extrabold uppercase text-slate-300 mb-1.5">
            <span>IMPORTO PUNTATA</span>
            <span className="text-[11px] font-mono text-cyan-400">
              SALDO: {currentBalance.toFixed(2)} {isDemoMode ? 'CHIP' : 'GRAM'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                disabled={gameState === 'FLYING'}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-500 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <GramIcon className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            {/* Quick Multipliers */}
            <div className="flex items-center space-x-1">
              {[0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={gameState === 'FLYING'}
                  onClick={() => {
                    triggerImpact('light');
                    setWager(amt.toString());
                  }}
                  className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold active:scale-95 disabled:opacity-40"
                >
                  {amt}
                </button>
              ))}
              <button
                type="button"
                disabled={gameState === 'FLYING'}
                onClick={() => {
                  triggerImpact('light');
                  setWager((prev) => (parseFloat(prev || '1') * 2).toFixed(1));
                }}
                className="px-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-400 font-mono text-xs font-bold active:scale-95 disabled:opacity-40"
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        {gameState === 'FLYING' ? (
          <button
            type="button"
            onClick={handleCashout}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <Trophy className="w-5 h-5 animate-bounce" />
            <span>INCASSA ORA ({(parsedWager * currentMultiplier).toFixed(2)} GRAM)</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={currentBalance < parsedWager}
            onClick={handleStartFlight}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Rocket className="w-5 h-5" />
            <span>LANCIA IL RAZZO ({parsedWager} GRAM)</span>
          </button>
        )}
      </div>
    </div>
  );
};
