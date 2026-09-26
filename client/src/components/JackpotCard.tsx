import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';

interface JackpotCardProps {
  amount?: string;
  currency?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export const JackpotCard: React.FC<JackpotCardProps> = ({
  amount: propAmount,
  currency = 'GRAM',
  label = 'TRUST JACKPOT',
  className = '',
  onClick,
}) => {
  const [liveAmount, setLiveAmount] = useState<string>('5.00');
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (propAmount) return;
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    const fetchJackpot = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/jackpot`);
        if (res.ok) {
          const data = await res.json();
          if (data?.trustJackpotGram) {
            setLiveAmount(data.trustJackpotGram);
            if (data.isActive !== undefined) {
              setIsActive(data.isActive);
            }
          }
        }
      } catch {}
    };

    fetchJackpot();
    const interval = setInterval(fetchJackpot, 10000);
    return () => clearInterval(interval);
  }, [propAmount]);

  const displayAmount = propAmount || liveAmount;

  return (
    <div
      onClick={onClick}
      className={`h-9 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border ${
        isActive
          ? 'border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
          : 'border-slate-500/40 opacity-80'
      } flex items-center space-x-2 select-none transition-all hover:border-amber-400/80 active:scale-95 cursor-pointer shrink-0 ${className}`}
      title="Jackpot della Fiducia (Split or Steal)"
    >
      <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
        <Trophy className="w-3.5 h-3.5 text-amber-300" />
      </div>

      <div className="flex flex-col justify-center text-left leading-none">
        <div className="flex items-center space-x-1">
          <span className="text-[8px] font-orbitron font-extrabold tracking-widest text-amber-300 uppercase">
            {label}
          </span>
          <Sparkles className="w-2.5 h-2.5 text-amber-300/80 animate-pulse" />
        </div>
        <div className="text-[11px] font-orbitron font-black text-white tracking-wide mt-0.5">
          <span>{displayAmount}</span>{' '}
          <span className="text-[9px] font-chakra text-amber-300 font-bold">{currency}</span>
        </div>
      </div>
    </div>
  );
};
