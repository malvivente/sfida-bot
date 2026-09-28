import React from 'react';
import { ArrowLeft, Sparkles, Flame, Swords, ShieldAlert, Clock, Shuffle, ArrowRight } from 'lucide-react';
import { GameType, MatchData } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { LiveActivityTicker } from './LiveActivityTicker.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface PlayHubViewProps {
  onBack: () => void;
  matches: MatchData[];
  onSelectGame: (gameType: GameType) => void;
  onCreateMatchForGame: (gameType: GameType) => void;
}

export const PlayHubView: React.FC<PlayHubViewProps> = ({
  onBack,
  matches,
  onSelectGame,
  onCreateMatchForGame,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  // Count open rooms per game
  const getOpenRoomsCount = (type: GameType) => {
    return matches.filter((m) => m.gameType === type && m.state === 'LOBBY' && !m.playerB).length;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-6 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Top Header Row with Back Button */}
      <div className="flex items-center justify-between px-1">
        <button
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
        onSelectGame={(g) => onSelectGame(g)}
      />

      {/* Featured Game Card in Play Hub (Russian Roulette - Electric Green/Cyan) */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onSelectGame('roulette');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 p-4 sm:p-5 shadow-lg border border-emerald-400/40 cursor-pointer active:scale-[0.99] transition-all group"
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="space-y-1.5 max-w-[65%]">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Flame className="w-3 h-3 fill-emerald-600 text-emerald-600" />
              <span>{t('epic.hot')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              RUSSIAN ROULETTE
            </h3>

            <p className="text-xs text-emerald-100/90 font-medium leading-tight">
              {t('playHub.rouletteDesc')}
            </p>

            <div className="pt-1 flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {t('playHub.openRooms', { count: getOpenRoomsCount('roulette') })}
              </span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <span className="text-3xl mb-0.5">🎯</span>
            <span className="text-[10px] font-heading font-black tracking-widest uppercase">
              {t('playHub.rouletteBadge')}
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid of Game Cards matching Epic Gift Play Hub Page */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Card 1: Blackjack Face-Up (Electric Rose/Pink) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onSelectGame('blackjack');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e11d48] to-[#881337] p-4 border border-rose-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />

          {/* Top visual graphic / illustration */}
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🃏
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-base font-heading font-black text-white">
                Blackjack
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[9px] font-black uppercase">
                21
              </span>
            </div>

            <p className="text-[11px] text-rose-100 font-medium leading-tight">
              {t('playHub.blackjackDesc')}
            </p>

            <span className="text-[10px] text-rose-200/90 font-bold block pt-1">
              {t('playHub.openRooms', { count: getOpenRoomsCount('blackjack') })}
            </span>
          </div>
        </div>

        {/* Card 2: Endless Glass Bridge (Lush Emerald/Teal) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onSelectGame('bridge');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#059669] to-[#064e3b] p-4 border border-emerald-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🌉
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-base font-heading font-black text-white">
                Glass Bridge
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/30 text-emerald-200 text-[9px] font-black uppercase">
                ENDLESS
              </span>
            </div>

            <p className="text-[11px] text-emerald-100 font-medium leading-tight">
              {t('playHub.bridgeDesc')}
            </p>

            <span className="text-[10px] text-emerald-200/90 font-bold block pt-1">
              {t('playHub.openRooms', { count: getOpenRoomsCount('bridge') })}
            </span>
          </div>
        </div>

        {/* Card 3: Chrono Blind (Sunset Amber/Orange) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onSelectGame('chrono');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#d97706] to-[#7c2d12] p-4 border border-amber-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            ⏱️
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-base font-heading font-black text-white">
                Chrono Blind
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400/30 text-amber-200 text-[9px] font-black uppercase">
                STOP
              </span>
            </div>

            <p className="text-[11px] text-amber-100 font-medium leading-tight">
              {t('playHub.chronoDesc')}
            </p>

            <span className="text-[10px] text-amber-200/90 font-bold block pt-1">
              {t('playHub.openRooms', { count: getOpenRoomsCount('chrono') })}
            </span>
          </div>
        </div>

        {/* Card 4: Split or Steal (Lush Violet/Purple) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onSelectGame('split');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#3b0764] p-4 border border-purple-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
        >
          <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-purple-400/25 blur-2xl pointer-events-none" />

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl shadow-md mb-2">
            🤝
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <h4 className="text-base font-heading font-black text-white">
                Split or Steal
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-400/30 text-purple-200 text-[9px] font-black uppercase">
                JACKPOT
              </span>
            </div>

            <p className="text-[11px] text-purple-100 font-medium leading-tight">
              {t('playHub.splitDesc')}
            </p>

            <span className="text-[10px] text-purple-200/90 font-bold block pt-1">
              {t('playHub.openRooms', { count: getOpenRoomsCount('split') })}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
