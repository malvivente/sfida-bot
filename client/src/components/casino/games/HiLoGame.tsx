import React, { useState } from 'react';
import { Layers, ArrowDown, ArrowUp, RefreshCw, Trophy, ShieldCheck, Zap, XCircle } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { HILO_CARD_RANKS, getCardRankValue, calculateHiLoMultipliers, recordCasinoOutcome } from '../casinoEngine.js';

interface HiLoGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

interface HiLoCard {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: string;
}

export const HiLoGame: React.FC<HiLoGameProps> = ({
  currentBalance,
  isDemoMode,
  onUpdateBalance,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wager, setWager] = useState<string>('1.0');
  const [inRound, setInRound] = useState<boolean>(false);
  const [currentCard, setCurrentCard] = useState<HiLoCard>({ suit: '♠', rank: '7' });
  const [nextCard, setNextCard] = useState<HiLoCard | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [cardHistory, setCardHistory] = useState<HiLoCard[]>([
    { suit: '♠', rank: '7' },
  ]);
  const [resultBanner, setResultBanner] = useState<{
    type: 'win' | 'loss';
    text: string;
    amount?: number;
    multiplier?: number;
  } | null>(null);

  const parsedWager = Math.max(0.1, parseFloat(wager) || 0.1);
  const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];

  const getRandomCard = (): HiLoCard => {
    const s = suits[Math.floor(Math.random() * suits.length)];
    const r = HILO_CARD_RANKS[Math.floor(Math.random() * HILO_CARD_RANKS.length)];
    return { suit: s, rank: r };
  };

  const { higher: higherMult, lower: lowerMult } = calculateHiLoMultipliers(currentCard.rank);
  const currentPayout = parseFloat((parsedWager * currentMultiplier).toFixed(2));

  const handleStartRound = () => {
    if (inRound) return;
    if (currentBalance < parsedWager) {
      triggerNotification('error');
      return;
    }

    triggerImpact('heavy');
    setResultBanner(null);
    onUpdateBalance(-parsedWager);

    const initial = getRandomCard();
    setCurrentCard(initial);
    setNextCard(null);
    setCurrentMultiplier(1.0);
    setStreakCount(0);
    setCardHistory([initial]);
    setInRound(true);
  };

  const handleGuess = (direction: 'higher' | 'lower') => {
    if (!inRound) return;

    triggerImpact('light');
    const newCard = getRandomCard();
    setNextCard(newCard);

    const oldVal = getCardRankValue(currentCard.rank);
    const newVal = getCardRankValue(newCard.rank);

    let won = false;
    if (direction === 'higher') {
      won = newVal >= oldVal;
    } else {
      won = newVal <= oldVal;
    }

    if (won) {
      triggerImpact('light');
      const stepMult = direction === 'higher' ? higherMult : lowerMult;
      const updatedMult = parseFloat((currentMultiplier * (stepMult * 0.96)).toFixed(2));
      setCurrentMultiplier(updatedMult);
      setStreakCount((s) => s + 1);
      setCurrentCard(newCard);
      setCardHistory((prev) => [newCard, ...prev.slice(0, 5)]);
    } else {
      triggerNotification('error');
      setInRound(false);
      recordCasinoOutcome(false, -parsedWager);
      setResultBanner({
        type: 'loss',
        text: `PERSO! -${parsedWager.toFixed(2)} G`,
        amount: parsedWager,
      });
    }
  };

  const handleSkip = () => {
    if (!inRound) return;
    triggerImpact('light');
    const skipped = getRandomCard();
    setCurrentCard(skipped);
    setCardHistory((prev) => [skipped, ...prev.slice(0, 5)]);
  };

  const handleCashout = () => {
    if (!inRound || streakCount === 0) return;

    triggerNotification('success');
    triggerImpact('heavy');

    const payout = currentPayout;
    onUpdateBalance(payout);
    recordCasinoOutcome(true, payout - parsedWager);
    setResultBanner({
      type: 'win',
      text: `CASHED OUT! +${payout.toFixed(2)} G!`,
      amount: payout,
      multiplier: currentMultiplier,
    });
    setInRound(false);
  };

  const isRedSuit = (suit: string) => suit === '♥' || suit === '♦';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* HiLo Card Visual Arena Box */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181a24] to-[#0f1118] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
        {/* Top History Ribbon */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 font-mono">STORICO:</span>
          <div className="flex items-center space-x-1">
            {cardHistory.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isRedSuit(c.suit) ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white'
                }`}
              >
                {c.rank}{c.suit}
              </span>
            ))}
          </div>
        </div>

        {/* Top History */}

        {/* Classic White Playing Card */}
        <div className="flex items-center space-x-3 my-3">
          <div
            className={`w-28 h-40 rounded-2xl p-3 flex flex-col justify-between shadow-[0_10px_35px_rgba(0,0,0,0.6)] border-2 transition-all bg-white ${
              isRedSuit(currentCard.suit)
                ? 'text-rose-600 border-rose-200 shadow-rose-950/30'
                : 'text-slate-950 border-slate-300 shadow-slate-900/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl font-mono font-black leading-none">{currentCard.rank}</span>
              <span className="text-xl leading-none">{currentCard.suit}</span>
            </div>
            <div className="text-center text-5xl font-black">{currentCard.suit}</div>
            <div className="flex justify-between items-end rotate-180">
              <span className="text-2xl font-mono font-black leading-none">{currentCard.rank}</span>
              <span className="text-xl leading-none">{currentCard.suit}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-heading font-extrabold text-slate-300">
          <span>STREAK: <strong className="text-amber-400">{streakCount}</strong></span>
          <span>•</span>
          <span>MOLTIPLICATORE: <strong className="text-emerald-400">{currentMultiplier.toFixed(2)}x</strong></span>
        </div>

        {/* Dynamic Cashout / Loss Banner */}
        {resultBanner && (
          <div className="mt-2.5 animate-in zoom-in-95 duration-200">
            {resultBanner.type === 'win' ? (
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>{resultBanner.text}</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full bg-rose-500/25 border-2 border-rose-500 text-rose-300 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>{resultBanner.text}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        {inRound ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGuess('higher')}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-0.5"
              >
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-4 h-4" />
                  <span>PIÙ ALTA (HIGHER)</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">+{higherMult}x</span>
              </button>

              <button
                type="button"
                onClick={() => handleGuess('lower')}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex flex-col items-center justify-center space-y-0.5"
              >
                <div className="flex items-center space-x-1">
                  <ArrowDown className="w-4 h-4" />
                  <span>PIÙ BASSA (LOWER)</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">+{lowerMult}x</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSkip}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>SALTA CARTA</span>
              </button>

              <button
                type="button"
                disabled={streakCount === 0}
                onClick={handleCashout}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-1"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>INCASSA ({currentPayout} G)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Wager row */}
            <div>
              <div className="flex items-center justify-between text-xs font-heading font-extrabold uppercase text-slate-300 mb-1.5">
                <span>IMPORTO PUNTATA</span>
                <span className="text-[11px] font-mono text-amber-400">
                  SALDO: {currentBalance.toFixed(2)} {isDemoMode ? 'CHIP' : 'GRAM'}
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
                    className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-500 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <GramIcon className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Quick Multipliers */}
                <div className="flex items-center space-x-1">
                  {[0.5, 1, 5].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setWager(amt.toString());
                      }}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold active:scale-95"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={currentBalance < parsedWager}
              onClick={handleStartRound}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Layers className="w-5 h-5" />
              <span>DISTRIBUISCI CARTA ({parsedWager} GRAM)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
