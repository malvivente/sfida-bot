import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, CheckCircle2, FastForward } from 'lucide-react';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useLanguage } from '../../i18n/index.js';

interface TrustJackpotWheelProps {
  isWon: boolean;
  bonusPerPlayerGram?: number;
  wagerGram: string;
  onFinish?: () => void;
  autoSpin?: boolean;
  mode?: 'peace' | 'steal';
  probabilityPercent?: number;
  bonusPercent?: number;
}

export const TrustJackpotWheel: React.FC<TrustJackpotWheelProps> = ({
  isWon,
  bonusPerPlayerGram = 0,
  wagerGram,
  onFinish,
  autoSpin = true,
  mode = 'peace',
  probabilityPercent = 30,
  bonusPercent = 20,
}) => {
  const { t } = useLanguage();
  const { triggerImpact } = useHaptics();
  const [hasSpun, setHasSpun] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [showResult, setShowResult] = useState<boolean>(false);
  const tickIntervalRef = useRef<any>(null);

  // 10 sectors (36° each).
  // Distribute winning sectors evenly around the 10 sectors according to probabilityPercent
  const numWinners = Math.max(1, Math.min(9, Math.round((probabilityPercent ?? 30) / 10)));
  const winningIndices = useMemo(() => {
    const step = 10 / numWinners;
    const indices: number[] = [];
    for (let i = 0; i < numWinners; i++) {
      const idx = Math.floor(i * step) % 10;
      if (!indices.includes(idx)) indices.push(idx);
    }
    for (let i = 0; i < 10 && indices.length < numWinners; i++) {
      if (!indices.includes(i)) indices.push(i);
    }
    return indices.sort((a, b) => a - b);
  }, [numWinners]);

  const safeIndices = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => i).filter((i) => !winningIndices.includes(i));
  }, [winningIndices]);

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

  // Generate SVG pie sectors (Compact 220x220 layout)
  const radius = 92;
  const cx = 110;
  const cy = 110;

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
    <div className="w-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-[#181528] to-[#0f111a] border border-amber-500/30 rounded-2xl shadow-xl my-1 relative overflow-hidden backdrop-blur-md">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-purple-900/10 to-transparent pointer-events-none" />

      {/* Header Banner */}
      <div className="text-center mb-2 z-10">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
          <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
          <span className="text-[10px] font-heading font-extrabold uppercase tracking-wider">
            {mode === 'steal' ? t('wheel.stealDropTitle') : t('wheel.peaceDropTitle')}
          </span>
          <span className="text-[9px] font-heading font-black bg-amber-400/30 px-1.5 py-0.5 rounded-full text-amber-200">
            {`DROP ${probabilityPercent}%`}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
          {isSpinning
            ? (mode === 'steal' ? t('wheel.spinningSteal') : t('wheel.spinningPeace'))
            : showResult
            ? (isWon
                ? (mode === 'steal' ? t('wheel.wonSteal') : t('wheel.wonPeace'))
                : (mode === 'steal' ? t('wheel.refundSteal') : t('wheel.refundPeace')))
            : (mode === 'steal'
                ? t('wheel.standbySteal')
                : t('wheel.standbyPeace'))}
        </p>
      </div>

      {/* Wheel Stage (Compact 220px) */}
      <div className="relative w-[220px] h-[220px] flex items-center justify-center z-10 my-0.5">
        {/* Top Pointer Arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-400 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-amber-300 -mt-1 shadow-[0_0_6px_#f59e0b]" />
        </div>

        {/* Outer Bezel Rim */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] pointer-events-none" />

        {/* Rotating SVG Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            duration: isSpinning ? 3.2 : 0,
            ease: [0.15, 0.88, 0.28, 1], // Realistic deceleration curve
          }}
          className="w-full h-full"
        >
          <svg viewBox="0 0 220 220" className="w-full h-full select-none">
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
                  strokeWidth="1.2"
                  className="transition-colors"
                />
                {/* Sector Text & Icon */}
                <g transform={`translate(${s.tx}, ${s.ty}) rotate(${s.textRot})`}>
                  {s.isWinnerSector ? (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[7.5px] font-heading font-black fill-slate-950 tracking-tight"
                    >
                      {mode === 'steal' ? `🗡️ +${bonusPercent}%` : `🏆 +${((bonusPercent) / 2).toFixed(1)}%`}
                    </text>
                  ) : (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[7px] font-sans font-bold fill-slate-400 tracking-tight"
                    >
                      {mode === 'steal' ? 'POT 2X' : '100% REF'}
                    </text>
                  )}
                </g>
              </g>
            ))}

            {/* Outer LED Dots */}
            {Array.from({ length: 20 }, (_, i) => {
              const dotAngle = (i * 18 * Math.PI) / 180;
              const dx = cx + (radius + 1.2) * Math.cos(dotAngle);
              const dy = cy + (radius + 1.2) * Math.sin(dotAngle);
              return (
                <circle
                  key={i}
                  cx={dx}
                  cy={dy}
                  r="1.8"
                  fill={i % 2 === 0 ? '#f59e0b' : '#a855f7'}
                  className="opacity-90"
                />
              );
            })}

            {/* Center Hub */}
            <circle cx={cx} cy={cy} r="24" fill="#090d16" stroke="#f59e0b" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="17" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1" />
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] font-heading font-black fill-amber-300 tracking-wider select-none"
            >
              {mode === 'steal' ? 'BOUNTY' : 'TRUST'}
            </text>
          </svg>
        </motion.div>
      </div>

      {/* Action / Result Feedback Card */}
      <AnimatePresence mode="wait">
        {showResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full max-w-sm rounded-xl p-3 text-center border mt-1.5 shadow-lg transition-all ${
              isWon
                ? 'bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-amber-500/20 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-[#151926]/95 border-emerald-500/40 text-slate-200'
            }`}
          >
            {isWon ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1.5 text-amber-300 font-heading font-extrabold text-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  <span>{mode === 'steal' ? t('wheel.wonStealBanner') : t('wheel.wonPeaceBanner')}</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <p className="text-[11px] text-slate-200 font-medium">
                  {mode === 'steal'
                    ? t('wheel.wonStealDesc', { pot: (parseFloat(wagerGram) * 2).toFixed(2) })
                    : t('wheel.wonPeaceDesc', { wager: wagerGram })}
                </p>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/60 rounded-lg text-amber-300 font-heading font-black text-xs mt-0.5">
                  <span>+{bonusPerPlayerGram.toFixed(2)}</span>
                  <GramIcon className="w-3 h-3 text-amber-300" />
                  <span>{mode === 'steal' ? t('wheel.extraBonus') : t('wheel.each')}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex items-center justify-center space-x-1.5 text-emerald-400 font-heading font-extrabold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{mode === 'steal' ? t('wheel.potWonBanner') : t('wheel.refundBanner')}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {mode === 'steal'
                    ? t('wheel.potCollected', { pot: (parseFloat(wagerGram) * 2).toFixed(2) })
                    : t('wheel.refundPreserved', { wager: wagerGram })}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center space-x-2 mt-1">
            {isSpinning && (
              <button
                type="button"
                onClick={skipSpin}
                className="px-3 py-1 rounded-lg bg-white/5 border border-white/15 hover:border-amber-400/50 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center space-x-1 transition-all active:scale-95"
              >
                <FastForward className="w-3 h-3 text-amber-300" />
                <span>{t('wheel.skipAnimation')}</span>
              </button>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
