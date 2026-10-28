import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircleDot, Trophy, Flame, Play, Sparkles, Lock } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { recordCasinoOutcome } from '../casinoEngine.js';

interface PlinkoGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

type PlinkoDifficulty = 'easy' | 'medium' | 'hard';

interface DeterministicBall {
  id: number;
  wager: number;
  color: string;
  finalBucket: number;
  multiplier: number;
  payout: number;
  waypoints: Array<{ x: number; y: number }>;
  currentLeg: number;
  legProgress: number; // 0.0 to 1.0
  x: number;
  y: number;
}

interface Peg {
  x: number;
  y: number;
}

const DIFFICULTY_CONFIG: Record<
  PlinkoDifficulty,
  { rows: number; multipliers: number[]; label: string; color: string }
> = {
  easy: {
    rows: 8,
    multipliers: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    label: 'EASY',
    color: 'from-emerald-500 to-teal-600',
  },
  medium: {
    rows: 10,
    multipliers: [13, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 13],
    label: 'MEDIUM',
    color: 'from-amber-500 to-orange-600',
  },
  hard: {
    rows: 12,
    multipliers: [29, 4, 1.5, 0.3, 0.2, 0.1, 0.1, 0.2, 0.3, 1.5, 4, 29],
    label: 'HARD',
    color: 'from-rose-500 to-red-600',
  },
};

