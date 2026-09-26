import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

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
  label: customLabel,
  className = '',
  onClick,
}) => {
  const { t } = useI18n();
  const [liveAmount, setLiveAmount] = useState<string>('5.00');
  const [isActive, setIsActive] = useState<boolean>(true);

  const label = customLabel || t('split.trustJackpot');

  useEffect(() => {
    if (propAmount) return;
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    const fetchJackpot = async () => {
      try {
        const url = serverUrl ? `${serverUrl}/api/jackpot` : `/api/jackpot`;
        const res = await fetch(url);
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
    const interval = setInterval(fetchJackpot, 6000);

    const handleCustomUpdate = (e: any) => {
      if (e?.detail?.amount) {
        setLiveAmount(e.detail.amount);
        if (e.detail.isActive !== undefined) setIsActive(e.detail.isActive);
      }
    };
    window.addEventListener('sfida_jackpot_update', handleCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sfida_jackpot_update', handleCustomUpdate);
    };
  }, [propAmount]);

  const displayAmount = propAmount || liveAmount;

  return (
    <div
      onClick={onClick}
      className={`h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center space-x-2 select-none transition-all hover:border-amber-300 active:scale-95 cursor-pointer shrink-0 max-w-[210px] ${className}`}
      title="Jackpot della Fiducia (Split or Steal)"
    >
      <div className="w-6 h-6 rounded-lg bg-amber-400/25 border border-amber-400/80 flex items-center justify-center shrink-0 shadow-sm">
        <Trophy className="w-3.5 h-3.5 text-amber-300" />
      </div>

      <div className="flex flex-col justify-center text-left leading-none min-w-0">
        <div className="flex items-center space-x-1 min-w-0">
          <span className="text-[8px] font-orbitron font-extrabold tracking-widest text-amber-300 uppercase truncate">
            {label}
          </span>
          <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0 animate-pulse" />
        </div>
        <div className="flex items-center space-x-1 mt-0.5">
          <div className="text-[11px] font-orbitron font-black text-white tracking-wide">
            <span>{displayAmount}</span>{' '}
            <span className="text-[9px] font-chakra text-amber-300 font-bold">{currency}</span>
          </div>
          {!isActive && (
            <span className="text-[7.5px] font-chakra font-bold text-amber-400/90 uppercase tracking-tighter bg-amber-500/20 px-1 py-0.2 rounded border border-amber-400/40">
              {t('split.chargingTag')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
