import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Clock,
  RotateCcw,
  Loader2,
  Trophy,
  Swords,
  Delete,
  CornerDownLeft,
  ArrowDownLeft,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CubeCountState } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';

interface CubeCountArenaProps {
  gameData?: CubeCountState | null;
  role: 'player' | 'spectator';
  isPlayerTurn?: boolean;
  onSubmit: (count: number) => void;
  playerAName: string;
  playerBName?: string;
  playerAReady?: boolean;
  playerBReady?: boolean;
  isReady?: boolean;
  onReady?: () => void;
  countdownSeconds?: number | null;
  roomState: string;
  wagerTon?: string;
  isCreator?: boolean;
  onCancelMatch?: () => void;
  isWinner?: boolean;
  onClaimPayout?: () => void;
  isClaimingPayout?: boolean;
  payoutClaimed?: boolean;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B' | null;
  userAddress?: string | null;
  userBalanceGram?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  socketError?: string | null;
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
}

const GRID_SIZE = 5;

// Isometric projection helper
// Screen X & Y from grid (x, y) and height z
function projectIso(x: number, y: number, z: number, originX: number, originY: number, tileW: number, tileH: number, cubeH: number) {
  const screenX = originX + (x - y) * (tileW / 2);
  const screenY = originY + (x + y) * (tileH / 2) - z * cubeH;
  return { x: screenX, y: screenY };
}

