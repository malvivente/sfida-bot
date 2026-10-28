import React, { useState } from 'react';
import { Disc, Trophy, ShieldCheck, Play, RefreshCw, Zap } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics.js';
import { useI18n } from '../../../i18n/index.js';
import { GramIcon } from '../../GramIcon.js';
import { spinRoulette, ROULETTE_NUMBERS, recordCasinoOutcome } from '../casinoEngine.js';

interface RouletteGameProps {
  currentBalance: number;
  isDemoMode: boolean;
  onUpdateBalance: (delta: number) => void;
}

type BetType = 'RED' | 'BLACK' | 'EVEN' | 'ODD' | 'LOW' | 'HIGH' | 'NUMBER';

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
  const [winningResult, setWinningResult] = useState<{ number: number; color: 'green' | 'red' | 'black' } | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

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

    // Spin animation delay
    setTimeout(() => {
      const outcome = spinRoulette();
      setWinningResult(outcome);
      setIsSpinning(false);

      // Check win condition
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
    }, 1500);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Roulette Wheel Visual Box */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#141829] to-[#0d0f18] border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center min-h-[220px]">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs font-heading font-extrabold">
          <div className="flex items-center space-x-1.5 text-amber-400">
            <Disc className="w-4 h-4" />
            <span>ROULETTE EUROPEA (37 NUMERI)</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-400 font-mono text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>RTP 97.3% (HOUSE 2.7%)</span>
          </div>
        </div>

        {/* Wheel Display Animation */}
        <div className="relative my-4 flex flex-col items-center">
          <div
            className={`w-28 h-28 rounded-full border-4 border-amber-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.25)] transition-all ${
              isSpinning ? 'animate-spin border-amber-400 duration-500' : ''
            }`}
          >
            {winningResult ? (
              <div
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-mono font-black text-2xl shadow-inner ${
                  winningResult.color === 'green'
                    ? 'bg-emerald-600 text-white'
                    : winningResult.color === 'red'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-white border border-white/20'
                }`}
              >
                <span>{winningResult.number}</span>
                <span className="text-[9px] uppercase tracking-wider font-heading opacity-80">
                  {winningResult.color}
                </span>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center text-amber-400">
                <Disc className="w-10 h-10" />
              </div>
            )}
          </div>

          {winningResult && (
            <div className="mt-3 text-center">
              {lastWinAmount ? (
                <span className="text-xs font-heading font-black text-emerald-400 uppercase tracking-wider">
                  🏆 VITTORIA! INCASSO: +{lastWinAmount} GRAM
                </span>
              ) : (
                <span className="text-xs font-heading font-black text-rose-400 uppercase tracking-wider">
                  NUMERO ESTRATTO: {winningResult.number} ({winningResult.color.toUpperCase()})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Betting Board */}
      <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 shadow-xl">
        {/* Outside Bets Grid */}
        <div>
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            PUNTATE ESTERNE (PAYOUT 1.95x)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'RED', label: 'ROSSO', bg: 'bg-rose-600 hover:bg-rose-500 text-white' },
              { type: 'BLACK', label: 'NERO', bg: 'bg-slate-900 hover:bg-slate-800 text-white border border-white/20' },
              { type: 'EVEN', label: 'PARI', bg: 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200' },
              { type: 'ODD', label: 'DISPARI', bg: 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200' },
              { type: 'LOW', label: '1 - 18', bg: 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200' },
              { type: 'HIGH', label: '19 - 36', bg: 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-200' },
            ].map((b) => (
              <button
                key={b.type}
                type="button"
                disabled={isSpinning}
                onClick={() => {
                  triggerImpact('light');
                  setSelectedBetType(b.type as BetType);
                }}
                className={`py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all active:scale-95 border ${
                  selectedBetType === b.type
                    ? 'ring-2 ring-amber-400 border-amber-400 scale-[1.02] shadow-md'
                    : 'border-white/10'
                } ${b.bg}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Straight Up Number Bet Option */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider">
              NUMERO SECCO (PAYOUT 35x)
            </span>
            <button
              type="button"
              onClick={() => setSelectedBetType('NUMBER')}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                selectedBetType === 'NUMBER' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              SELEZIONA NUMERO
            </button>
          </div>

          {selectedBetType === 'NUMBER' && (
            <div className="flex items-center space-x-2 pt-1 animate-in fade-in">
              <span className="text-xs font-heading font-bold text-slate-300">NUMERO:</span>
              <input
                type="number"
                min="0"
                max="36"
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(Math.max(0, Math.min(36, parseInt(e.target.value) || 0)))}
                className="w-20 bg-black/60 border border-amber-400/50 rounded-xl px-2 py-1 text-center font-mono font-bold text-white text-sm"
              />
              <span className="text-[11px] font-mono text-amber-300">VINCITA POTENZIALE: {(parsedWager * 35).toFixed(2)} G</span>
            </div>
          )}
        </div>

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
                disabled={isSpinning}
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
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
                  disabled={isSpinning}
                  onClick={() => {
                    triggerImpact('light');
                    setWager(amt.toString());
                  }}
                  className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold active:scale-95 disabled:opacity-40"
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={isSpinning || currentBalance < parsedWager}
          onClick={handleSpin}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
        >
          <Disc className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? 'RUOTA IN MOVIMENTO...' : `GIRA RUOTA (${parsedWager} GRAM)`}</span>
        </button>
      </div>
    </div>
  );
};
