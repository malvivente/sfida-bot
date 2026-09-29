import React, { useMemo, useEffect, useState } from 'react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { GramIcon } from './GramIcon.js';
import { GameIcon } from './GameIcon.js';
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
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Fetch real global platform wins from server
  useEffect(() => {
    const fetchRecentWins = async () => {
      try {
        const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
        const res = await fetch(`${serverUrl}/api/recent-wins`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.wins) && data.wins.length > 0) {
            setWinsList((prev) => {
              const incoming: WinItem[] = data.wins.map((w: any) => ({
                id: w.id,
                winnerName: w.winnerName,
                gameType: (w.gameType || 'roulette') as GameType,
                payoutGram: w.payoutGram,
                timestamp: w.timestamp,
                isNew: false,
              }));

              const map = new Map<string, WinItem>();
              for (const item of incoming) {
                map.set(item.id, item);
              }
              // Preserve any unexpired fresh live wins at the top
              for (const item of prev) {
                if (item.isNew) {
                  map.set(item.id, item);
                }
              }

              const merged = Array.from(map.values()).slice(0, 15);
              try {
                localStorage.setItem('sfidabot_recent_wins', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch {}
    };

    fetchRecentWins();
    const interval = setInterval(fetchRecentWins, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live global win event from WebSocket
  useEffect(() => {
    const handleGlobalWin = (e: any) => {
      const winData = e?.detail;
      if (!winData?.winnerName) return;

      const newWin: WinItem = {
        id: winData.id || `win_${Date.now()}`,
        winnerName: winData.winnerName.replace(/^@/, ''),
        gameType: (winData.gameType || 'roulette') as GameType,
        payoutGram: winData.payoutGram || '1.92',
        timestamp: winData.timestamp || Date.now(),
        isNew: true,
      };

      setWinsList((prev) => {
        const updated = [newWin, ...prev.filter((w) => w.id !== newWin.id)].slice(0, 15);
        try {
          localStorage.setItem('sfidabot_recent_wins', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setTimeout(() => {
        setWinsList((prev) => prev.map((w) => (w.id === newWin.id ? { ...w, isNew: false } : w)));
      }, 15000);
    };

    window.addEventListener('sfida_global_win', handleGlobalWin);
    return () => window.removeEventListener('sfida_global_win', handleGlobalWin);
  }, []);

  // When a live win prop event comes in
  useEffect(() => {
    if (!newWinEvent) return;
    setWinsList((prev) => {
      const updated = [{ ...newWinEvent, isNew: true }, ...prev.filter((w) => w.id !== newWinEvent.id)].slice(0, 15);
      try {
        localStorage.setItem('sfidabot_recent_wins', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const timer = setTimeout(() => {
      setWinsList((prev) => prev.map((w) => (w.id === newWinEvent.id ? { ...w, isNew: false } : w)));
    }, 15000);
    return () => clearTimeout(timer);
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
    <div className="w-full flex items-center space-x-2 py-1 select-none">
      {/* Fixed 'Live 🟢' Pill */}
      <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-[11px] font-heading font-extrabold text-white tracking-wider uppercase">
          {t('epic.live')}
        </span>
      </div>

      {/* Horizontal Scrolling Stream of User Winnings */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-2 px-1 -my-2 flex-1">
        {winsList.length === 0 ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 font-sans italic w-full">
            <span>{t('epic.noRecentWins')}</span>
          </div>
        ) : (
          winsList.map((win, idx) => {
            const style = getGameStyle(win.gameType);
            const meta = GAMES_METADATA[win.gameType] || GAMES_METADATA.roulette;
            const isLatest = idx === 0 && win.isNew;

            return (
              <button
                key={win.id}
                onClick={() => {
                  triggerImpact('light');
                  onSelectGame?.(win.gameType);
                }}
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl ${style.bg} border ${style.border} shrink-0 text-white active:scale-95 transition-all shadow-sm hover:brightness-110 group ${
                  isLatest
                    ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)] animate-pulse'
                    : ''
                }`}
                title={`${win.winnerName} ${t('epic.won')} ${win.payoutGram} GRAM su ${meta.title}`}
              >
                {/* Game SVG Icon */}
                <div className="w-5 h-5 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                  <GameIcon type={win.gameType} className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                </div>

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
          })
        )}
      </div>
    </div>
  );
};
