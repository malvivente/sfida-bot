import React, { useState } from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';

interface SpectatorOddsBarProps {
  oddsA: number;
  oddsB: number;
  totalBetsA: string;
  totalBetsB: string;
  onBet: (side: 'A' | 'B', amountTon: string) => void;
  disabled?: boolean;
}

export const SpectatorOddsBar: React.FC<SpectatorOddsBarProps> = ({
  oddsA,
  oddsB,
  totalBetsA,
  totalBetsB,
  onBet,
  disabled = false,
}) => {
  const { triggerImpact } = useHaptics();
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');
  const [betAmount, setBetAmount] = useState<string>('1');

  const betsANum = Number(BigInt(totalBetsA || '0')) / 1e9;
  const betsBNum = Number(BigInt(totalBetsB || '0')) / 1e9;
  const total = betsANum + betsBNum;

  const pctA = total > 0 ? Math.round((betsANum / total) * 100) : 50;
  const pctB = 100 - pctA;

  const handleQuickAmount = (val: string) => {
    triggerImpact('light');
    setBetAmount(val);
  };

  const handlePlaceBet = () => {
    triggerImpact('medium');
    onBet(selectedSide, betAmount);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-cyber-cyan" />
          <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">
            LIVE PARI-MUTUEL TOTALIZER
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyber-muted bg-cyber-bg px-2 py-0.5 rounded border border-cyber-border">
          6% TOTAL RAKE
        </span>
      </div>

      {/* Dynamic Odds Cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Side A */}
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
            <span className="text-xs font-mono text-cyber-cyan">PLAYER A</span>
            <span className="text-[10px] text-slate-400 font-mono">{betsANum.toFixed(1)} TON</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-white mt-1">
            {oddsA.toFixed(2)}x
          </div>
        </button>

        {/* Side B */}
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
            <span className="text-xs font-mono text-cyber-pink">PLAYER B</span>
            <span className="text-[10px] text-slate-400 font-mono">{betsBNum.toFixed(1)} TON</span>
          </div>
          <div className="text-xl font-mono font-extrabold text-white mt-1">
            {oddsB.toFixed(2)}x
          </div>
        </button>
      </div>

      {/* Pool Distribution Bar */}
      <div className="w-full h-2.5 bg-cyber-bg rounded-full overflow-hidden flex mb-4 border border-cyber-border">
        <div
          style={{ width: `${pctA}%` }}
          className="bg-cyber-cyan h-full transition-all duration-500"
        />
        <div
          style={{ width: `${pctB}%` }}
          className="bg-cyber-pink h-full transition-all duration-500"
        />
      </div>

      {/* Quick Stake Buttons */}
      <div className="flex items-center space-x-2 mb-3">
        {['0.5', '1', '2', '5'].map((amt) => (
          <button
            key={amt}
            onClick={() => handleQuickAmount(amt)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
              betAmount === amt
                ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan'
                : 'bg-cyber-bg border-cyber-border text-slate-400 hover:text-white'
            }`}
          >
            +{amt} TON
          </button>
        ))}
      </div>

      {/* Place Bet Action */}
      <button
        onClick={handlePlaceBet}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-all ${
          disabled
            ? 'bg-cyber-border text-cyber-muted cursor-not-allowed'
            : selectedSide === 'A'
            ? 'bg-cyber-cyan text-cyber-bg hover:brightness-110 shadow-neon-cyan active:scale-95'
            : 'bg-cyber-pink text-white hover:brightness-110 shadow-neon-pink active:scale-95'
        }`}
      >
        <Coins className="w-4 h-4" />
        <span>
          WAGER {betAmount} TON ON PLAYER {selectedSide} ({selectedSide === 'A' ? oddsA : oddsB}x)
        </span>
      </button>
    </div>
  );
};
