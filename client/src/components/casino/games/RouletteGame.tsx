import React, { useState, useRef, useEffect } from 'react';
import { Disc, Trophy, Sparkles } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { spinRoulette, recordCasinoOutcome, RouletteOutcome } from '../casinoEngine.js';

interface RouletteGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

type BetType = 'RED' | 'BLACK' | 'EVEN' | 'ODD' | 'LOW' | 'HIGH' | 'NUMBER';

// European Roulette 37 numbers clockwise sequence
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const RouletteGame: React.FC<RouletteGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [selectedBetType, setSelectedBetType] = useState<BetType>('RED');
  const [selectedNumber, setSelectedNumber] = useState<number>(7);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningResult, setWinningResult] = useState<RouletteOutcome | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  // Wheel and ball animation state
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [ballAngle, setBallAngle] = useState<number>(0);
  const [ballRadius, setBallRadius] = useState<number>(98);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);

  const handleSpin = () => {
    if (isSpinning) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    setIsSpinning(true);
    setWinningResult(null);
    setLastWinAmount(null);

    // 1. Determine outcome
    const outcome = spinRoulette();
    const winningIdx = WHEEL_NUMBERS.indexOf(outcome.number);
    const sectorAngle = 360 / 37; // ~9.73 deg

    // Target angle where winning pocket aligns with pointer (pointer at 12 o'clock, 0 deg)
    const targetPocketAngle = winningIdx * sectorAngle;
    const finalWheelRotation = wheelAngle + 360 * 4 + (360 - (targetPocketAngle % 360));

    // Ball spins in opposite direction
    const finalBallRotation = ballAngle - (360 * 6 + targetPocketAngle);

    // Animate smoothly over 3200ms
    const startTime = performance.now();
    const duration = 3200;
    const initialWheel = wheelAngle;
    const initialBall = ballAngle;

    const animateLoop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      const curWheel = initialWheel + (finalWheelRotation - initialWheel) * ease;
      const curBall = initialBall + (finalBallRotation - initialBall) * ease;
      setWheelAngle(curWheel);
      setBallAngle(curBall);

      // Ball drops inward in last 30% of animation
      if (progress > 0.7) {
        const dropProgress = (progress - 0.7) / 0.3;
        setBallRadius(98 - dropProgress * 26); // drops from 98 to 72
      } else {
        setBallRadius(98);
      }

      if (progress < 1) {
        requestAnimationFrame(animateLoop);
      } else {
        // Animation complete!
        setIsSpinning(false);
        setWinningResult(outcome);

        // Calculate win condition
        let won = false;
        let multiplier = 0;

        if (selectedBetType === 'RED' && outcome.color === 'red') {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'BLACK' && outcome.color === 'black') {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'EVEN' && outcome.number > 0 && outcome.number % 2 === 0) {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'ODD' && outcome.number % 2 !== 0) {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'LOW' && outcome.number >= 1 && outcome.number <= 18) {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'HIGH' && outcome.number >= 19 && outcome.number <= 36) {
          won = true;
          multiplier = 1.95;
        } else if (selectedBetType === 'NUMBER' && outcome.number === selectedNumber) {
          won = true;
          multiplier = 35.0;
        }

        if (won) {
          const payout = parseFloat((parsedWager * multiplier).toFixed(2));
          setLastWinAmount(payout);
          onUpdateBalance(payout);
          triggerNotification('success');
          recordCasinoOutcome(true, payout - parsedWager);
        } else {
          triggerNotification('error');
          recordCasinoOutcome(false, -parsedWager);
        }
      }
    };

    requestAnimationFrame(animateLoop);
  };

  // Convert polar coordinates to Cartesian for the spinning ball
  const ballRad = (ballAngle * Math.PI) / 180;
  const ballX = 130 + ballRadius * Math.sin(ballRad);
  const ballY = 130 - ballRadius * Math.cos(ballRad);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Classic European Roulette Visual Wheel Arena */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#1c1409] via-[#0d0903] to-black border border-amber-500/40 p-4 shadow-2xl flex flex-col items-center">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-2">
          <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-heading font-black tracking-wider">
            <Disc className="w-4 h-4" />
            <span>ROULETTE EUROPEA (37 NUMERI)</span>
          </div>
          {winningResult && (
            <span
              className={`px-2 py-0.5 rounded-full font-mono font-black text-xs uppercase ${
                winningResult.color === 'green'
                  ? 'bg-emerald-500 text-slate-950'
                  : winningResult.color === 'red'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-white border border-white/20'
              }`}
            >
              NUMERO #{winningResult.number} ({winningResult.color.toUpperCase()})
            </span>
          )}
        </div>

        {/* The Animated Spinning Classic Roulette Wheel */}
        <div className="relative w-[260px] h-[260px] my-2 flex items-center justify-center">
          {/* Top Pointer Indicator (12 o'clock) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <polygon
              points="-6,0 6,0 0,14"
              className="fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
            />
          </div>

          {/* SVG Rotating Wheel Base */}
          <svg
            viewBox="0 0 260 260"
            className="w-[260px] h-[260px] select-none"
            style={{
              transform: `rotate(${wheelAngle}deg)`,
              transformOrigin: '130px 130px',
            }}
          >
            <defs>
              <radialGradient id="turretGold" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <linearGradient id="wheelRim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
            </defs>

            {/* Outer Wood/Brass Rim */}
            <circle cx="130" cy="130" r="126" fill="#1e1307" stroke="url(#wheelRim)" strokeWidth="5" />
            {/* Ball Track Ring */}
            <circle cx="130" cy="130" r="106" fill="#0f172a" stroke="#d97706" strokeWidth="1" />

            {/* 37 Numbered Wedges */}
            {WHEEL_NUMBERS.map((num, i) => {
              const angle = (i * 360) / 37;
              const nextAngle = ((i + 1) * 360) / 37;
              const rad1 = (angle * Math.PI) / 180;
              const rad2 = (nextAngle * Math.PI) / 180;
              const rIn = 58;
              const rOut = 95;

              const x1 = 130 + rOut * Math.sin(rad1);
              const y1 = 130 - rOut * Math.cos(rad1);
              const x2 = 130 + rOut * Math.sin(rad2);
              const y2 = 130 - rOut * Math.cos(rad2);
              const x3 = 130 + rIn * Math.sin(rad2);
              const y3 = 130 - rIn * Math.cos(rad2);
              const x4 = 130 + rIn * Math.sin(rad1);
              const y4 = 130 - rIn * Math.cos(rad1);

              const color = num === 0 ? '#059669' : RED_NUMBERS.has(num) ? '#dc2626' : '#111827';
              const textAngle = angle + 360 / 74;
              const textRad = (textAngle * Math.PI) / 180;
              const textR = 76;
              const tx = 130 + textR * Math.sin(textRad);
              const ty = 130 - textR * Math.cos(textRad);

              return (
                <g key={i}>
                  <path
                    d={`M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`}
                    fill={color}
                    stroke="#d97706"
                    strokeWidth="0.75"
                  />
                  <text
                    x={tx}
                    y={ty}
                    fill="#ffffff"
                    fontSize="7"
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                  >
                    {num}
                  </text>
                </g>
              );
            })}

            {/* Inner Brass Ring & Spokes */}
            <circle cx="130" cy="130" r="58" fill="#1c1917" stroke="url(#wheelRim)" strokeWidth="2.5" />
            <line x1="75" y1="130" x2="185" y2="130" stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
            <line x1="130" y1="75" x2="130" y2="185" stroke="#f59e0b" strokeWidth="2" opacity="0.6" />
            <line x1="91" y1="91" x2="169" y2="169" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            <line x1="91" y1="169" x2="169" y2="91" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />

            {/* Center Turret Handle */}
            <circle cx="130" cy="130" r="24" fill="url(#turretGold)" stroke="#fef08a" strokeWidth="1.5" />
            <circle cx="130" cy="130" r="8" fill="#fef3c7" />
          </svg>

          {/* The Spinning Ivory Ball */}
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-75"
            style={{
              left: `${ballX}px`,
              top: `${ballY}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
          </div>
        </div>

        {/* Result Outcome Tag */}
        {winningResult && (
          <div className="mt-2 text-center animate-in zoom-in-95">
            {lastWinAmount ? (
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5">
                <Trophy className="w-4 h-4" />
                <span>VITTORIA! INCASSO: +{lastWinAmount} GRAM!</span>
              </span>
            ) : (
              <span className="px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 font-heading font-bold text-xs uppercase tracking-wider">
                NON VINCENTE ({winningResult.number} {winningResult.color.toUpperCase()})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3.5 shadow-xl">
        {/* Betting Types */}
        <div className="space-y-1.5">
          <span className="text-xs font-heading font-bold text-slate-300 uppercase">
            TIPO DI SCOMMESSA
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedBetType('RED')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'RED'
                  ? 'bg-rose-600 text-white shadow-md border border-rose-400'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              🔴 ROSSO (1.95x)
            </button>

            <button
              type="button"
              onClick={() => setSelectedBetType('BLACK')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'BLACK'
                  ? 'bg-slate-900 text-white shadow-md border border-white/30'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              ⚫ NERO (1.95x)
            </button>

            <button
              type="button"
              onClick={() => setSelectedBetType('EVEN')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'EVEN'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              PARI (1.95x)
            </button>

            <button
              type="button"
              onClick={() => setSelectedBetType('ODD')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'ODD'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              DISPARI (1.95x)
            </button>

            <button
              type="button"
              onClick={() => setSelectedBetType('LOW')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'LOW'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              1-18 (1.95x)
            </button>

            <button
              type="button"
              onClick={() => setSelectedBetType('NUMBER')}
              className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all ${
                selectedBetType === 'NUMBER'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                  : 'bg-black/40 text-slate-400 border border-white/5'
              }`}
            >
              NUMERO PIENO (35x)
            </button>
          </div>
        </div>

        {/* Number Picker if NUMBER bet is chosen */}
        {selectedBetType === 'NUMBER' && (
          <div className="space-y-1.5 animate-in zoom-in-95">
            <span className="text-xs font-heading font-bold text-amber-300">
              SCEGLI NUMERO: #{selectedNumber}
            </span>
            <div className="grid grid-cols-7 gap-1 max-h-28 overflow-y-auto no-scrollbar p-1 bg-black/40 rounded-xl border border-white/10">
              {Array.from({ length: 37 }).map((_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedNumber(n)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all ${
                    selectedNumber === n
                      ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white'
                      : n === 0
                      ? 'bg-emerald-600 text-white'
                      : RED_NUMBERS.has(n)
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wager Presets & Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-slate-300">PUNTATA IN GRAM</span>
            <span className="font-mono text-amber-300 font-bold">
              POTENZIALE VINCITA: +
              {parseFloat(
                (parsedWager * (selectedBetType === 'NUMBER' ? 35.0 : 1.95)).toFixed(2)
              )}{' '}
              G
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-2xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
              />
              <GramIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
            </div>

            <button
              type="button"
              onClick={() => setWager((p) => Math.max(0.1, parseFloat(p) / 2).toFixed(1))}
              className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300"
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => setWager((p) => (parseFloat(p) * 2).toFixed(1))}
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

        {/* Spin Wheel Action Button */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning || currentBalance < parsedWager}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Disc className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>
            {isSpinning
              ? 'LA ROULETTE GIRA...'
              : `GIRA LA ROULETTE (${parsedWager} GRAM)`}
          </span>
        </button>
      </div>
    </div>
  );
};
