import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Handshake, CheckCircle2, RotateCcw, FastForward } from 'lucide-react';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';

interface TrustJackpotWheelProps {
  isWon: boolean;
  bonusPerPlayerGram?: number;
  wagerGram: string;
  onFinish?: () => void;
  autoSpin?: boolean;
}

export const TrustJackpotWheel: React.FC<TrustJackpotWheelProps> = ({
  isWon,
  bonusPerPlayerGram = 0,
  wagerGram,
  onFinish,
  autoSpin = true,
}) => {
  const { triggerImpact } = useHaptics();
  const [hasSpun, setHasSpun] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const tickIntervalRef = useRef<any>(null);

  // 10 sectors (36° each).
  // Winning sectors: 2, 5, 8 (30% total)
  // Safe sectors: 0, 1, 3, 4, 6, 7, 9 (70% total)
  const winningIndices = [2, 5, 8];
  const safeIndices = [0, 1, 3, 4, 6, 7, 9];

  const startSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false);

    // Pick target sector
    let targetSector: number;
    if (isWon) {
      targetSector = winningIndices[Math.floor(Math.random() * winningIndices.length)];
    } else {
      targetSector = safeIndices[Math.floor(Math.random() * safeIndices.length)];
    }

    // Formula to bring sector center to 12 o'clock (top pointer):
    // Center of sector k is at: -90 + k*36 + 18
    // Clockwise rotation to align with -90: 360 - (k*36 + 18)
    const baseAngle = 360 - (targetSector * 36 + 18);
    // Add 5 full turns (1800°) plus previous rotation accumulator
    const turns = 1800;
    const currentBase = Math.floor(rotation / 360) * 360;
    const nextRotation = currentBase + turns + baseAngle;

    setRotation(nextRotation);

    // Simulate haptic ticks during spin
    let tickCount = 0;
    const maxTicks = 20;
    tickIntervalRef.current = setInterval(() => {
      tickCount++;
      if (tickCount <= maxTicks) {
        triggerImpact('light');
      } else {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      }
    }, 140);

    // Spin duration 3.2s
    setTimeout(() => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setIsSpinning(false);
      setHasSpun(true);
      setShowResult(true);
      triggerImpact(isWon ? 'heavy' : 'medium');
      onFinish?.();
    }, 3200);
  };

  const skipSpin = () => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    setIsSpinning(false);
    setHasSpun(true);
    setShowResult(true);
    triggerImpact(isWon ? 'heavy' : 'medium');
    onFinish?.();
  };

  useEffect(() => {
    if (autoSpin && !hasSpun && !isSpinning) {
      const timer = setTimeout(() => {
        startSpin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoSpin]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  // Generate SVG pie sectors
  const radius = 110;
  const cx = 130;
  const cy = 130;

  const sectors = Array.from({ length: 10 }, (_, i) => {
    const isWinnerSector = winningIndices.includes(i);
    const startAngle = (-90 + i * 36) * (Math.PI / 180);
    const endAngle = (-90 + (i + 1) * 36) * (Math.PI / 180);
    const midAngle = (-90 + i * 36 + 18) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    // Text position
    const textRadius = radius * 0.72;
    const tx = cx + textRadius * Math.cos(midAngle);
    const ty = cy + textRadius * Math.sin(midAngle);
    const textRot = (midAngle * 180) / Math.PI + 90;

    const pathData = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    return {
      index: i,
      isWinnerSector,
      pathData,
      tx,
      ty,
      textRot,
    };
  });

  return (
    <div className="w-full flex flex-col items-center justify-center p-3 bg-cyber-bg/90 border border-purple-500/50 rounded-2xl shadow-[0_0_35px_rgba(168,85,247,0.2)] my-2 relative overflow-hidden backdrop-blur-md">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-purple-900/10 to-transparent pointer-events-none" />

      {/* Header Banner */}
      <div className="text-center mb-2 z-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span className="text-[10px] font-orbitron font-extrabold uppercase tracking-wider">
            Trust Jackpot Lucky Drop
          </span>
          <span className="text-[9px] font-mono font-bold bg-amber-400/30 px-1 rounded text-amber-200">
            30% DROP
          </span>
        </div>
        <p className="text-[11px] font-chakra text-slate-300 mt-1">
          {isSpinning
            ? 'La ruota sta girando... Buona fortuna!'
            : showResult
            ? (isWon ? '🎉 Drop 30% Assegnato!' : '🤝 Rimborso 100% Confermato')
            : 'Entrambi avete scelto SPLIT! Estrazione in corso...'}
        </p>
      </div>

      {/* Wheel Stage */}
      <div className="relative w-[260px] h-[260px] flex items-center justify-center z-10 my-1">
        {/* Top Pointer Arrow */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-400 animate-bounce" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-300 -mt-1 shadow-[0_0_8px_#f59e0b]" />
        </div>

        {/* Outer Bezel Rim */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] pointer-events-none" />

        {/* Rotating SVG Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            duration: isSpinning ? 3.2 : 0,
            ease: [0.15, 0.88, 0.28, 1], // Realistic deceleration curve
          }}
          className="w-full h-full"
        >
          <svg viewBox="0 0 260 260" className="w-full h-full select-none">
            <defs>
              <radialGradient id="goldJackpotGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
              <linearGradient id="safeRefundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>

            {/* Slices */}
            {sectors.map((s) => (
              <g key={s.index}>
                <path
                  d={s.pathData}
                  fill={s.isWinnerSector ? 'url(#goldJackpotGrad)' : 'url(#safeRefundGrad)'}
                  stroke={s.isWinnerSector ? '#fde047' : '#334155'}
                  strokeWidth="1.5"
                  className="transition-colors"
                />
                {/* Sector Text & Icon */}
                <g transform={`translate(${s.tx}, ${s.ty}) rotate(${s.textRot})`}>
                  {s.isWinnerSector ? (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[8px] font-orbitron font-extrabold fill-slate-950 font-black tracking-tight"
                    >
                      🏆 +25%
                    </text>
                  ) : (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[7.5px] font-chakra font-bold fill-slate-400 tracking-tight"
                    >
                      100% REF
                    </text>
                  )}
                </g>
              </g>
            ))}

            {/* Outer LED Dots */}
            {Array.from({ length: 20 }, (_, i) => {
              const dotAngle = (i * 18 * Math.PI) / 180;
              const dx = cx + (radius + 1.5) * Math.cos(dotAngle);
              const dy = cy + (radius + 1.5) * Math.sin(dotAngle);
              return (
                <circle
                  key={i}
                  cx={dx}
                  cy={dy}
                  r="2"
                  fill={i % 2 === 0 ? '#f59e0b' : '#00f0ff'}
                  className="opacity-90"
                />
              );
            })}

            {/* Center Hub */}
            <circle cx={cx} cy={cy} r="28" fill="#090d16" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="20" fill="#1e1b4b" stroke="#00f0ff" strokeWidth="1" />
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-orbitron font-black fill-amber-300 tracking-wider select-none"
            >
              TRUST
            </text>
          </svg>
        </motion.div>
      </div>

      {/* Action / Result Feedback Card */}
      <AnimatePresence mode="wait">
        {showResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full max-w-sm rounded-xl p-3 text-center border mt-2 shadow-lg transition-all ${
              isWon
                ? 'bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-cyber-bg/90 border-cyber-green/50 text-slate-200'
            }`}
          >
            {isWon ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1.5 text-amber-300 font-orbitron font-black text-sm">
                  <Trophy className="w-4 h-4 text-amber-300 animate-bounce" />
                  <span>JACKPOT DROP VINTO!</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-xs font-chakra text-slate-200">
                  Entrambi ricevete il rimborso del 100% della puntata ({wagerGram} GRAM) + Bonus del 25%:
                </p>
                <div className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-400/20 border border-amber-400/60 rounded-lg text-amber-300 font-orbitron font-extrabold text-sm mt-1">
                  <span>+{bonusPerPlayerGram.toFixed(2)}</span>
                  <GramIcon className="w-3.5 h-3.5 text-amber-300" />
                  <span>A TESTA</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1.5 text-cyber-green font-orbitron font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                  <span>PUNTATA RIMBORSATA AL 100%</span>
                </div>
                <p className="text-[11px] font-chakra text-slate-300">
                  Lucky Drop 30% non estratto questa volta. Capitale interamente preservato (+{wagerGram} GRAM).
                </p>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-cyber-border/40 flex justify-center">
              <button
                type="button"
                onClick={startSpin}
                disabled={isSpinning}
                className="px-3 py-1 bg-cyber-bg border border-cyber-border hover:border-amber-400/50 rounded-lg text-[10px] font-chakra text-slate-400 hover:text-white transition-all flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rivedi estrazione</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center space-x-2 mt-2">
            {isSpinning && (
              <button
                type="button"
                onClick={skipSpin}
                className="px-3 py-1 rounded-lg bg-black/50 border border-cyber-border/70 hover:border-amber-400/50 text-slate-400 hover:text-white text-[10px] font-chakra flex items-center space-x-1 transition-all"
              >
                <FastForward className="w-3 h-3 text-amber-300" />
                <span>Salta animazione</span>
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
