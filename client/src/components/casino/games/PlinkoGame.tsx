import React, { useState, useRef, useEffect } from 'react';
import { CircleDot, Trophy, ShieldCheck, Play, Zap } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { PLINKO_BUCKET_MULTIPLIERS, simulatePlinkoDrop, recordCasinoOutcome } from '../casinoEngine.js';

interface PlinkoGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

interface ActiveBall {
  id: number;
  x: number;
  y: number;
  targetBucket: number;
  step: number;
  path: number[];
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [lastWonBucket, setLastWonBucket] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [balls, setBalls] = useState<ActiveBall[]>([]);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);
  const rows = 8;

  const handleDrop = () => {
    if (isDropping) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    setIsDropping(true);
    setLastWonBucket(null);

    const { path, finalBucket, multiplier } = simulatePlinkoDrop(rows);

    const newBall: ActiveBall = {
      id: Date.now(),
      x: 50, // 50%
      y: 5,  // 5%
      targetBucket: finalBucket,
      step: 0,
      path,
    };

    setBalls([newBall]);

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step <= rows) {
        triggerImpact('light');
        setBalls((prev) =>
          prev.map((b) => {
            const rowProgress = step / rows;
            // Calculate horizontal offset
            let leftMoves = 0;
            for (let i = 0; i < step; i++) {
              if (b.path[i] === 0) leftMoves--;
              else leftMoves++;
            }
            const posX = 50 + leftMoves * 5.2;
            const posY = 10 + rowProgress * 78;
            return { ...b, x: posX, y: posY, step };
          })
        );
      } else {
        clearInterval(interval);
        setBalls([]);
        setLastWonBucket(finalBucket);
        setLastMultiplier(multiplier);
        setIsDropping(false);

        const payout = parseFloat((parsedWager * multiplier).toFixed(2));
        if (multiplier >= 1.0) {
          triggerNotification('success');
        } else {
          triggerImpact('light');
        }

        onUpdateBalance(payout);
        recordCasinoOutcome(multiplier >= 1.0, payout - parsedWager);
      }
    }, 120);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Plinko Pegboard Box */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#141829] to-[#0d0f18] border border-purple-500/30 p-4 shadow-2xl flex flex-col items-center min-h-[300px]">
        {/* Top Info */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-2 text-xs font-heading font-extrabold">
          <div className="flex items-center space-x-1.5 text-purple-400">
            <CircleDot className="w-4 h-4" />
            <span>PIRAMIDE A PIOLI (8 FILE)</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-400 font-mono text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>RTP 96.0%</span>
          </div>
        </div>

        {/* Pegboard Canvas/SVG */}
        <div className="relative w-full max-w-[320px] h-[220px] flex flex-col justify-between py-2">
          {/* Animated Falling Ball */}
          {balls.map((b) => (
            <div
              key={b.id}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 border-2 border-white shadow-[0_0_15px_rgba(245,158,11,0.8)] z-20 transition-all duration-100 ease-linear"
            />
          ))}

          {/* Peg Rows */}
          {Array.from({ length: rows + 1 }).map((_, r) => {
            const pegsInRow = r + 3;
            return (
              <div key={r} className="flex justify-center space-x-4 sm:space-x-5">
                {Array.from({ length: pegsInRow }).map((_, c) => (
                  <span
                    key={c}
                    className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_4px_rgba(255,255,255,0.6)] inline-block"
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Landing Buckets at the bottom */}
        <div className="w-full max-w-[320px] grid grid-cols-9 gap-1 pt-2">
          {PLINKO_BUCKET_MULTIPLIERS.map((mult, i) => {
            const isWinner = lastWonBucket === i;
            const isHigh = mult >= 3.0;
            const isMid = mult >= 1.0 && mult < 3.0;
            return (
              <div
                key={i}
                className={`py-1.5 rounded-lg text-center font-mono text-[9px] font-black transition-all ${
                  isWinner
                    ? 'bg-amber-400 text-slate-950 scale-110 shadow-[0_0_15px_rgba(251,191,36,0.8)] ring-2 ring-white z-10'
                    : isHigh
                    ? 'bg-rose-500/25 border border-rose-500/60 text-rose-300'
                    : isMid
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-white/5 border border-white/10 text-slate-400'
                }`}
              >
                {mult}x
              </div>
            );
          })}
        </div>

        {/* Dynamic status feedback */}
        {lastMultiplier !== null && (
          <div className="mt-3 px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-heading font-black uppercase tracking-wider animate-in zoom-in-95">
            MOLTIPLICATORE OTTENUTO: {lastMultiplier}x • +{(parsedWager * lastMultiplier).toFixed(2)} GRAM
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        {/* Wager row */}
        <div>
          <div className="flex items-center justify-between text-xs font-heading font-extrabold uppercase text-slate-300 mb-1.5">
            <span>IMPORTO PUNTATA</span>
            <span className="text-[11px] font-mono text-purple-400">
              SALDO: {currentBalance.toFixed(2)} {isDemoMode ? 'CHIP' : 'GRAM'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                disabled={isDropping}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-purple-500 transition-all disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <GramIcon className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            {/* Quick Multipliers */}
            <div className="flex items-center space-x-1">
              {[0.5, 1, 5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isDropping}
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
          disabled={isDropping || currentBalance < parsedWager}
          onClick={handleDrop}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-400 hover:to-indigo-500 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
        >
          <CircleDot className={`w-5 h-5 ${isDropping ? 'animate-spin' : ''}`} />
          <span>{isDropping ? 'SFERA IN CADUTA...' : `LANCIA SFERA (${parsedWager} GRAM)`}</span>
        </button>
      </div>
    </div>
  );
};
