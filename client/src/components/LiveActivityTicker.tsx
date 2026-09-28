import React, { useMemo, useEffect, useState } from 'react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

export interface WinItem {
  id: string;
  winnerName: string;
  gameType: GameType;
  payoutGram: string;
  timestamp: number;
  isNew?: boolean;
}

interface LiveActivityTickerProps {
  matches: MatchData[];
  onSelectGame?: (gameType: GameType) => void;
  newWinEvent?: WinItem | null;
}

// Initial fallback past victories to ensure the live bar is vibrant on launch
const SEED_WINS: WinItem[] = [
  { id: 'seed-1', winnerName: 'Tonner', gameType: 'split', payoutGram: '12.50', timestamp: Date.now() - 45000 },
  { id: 'seed-2', winnerName: 'Alex_K', gameType: 'roulette', payoutGram: '4.00', timestamp: Date.now() - 90000 },
  { id: 'seed-3', winnerName: 'Degen_99', gameType: 'chrono', payoutGram: '2.00', timestamp: Date.now() - 130000 },
  { id: 'seed-4', winnerName: 'CryptoSam', gameType: 'bridge', payoutGram: '6.00', timestamp: Date.now() - 180000 },
  { id: 'seed-5', winnerName: 'Mike_TON', gameType: 'blackjack', payoutGram: '10.00', timestamp: Date.now() - 240000 },
];

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({
  matches,
  onSelectGame,
  newWinEvent,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [winsList, setWinsList] = useState<WinItem[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_recent_wins');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_WINS;
  });

  // Extract settled matches from matches feed and add to wins list
  useEffect(() => {
    const settledMatches = matches.filter(
      (m) => (m.state === 'MATCH_SETTLED' || Boolean(m.winnerAddress) || Boolean(m.winnerName)) && m.playerA
    );

    if (settledMatches.length > 0) {
      setWinsList((prev) => {
        const updated = [...prev];
        for (const m of settledMatches) {
          const winId = `match-win-${m.matchId}`;
          if (!updated.some((w) => w.id === winId)) {
            const winnerName = (m as any).winnerName || m.playerA.name || 'Warrior';
            const payout = (parseFloat(m.wagerAmountNano) * 2 / 1e9).toFixed(2);
            updated.unshift({
              id: winId,
              winnerName: winnerName.replace(/^@/, ''),
              gameType: m.gameType || 'roulette',
              payoutGram: payout,
              timestamp: Date.now(),
              isNew: true,
            });
          }
        }
        const trimmed = updated.slice(0, 15);
        try {
          localStorage.setItem('sfidabot_recent_wins', JSON.stringify(trimmed));
        } catch {}
        return trimmed;
      });
    }
  }, [matches]);

  // When a live win socket event comes in
  useEffect(() => {
    if (!newWinEvent) return;
    setWinsList((prev) => {
      const updated = [{ ...newWinEvent, isNew: true }, ...prev.filter((w) => w.id !== newWinEvent.id)].slice(0, 15);
      try {
        localStorage.setItem('sfidabot_recent_wins', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [newWinEvent]);

  // Color styles for game types matching the jewel-toned look
  const getGameStyle = (gameType: GameType) => {
    switch (gameType) {
      case 'split':
        return {
          bg: 'bg-gradient-to-br from-purple-600/80 to-indigo-800/80',
          border: 'border-purple-400/40',
          icon: '🤝',
        };
      case 'roulette':
        return {
          bg: 'bg-gradient-to-br from-cyan-600/80 to-blue-800/80',
          border: 'border-cyan-400/40',
          icon: '🎯',
        };
      case 'bridge':
        return {
          bg: 'bg-gradient-to-br from-emerald-600/80 to-teal-800/80',
          border: 'border-emerald-400/40',
          icon: '🌉',
        };
      case 'chrono':
        return {
          bg: 'bg-gradient-to-br from-amber-600/80 to-orange-800/80',
          border: 'border-amber-400/40',
          icon: '⏱️',
        };
      case 'blackjack':
        return {
          bg: 'bg-gradient-to-br from-rose-600/80 to-pink-800/80',
          border: 'border-rose-400/40',
          icon: '🃏',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-indigo-600/80 to-purple-800/80',
          border: 'border-indigo-400/40',
          icon: '⚔️',
        };
    }
  };

  return (
    <div className="w-full flex items-center space-x-2 overflow-hidden py-1 select-none">
      {/* Fixed 'Live 🟢' Pill */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-[11px] font-heading font-extrabold text-white tracking-wider uppercase">
          {t('epic.live')}
        </span>
      </div>

      {/* Horizontal Scrolling Stream of User Winnings */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 -my-1 pr-2">
        {winsList.map((win) => {
          const style = getGameStyle(win.gameType);
          const meta = GAMES_METADATA[win.gameType] || GAMES_METADATA.roulette;

          return (
            <button
              key={win.id}
              onClick={() => {
                triggerImpact('light');
                onSelectGame?.(win.gameType);
              }}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl ${style.bg} border ${style.border} shrink-0 text-white active:scale-95 transition-all shadow-sm hover:brightness-110 group ${
                win.isNew ? 'ring-2 ring-amber-400 animate-bounce' : ''
              }`}
              title={`${win.winnerName} ${t('epic.won')} ${win.payoutGram} GRAM su ${meta.title}`}
            >
              {/* Game Icon */}
              <span className="text-sm shrink-0 drop-shadow-sm">{style.icon}</span>

              {/* Winner Name & Amount Won */}
              <div className="text-left leading-tight">
                <span className="text-[10px] font-heading font-bold text-white/90 truncate max-w-[70px] sm:max-w-[90px] block">
                  {win.winnerName}
                </span>
                <span className="text-[11px] font-heading font-black text-amber-300 flex items-center space-x-0.5">
                  <span>+{win.payoutGram}</span>
                  <GramIcon className="w-2.5 h-2.5 text-amber-300 inline" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
