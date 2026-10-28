import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plane, Trophy, Users, CheckCircle2, Clock } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { recordCasinoOutcome } from '../casinoEngine.js';

interface CrashGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

const CYCLE_MS = 45000; // 45 seconds total round cycle
const BETTING_WINDOW_MS = 30000; // 30 seconds betting window

// Deterministic crash point derived from global roundId so it remains identical across page refreshes
function getCrashPointForRound(roundId: number): number {
  const seed = (roundId * 9301 + 49297) % 233280;
  const rand = seed / 233280;

  // Casino house edge distribution: 12% instant crash (< 1.2x), 60% standard (1.2x - 3.5x), 28% high flyer
  if (rand < 0.12) {
    return parseFloat((1.05 + rand * 1.2).toFixed(2));
  } else if (rand < 0.72) {
    return parseFloat((1.2 + rand * 2.8).toFixed(2));
  } else {
    return parseFloat((3.2 + rand * 8.5).toFixed(2));
  }
}

export const CrashGame: React.FC<CrashGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [phase, setPhase] = useState<'BETTING' | 'FLYING' | 'CRASHED'>('BETTING');
  const [countdownSec, setCountdownSec] = useState<number>(30);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [crashedAt, setCrashedAt] = useState<number | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([1.92, 4.15, 1.12, 12.4, 2.08, 1.45]);

  // Persistent Hero Bet State
  const [heroBet, setHeroBet] = useState<{
    roundId: number;
    amount: number;
    cashedOutAt: number | null;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_crash_user_bet');
      if (saved) {
        const parsed = JSON.parse(saved);
        const currentRoundId = Math.floor(Date.now() / CYCLE_MS);
        if (parsed.roundId === currentRoundId) return parsed;
      }
    } catch {}
    return null;
  });

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);
  const currentRoundId = Math.floor(Date.now() / CYCLE_MS);
  const targetCrash = useMemo(() => getCrashPointForRound(currentRoundId), [currentRoundId]);

  // Main synchronized wall-clock loop (runs every ~50ms)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const roundId = Math.floor(now / CYCLE_MS);
      const msInRound = now % CYCLE_MS;
      const crashPoint = getCrashPointForRound(roundId);

      if (msInRound < BETTING_WINDOW_MS) {
        // 1. BETTING PHASE (0s - 30s)
        setPhase('BETTING');
        const remainingSec = Math.max(1, Math.ceil((BETTING_WINDOW_MS - msInRound) / 1000));
        setCountdownSec(remainingSec);
        setCurrentMultiplier(1.0);
        setCrashedAt(null);
      } else {
        // 2. FLIGHT OR CRASH PHASE (30s - 45s)
        const elapsedFlightSec = (msInRound - BETTING_WINDOW_MS) / 1000;
        // Parabolic exponential acceleration curve
        const mult = parseFloat(Math.pow(Math.E, 0.084 * Math.pow(elapsedFlightSec, 1.14)).toFixed(2));

        if (mult >= crashPoint) {
          // CRASHED
          setPhase('CRASHED');
          setCurrentMultiplier(crashPoint);
          setCrashedAt(crashPoint);
        } else {
          // FLYING
          setPhase('FLYING');
          setCurrentMultiplier(mult);
        }
      }
    }, 45);

    return () => clearInterval(timer);
  }, []);

  // Update crash history when round ID advances
  const lastRoundRef = useRef<number>(currentRoundId);
  useEffect(() => {
    if (currentRoundId !== lastRoundRef.current) {
      const prevCrash = getCrashPointForRound(lastRoundRef.current);
      setCrashHistory((prev) => [prevCrash, ...prev.slice(0, 6)]);
      lastRoundRef.current = currentRoundId;

      // Clean expired hero bet
      setHeroBet(null);
      try {
        localStorage.removeItem('sfidabot_crash_user_bet');
      } catch {}
    }
  }, [currentRoundId]);

  // Place persistent bet during 30s window (CANNOT BE WITHDRAWN)
  const handlePlaceBet = () => {
    if (phase !== 'BETTING' || heroBet) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    onUpdateBalance(-parsedWager);
    recordCasinoOutcome(false, -parsedWager);

    const newBet = {
      roundId: currentRoundId,
      amount: parsedWager,
      cashedOutAt: null,
    };

    setHeroBet(newBet);
    try {
      localStorage.setItem('sfidabot_crash_user_bet', JSON.stringify(newBet));
    } catch {}
  };

  // Cashout during flight
  const handleCashout = () => {
    if (phase !== 'FLYING' || !heroBet || heroBet.cashedOutAt) return;

    triggerImpact('heavy');
    triggerNotification('success');

    const mult = currentMultiplier;
    const payout = parseFloat((heroBet.amount * mult).toFixed(2));

    const updated = { ...heroBet, cashedOutAt: mult };
    setHeroBet(updated);
    try {
      localStorage.setItem('sfidabot_crash_user_bet', JSON.stringify(updated));
    } catch {}

    onUpdateBalance(payout);
    recordCasinoOutcome(true, payout - heroBet.amount);
  };

  const hasActiveHeroBet = Boolean(heroBet && heroBet.roundId === currentRoundId);
  const heroCashedOut = Boolean(hasActiveHeroBet && heroBet?.cashedOutAt);

  // SVG Parabolic flight coordinates
  const flightProgress = Math.min(1, Math.max(0, (currentMultiplier - 1) / 5));
  const planeX = 20 + flightProgress * 235;
  const planeY = 160 - Math.pow(flightProgress, 0.82) * 125;

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

          <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-0.5" />
            <span>ROUND #{currentRoundId % 10000}</span>
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
                {countdownSec}s
              </div>

              {/* Animated Progress Bar */}
              <div className="w-48 h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-300 ease-linear"
                  style={{ width: `${(countdownSec / 30) * 100}%` }}
                />
              </div>

              <span className="text-[10px] text-slate-400 font-sans">
                {hasActiveHeroBet
                  ? (t('casino.betPlaced') || 'Puntata confermata per questo volo!')
                  : (t('casino.placeBetPrompt') || 'Piazza la tua puntata prima che l\'aereo decolli')}
              </span>
            </div>
          )}

          {/* PHASE 2: FLYING */}
          {phase === 'FLYING' && (
            <>
              {/* Flight Path SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient id="flightGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(244, 63, 94, 0.05)" />
                    <stop offset="100%" stopColor="rgba(244, 63, 94, 0.35)" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 20 160 Q ${planeX * 0.4} 160, ${planeX} ${planeY} L ${planeX} 160 Z`}
                  fill="url(#flightGradient)"
                />
                <path
                  d={`M 20 160 Q ${planeX * 0.4} 160, ${planeX} ${planeY}`}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>

              {/* Supersonic Red Jet */}
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
                  <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-1.5 rounded-full bg-gradient-to-l from-amber-400 to-transparent animate-pulse" />
                </div>
              </div>

              {/* Big Live Multiplier Display */}
              <div className="z-10 flex flex-col items-center">
                <span className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                  {currentMultiplier.toFixed(2)}x
                </span>
                {heroCashedOut && (
                  <span className="mt-1 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-bold text-xs uppercase animate-in zoom-in-95">
                    {t('casino.cashedOut') || 'INCASSATI'}: {heroBet?.cashedOutAt?.toFixed(2)}x!
                  </span>
                )}
              </div>
            </>
          )}

          {/* PHASE 3: CRASHED */}
          {phase === 'CRASHED' && (
            <div className="z-10 flex flex-col items-center space-y-1 animate-in zoom-in-95 duration-150">
              <span className="text-base font-heading font-black text-rose-500 uppercase tracking-widest drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]">
                {t('casino.crashed') || 'VOLATO VIA!'}
              </span>
              <span className="text-5xl sm:text-6xl font-mono font-black text-rose-500">
                @{crashedAt?.toFixed(2)}x
              </span>
              <span className="text-[11px] font-sans text-slate-400 pt-1">
                {t('casino.takingOffIn') || 'Prossimo volo tra pochi secondi...'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Interactive Betting / Cashout Bar */}
        <div className="pt-2 border-t border-white/10 z-20">
          {phase === 'BETTING' ? (
            !hasActiveHeroBet ? (
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
                  {t('casino.placeBet') || 'PUNTA'} ({parsedWager} G)
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-heading font-bold text-emerald-300">
                    {t('casino.betPlaced') || 'Puntata confermata'}: {heroBet?.amount} GRAM
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                  {t('casino.takingOffIn') || 'IN VOLO TRA'} {countdownSec}S
                </span>
              </div>
            )
          ) : phase === 'FLYING' ? (
            hasActiveHeroBet && !heroCashedOut ? (
              <button
                type="button"
                onClick={handleCashout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 animate-pulse"
              >
                <Trophy className="w-5 h-5" />
                <span>
                  {t('casino.cashout') || 'INCASSA ORA'} (+{parseFloat(((heroBet?.amount || 1) * currentMultiplier).toFixed(2))} GRAM)
                </span>
              </button>
            ) : (
              <div className="w-full py-2.5 text-center text-xs font-mono font-bold text-slate-400 bg-black/40 rounded-2xl border border-white/10">
                {heroCashedOut
                  ? `${t('casino.cashoutSuccess') || 'INCASSO RIUSCITO'} (+${parseFloat(((heroBet?.amount || 1) * (heroBet?.cashedOutAt || 1)).toFixed(2))} GRAM)`
                  : (t('casino.roundActive') || 'VOLO IN CORSO - PUNTATE CHIUSE')}
              </div>
            )
          ) : (
            <div className="w-full py-2.5 text-center text-xs font-mono font-bold text-rose-400 bg-rose-950/30 rounded-2xl border border-rose-500/30">
              {t('casino.crashed') || 'ROUND TERMINATO'}
            </div>
          )}
        </div>
      </div>

      {/* Real Player Bet Overview Card (NO FAKE PLAYERS) */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">✈️</span>
            <span className="text-xs font-heading font-black text-white uppercase tracking-wider">
              {t('casino.myBetStatus') || 'DETTAGLI TUA SCOMMESSA'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
            {phase === 'BETTING'
              ? (t('casino.waitingBets') || 'FASE DI PUNTATA')
              : phase === 'FLYING'
              ? (t('casino.flying') || 'IN VOLO')
              : (t('casino.crashed') || 'TERMINATO')}
          </span>
        </div>

        {hasActiveHeroBet ? (
          <div className="p-3 rounded-2xl border bg-black/30 border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-sans">
                {t('casino.wager') || 'Puntata'}:
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {heroBet?.amount.toFixed(2)} GRAM
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-sans">
                {t('casino.status') || 'Stato'}:
              </span>
              {heroCashedOut ? (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono font-bold text-xs flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {t('casino.cashedOut') || 'Incassato a'} @{heroBet?.cashedOutAt?.toFixed(2)}x (+{parseFloat(((heroBet?.amount || 0) * (heroBet?.cashedOutAt || 1)).toFixed(2))} G)
                  </span>
                </span>
              ) : phase === 'CRASHED' ? (
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300 font-mono font-bold text-xs">
                  {t('casino.lost') || 'Perso (Crash)'}
                </span>
              ) : phase === 'FLYING' ? (
                <span className="text-xs font-mono text-cyan-300 font-bold animate-pulse">
                  {t('casino.flying') || 'In volo...'} (+{parseFloat(((heroBet?.amount || 0) * currentMultiplier).toFixed(2))} G)
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-300 font-bold">
                  {t('casino.betPlaced') || 'Pronto per il decollo'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl border bg-black/20 border-white/5 text-center">
            <p className="text-xs text-slate-400 font-sans">
              {phase === 'BETTING'
                ? (t('casino.placeBetPrompt') || 'Non hai puntate attive per questo round. Inserisci l\'importo e clicca Punta!')
                : (t('casino.roundActive') || 'Round in corso. Attendi il prossimo intervallo per piazzare la puntata.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
