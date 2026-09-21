import React, { useState } from 'react';
import { Coins, TrendingUp, Swords } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

interface SpectatorOddsBarProps {
  oddsA: number;
  oddsB: number;
  totalBetsA: string;
  totalBetsB: string;
  onBet: (side: 'A' | 'B', amountTon: string) => void;
  disabled?: boolean;
  isPlayer?: boolean;
  playerAName?: string;
  playerBName?: string;
}

export const SpectatorOddsBar: React.FC<SpectatorOddsBarProps> = ({
  oddsA,
  oddsB,
  totalBetsA,
  totalBetsB,
  onBet,
  disabled = false,
  isPlayer = false,
  playerAName = 'PLAYER A',
  playerBName = 'PLAYER B',
}) => {
  const { triggerImpact } = useHaptics();
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');
  const [betAmount, setBetAmount] = useState<string>('1');

  const betsANum = Number(BigInt(totalBetsA || '0')) / 1e9;
  const betsBNum = Number(BigInt(totalBetsB || '0')) / 1e9;
  const total = betsANum + betsBNum;

  const pctA = total > 0 ? Math.round((betsANum / total) * 100) : 50;
  const pctB = 100 - pctA;

  const currentOdds = selectedSide === 'A' ? oddsA : oddsB;
  const parsedBet = parseFloat(betAmount || '0');
  const isOverMax = parsedBet > GAME_CONFIG.MAX_WAGER;
  const estimatedPayout = (parsedBet * currentOdds).toFixed(2);

  const handleQuickAmount = (val: string) => {
    triggerImpact('light');
    setBetAmount(val);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setBetAmount(val);
  };

  const handlePlaceBet = () => {
    if (parsedBet <= 0 || isOverMax) return;
    triggerImpact('medium');
    onBet(selectedSide, betAmount);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl mt-4 font-rajdhani">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-cyber-cyan" />
          <span className="text-xs font-orbitron font-bold text-slate-200 tracking-wider">
            {isPlayer ? 'PARI-MUTUEL ODDS (SPECTATORS)' : 'SPECTATOR TOTALIZER BETTING'}
          </span>
        </div>
        {!isPlayer ? (
          <div className="flex items-center space-x-1 text-xs font-chakra font-bold text-cyber-green bg-cyber-bg px-2.5 py-0.5 rounded-lg border border-cyber-border">
            <span>Est. payout: ~+{estimatedPayout}</span>
            <GramIcon className="w-3 h-3 text-cyber-green" />
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs font-chakra font-bold text-cyber-cyan bg-cyber-bg px-2.5 py-0.5 rounded-lg border border-cyber-border">
            <span>Live Pool</span>
          </div>
        )}
      </div>

      {/* Dynamic Odds Cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Side A */}
        {isPlayer ? (
          <div className="p-3 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                {playerAName}
              </span>
              <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                <span>{betsANum.toFixed(1)}</span>
                <GramIcon className="w-2.5 h-2.5 text-slate-400" />
              </span>
            </div>
            <div className="text-xl font-orbitron font-extrabold text-white mt-1">
              {oddsA.toFixed(2)}x
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              triggerImpact('light');
              setSelectedSide('A');
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 ${
              selectedSide === 'A'
                ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-cyan/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                {playerAName}
              </span>
              <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                <span>{betsANum.toFixed(1)}</span>
                <GramIcon className="w-2.5 h-2.5 text-slate-400" />
              </span>
            </div>
            <div className="text-xl font-orbitron font-extrabold text-white mt-1">
              {oddsA.toFixed(2)}x
            </div>
          </button>
        )}

        {/* Side B */}
        {isPlayer ? (
          <div className="p-3 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                {playerBName}
              </span>
              <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                <span>{betsBNum.toFixed(1)}</span>
                <GramIcon className="w-2.5 h-2.5 text-slate-400" />
              </span>
            </div>
            <div className="text-xl font-orbitron font-extrabold text-white mt-1">
              {oddsB.toFixed(2)}x
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              triggerImpact('light');
              setSelectedSide('B');
            }}
            className={`p-3 rounded-xl border text-left transition-all duration-200 ${
              selectedSide === 'B'
                ? 'bg-cyber-pink/15 border-cyber-pink shadow-[0_0_12px_rgba(255,0,85,0.25)]'
                : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-pink/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                {playerBName}
              </span>
              <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                <span>{betsBNum.toFixed(1)}</span>
                <GramIcon className="w-2.5 h-2.5 text-slate-400" />
              </span>
            </div>
            <div className="text-xl font-orbitron font-extrabold text-white mt-1">
              {oddsB.toFixed(2)}x
            </div>
          </button>
        )}
      </div>

      {/* Pool Distribution Bar */}
      <div className="w-full h-2.5 bg-cyber-bg rounded-full overflow-hidden flex mb-3 border border-cyber-border">
        <div
          style={{ width: `${pctA}%` }}
          className="bg-cyber-cyan h-full transition-all duration-500"
        />
        <div
          style={{ width: `${pctB}%` }}
          className="bg-cyber-pink h-full transition-all duration-500"
        />
      </div>

      {/* Notice for Duelists or Bet Controls for Spectators */}
      {isPlayer ? (
        <div className="p-3.5 rounded-xl bg-cyber-bg/70 border border-cyber-cyan/30 text-center flex items-center justify-center space-x-2.5">
          <Swords className="w-4 h-4 text-cyber-cyan shrink-0" />
          <span className="text-xs font-chakra text-slate-300">
            You are a duelist in this match: spectator betting is disabled for combatants.
          </span>
        </div>
      ) : (
        <>
          {/* Quick Stake Buttons Grid */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra">
              <span>Select or enter amount:</span>
              <span className="flex items-center space-x-1">
                <span>Max limit: {GAME_CONFIG.MAX_WAGER}</span>
                <GramIcon className="w-3 h-3 text-slate-400" />
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {GAME_CONFIG.PRESET_SPECTATOR_BETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickAmount(amt)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-chakra font-bold border transition-all flex items-center justify-center space-x-0.5 ${
                    betAmount === amt
                      ? 'bg-cyber-cyan/25 border-cyber-cyan text-cyber-cyan shadow-sm'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:text-white hover:border-cyber-border/80'
                  }`}
                >
                  <span>+{amt}</span>
                  <GramIcon className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>

            {/* Custom Input Field */}
            <div className="flex items-center space-x-2 bg-cyber-bg/70 border border-cyber-border rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400 font-chakra">Custom amount:</span>
              <input
                type="text"
                inputMode="decimal"
                value={betAmount}
                onChange={handleCustomInput}
                placeholder={`1 - ${GAME_CONFIG.MAX_WAGER}`}
                className="flex-1 bg-transparent text-sm font-chakra font-bold text-white text-right focus:outline-none"
              />
              <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
            </div>
            {isOverMax && (
              <p className="text-[11px] text-cyber-pink font-chakra">
                Warning: Maximum allowed bet is {GAME_CONFIG.MAX_WAGER} TON.
              </p>
            )}
          </div>

          {/* Place Bet Action Button */}
          <button
            onClick={handlePlaceBet}
            disabled={disabled || !betAmount || parsedBet <= 0 || isOverMax}
            className={`w-full py-3 px-4 rounded-xl font-orbitron font-bold uppercase tracking-wider text-xs transition-all shadow-lg active:scale-[0.98] ${
              disabled || !betAmount || parsedBet <= 0 || isOverMax
                ? 'bg-cyber-border text-cyber-muted cursor-not-allowed'
                : selectedSide === 'A'
                ? 'bg-cyber-cyan text-cyber-bg hover:brightness-110 shadow-neon-cyan'
                : 'bg-cyber-pink text-white hover:brightness-110 shadow-neon-pink'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Coins className="w-4 h-4 shrink-0" />
              <span>BET</span>
              <span className="inline-flex items-center font-chakra font-black text-sm space-x-0.5">
                <span>{betAmount || '0'}</span>
                <GramIcon className="w-3.5 h-3.5" />
              </span>
              <span>ON {selectedSide === 'A' ? playerAName : playerBName}</span>
            </div>
            <div className="text-[11px] font-chakra font-bold opacity-90 mt-0.5 flex items-center justify-center space-x-1">
              <span>Est. payout:</span>
              <span className="font-extrabold text-xs">+{estimatedPayout}</span>
              <GramIcon className="w-3 h-3" />
            </div>
          </button>
        </>
      )}
    </div>
  );
};
