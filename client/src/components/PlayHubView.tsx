import React from 'react';
import { ArrowLeft, Sparkles, Flame, ArrowRight } from 'lucide-react';
import { GameType, MatchData } from '../types/index.js';
import { LiveActivityTicker } from './LiveActivityTicker.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface PlayHubViewProps {
  onBack: () => void;
  matches: MatchData[];
  onSelectGame: (gameType: GameType) => void;
  onNavigateToDuels?: (gameType?: string) => void;
  onCreateMatchForGame: (gameType: GameType) => void;
}

export const PlayHubView: React.FC<PlayHubViewProps> = ({
  onBack,
  matches,
  onNavigateToDuels,
  onCreateMatchForGame,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  // Count open rooms per game
  const getOpenRoomsCount = (type: GameType) => {
    return matches.filter((m) => m.gameType === type && m.state === 'LOBBY' && !m.playerB).length;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-6 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header Row with Back Button */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            onBack();
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>{t('epic.back')}</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-heading font-black text-white uppercase tracking-wider">
            {t('epic.playHubTitle')}
          </h2>
        </div>

        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Live Winnings Ticker */}
      <LiveActivityTicker
        matches={matches}
        onSelectGame={(g) => {
          if (onNavigateToDuels) {
            onNavigateToDuels(g);
          } else {
            onCreateMatchForGame(g);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* Featured HOT Game in Play Hub: SPLIT OR STEAL                 */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onCreateMatchForGame('split');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-4 sm:p-5 shadow-xl border border-sky-400/40 cursor-pointer active:scale-[0.99] transition-all group"
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="space-y-1.5 max-w-[65%]">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-orange-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
              <span>{t('epic.hot')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              SPLIT OR STEAL
            </h3>

            <p className="text-xs text-sky-100/90 font-medium leading-tight">
              {t('playHub.splitDesc')}
            </p>

            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onCreateMatchForGame('split');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-sky-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('playHub.playNow')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                {t('playHub.openRooms', { count: getOpenRoomsCount('split') })}
              </span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <span className="text-3xl mb-0.5">🤝</span>
            <span className="text-[10px] font-heading font-black tracking-widest uppercase">
              {t('playHub.splitBadge')}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2x2 Grid of the 4 PVP Games                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Card 1: Russian Roulette */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('roulette');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-4 border border-emerald-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🎯
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
              {t('playHub.badgeRoulette')}
            </span>
            <h4 className="text-base font-heading font-black text-white">
              ROULETTE
            </h4>
            <p className="text-[10px] text-emerald-100 font-medium leading-tight line-clamp-2">
              {t('playHub.rouletteDesc')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/90">
              {t('playHub.openRooms', { count: getOpenRoomsCount('roulette') })}
            </span>
            <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>{t('playHub.playNow')}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Blackjack Face-Up */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('blackjack');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e11d48] to-[#881337] p-4 border border-rose-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🃏
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
              {t('playHub.badgeBlackjack')}
            </span>
            <h4 className="text-base font-heading font-black text-white">
              BLACKJACK
            </h4>
            <p className="text-[10px] text-pink-100 font-medium leading-tight line-clamp-2">
              {t('playHub.blackjackDesc')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/90">
              {t('playHub.openRooms', { count: getOpenRoomsCount('blackjack') })}
            </span>
            <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>{t('playHub.playNow')}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Glass Bridge */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('bridge');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0284c7] to-[#0c4a6e] p-4 border border-cyan-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🌉
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
              {t('playHub.badgeBridge')}
            </span>
            <h4 className="text-base font-heading font-black text-white">
              GLASS BRIDGE
            </h4>
            <p className="text-[10px] text-sky-100 font-medium leading-tight line-clamp-2">
              {t('playHub.bridgeDesc')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/90">
              {t('playHub.openRooms', { count: getOpenRoomsCount('bridge') })}
            </span>
            <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>{t('playHub.playNow')}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Chrono Blind */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('chrono');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#d97706] to-[#78350f] p-4 border border-amber-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            ⏱️
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
              {t('playHub.badgeChrono')}
            </span>
            <h4 className="text-base font-heading font-black text-white">
              CHRONO BLIND
            </h4>
            <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-2">
              {t('playHub.chronoDesc')}
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/90">
              {t('playHub.openRooms', { count: getOpenRoomsCount('chrono') })}
            </span>
            <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>{t('playHub.playNow')}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