export const CubeCountArena: React.FC<CubeCountArenaProps> = ({
  gameData,
  role,
  onSubmit,
  playerAName,
  playerBName = 'Opponent',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
  onReady,
  countdownSeconds,
  roomState,
  wagerTon,
  isCreator = false,
  isWinner,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userSide = 'A',
  userBalanceGram,
  onOpenDeposit,
  socketError,
  hasPlayerB = true,
  onJoinAsPlayer,
  onInviteChallenger,
}) => {
  const { t } = useI18n();
  const { triggerImpact, triggerNotification } = useHaptics();

  const currentRound = gameData?.currentRound ?? 1;
  const phase = gameData?.phase ?? 'COUNTDOWN';
  const hpA = gameData?.hpA ?? 3;
  const hpB = gameData?.hpB ?? 3;
  const maxHp = gameData?.maxHp ?? 3;
  const isSuddenDeath = gameData?.isSuddenDeath ?? false;
  const grid = gameData?.grid ?? Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
  const exactCount = gameData?.exactCount;
  const flashDurationMs = gameData?.flashDurationMs ?? 3000;
  const phaseEndEpochMs = gameData?.phaseEndEpochMs ?? 0;
  const hasAnsweredA = gameData?.hasAnsweredA ?? false;
  const hasAnsweredB = gameData?.hasAnsweredB ?? false;
  const answerA = gameData?.answerA;
  const answerB = gameData?.answerB;
  const roundDamageA = gameData?.roundDamageA;
  const roundDamageB = gameData?.roundDamageB;

  // Virtual numpad input state
  const [typedInput, setTypedInput] = useState<string>('');
  const [submittedThisRound, setSubmittedThisRound] = useState<boolean>(false);
  const [submittedValue, setSubmittedValue] = useState<number | null>(null);

  // Reset local input when round or phase changes
  const prevRoundRef = useRef<number>(currentRound);
  useEffect(() => {
    if (prevRoundRef.current !== currentRound) {
      prevRoundRef.current = currentRound;
      setTypedInput('');
      setSubmittedThisRound(false);
      setSubmittedValue(null);
    }
  }, [currentRound]);

  useEffect(() => {
    if (phase === 'COUNTDOWN' || phase === 'FLASH') {
      setTypedInput('');
      setSubmittedThisRound(false);
      setSubmittedValue(null);
    }
  }, [phase]);

  // Phase Countdown timer calculation
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(0);
  useEffect(() => {
    if (!phaseEndEpochMs) return;
    const update = () => {
      const remaining = Math.max(0, phaseEndEpochMs - Date.now());
      setTimeRemainingMs(remaining);
    };
    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [phaseEndEpochMs]);

  // Handle virtual numpad input
  const handleDigit = (digit: string) => {
    if (submittedThisRound || phase !== 'INPUT' || role !== 'player') return;
    if (typedInput.length >= 3) return; // Cap at 3 digits (e.g. 999 max)
    triggerImpact?.('light');
    setTypedInput((prev) => (prev === '0' ? digit : prev + digit));
  };

  const handleDelete = () => {
    if (submittedThisRound || phase !== 'INPUT' || role !== 'player') return;
    triggerImpact?.('medium');
    setTypedInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (submittedThisRound || phase !== 'INPUT' || role !== 'player') return;
    triggerImpact?.('medium');
    setTypedInput('');
  };

  const handleSubmit = () => {
    if (submittedThisRound || phase !== 'INPUT' || role !== 'player') return;
    const count = parseInt(typedInput, 10);
    if (isNaN(count) || count < 0) return;

    triggerNotification?.('success');
    setSubmittedThisRound(true);
    setSubmittedValue(count);
    onSubmit(count);
  };

  // 2-Phase Outcome Popup state
  const [outcomePhase, setOutcomePhase] = useState<'splash' | 'settled' | 'none'>('none');
  useEffect(() => {
    if (roomState === 'MATCH_SETTLED' || roomState === 'FORFEITED') {
      setOutcomePhase('splash');
      const timer = setTimeout(() => {
        setOutcomePhase('settled');
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setOutcomePhase('none');
    }
  }, [roomState]);

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  // Flatten and sort cubes for painter's algorithm
  // Order: ascending (x + y), then ascending z
  const sortedCubes = useMemo(() => {
    const list: { x: number; y: number; z: number }[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const height = grid[x]?.[y] ?? 0;
        for (let z = 0; z < height; z++) {
          list.push({ x, y, z });
        }
      }
    }
    // Sort so back cubes render first, front cubes render on top
    list.sort((a, b) => {
      const sumA = a.x + a.y;
      const sumB = b.x + b.y;
      if (sumA !== sumB) return sumA - sumB;
      return a.z - b.z;
    });
    return list;
  }, [grid]);

  // Isometric Grid dimension parameters
  const svgWidth = 320;
  const svgHeight = 250;
  const originX = 160;
  const originY = 110;
  const tileW = 42;
  const tileH = 21;
  const cubeH = 22;

  // Render ground tile wireframe
  const renderGroundGrid = () => {
    const tiles: React.ReactNode[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const pTop = projectIso(x, y, 0, originX, originY, tileW, tileH, cubeH);
        const pRight = projectIso(x + 1, y, 0, originX, originY, tileW, tileH, cubeH);
        const pBottom = projectIso(x + 1, y + 1, 0, originX, originY, tileW, tileH, cubeH);
        const pLeft = projectIso(x, y + 1, 0, originX, originY, tileW, tileH, cubeH);

        const d = `M ${pTop.x} ${pTop.y} L ${pRight.x} ${pRight.y} L ${pBottom.x} ${pBottom.y} L ${pLeft.x} ${pLeft.y} Z`;
        tiles.push(
          <path
            key={`ground-${x}-${y}`}
            d={d}
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="0.8"
            className="transition-colors duration-200"
          />
        );
      }
    }
    return tiles;
  };

  // Render an individual 3D cube with top, left, right faces
  const renderCube = (c: { x: number; y: number; z: number }, index: number) => {
    const { x, y, z } = c;
    const pCenter = projectIso(x, y, z, originX, originY, tileW, tileH, cubeH);

    // Top face vertices
    const tTop = { x: pCenter.x, y: pCenter.y - cubeH - tileH / 2 };
    const tRight = { x: pCenter.x + tileW / 2, y: pCenter.y - cubeH };
    const tBottom = { x: pCenter.x, y: pCenter.y - cubeH + tileH / 2 };
    const tLeft = { x: pCenter.x - tileW / 2, y: pCenter.y - cubeH };
    const topPath = `M ${tTop.x} ${tTop.y} L ${tRight.x} ${tRight.y} L ${tBottom.x} ${tBottom.y} L ${tLeft.x} ${tLeft.y} Z`;

    // Left face vertices
    const lTop = tLeft;
    const lRight = tBottom;
    const lBottom = { x: pCenter.x, y: pCenter.y + tileH / 2 };
    const lLeft = { x: pCenter.x - tileW / 2, y: pCenter.y };
    const leftPath = `M ${lTop.x} ${lTop.y} L ${lRight.x} ${lRight.y} L ${lBottom.x} ${lBottom.y} L ${lLeft.x} ${lLeft.y} Z`;

    // Right face vertices
    const rTop = tBottom;
    const rRight = tRight;
    const rBottom = { x: pCenter.x + tileW / 2, y: pCenter.y };
    const rLeft = { x: pCenter.x, y: pCenter.y + tileH / 2 };
    const rightPath = `M ${rTop.x} ${rTop.y} L ${rRight.x} ${rRight.y} L ${rBottom.x} ${rBottom.y} L ${rLeft.x} ${rLeft.y} Z`;

    return (
      <g key={`cube-${x}-${y}-${z}-${index}`} className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
        {/* Left Face (Medium shade) */}
        <path
          d={leftPath}
          fill="url(#cubeLeftGrad)"
          stroke="#f59e0b"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
        {/* Right Face (Darkest shade) */}
        <path
          d={rightPath}
          fill="url(#cubeRightGrad)"
          stroke="#d97706"
          strokeOpacity="0.4"
          strokeWidth="0.8"
        />
        {/* Top Face (Highlight, lightest) */}
        <path
          d={topPath}
          fill="url(#cubeTopGrad)"
          stroke="#fbbf24"
          strokeOpacity="0.8"
          strokeWidth="1"
        />
      </g>
    );
  };

  const renderLives = (lives: number, max: number, side: 'A' | 'B') => {
    const isPlayerA = side === 'A';
    return (
      <div className={`flex items-center space-x-1.5 ${isPlayerA ? '' : 'justify-end'}`}>
        {Array.from({ length: max }).map((_, idx) => {
          const isAlive = idx < lives;
          return (
            <motion.div
              key={idx}
              initial={{ scale: 1 }}
              animate={isAlive ? { scale: 1 } : { scale: 0.85, opacity: 0.3 }}
              transition={{ duration: 0.2 }}
            >
              <Heart
                className={`w-4 h-4 transition-all ${
                  isAlive
                    ? isPlayerA
                      ? 'text-cyan-400 fill-cyan-400 filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                      : 'text-pink-400 fill-pink-400 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                    : 'text-slate-700 fill-slate-900/60'
                }`}
              />
            </motion.div>
          );
        })}
      </div>
    );
  };

  const isCubesVisible = phase === 'FLASH' || phase === 'REVEAL';

  return (
    <div className="w-full flex flex-col items-center justify-between p-3 sm:p-4 bg-[#0a0d18] border border-amber-500/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.18)] relative overflow-hidden min-h-[580px]">
      {/* Background Cyber Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />

      {/* Top Header: Duelists & Lives */}
      <div className="w-full z-10 grid grid-cols-2 gap-2.5 pb-2.5 border-b border-white/10">
        {/* Player A (Cyan) */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            userSide === 'A' && role === 'player'
              ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
              : 'bg-black/40 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-chakra font-black text-cyan-300 truncate">{playerAName}</span>
            {userSide === 'A' && role === 'player' && (
              <span className="text-[8px] bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">
                {t('arena.you')}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            {renderLives(hpA, maxHp, 'A')}
            <span className="text-[10px] font-mono font-bold text-cyan-400">{hpA}/{maxHp} HP</span>
          </div>
          <span className="text-[9px] font-mono mt-1">
            {roomState === 'GAME_ACTIVE' ? (
              phase === 'INPUT' ? (
                hasAnsweredA ? (
                  <span className="text-emerald-400 font-bold">✓ INVIATO</span>
                ) : (
                  <span className="text-amber-400 animate-pulse font-bold">DIGITANDO...</span>
                )
              ) : phase === 'REVEAL' ? (
                answerA !== undefined ? (
                  <span className={answerA === exactCount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    RISPOSTA: {answerA}
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">TEMPO SCADUTO</span>
                )
              ) : (
                <span className="text-slate-400">PRONTO</span>
              )
            ) : playerAReady ? (
              <span className="text-emerald-400 font-bold">{t('arena.readyBadge')}</span>
            ) : (
              <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>

        {/* Player B (Pink) */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            userSide === 'B' && role === 'player'
              ? 'bg-rose-950/40 border-pink-400/80 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
              : 'bg-black/40 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-chakra font-black text-pink-300 truncate">{playerBName}</span>
            {userSide === 'B' && role === 'player' && (
              <span className="text-[8px] bg-pink-500/20 border border-pink-400/50 text-pink-300 px-1 py-0.2 rounded font-mono font-bold">
                {t('arena.you')}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-pink-400">{hpB}/{maxHp} HP</span>
            {renderLives(hpB, maxHp, 'B')}
          </div>
          <span className="text-[9px] font-mono mt-1 text-right">
            {roomState === 'GAME_ACTIVE' ? (
              phase === 'INPUT' ? (
                hasAnsweredB ? (
                  <span className="text-emerald-400 font-bold">✓ INVIATO</span>
                ) : (
                  <span className="text-amber-400 animate-pulse font-bold">DIGITANDO...</span>
                )
              ) : phase === 'REVEAL' ? (
                answerB !== undefined ? (
                  <span className={answerB === exactCount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    RISPOSTA: {answerB}
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">TEMPO SCADUTO</span>
                )
              ) : (
                <span className="text-slate-400">PRONTO</span>
              )
            ) : playerBReady ? (
              <span className="text-emerald-400 font-bold">{t('arena.readyBadge')}</span>
            ) : (
              <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Stage: Isometric Grid or Lobby Banner */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10 relative">
        {/* Lobby State */}
        {roomState === 'LOBBY' && (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/60 border border-amber-500/30 text-center space-y-2 max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mb-1">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <h4 className="text-sm font-orbitron font-black text-white uppercase tracking-wider">
              {t('cubecount.title')}
            </h4>
            <p className="text-xs text-slate-300 font-chakra leading-relaxed">
              {t('cubecount.subtitle')}
            </p>
          </div>
        )}

        {/* Betting Window State */}
        {roomState === 'BETTING_WINDOW' && (
          <div className="flex flex-col items-center space-y-1 py-4">
            <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider animate-pulse flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('arena.bettingWindowTitle')}</span>
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
            </span>
            <span className="text-[10px] font-rajdhani text-slate-400">
              {t('arena.bettingWindowActiveDesc')}
            </span>
          </div>
        )}

        {/* Active Combat Gameplay */}
        {roomState === 'GAME_ACTIVE' && (
          <div className="w-full flex flex-col items-center space-y-2">
            {/* Status / Phase Banner */}
            <div className="flex flex-col items-center text-center">
              {isSuddenDeath && (
                <div className="px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500 text-rose-300 font-orbitron font-black text-[10px] uppercase tracking-wider animate-pulse mb-1">
                  {t('cubecount.suddenDeath')}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-chakra font-black uppercase text-amber-400 tracking-wider">
                  ROUND {currentRound}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-orbitron font-bold text-white uppercase">
                  {phase === 'COUNTDOWN'
                    ? t('cubecount.phaseCountdown')
                    : phase === 'FLASH'
                    ? `${t('cubecount.phaseFlash')} (${(timeRemainingMs / 1000).toFixed(1)}s)`
                    : phase === 'INPUT'
                    ? t('cubecount.phaseInput')
                    : t('cubecount.phaseReveal')}
                </span>
              </div>
            </div>

            {/* 3D Isometric SVG Container */}
            <div className="relative w-full max-w-[320px] h-[220px] flex items-center justify-center rounded-2xl bg-black/50 border border-white/10 overflow-hidden shadow-inner">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full select-none pointer-events-none">
                <defs>
                  {/* Cube Gradient Shading */}
                  <linearGradient id="cubeTopGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="60%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="cubeLeftGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                  <linearGradient id="cubeRightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#92400e" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                </defs>

                {/* Ground Plate Grid */}
                {renderGroundGrid()}

                {/* Rendered 3D Cubes (Visible during FLASH and REVEAL) */}
                {isCubesVisible && sortedCubes.map((c, idx) => renderCube(c, idx))}
              </svg>

              {/* Reveal Overlay on top of grid */}
              {phase === 'REVEAL' && exactCount !== undefined && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center"
                >
                  <span className="text-[10px] font-chakra font-black uppercase text-amber-400 tracking-widest">
                    {t('cubecount.exactCount')}
                  </span>
                  <span className="text-4xl font-orbitron font-black text-white filter drop-shadow-[0_0_12px_rgba(245,158,11,0.8)] mt-0.5">
                    {exactCount}
                  </span>
                  <div className="flex items-center space-x-3 mt-2 text-xs font-chakra">
                    <span className={answerA === exactCount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playerAName}: {answerA ?? 'No'} {answerA === exactCount ? '(✓)' : '(-1 HP)'}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className={answerB === exactCount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playerBName}: {answerB ?? 'No'} {answerB === exactCount ? '(✓)' : '(-1 HP)'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Flash Bar Animation Indicator */}
              {phase === 'FLASH' && (
                <div className="absolute top-2 left-3 right-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: flashDurationMs / 1000, ease: 'linear' }}
                  />
                </div>
              )}
            </div>

            {/* Input Phase: Integrated Virtual On-Screen Numpad */}
            {phase === 'INPUT' && (
              <div className="w-full flex flex-col items-center space-y-2 mt-1">
                {/* Answer Display Row */}
                <div className="w-full flex items-center justify-between p-2 rounded-xl bg-black/60 border border-amber-500/40">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="text-xs font-chakra text-slate-300">
                      {role === 'player'
                        ? submittedThisRound
                          ? t('cubecount.answerSubmitted', { count: submittedValue ?? 0 })
                          : t('cubecount.enterCountPrompt')
                        : t('cubecount.spectatorNotice')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-mono font-black text-amber-400 tracking-wider">
                      {role === 'player' ? (submittedThisRound ? submittedValue : typedInput || '0') : '--'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">cubi</span>
                  </div>
                </div>

                {/* Virtual Numpad (Shown to Players) */}
                {role === 'player' && !submittedThisRound && (
                  <div className="w-full grid grid-cols-3 gap-1.5 max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleDigit(String(num))}
                        className="py-2.5 rounded-xl bg-black/50 border border-white/15 hover:border-amber-400 text-base font-orbitron font-black text-white hover:text-amber-400 active:scale-95 transition-all shadow-md"
                      >
                        {num}
                      </button>
                    ))}
                    {/* Delete / Clear button */}
                    <button
                      onClick={handleDelete}
                      className="py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 text-xs font-orbitron font-bold text-rose-300 active:scale-95 transition-all flex items-center justify-center space-x-1"
                    >
                      <Delete className="w-4 h-4" />
                      <span>{t('cubecount.delBtn')}</span>
                    </button>

                    {/* 0 */}
                    <button
                      onClick={() => handleDigit('0')}
                      className="py-2.5 rounded-xl bg-black/50 border border-white/15 hover:border-amber-400 text-base font-orbitron font-black text-white hover:text-amber-400 active:scale-95 transition-all shadow-md"
                    >
                      0
                    </button>

                    {/* Submit / INVIO */}
                    <button
                      onClick={handleSubmit}
                      disabled={typedInput.length === 0}
                      className={`py-2.5 rounded-xl font-orbitron font-black text-xs uppercase flex items-center justify-center space-x-1 transition-all ${
                        typedInput.length > 0
                          ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 hover:brightness-110'
                          : 'bg-black/40 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <CornerDownLeft className="w-4 h-4" />
                      <span>{t('cubecount.submitBtn')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2-Phase Settlement Popups */}
        {outcomePhase === 'splash' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
              className={`flex flex-col items-center p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
                isWinner
                  ? 'bg-gradient-to-b from-amber-950/40 via-black/95 to-black border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.4)]'
                  : role === 'player'
                  ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                  : 'bg-gradient-to-b from-amber-950/40 via-black/95 to-black border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.3)]'
              }`}
            >
              {isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3 filter drop-shadow-[0_0_15px_#f59e0b]" />
                  <h2 className="text-2xl font-orbitron font-black text-amber-300 tracking-wider uppercase animate-pulse">
                    {t('cubecount.victoryTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    {t('cubecount.victoryDesc')}
                  </p>
                </>
              ) : role === 'player' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 animate-pulse">
                    <Heart className="w-9 h-9 text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                    {t('cubecount.defeatTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-300 mt-2">
                    {t('cubecount.defeatDesc')}
                  </p>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-amber-400 mb-3 animate-pulse" />
                  <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
                    ⚔️ DUELLO CONCLUSO
                  </h2>
                </>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Settled Concluded Modal */}
        {outcomePhase === 'settled' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex flex-col items-center p-5 bg-[#0f121d] border rounded-3xl shadow-2xl max-w-xs w-full text-center mx-auto ${
                isWinner ? 'border-amber-400' : 'border-white/15'
              }`}
            >
              {isWinner ? (
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2">
                  <Heart className="w-6 h-6 text-rose-500" />
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isWinner ? t('cubecount.victoryTitle') : role === 'player' ? t('cubecount.defeatTitle') : '⚔️ DUELLO CONCLUSO'}
              </h2>

              {/* Winner Prize row shown ONLY to the winner! */}
              {isWinner && (
                <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-amber-400/50 w-full flex justify-between items-center text-xs font-chakra">
                  <span className="text-slate-300">{t('arena.winnerPrize')}:</span>
                  <span className="font-bold text-amber-400 flex items-center space-x-1">
                    <span>+{winnerPayoutTon}</span>
                    <GramIcon className="w-3.5 h-3.5 text-amber-400 inline" />
                  </span>
                </div>
              )}

              {/* Rematch Offer Received */}
              {rematchOffer && isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-pink-950/30 border border-pink-500/60 flex flex-col space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                      <span>{t('arena.rematchOfferSent')}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300">{rematchOffer.newWagerTon} GRAM</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-chakra">
                    {t('arena.waitingForOpponentRematch')}
                  </span>
                  {onDeclineRematch && (
                    <button
                      onClick={onDeclineRematch}
                      className="w-full py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-300 hover:text-white font-chakra"
                    >
                      {t('arena.decline')}
                    </button>
                  )}
                </div>
              )}

              {rematchOffer && !isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-pink-950/40 border border-pink-500 flex flex-col space-y-2 mb-2 animate-pulse">
                  <span className="text-xs font-orbitron font-bold text-white">🔥 {t('arena.rematch2x')}</span>
                  <span className="text-[11px] text-slate-200 font-chakra">
                    {t('arena.rematchChallengeReceived', { name: rematchOffer.proposerName, amount: rematchOffer.newWagerTon })}
                  </span>
                  {!hasEnoughForRematch ? (
                    <div className="flex flex-col space-y-1.5 pt-1">
                      <div className="p-2 rounded-lg bg-black/70 border border-pink-500/50 text-[10px] text-pink-300 font-chakra flex items-center justify-between">
                        <span>Saldo: {currentBal.toFixed(2)} GRAM</span>
                        <span className="font-bold">Mancano: {missingForRematch} GRAM</span>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">{t('arena.decline')}</button>
                        <button
                          onClick={() => onOpenDeposit?.(missingForRematch)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold font-orbitron flex items-center justify-center space-x-1 shadow-[0_0_12px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>{t('arena.depositForRematch', { amount: missingForRematch })}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-2 pt-1">
                      <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">{t('arena.decline')}</button>
                      <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold font-orbitron shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:brightness-110 active:scale-95">{t('arena.accept2x')}</button>
                    </div>
                  )}
                  {socketError && (
                    <div className="p-1.5 rounded-lg bg-pink-950/40 border border-pink-500/60 text-[10px] text-pink-300 font-chakra text-center">
                      {socketError}
                    </div>
                  )}
                </div>
              )}

              {/* Rematch Button */}
              {!rematchOffer && onRequestRematch && role === 'player' && (
                !opponentConnected ? (
                  <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                    {t('arena.opponentLeft')}
                  </div>
                ) : (
                  <button
                    onClick={onRequestRematch}
                    className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('arena.rematch2x')}</span>
                  </button>
                )
              )}

              {isWinner && (
                <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/60 flex items-center justify-center space-x-1.5 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="text-xs font-orbitron font-bold text-emerald-400">
                    ✅ {t('arena.prizeAutoCredited', { amount: winnerPayoutTon })}
                  </span>
                </div>
              )}

              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="w-full py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-chakra font-bold hover:text-white"
                >
                  {t('arena.backToLobby')}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Controls: Lobby Ready Up or Spectator Join */}
      <div className="w-full z-10 pt-3 border-t border-white/10 flex flex-col items-center">
        {roomState === 'LOBBY' ? (
          role === 'player' ? (
            <div className="w-full flex flex-col space-y-2">
              {isCreator && !hasPlayerB && onInviteChallenger && (
                <button
                  onClick={onInviteChallenger}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-orbitron font-extrabold rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-amber-300" />
                  <span>{t('arena.inviteChallengerBtn')}</span>
                </button>
              )}
              <button
                onClick={onReady}
                disabled={isReady || !hasPlayerB}
                className={`w-full py-3.5 rounded-2xl font-orbitron font-extrabold tracking-wider text-xs sm:text-sm uppercase transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isReady
                    ? 'bg-black/60 border border-white/15 text-slate-400 cursor-not-allowed shadow-inner'
                    : !hasPlayerB
                    ? 'bg-black/40 border border-white/15 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-400 text-black hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{t('arena.readyWaiting')}</span>
                  </>
                ) : !hasPlayerB ? (
                  <span>{t('arena.waitingForOpponentBtn')}</span>
                ) : (
                  <span>{t('arena.readyToDuel')}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {!hasPlayerB ? (
                <div className="w-full flex flex-col space-y-2">
                  <div className="w-full py-2.5 px-3 bg-black/60 border border-amber-500/30 rounded-xl text-center">
                    <span className="text-xs font-chakra font-bold text-amber-400">
                      {t('arena.spectatorWaitingOpponent')}
                    </span>
                  </div>
                  {onJoinAsPlayer && (
                    <button
                      onClick={onJoinAsPlayer}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{t('arena.joinAsPlayer', { amount: wagerTon || '0' })}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-center">
                  <span className="text-xs font-chakra font-bold text-amber-400">
                    {t('arena.spectatorWaitingReady')}
                  </span>
                </div>
              )}
            </div>
          )
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="w-full py-3 px-4 rounded-xl bg-black/60 border border-amber-500/60 text-center flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            <span className="text-xs font-chakra font-bold text-amber-400">
              {t('arena.bettingWindowTitle')} ({countdownSeconds ?? 20}s)
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            <div className="w-full text-center">
              <span className="text-[10px] font-chakra text-slate-400">
                {phase === 'COUNTDOWN'
                  ? 'Il flash dei cubi sta per iniziare...'
                  : phase === 'FLASH'
                  ? 'Conta i cubi prima che il flash sparisca!'
                  : phase === 'INPUT'
                  ? submittedThisRound
                    ? 'Risposta registrata! Il round si risolverà a fine timer.'
                    : 'Inserisci il conteggio esatto sul tastierino.'
                  : 'Risoluzione del round in corso...'}
              </span>
            </div>
          ) : (
            <div className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-amber-400">
                {t('cubecount.spectatorNotice')}
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
