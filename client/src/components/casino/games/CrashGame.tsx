import React, { useState, useEffect, useRef } from 'react';
import { Plane, Trophy, Users, Zap, CheckCircle2, Clock } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { generateCrashPoint, recordCasinoOutcome } from '../casinoEngine.js';

interface CrashGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

interface SimulatedPlayerBet {
  id: string;
  name: string;
  avatar: string;
  bet: number;
  cashedOutAt?: number;
  isHero?: boolean;
}

const SIMULATED_PLAYERS_POOL = [
  { name: 'Marco_99', avatar: '🦁', baseBet: 2.0 },
  { name: 'CryptoWhale', avatar: '🐋', baseBet: 15.0 },
  { name: 'Elena_K', avatar: '🦊', baseBet: 1.0 },
  { name: 'TonSniper', avatar: '🎯', baseBet: 5.0 },
  { name: 'Davide_B', avatar: '⚡', baseBet: 3.5 },
  { name: 'Satoshi_7', avatar: '👑', baseBet: 10.0 },
  { name: 'Alex_Roma', avatar: '🐺', baseBet: 1.5 },
  { name: 'Luna_Ton', avatar: '🌙', baseBet: 4.0 },
];

export const CrashGame: React.FC<CrashGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [hasHeroBet, setHasHeroBet] = useState<boolean>(false);
  const [heroBetAmount, setHeroBetAmount] = useState<number>(1.0);
  const [heroCashedOutAt, setHeroCashedOutAt] = useState<number | null>(null);

  // Shared round state
  const [phase, setPhase] = useState<'BETTING' | 'FLYING' | 'CRASHED'>('BETTING');
  const [bettingCountdown, setBettingCountdown] = useState<number>(30);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([1.92, 4.15, 1.12, 12.4, 2.08, 1.45, 3.20]);
  const [activeBets, setActiveBets] = useState<SimulatedPlayerBet[]>([]);

  const crashPointRef = useRef<number>(2.0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);

  // Generate simulated round participants
  const initRoundBets = () => {
    const selected = [...SIMULATED_PLAYERS_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5 + Math.floor(Math.random() * 3))
      .map((p, idx) => ({
        id: `sim-${idx}-${Date.now()}`,
        name: p.name,
        avatar: p.avatar,
        bet: parseFloat((p.baseBet * (0.8 + Math.random() * 0.6)).toFixed(1)),
      }));

    setActiveBets(selected);
  };

  // 30-Second Betting Countdown Cycle
  useEffect(() => {
    if (phase !== 'BETTING') return;

    initRoundBets();
    setHasHeroBet(false);
    setHeroCashedOutAt(null);
    setCrashedAt(null);
    setCurrentMultiplier(1.0);
    setBettingCountdown(30);

    const interval = setInterval(() => {
      setBettingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startFlight();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Clean animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Launch Flight
  const startFlight = () => {
    const targetCrash = generateCrashPoint();
    crashPointRef.current = targetCrash;
    setPhase('FLYING');
    setCurrentMultiplier(1.0);
    startTimeRef.current = performance.now();

    // Assign cashout targets to simulated players
    setActiveBets((prev) =>
      prev.map((b) => {
        // 70% of bots will attempt cashout below targetCrash; 30% will crash
        const willCashout = Math.random() < 0.75;
        const botTarget = willCashout
          ? parseFloat((1.1 + Math.random() * Math.max(0.2, targetCrash - 1.15)).toFixed(2))
          : 999;
        return {
          ...b,
          botCashoutTarget: botTarget,
        } as any;
      })
    );

    const loop = (now: number) => {
      const elapsedSec = (now - startTimeRef.current) / 1000;
      // Smooth parabolic acceleration
      const mult = parseFloat(Math.pow(Math.E, 0.082 * Math.pow(elapsedSec, 1.14)).toFixed(2));

      // Check simulated players cashout
      setActiveBets((prev) =>
        prev.map((b: any) => {
          if (!b.cashedOutAt && b.botCashoutTarget && mult >= b.botCashoutTarget && mult < crashPointRef.current) {
            return { ...b, cashedOutAt: b.botCashoutTarget };
          }
          return b;
        })
      );

      if (mult >= crashPointRef.current) {
        // CRASHED!
        const finalCrash = crashPointRef.current;
        setCurrentMultiplier(finalCrash);
        setCrashedAt(finalCrash);
        setPhase('CRASHED');
        triggerNotification('error');

        setCrashHistory((prev) => [finalCrash, ...prev.slice(0, 7)]);

        // 3.5-second cooldown after crash, then restart 30-second betting countdown
        setTimeout(() => {
          setPhase('BETTING');
        }, 3500);

        return;
      }

      setCurrentMultiplier(mult);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  // User places bet for current round
  const handlePlaceBet = () => {
    if (phase !== 'BETTING' || hasHeroBet) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    setHeroBetAmount(parsedWager);
    setHasHeroBet(true);
    recordCasinoOutcome(false, -parsedWager);

    // Add hero to active bets list
    setActiveBets((prev) => [
      {
        id: 'hero-bet',
        name: 'Tu (Player)',
        avatar: '⭐',
        bet: parsedWager,
        isHero: true,
      },
      ...prev,
    ]);
  };

  // User cancels bet during 30s countdown
  const handleCancelBet = () => {
    if (phase !== 'BETTING' || !hasHeroBet) return;
    triggerImpact('light');
    onUpdateBalance(heroBetAmount);
    setHasHeroBet(false);
    setActiveBets((prev) => prev.filter((b) => !b.isHero));
  };

  // User hits Cashout
  const handleCashout = () => {
    if (phase !== 'FLYING' || !hasHeroBet || heroCashedOutAt) return;
    triggerImpact('heavy');
    triggerNotification('success');

    const mult = currentMultiplier;
    const payout = parseFloat((heroBetAmount * mult).toFixed(2));
    setHeroCashedOutAt(mult);

    onUpdateBalance(payout);
    recordCasinoOutcome(true, payout - heroBetAmount);

    setActiveBets((prev) =>
      prev.map((b) => (b.isHero ? { ...b, cashedOutAt: mult } : b))
    );
  };

  // Flight progress percentage for canvas / SVG (capped at 100%)
  const flightProgress = Math.min(1, Math.max(0, (currentMultiplier - 1) / 5));
  const planeX = 20 + flightProgress * 230;
  const planeY = 160 - Math.pow(flightProgress, 0.85) * 125;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Aviator Shared Flight Arena Screen */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#101426] via-[#090b14] to-black border border-cyan-500/30 p-4 shadow-2xl flex flex-col justify-between min-h-[250px]">
        {/* Top Multiplier History */}
        <div className="flex items-center justify-between w-full z-20">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar max-w-[70%]">
            <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">STORICO:</span>
            {crashHistory.map((m, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                  m >= 2.0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>

          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{activeBets.length + 12} live</span>
          </div>
        </div>

        {/* Center Arena View: 30s Countdown OR Flight In Progress OR Flew Away */}
        <div className="relative w-full h-44 flex flex-col items-center justify-center my-2">
          {/* Subtle Grid Lines in background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* PHASE 1: 30s BETTING COUNTDOWN */}
          {phase === 'BETTING' && (
            <div className="flex flex-col items-center justify-center space-y-2 z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-heading font-black tracking-wider uppercase">
                <Clock className="w-4 h-4 animate-spin text-amber-400" />
                <span>{t('casino.nextRoundIn') || 'PROSSIMO VOLO TRA'}</span>
              </div>

              <div className="text-5xl font-mono font-black text-white tracking-tight">
                {bettingCountdown}s
              </div>

              {/* Animated Progress Bar */}
              <div className="w-48 h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(bettingCountdown / 30) * 100}%` }}
                />
              </div>

              <span className="text-[10px] text-slate-400 font-sans">
                {hasHeroBet
                  ? 'Puntata confermata! In attesa del decollo...'
                  : 'Piazza la tua puntata prima che l\'aereo decolli'}
              </span>
            </div>
          )}

          {/* PHASE 2: FLYING */}
          {phase === 'FLYING' && (
            <>
              {/* Flight Path SVG with Smooth Curve and Red Jet */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient id="flightGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(244, 63, 94, 0.05)" />
                    <stop offset="100%" stopColor="rgba(244, 63, 94, 0.35)" />
                  </linearGradient>
                </defs>
                {/* Curved Fill Area under plane */}
                <path
                  d={`M 20 160 Q ${planeX * 0.4} 160, ${planeX} ${planeY} L ${planeX} 160 Z`}
                  fill="url(#flightGradient)"
                />
                {/* Glowing Trail Line */}
                <path
                  d={`M 20 160 Q ${planeX * 0.4} 160, ${planeX} ${planeY}`}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>

              {/* The Supersonic Red Jet */}
              <div
                className="absolute z-10 transition-transform duration-75"
                style={{
                  left: `${planeX}px`,
                  top: `${planeY}px`,
                  transform: 'translate(-50%, -50%) rotate(-18deg)',
                }}
              >
                <div className="relative">
                  <Plane className="w-8 h-8 text-rose-500 fill-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.9)]" />
                  {/* Jet Flame Exhaust Trail */}
                  <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-1.5 rounded-full bg-gradient-to-l from-amber-400 to-transparent animate-pulse" />
                </div>
              </div>

              {/* Big Live Multiplier Display */}
              <div className="z-10 flex flex-col items-center">
                <span className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                  {currentMultiplier.toFixed(2)}x
                </span>
                {heroCashedOutAt && (
                  <span className="mt-1 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-bold text-xs uppercase animate-in zoom-in-95">
                    HAI INCASSATO A {heroCashedOutAt.toFixed(2)}x!
                  </span>
                )}
              </div>
            </>
          )}

          {/* PHASE 3: CRASHED / VOLATO VIA */}
          {phase === 'CRASHED' && (
            <div className="z-10 flex flex-col items-center space-y-1 animate-in zoom-in-95 duration-150">
              <span className="text-base font-heading font-black text-rose-500 uppercase tracking-widest drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                VOLATO VIA!
              </span>
              <span className="text-5xl sm:text-6xl font-mono font-black text-rose-500">
                @{crashedAt?.toFixed(2)}x
              </span>
              <span className="text-[11px] font-sans text-slate-400 pt-1">
                Nuovo round in partenza tra pochi secondi...
              </span>
            </div>
          )}
        </div>

        {/* Bottom Interactive Betting / Cashout Bar */}
        <div className="pt-2 border-t border-white/10 z-20">
          {phase === 'BETTING' ? (
            !hasHeroBet ? (
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={wager}
                    onChange={(e) => setWager(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                  <GramIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                </div>

                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={currentBalance < parsedWager}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  PUNTA ({parsedWager} G)
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-heading font-bold text-emerald-300">
                    Puntata: {heroBetAmount} GRAM
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelBet}
                  className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-heading font-bold text-[11px] uppercase tracking-wider"
                >
                  ANNULLA
                </button>
              </div>
            )
          ) : phase === 'FLYING' ? (
            hasHeroBet && !heroCashedOutAt ? (
              <button
                type="button"
                onClick={handleCashout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 animate-pulse"
              >
                <Trophy className="w-5 h-5" />
                <span>
                  INCASSA ORA (+{(heroBetAmount * currentMultiplier).toFixed(2)} GRAM)
                </span>
              </button>
            ) : (
              <div className="w-full py-2.5 text-center text-xs font-mono font-bold text-slate-400 bg-black/40 rounded-2xl border border-white/10">
                {heroCashedOutAt
                  ? `INCASSO RIUSCITO (+${(heroBetAmount * heroCashedOutAt).toFixed(2)} GRAM)`
                  : 'VOLO IN CORSO - PUNTATE CHIUSE'}
              </div>
            )
          ) : (
            <div className="w-full py-2.5 text-center text-xs font-mono font-bold text-rose-400 bg-rose-950/30 rounded-2xl border border-rose-500/30">
              ROUND TERMINATO
            </div>
          )}
        </div>
      </div>

      {/* Live Multiplayer Active Players Table */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-heading font-black text-white uppercase tracking-wider">
              SCOMMESSE IN STANZA ({activeBets.length})
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">MULTIPLAYER LIVE</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {activeBets.map((b) => (
            <div
              key={b.id}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                b.isHero
                  ? 'bg-amber-500/10 border-amber-400/50'
                  : b.cashedOutAt
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-black/30 border-white/5'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{b.avatar}</span>
                <span
                  className={`text-xs font-heading font-bold ${
                    b.isHero ? 'text-amber-300' : 'text-slate-200'
                  }`}
                >
                  {b.name}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-slate-400">
                  {b.bet.toFixed(1)} G
                </span>

                {b.cashedOutAt ? (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono font-bold text-[10px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>@{b.cashedOutAt.toFixed(2)}x</span>
                  </span>
                ) : phase === 'CRASHED' ? (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300 font-mono font-bold text-[10px]">
                    CRASH
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                    IN VOLO...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
