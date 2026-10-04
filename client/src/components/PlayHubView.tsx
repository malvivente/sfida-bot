import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, ArrowRight, Zap, Target } from 'lucide-react';
import { GameType, MatchData } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface PlayHubViewProps {
  onBack: () => void;
  matches: MatchData[];
  onSelectGame: (gameType: GameType) => void;
  onNavigateToDuels?: (gameType?: string) => void;
  onCreateMatchForGame: (gameType: GameType) => void;
  initialSection?: 'all' | 'quick' | 'strategy';
}

export const PlayHubView: React.FC<PlayHubViewProps> = ({
  onBack,
  matches,
  onNavigateToDuels,
  onCreateMatchForGame,
  initialSection = 'all',
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [activeCategory, setActiveCategory] = useState<'all' | 'quick' | 'strategy'>(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveCategory(initialSection);
    }
  }, [initialSection]);

  // Count open rooms per game
  const getOpenRoomsCount = (type: GameType) => {
    return matches.filter((m) => m.gameType === type && m.state === 'LOBBY' && !m.playerB).length;
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-8 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header Row with Back Button */}
      <div className="flex items-center px-1">
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
      </div>

      {/* Category Filter Switcher Tabs */}
      <div className="flex items-center justify-between p-1 bg-black/40 border border-white/10 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('all');
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-heading font-black uppercase tracking-wider transition-all text-center ${
            activeCategory === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-white/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('playHub.allGamesTab')}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('quick');
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-heading font-black uppercase tracking-wider transition-all text-center ${
            activeCategory === 'quick'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md border border-white/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('playHub.quickMatchTab')}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('strategy');
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-heading font-black uppercase tracking-wider transition-all text-center ${
            activeCategory === 'strategy'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md border border-white/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('playHub.strategyTab')}
        </button>
      </div>

      {/* ============================================================= */}
      {/* SECTION 1: TATTICA & STRATEGIA (GIOCHI LUNGHI • 2-3 MINUTI)    */}
      {/* ============================================================= */}
      {(activeCategory === 'all' || activeCategory === 'strategy') && (
      <div className="space-y-3">
        <div className="px-1 flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-heading font-black text-white tracking-wide uppercase">
              {t('playHub.strategySection')}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            {t('playHub.strategySub')}
          </p>
        </div>

        {/* Hero Card: Cyber Shotgun (Buckshot Roulette) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('shotgun');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-700 to-amber-800 p-4 sm:p-5 shadow-xl border border-red-400/40 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
        >
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-red-400/25 blur-2xl pointer-events-none" />

          {/* 2D Minimal Graphic in Background */}
          <CardBackgroundArt
            type="shotgun"
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-48 sm:w-56 h-auto opacity-35 group-hover:scale-105 group-hover:opacity-45 transition-all duration-300 pointer-events-none text-red-200"
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1.5 max-w-[68%]">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
                <Flame className="w-3 h-3 fill-red-500 text-red-500" />
                <span>NUOVO GIOCO</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                CYBER SHOTGUN
              </h3>

              <p className="text-xs text-red-100/90 font-medium leading-tight">
                {t('playHub.shotgunDesc')}
              </p>

              <div className="pt-1 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerImpact('medium');
                    onCreateMatchForGame('shotgun');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>{t('playHub.playNow')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('shotgun') })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Forza 4 & Split or Steal */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card: Forza 4 (Connect 4) */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('connect4');
            }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 p-4 border border-blue-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
          >
            <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="connect4"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-blue-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.badgeConnect4')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                FORZA 4
              </h4>
              <p className="text-[10px] text-blue-100 font-medium leading-tight line-clamp-3">
                {t('playHub.connect4Desc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/90">
                {t('playHub.openRooms', { count: getOpenRoomsCount('connect4') })}
              </span>
              <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                <span>{t('playHub.playNow')}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card: Split or Steal */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('split');
            }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 to-slate-900 p-4 border border-purple-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
          >
            <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="split"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-purple-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.splitBadge')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                SPLIT OR STEAL
              </h4>
              <p className="text-[10px] text-purple-100 font-medium leading-tight line-clamp-3">
                {t('playHub.splitDesc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/90">
                {t('playHub.openRooms', { count: getOpenRoomsCount('split') })}
              </span>
              <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                <span>{t('playHub.playNow')}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card: Cube Count */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('cubecount');
            }}
            className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-700 to-amber-900 p-4 border border-amber-400/40 shadow-lg cursor-pointer group active:scale-95 transition-all flex items-center justify-between min-h-[110px]"
          >
            <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="cubecount"
              className="absolute right-14 top-1/2 -translate-y-1/2 w-44 h-auto opacity-30 group-hover:scale-105 group-hover:opacity-45 transition-all duration-300 pointer-events-none text-amber-200"
            />

            <div className="relative z-10 flex items-center min-w-0 flex-1 pr-3">
              <div className="space-y-1 min-w-0 max-w-[68%]">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeCubeCount')}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  CUBE COUNT
                </h4>
                <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-1">
                  {t('playHub.cubeCountDesc')}
                </p>
              </div>
            </div>

            <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch">
              <span className="px-2 py-0.5 rounded-xl bg-white/20 text-white text-[9px] font-bold">
                {t('playHub.openRooms', { count: getOpenRoomsCount('cubecount') })}
              </span>
              <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform mt-auto">
                <span>{t('playHub.playNow')}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ============================================================= */}
      {/* SECTION 2: QUICK MATCH / QUICK PVP (PARTITE RAPIDE • 30-60S)   */}
      {/* ============================================================= */}
      {(activeCategory === 'all' || activeCategory === 'quick') && (
      <div className="space-y-3 pt-2">
        <div className="px-1 flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-heading font-black text-white tracking-wide uppercase">
              {t('playHub.quickMatchSection')}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            {t('playHub.quickMatchSub')}
          </p>
        </div>

        {/* 2x2 Grid of the 4 Rapid Reflex Games */}
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

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="roulette"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-emerald-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.badgeRoulette')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                ROULETTE
              </h4>
              <p className="text-[10px] text-emerald-100 font-medium leading-tight line-clamp-3">
                {t('playHub.rouletteDesc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
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

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="blackjack"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-pink-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.badgeBlackjack')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                BLACKJACK
              </h4>
              <p className="text-[10px] text-pink-100 font-medium leading-tight line-clamp-3">
                {t('playHub.blackjackDesc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
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

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="bridge"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-sky-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.badgeBridge')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                GLASS BRIDGE
              </h4>
              <p className="text-[10px] text-sky-100 font-medium leading-tight line-clamp-3">
                {t('playHub.bridgeDesc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
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

            {/* 2D Minimal Graphic in Background */}
            <CardBackgroundArt
              type="chrono"
              className="absolute -right-3 -top-2 w-32 h-32 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 pointer-events-none text-amber-200"
            />

            <div className="relative z-10 space-y-1.5 pt-1">
              <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                {t('playHub.badgeChrono')}
              </span>
              <h4 className="text-base font-heading font-black text-white">
                CHRONO BLIND
              </h4>
              <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-3">
                {t('playHub.chronoDesc')}
              </p>
            </div>

            <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
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
      )}
    </div>
  );
};
