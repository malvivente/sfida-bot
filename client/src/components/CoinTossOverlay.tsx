import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import { CoinTossData } from '../types/index.js';
import { useI18n } from '../i18n/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

interface CoinTossOverlayProps {
  coinToss: CoinTossData;
  playerAName: string;
  playerBName?: string;
  userSide?: 'A' | 'B';
  role?: 'player' | 'spectator';
  onComplete?: () => void;
}

export const CoinTossOverlay: React.FC<CoinTossOverlayProps> = ({
  coinToss,
  playerAName,
  playerBName = 'Player B',
  userSide = 'A',
  role = 'player',
  onComplete,
}) => {
  const { t } = useI18n();
  const { triggerImpact } = useHaptics();

  // Animation phases: 'toss' -> 'landed' -> 'fadeout'
  const [phase, setPhase] = useState<'toss' | 'landed' | 'fadeout'>('toss');
  const impactFiredRef = useRef<boolean>(false);

  const winningFace = coinToss.winningFace || (coinToss.starterSide === 'A' ? 'HEADS' : 'TAILS');
  const isHeadsWinner = winningFace === 'HEADS';
  const isUserWinner = role === 'player' && coinToss.starterSide === userSide;
  const starterName = coinToss.starterName || (coinToss.starterSide === 'A' ? playerAName : playerBName);

  // Rotation target: 1800 deg for HEADS (5 full spins), 1980 deg for TAILS (5.5 spins)
  const targetRotation = isHeadsWinner ? 1800 : 1980;

  useEffect(() => {
    // Initial light vibration at toss launch
    triggerImpact('medium');

    // Land after 2.3 seconds
    const landTimer = setTimeout(() => {
      if (!impactFiredRef.current) {
        impactFiredRef.current = true;
        triggerImpact('heavy');
      }
      setPhase('landed');
    }, 2300);

    // Fade out after 3.7 seconds
    const fadeTimer = setTimeout(() => {
      setPhase('fadeout');
    }, 3700);

    // Complete after 4.1 seconds
    const doneTimer = setTimeout(() => {
      onComplete?.();
    }, 4100);

    return () => {
      clearTimeout(landTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete, triggerImpact]);

  const handleSkip = () => {
    if (phase === 'toss') {
      // Fast forward to landed
      if (!impactFiredRef.current) {
        impactFiredRef.current = true;
        triggerImpact('heavy');
      }
      setPhase('landed');
    } else {
      // Instantly finish
      onComplete?.();
    }
  };

  return (
    <AnimatePresence>
      {phase !== 'fadeout' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35 }}
          onClick={handleSkip}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>

          {/* Top Title & Subtitle */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center z-10 mb-4"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-orbitron font-extrabold text-[11px] uppercase tracking-widest mb-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{t('coinToss.title')}</span>
            </div>
            <h2 className="text-sm sm:text-base font-chakra font-medium text-slate-300">
              {t('coinToss.subtitle')}
            </h2>
          </motion.div>

          {/* Player Assignment Cards (Who is Heads / Tails) */}
          <div className="w-full max-w-xs flex items-center justify-between gap-2.5 z-10 mb-6">
            {/* Player A (HEADS) */}
            <div
              className={`flex-1 p-2.5 rounded-2xl border flex flex-col items-center transition-all ${
                userSide === 'A' && role === 'player'
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                  : 'bg-slate-900/80 border-white/10'
              }`}
            >
              <div className="w-7 h-7 mb-1 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center overflow-hidden">
                <img src="/coin_heads.png" alt="Testa" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight truncate max-w-[100px]">
                {playerAName}
              </span>
              <span className="text-xs font-orbitron font-black text-amber-300 mt-0.5">
                {t('coinToss.heads')}
              </span>
              {userSide === 'A' && role === 'player' && (
                <span className="text-[9px] font-chakra font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 mt-1 uppercase">
                  {t('coinToss.youAre')}
                </span>
              )}
            </div>

            <div className="text-[10px] font-orbitron font-extrabold text-slate-500 uppercase px-1">
              VS
            </div>

            {/* Player B (TAILS) */}
            <div
              className={`flex-1 p-2.5 rounded-2xl border flex flex-col items-center transition-all ${
                userSide === 'B' && role === 'player'
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                  : 'bg-slate-900/80 border-white/10'
              }`}
            >
              <div className="w-7 h-7 mb-1 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center overflow-hidden">
                <img src="/coin_tails.png" alt="Croce" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight truncate max-w-[100px]">
                {playerBName}
              </span>
              <span className="text-xs font-orbitron font-black text-amber-300 mt-0.5">
                {t('coinToss.tails')}
              </span>
              {userSide === 'B' && role === 'player' && (
                <span className="text-[9px] font-chakra font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 mt-1 uppercase">
                  {t('coinToss.youAre')}
                </span>
              )}
            </div>
          </div>

          {/* 3D Coin Toss Area */}
          <div className="relative w-44 h-48 flex items-center justify-center [perspective:1200px] z-20 my-2">
            {/* Projected Floor Shadow */}
            <motion.div
              animate={
                phase === 'toss'
                  ? {
                      scale: [1, 0.45, 1],
                      opacity: [0.7, 0.2, 0.8],
                    }
                  : {
                      scale: 1,
                      opacity: 0.85,
                    }
              }
              transition={{
                duration: 2.3,
                times: [0, 0.5, 1],
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="absolute bottom-2 w-28 h-6 rounded-full bg-black/70 blur-md pointer-events-none"
            />

            {/* Flipping 3D Coin */}
            <motion.div
              animate={
                phase === 'toss'
                  ? {
                      y: [0, -170, 0],
                      scale: [0.95, 1.25, 1],
                      rotateY: [0, targetRotation],
                      rotateZ: [0, 8, -6, 0],
                    }
                  : {
                      y: [0, -15, 0],
                      rotateY: targetRotation,
                      scale: 1.05,
                    }
              }
              transition={
                phase === 'toss'
                  ? {
                      duration: 2.3,
                      times: [0, 0.5, 1],
                      ease: [0.2, 0.75, 0.2, 1],
                    }
                  : {
                      duration: 0.35,
                      ease: 'easeOut',
                    }
              }
              className="w-36 h-36 relative [transform-style:preserve-3d] cursor-pointer"
            >
              {/* HEADS FACE (0 deg) */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden] select-none pointer-events-none"
                style={{
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <img
                  src="/coin_heads.png"
                  alt="Testa"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(245,158,11,0.5)]"
                />
              </div>

              {/* TAILS FACE (180 deg) */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden] select-none pointer-events-none"
                style={{
                  transform: 'rotateY(180deg)',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <img
                  src="/coin_tails.png"
                  alt="Croce"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(245,158,11,0.5)]"
                />
              </div>
            </motion.div>
          </div>

          {/* Outcome Announcement */}
          <div className="min-h-[90px] flex flex-col items-center justify-center z-10 mt-3 text-center px-4 max-w-sm">
            {phase === 'landed' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, type: 'spring', stiffness: 350 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center space-x-2 text-amber-300 font-orbitron font-black text-lg sm:text-xl uppercase tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                  <span>{isHeadsWinner ? '🟡' : '⚔️'}</span>
                  <span>{isHeadsWinner ? t('coinToss.headsWon') : t('coinToss.tailsWon')}</span>
                </div>

                <div
                  className={`mt-2 px-4 py-2 rounded-2xl border text-center font-chakra font-bold text-xs sm:text-sm ${
                    isUserWinner
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/90 border-white/10 text-slate-200'
                  }`}
                >
                  {isUserWinner ? (
                    <div className="flex items-center justify-center space-x-1.5">
                      <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('coinToss.youStart')}</span>
                    </div>
                  ) : role === 'player' ? (
                    <span>{t('coinToss.opponentStarts', { name: starterName })}</span>
                  ) : (
                    <span>{t('coinToss.spectatorStarts', { name: starterName })}</span>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center space-x-2 text-xs font-chakra font-medium text-slate-400 animate-pulse">
                <span>In volo...</span>
              </div>
            )}
          </div>

          {/* Skip Hint */}
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-4 opacity-75">
            Tocca per continuare
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
