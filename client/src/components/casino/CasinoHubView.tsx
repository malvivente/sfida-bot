import React, { useState, useEffect } from 'react';
import { ArrowLeft, Dices, Layers, Sparkles, TrendingUp, ArrowDown, ArrowUp, RefreshCw, Trophy, AlertCircle, ShieldCheck, Flame, Zap, CheckCircle2 } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';

interface CasinoHubViewProps {
  onBack: () => void;
  userBalanceGram?: string;
  onBalanceUpdated?: (newBalance: string) => void;
}

type CasinoGame = 'dice' | 'hilo';

export const CasinoHubView: React.FC<CasinoHubViewProps> = ({
  onBack,
  userBalanceGram = '0.00',
  onBalanceUpdated,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [activeGame, setActiveGame] = useState<CasinoGame>('dice');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoBalance, setDemoBalance] = useState<number>(100.0);

  const realBalance = parseFloat(userBalanceGram || '0');
  const currentBalance = isDemoMode ? demoBalance : realBalance;

  // Update real balance helper
  const updateBalanceDelta = (delta: number) => {
    if (isDemoMode) {
      setDemoBalance((prev) => Math.max(0, parseFloat((prev + delta).toFixed(2))));
    } else {
      const next = Math.max(0, parseFloat((realBalance + delta).toFixed(2)));
      onBalanceUpdated?.(next.toFixed(2));
      try {
        const saved = localStorage.getItem('sfidabot_user_balance');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.balanceGram = next.toFixed(2);
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('sfida_balance_updated', { detail: { balance: next.toFixed(2) } }));
        }
      } catch {}
    }
  };

  // ==========================================
  // --- 1. DICE LOGIC ---
  // ==========================================
  const [diceTarget, setDiceTarget] = useState<number>(50.0);
  const [diceMode, setDiceMode] = useState<'under' | 'over'>('under');
  const [diceWager, setDiceWager] = useState<string>('0.10');
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceWon, setDiceWon] = useState<boolean | null>(null);
  const [diceHistory, setDiceHistory] = useState<Array<{ roll: number; won: boolean }>>([
    { roll: 42.15, won: true },
    { roll: 88.30, won: false },
    { roll: 23.90, won: true },
  ]);

  const diceWinChance = diceMode === 'under' ? diceTarget : 100 - diceTarget;
  const diceMultiplier = parseFloat((99 / Math.max(1, diceWinChance)).toFixed(2));
  const parsedDiceWager = parseFloat(diceWager) || 0.1;
  const dicePotentialPayout = parseFloat((parsedDiceWager * diceMultiplier).toFixed(2));

  const handleRollDice = () => {
    if (diceRolling) return;
    if (currentBalance < parsedDiceWager) {
      triggerNotification('warning');
      return;
    }

    triggerImpact('heavy');
    setDiceRolling(true);
    setDiceWon(null);

    // Deduct wager
    updateBalanceDelta(-parsedDiceWager);

    // Animate roll
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      setDiceResult(parseFloat((Math.random() * 100).toFixed(2)));
      if (ticks > 8) {
        clearInterval(interval);
        const finalRoll = parseFloat((Math.random() * 99.99).toFixed(2));
        setDiceResult(finalRoll);

        const isWin = diceMode === 'under' ? finalRoll < diceTarget : finalRoll > diceTarget;
        setDiceWon(isWin);
        setDiceRolling(false);
        setDiceHistory((prev) => [{ roll: finalRoll, won: isWin }, ...prev.slice(0, 5)]);

        if (isWin) {
          triggerNotification('success');
          updateBalanceDelta(dicePotentialPayout);
        } else {
          triggerNotification('error');
        }
      }
    }, 60);
  };

  // ==========================================
  // --- 2. HILO LOGIC ---
  // ==========================================
  const CARD_SUITS = ['♠', '♥', '♦', '♣'] as const;
  const CARD_VALUES = [
    { label: '2', val: 2 },
    { label: '3', val: 3 },
    { label: '4', val: 4 },
    { label: '5', val: 5 },
    { label: '6', val: 6 },
    { label: '7', val: 7 },
    { label: '8', val: 8 },
    { label: '9', val: 9 },
    { label: '10', val: 10 },
    { label: 'J', val: 11 },
    { label: 'Q', val: 12 },
    { label: 'K', val: 13 },
    { label: 'A', val: 14 },
  ];

  const getRandomCard = () => {
    const s = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
    const v = CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
    return { ...v, suit: s };
  };

  const [hiloWager, setHiloWager] = useState<string>('0.20');
  const [hiloActive, setHiloActive] = useState<boolean>(false);
  const [hiloCurrentCard, setHiloCurrentCard] = useState<any>(getRandomCard);
  const [hiloMultiplier, setHiloMultiplier] = useState<number>(1.0);
  const [hiloStreak, setHiloStreak] = useState<number>(0);
  const [hiloHistory, setHiloHistory] = useState<any[]>([]);
  const [hiloGameOver, setHiloGameOver] = useState<boolean>(false);
  const [hiloWonCashout, setHiloWonCashout] = useState<number | null>(null);

  const parsedHiloWager = parseFloat(hiloWager) || 0.2;
  const hiloCurrentPayout = parseFloat((parsedHiloWager * hiloMultiplier).toFixed(2));

  // Multiplier calculations based on current card
  const higherChance = (14 - hiloCurrentCard.val + 1) / 13;
  const lowerChance = (hiloCurrentCard.val - 2 + 1) / 13;
  const higherMult = parseFloat((1 / Math.max(0.1, higherChance) * 0.95).toFixed(2));
  const lowerMult = parseFloat((1 / Math.max(0.1, lowerChance) * 0.95).toFixed(2));

  const handleStartHilo = () => {
    if (currentBalance < parsedHiloWager) {
      triggerNotification('warning');
      return;
    }
    triggerImpact('medium');
    updateBalanceDelta(-parsedHiloWager);
    const startCard = getRandomCard();
    setHiloCurrentCard(startCard);
    setHiloMultiplier(1.0);
    setHiloStreak(0);
    setHiloHistory([startCard]);
    setHiloActive(true);
    setHiloGameOver(false);
    setHiloWonCashout(null);
  };

  const handleHiloGuess = (direction: 'higher' | 'lower') => {
    if (!hiloActive || hiloGameOver) return;
    triggerImpact('heavy');

    const nextCard = getRandomCard();
    const isHigher = nextCard.val >= hiloCurrentCard.val;
    const isLower = nextCard.val <= hiloCurrentCard.val;
    const correct = direction === 'higher' ? isHigher : isLower;

    setHiloHistory((prev) => [nextCard, ...prev.slice(0, 6)]);
    setHiloCurrentCard(nextCard);

    if (correct) {
      triggerNotification('success');
      const stepMult = direction === 'higher' ? higherMult : lowerMult;
      const nextTotMult = parseFloat((hiloMultiplier * stepMult).toFixed(2));
      setHiloMultiplier(nextTotMult);
      setHiloStreak((s) => s + 1);
    } else {
      triggerNotification('error');
      setHiloGameOver(true);
      setHiloActive(false);
    }
  };

  const handleHiloSkip = () => {
    if (!hiloActive || hiloGameOver) return;
    triggerImpact('light');
    const newCard = getRandomCard();
    setHiloCurrentCard(newCard);
    setHiloHistory((prev) => [newCard, ...prev.slice(0, 6)]);
  };

  const handleHiloCashout = () => {
    if (!hiloActive || hiloGameOver || hiloStreak === 0) return;
    triggerNotification('success');
    const wonAmount = hiloCurrentPayout;
    updateBalanceDelta(wonAmount);
    setHiloWonCashout(wonAmount);
    setHiloActive(false);
    setHiloGameOver(false);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-12 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            onBack();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-heading font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back') || 'Torna'}</span>
        </button>

        <div className="flex items-center space-x-2">
          {/* Real vs Demo Balance Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setIsDemoMode(!isDemoMode);
            }}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-heading font-black tracking-wider uppercase border transition-all ${
              isDemoMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {isDemoMode ? '🟡 MODALITÀ DEMO' : '🟢 GRAM REALI'}
          </button>

          <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300 text-xs font-heading font-bold">
            <GramIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Hero Brand Title */}
      <div className="px-1 flex items-center justify-between">
        <div>
          <h2 className="text-base font-heading font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <Dices className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <span>SFIDA CASINO ORIGINALS</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-sans">
            Giochi matematici Provably Fair ad alto rendimento.
          </p>
        </div>
      </div>

      {/* Game Selector Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveGame('dice');
          }}
          className={`py-2 px-3 rounded-xl text-center select-none active:scale-95 transition-all border flex items-center justify-center space-x-2 ${
            activeGame === 'dice'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md border-amber-400'
              : 'border-transparent text-slate-400 hover:text-white font-bold'
          }`}
        >
          <Dices className="w-4 h-4" />
          <span className="text-xs font-heading uppercase tracking-wider">
            DICE (DADO)
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveGame('hilo');
          }}
          className={`py-2 px-3 rounded-xl text-center select-none active:scale-95 transition-all border flex items-center justify-center space-x-2 ${
            activeGame === 'hilo'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black shadow-md border-amber-400'
              : 'border-transparent text-slate-400 hover:text-white font-bold'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-xs font-heading uppercase tracking-wider">
            HILO (ALTA/BASSA)
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. DICE INTERACTIVE ARENA                                */}
      {/* ======================================================== */}
      {activeGame === 'dice' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Live Roll Visual Display Box */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181a24] to-[#0f1118] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[170px]">
            <div className="absolute top-3 left-3 flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-400 font-mono">CRONOLOGIA:</span>
              <div className="flex items-center space-x-1">
                {diceHistory.map((h, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      h.won ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {h.roll.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Target condition indicator */}
            <div className="text-xs font-heading font-extrabold tracking-wider uppercase text-slate-400 mt-3 mb-1">
              OBIETTIVO: <span className="text-amber-300">{diceMode === 'under' ? '<' : '>'} {diceTarget.toFixed(2)}</span>
            </div>

            {/* Number Roll Display */}
            <div
              className={`text-5xl sm:text-6xl font-mono font-black tracking-tight transition-transform duration-100 ${
                diceRolling
                  ? 'text-amber-400 scale-105 animate-pulse'
                  : diceWon === true
                  ? 'text-emerald-400 scale-110 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                  : diceWon === false
                  ? 'text-rose-500 scale-100'
                  : 'text-white'
              }`}
            >
              {diceResult !== null ? diceResult.toFixed(2) : '50.00'}
            </div>

            {/* Outcome Tag */}
            {diceWon !== null && !diceRolling && (
              <div className="mt-2 animate-in zoom-in-95 duration-150">
                {diceWon ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-heading font-black text-xs uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>HAI VINTO +{dicePotentialPayout} GRAM!</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 font-heading font-bold text-xs uppercase tracking-wider">
                    NON RIUSCITO ({diceResult?.toFixed(2)})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dice Slider & Mode Switch */}
          <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-slate-300 uppercase">
                CONDIZIONE DI VINCITA
              </span>
              <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('light');
                    setDiceMode('under');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-heading font-black uppercase transition-all ${
                    diceMode === 'under' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  SOTTO (&lt;)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('light');
                    setDiceMode('over');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-heading font-black uppercase transition-all ${
                    diceMode === 'over' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  SOPRA (&gt;)
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="2"
                max="98"
                step="1"
                value={diceTarget}
                onChange={(e) => setDiceTarget(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>2.00</span>
                <span className="text-amber-300 font-bold">{diceTarget.toFixed(2)}</span>
                <span>98.00</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5 text-center">
                <span className="text-[10px] font-heading text-slate-400 block uppercase">
                  PROBABILITÀ
                </span>
                <span className="text-base font-heading font-black text-white">
                  {diceWinChance.toFixed(2)}%
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5 text-center">
                <span className="text-[10px] font-heading text-slate-400 block uppercase">
                  MOLTIPLICATORE
                </span>
                <span className="text-base font-heading font-black text-amber-300">
                  {diceMultiplier.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          {/* Wager Input & Roll Action */}
          <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-slate-300 uppercase">
                PUNTATA IN GRAM
              </span>
              <span className="text-xs font-heading font-bold text-amber-300">
                VINCITA: +{dicePotentialPayout} G
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={diceWager}
                onChange={(e) => setDiceWager(e.target.value)}
                className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setDiceWager((prev) => (Math.max(0.05, parseFloat(prev) / 2)).toFixed(2))}
                className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300"
              >
                1/2
              </button>
              <button
                type="button"
                onClick={() => setDiceWager((prev) => (parseFloat(prev) * 2).toFixed(2))}
                className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300"
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => setDiceWager(currentBalance.toFixed(2))}
                className="px-2.5 py-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-xs font-mono text-amber-300 font-bold"
              >
                MAX
              </button>
            </div>

            <button
              type="button"
              onClick={handleRollDice}
              disabled={diceRolling || currentBalance < parsedDiceWager}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {diceRolling ? 'LANCIO IN CORSO...' : `LANCIA IL DADO (${parsedDiceWager} GRAM)`}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. HILO INTERACTIVE ARENA                                */}
      {/* ======================================================== */}
      {activeGame === 'hilo' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Card Table Visual */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181a24] to-[#0f1118] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
            {/* Top Multiplier & Streak Tracker */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-heading block uppercase">MOLTIPLICATORE</span>
                <span className="text-xl font-heading font-black text-amber-300">
                  {hiloMultiplier.toFixed(2)}x
                </span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-heading block uppercase">SERIE CORRETTA</span>
                <span className="text-lg font-heading font-black text-white">
                  🔥 {hiloStreak}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-heading block uppercase">POTENZIALE VINCITA</span>
                <span className="text-xl font-heading font-black text-emerald-400">
                  {hiloCurrentPayout} G
                </span>
              </div>
            </div>

            {/* Current Playing Card */}
            <div className="my-4 relative">
              <div
                className={`w-28 h-40 rounded-2xl bg-white border-2 border-slate-300 shadow-2xl flex flex-col justify-between p-3 select-none transform transition-transform duration-200 ${
                  hiloGameOver ? 'opacity-40 grayscale rotate-6' : 'hover:scale-105'
                }`}
              >
                <div className={`text-left font-mono font-black text-xl leading-none ${['♥', '♦'].includes(hiloCurrentCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                  {hiloCurrentCard.label}
                  <div className="text-sm">{hiloCurrentCard.suit}</div>
                </div>

                <div className={`text-center font-mono font-black text-4xl ${['♥', '♦'].includes(hiloCurrentCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                  {hiloCurrentCard.suit}
                </div>

                <div className={`text-right font-mono font-black text-xl leading-none rotate-180 ${['♥', '♦'].includes(hiloCurrentCard.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                  {hiloCurrentCard.label}
                  <div className="text-sm">{hiloCurrentCard.suit}</div>
                </div>
              </div>

              {hiloGameOver && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 py-1 rounded-xl bg-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg rotate-12 animate-pulse">
                    BUST! PERSO
                  </span>
                </div>
              )}

              {hiloWonCashout && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg -rotate-6">
                    INCASSATI +{hiloWonCashout} G!
                  </span>
                </div>
              )}
            </div>

            {/* History Strip */}
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full px-2 py-1">
              {hiloHistory.map((c, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-slate-950' : 'bg-black/40 text-slate-300 border border-white/10'
                  }`}
                >
                  {c.label}{c.suit}
                </span>
              ))}
            </div>
          </div>

          {/* HiLo Controls */}
          {!hiloActive ? (
            <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-slate-300 uppercase">
                  PUNTATA INIZIALE
                </span>
                <span className="text-xs font-mono text-slate-400">MIN: 0.10 G</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={hiloWager}
                  onChange={(e) => setHiloWager(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setHiloWager('0.20')}
                  className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300"
                >
                  0.20
                </button>
                <button
                  type="button"
                  onClick={() => setHiloWager('1.00')}
                  className="px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-300"
                >
                  1.00
                </button>
              </div>

              <button
                type="button"
                onClick={handleStartHilo}
                disabled={currentBalance < parsedHiloWager}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                DISTRIBUISCI CARTA ({parsedHiloWager} GRAM)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleHiloGuess('higher')}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center space-y-0.5"
                >
                  <div className="flex items-center space-x-1">
                    <ArrowUp className="w-4 h-4" />
                    <span>PIÙ ALTA O =</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">+{higherMult}x</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleHiloGuess('lower')}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center space-y-0.5"
                >
                  <div className="flex items-center space-x-1">
                    <ArrowDown className="w-4 h-4" />
                    <span>PIÙ BASSA O =</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">+{lowerMult}x</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleHiloSkip}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>SALTA CARTA</span>
                </button>

                <button
                  type="button"
                  onClick={handleHiloCashout}
                  disabled={hiloStreak === 0}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-1"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>INCASSA ({hiloCurrentPayout} G)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PROSSIMI GIOCHI CASINO TEASER                         */}
      {/* ======================================================== */}
      <div className="pt-2 space-y-2.5">
        <div className="flex items-center space-x-2 px-1">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider">
            PROSSIMI GIOCHI CASINO IN ARRIVO
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-lg">🚀</span>
            <h4 className="text-xs font-heading font-black text-white uppercase">CRASH / AVIATOR</h4>
            <p className="text-[10px] text-slate-400">Moltiplicatore a razzo esponenziale con cash out tempestivo.</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-lg">💣</span>
            <h4 className="text-xs font-heading font-black text-white uppercase">MINES</h4>
            <p className="text-[10px] text-slate-400">Griglia 5x5 con gemme lucenti e mine nascoste.</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-lg">🔴</span>
            <h4 className="text-xs font-heading font-black text-white uppercase">ROULETTE EUROPEA</h4>
            <p className="text-[10px] text-slate-400">Tavolo classico Rosso/Nero, Dozzine e Numeri secchi.</p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-lg">⚡</span>
            <h4 className="text-xs font-heading font-black text-white uppercase">PLINKO</h4>
            <p className="text-[10px] text-slate-400">Caduta su piramide a pioli con vasche moltiplicatrici.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
