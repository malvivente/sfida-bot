import React from 'react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface LiveActivityTickerProps {
  matches: MatchData[];
  onSelectGame?: (gameType: GameType | 'ALL') => void;
  onJoinMatch?: (match: MatchData) => void;
}

export const LiveActivityTicker: React.FC<LiveActivityTickerProps> = ({
  matches,
  onSelectGame,
  onJoinMatch,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  // Find open matches waiting for an opponent
  const openMatches = matches.filter((m) => m.state === 'LOBBY' && !m.playerB);

  // Quick game discipline chips
  const GAME_CHIPS = [
    {
      id: 'split' as GameType,
      icon: '🤝',
      title: 'Split',
      bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      border: 'border-purple-400/40',
      badge: 'JACKPOT',
    },
    {
      id: 'roulette' as GameType,
      icon: '🎯',
      title: 'Roulette',
      bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      border: 'border-cyan-400/40',
      badge: '8 CHAMBER',
    },
    {
      id: 'bridge' as GameType,
      icon: '🌉',
      title: 'Bridge',
      bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      border: 'border-emerald-400/40',
      badge: 'ENDLESS',
    },
    {
      id: 'chrono' as GameType,
      icon: '⏱️',
      title: 'Chrono',
      bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      border: 'border-amber-400/40',
      badge: 'BLIND',
    },
    {
      id: 'blackjack' as GameType,
      icon: '🃏',
      title: 'Blackjack',
      bg: 'bg-gradient-to-br from-rose-500 to-pink-600',
      border: 'border-rose-400/40',
      badge: '21 DUEL',
    },
  ];

  return (
    <div className="w-full flex items-center space-x-2.5 overflow-hidden py-1">
      {/* Live Badge Pillar */}
      <div className="flex items-center space-x-1.5 px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-[11px] font-heading font-extrabold text-white tracking-wider uppercase">
          {t('epic.live')}
        </span>
      </div>

      {/* Horizontal Scrolling Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 -my-1 pr-2">
        {/* If there are open matches waiting for opponent, show them with glowing highlight */}
        {openMatches.slice(0, 3).map((match) => {
          const gType = match.gameType || 'roulette';
          const meta = GAMES_METADATA[gType] || GAMES_METADATA.roulette;
          const wager = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(1);

          return (
            <button
              key={match.matchId}
              onClick={() => {
                triggerImpact('medium');
                onJoinMatch?.(match);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-400/50 hover:border-amber-400 shrink-0 text-left active:scale-95 transition-all shadow-sm group"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center text-xs">
                ⚔️
              </div>
              <div className="leading-tight">
                <div className="text-[10px] font-heading font-bold text-amber-300 uppercase tracking-wide truncate max-w-[90px]">
                  {meta.title}
                </div>
                <div className="text-[11px] font-extrabold text-white flex items-center space-x-0.5">
                  <span>{wager}</span>
                  <GramIcon className="w-2.5 h-2.5 text-amber-400" />
                </div>
              </div>
            </button>
          );
        })}

        {/* Game Discipline Squircles */}
        {GAME_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => {
              triggerImpact('light');
              onSelectGame?.(chip.id);
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl ${chip.bg} border ${chip.border} shrink-0 text-white active:scale-95 transition-all shadow-md group hover:brightness-110`}
          >
            <span className="text-sm select-none">{chip.icon}</span>
            <div className="leading-tight text-left">
              <span className="text-[11px] font-heading font-extrabold tracking-wide uppercase block">
                {chip.title}
              </span>
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-tight block">
                {chip.badge}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