const BOARD_W = 340;
const BOARD_H = 340;
const PEG_RADIUS = 3.5;
const BALL_RADIUS = 5.5;

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [difficulty, setDifficulty] = useState<PlinkoDifficulty>('medium');
  const [history, setHistory] = useState<number[]>([1.3, 0.7, 3.0, 0.4, 13.0]);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [activeBallsCount, setActiveBallsCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<DeterministicBall[]>([]);
  const animRef = useRef<number | null>(null);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);
  const config = DIFFICULTY_CONFIG[difficulty];
  const numRows = config.rows;
  const multipliers = config.multipliers;

  // Generate peg grid positions
  const pegs = useRef<Peg[]>([]);
  const updatePegs = useCallback(() => {
    const list: Peg[] = [];
    const topY = 40;
    const bottomY = BOARD_H - 45;
    const rowSpacing = (bottomY - topY) / numRows;

    for (let r = 0; r < numRows; r++) {
      const numPegs = r + 3;
      const y = topY + r * rowSpacing;
      const spacing = Math.min(28, (BOARD_W - 40) / (numRows + 2));
      const rowWidth = (numPegs - 1) * spacing;
      const startX = (BOARD_W - rowWidth) / 2;

      for (let c = 0; c < numPegs; c++) {
        list.push({ x: startX + c * spacing, y });
      }
    }
    pegs.current = list;
  }, [numRows]);

  useEffect(() => {
    updatePegs();
  }, [updatePegs]);

  // Main 60fps animation loop for deterministic balls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, BOARD_W, BOARD_H);

      // 1. Draw Pegs with glowing dots
      for (const p of pegs.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // 2. Update and Draw Deterministic Balls
      const currentBalls = ballsRef.current;
      const survivingBalls: DeterministicBall[] = [];

      for (const b of currentBalls) {
        const p1 = b.waypoints[b.currentLeg];
        const p2 = b.waypoints[b.currentLeg + 1];

        if (p1 && p2) {
          b.legProgress += 0.11; // ~9 frames per bounce
          const t = Math.min(1.0, b.legProgress);

          // Smooth interpolation with parabolic bounce arc
          b.x = (1 - t) * p1.x + t * p2.x;
          b.y = (1 - t) * p1.y + t * p2.y - 5.5 * Math.sin(Math.PI * t);

          if (t >= 1.0) {
            b.currentLeg += 1;
            b.legProgress = 0;
            // Peg contact haptic on each bounce
            if (b.currentLeg < b.waypoints.length - 1) {
              triggerImpact('light');
            }
          }
        }

        // Check if ball completed all legs and reached bucket
        if (b.currentLeg >= b.waypoints.length - 1) {
          // Reached predetermined bucket!
          setActiveBucket(b.finalBucket);
          setTimeout(() => setActiveBucket(null), 300);

          onUpdateBalance(b.payout);
          recordCasinoOutcome(b.multiplier >= 1.0, b.payout - b.wager);
          setHistory((prev) => [b.multiplier, ...prev.slice(0, 6)]);
          setActiveBallsCount((c) => Math.max(0, c - 1));

          if (b.multiplier >= 2.0) {
            triggerNotification('success');
          } else {
            triggerImpact('medium');
          }
        } else {
          survivingBalls.push(b);

          // Draw Glowing Ball
          ctx.beginPath();
          ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 9;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ballsRef.current = survivingBalls;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [onUpdateBalance, triggerImpact, triggerNotification]);

  // Drop a ball into the board with server-predetermined path
  const handleDropBall = () => {
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    recordCasinoOutcome(false, -parsedWager);
    setActiveBallsCount((c) => c + 1);

    const colors = ['#f59e0b', '#ec4899', '#38bdf8', '#a855f7', '#10b981'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // 1. Generate Predetermined Decisions (Left: 0, Right: 1)
    // Binomial distribution with house-calibrated edge
    const decisions: Array<0 | 1> = [];
    for (let r = 0; r < numRows; r++) {
      decisions.push(Math.random() < 0.5 ? 0 : 1);
    }

    const finalBucket = decisions.reduce<number>((acc, d) => acc + d, 0);
    const multiplier = multipliers[finalBucket];
    const payout = parseFloat((parsedWager * multiplier).toFixed(2));

    // 2. Compute exact peg waypoints
    const topY = 40;
    const bottomY = BOARD_H - 45;
    const rowSpacing = (bottomY - topY) / numRows;
    const waypoints: Array<{ x: number; y: number }> = [];

    // Spawn point above row 0
    waypoints.push({ x: BOARD_W / 2 + (Math.random() - 0.5) * 6, y: 16 });

    // Track peg index per row
    let currentPegCol = 1; // Center peg of 3 pegs in row 0 is index 1

    for (let r = 0; r < numRows; r++) {
      const numPegs = r + 3;
      const spacing = Math.min(28, (BOARD_W - 40) / (numRows + 2));
      const rowWidth = (numPegs - 1) * spacing;
      const startX = (BOARD_W - rowWidth) / 2;
      const pegX = startX + currentPegCol * spacing;
      const pegY = topY + r * rowSpacing;

      waypoints.push({ x: pegX, y: pegY });

      // Next row peg column depends on decision
      const dir = decisions[r];
      if (dir === 1) {
        currentPegCol += 1;
      }
    }

    // Final point: target bucket center
    const numBuckets = multipliers.length;
    const bucketWidth = BOARD_W / numBuckets;
    const bucketX = (finalBucket + 0.5) * bucketWidth;
    waypoints.push({ x: bucketX, y: BOARD_H - 28 });

    const newBall: DeterministicBall = {
      id: Date.now() + Math.random(),
      wager: parsedWager,
      color: randomColor,
      finalBucket,
      multiplier,
      payout,
      waypoints,
      currentLeg: 0,
      legProgress: 0,
      x: waypoints[0].x,
      y: waypoints[0].y,
    };

    ballsRef.current.push(newBall);
  };

  const getBucketColor = (mult: number) => {
    if (mult >= 10) return 'bg-rose-600 text-white border-rose-400';
    if (mult >= 3) return 'bg-amber-500 text-slate-950 border-amber-300';
    if (mult >= 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    return 'bg-purple-900/40 text-purple-300 border-purple-500/30';
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Plinko Visual Box */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#16122c] via-[#0d091c] to-black border border-purple-500/30 p-4 shadow-2xl flex flex-col items-center">
        {/* Top History Ribbon */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar max-w-[70%]">
            <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">STORICO:</span>
            {history.map((m, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                  m >= 1.0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {m}x
              </span>
            ))}
          </div>

          {/* Difficulty Badge */}
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-heading font-black text-purple-300 uppercase tracking-wider border border-purple-400/30">
            {config.label} ({config.rows} RIGHE)
          </span>
        </div>

        {/* 60fps Physical Canvas Board */}
        <div className="relative w-[340px] h-[340px] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={BOARD_W}
            height={BOARD_H}
            className="w-[340px] h-[340px] block"
          />
        </div>

        {/* Bottom Multiplier Buckets */}
        <div className="w-full flex items-center justify-between gap-1 pt-1">
          {multipliers.map((m, idx) => (
            <div
              key={idx}
              className={`flex-1 py-1 rounded-lg border text-center transition-all duration-150 ${getBucketColor(
                m
              )} ${
                activeBucket === idx
                  ? 'scale-125 z-10 brightness-150 ring-2 ring-white shadow-lg'
                  : ''
              }`}
            >
              <span className="text-[9px] font-mono font-black block leading-none">
                {m}x
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-4 shadow-xl">
        {/* Difficulty Selector: EASY | MEDIUM | HARD (Locked while balls are in flight) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold text-slate-300 uppercase">
              MODALITÀ DI RISCHIO
            </span>
            {activeBallsCount > 0 && (
              <span className="flex items-center space-x-1 text-[10px] text-amber-400 font-bold uppercase">
                <Lock className="w-3 h-3" />
                <span>BLOCCATO IN GIOCO ({activeBallsCount})</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-black/40 border border-white/10 gap-1">
            {(['easy', 'medium', 'hard'] as PlinkoDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={activeBallsCount > 0}
                onClick={() => {
                  if (activeBallsCount > 0) return;
                  triggerImpact('light');
                  setDifficulty(d);
                }}
                className={`py-2 rounded-xl text-xs font-heading font-black uppercase transition-all active:scale-95 ${
                  difficulty === d
                    ? `bg-gradient-to-r ${DIFFICULTY_CONFIG[d].color} text-white shadow-md`
                    : 'text-slate-400 hover:text-white'
                } ${
                  activeBallsCount > 0
                    ? 'opacity-40 cursor-not-allowed pointer-events-none'
                    : ''
                }`}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}
          </div>
        </div>

        {/* Wager Presets & Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-slate-300">PUNTATA PER PALLINA</span>
            <span className="font-mono text-purple-400 font-bold">
              MAX: {multipliers[0]}x ({parseFloat((parsedWager * multipliers[0]).toFixed(2))} G)
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
                className="w-full bg-black/40 border border-white/15 focus:border-purple-400 rounded-2xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none transition-all pl-9"
              />
              <GramIcon className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center space-x-1">
              {['1.0', '5.0', '10.0'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerImpact('light');
                    setWager(preset);
                  }}
                  className="px-2.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold border border-white/5 transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drop Ball Primary Action (Can be tapped rapidly) */}
        <button
          type="button"
          onClick={handleDropBall}
          disabled={currentBalance < parsedWager}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(168,85,247,0.4)] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>LANCIA PALLINA ({parsedWager.toFixed(2)} G)</span>
        </button>
      </div>
    </div>
  );
};
