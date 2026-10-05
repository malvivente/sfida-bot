import React from 'react';
import { MatchData, GameType } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { Swords, Eye, Flame, Trophy, Users, ArrowRight, Zap } from 'lucide-react';

interface EpicBannersProps {
  matches?: MatchData[];
  onOpenCreateModal: (defaultGame?: GameType) => void;
  onJoinMatch?: (match: MatchData) => void;
  onSelectGame?: (gameType: GameType) => void;
  onOpenPlayHub?: (section?: 'all' | 'quick' | 'strategy') => void;
  onOpenSpectate?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  jackpotAmountGram?: string;
}

export const EpicBanners: React.FC<EpicBannersProps> = ({
  matches = [],
  onOpenCreateModal,
  onOpenPlayHub,
  onOpenSpectate,
  onOpenAffiliates,
  onOpenJackpotModal,
  jackpotAmountGram = '5.00',
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  return (
    <div className="w-full space-y-3 select-none font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO BANNER: SPLIT OR STEAL (#1 Position)                   */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenCreateModal('split');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-4 sm:p-5 shadow-xl border border-sky-400/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[145px]"
      >
        {/* Ambient glow */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none" />

        {/* 2D Minimal Graphic in Background */}
        <CardBackgroundArt
          type="menu_split"
          className="absolute -right-1 top-1/2 -translate-y-1/2 w-36 sm:w-44 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-[65%] space-y-1.5">
            {/* Top Badge */}
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-orange-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
              <span>{t('epic.hot')}</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              SPLIT OR STEAL
            </h2>

            {/* Description */}
            <p className="text-xs text-sky-100/90 font-medium leading-tight">
              {t('epic.splitHeroDesc')}
            </p>

            {/* Action button */}
            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onOpenCreateModal('split');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-sky-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('epic.playNow')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Clean Badge */}
          <div className="hidden sm:flex flex-col items-end space-y-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-md text-white font-heading font-bold text-[10px] border border-white/30">
              {t('epic.zeroRake')}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PVP DUELS HUB (Opens dedicated Play Hub Section Page)       */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenPlayHub?.('quick');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-4 sm:p-5 shadow-xl border border-amber-400/30 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-orange-300/25 blur-2xl pointer-events-none" />

        {/* 2D Minimal Graphic in Background */}
        <CardBackgroundArt
          type="menu_quick"
          className="absolute -right-1 top-1/2 -translate-y-1/2 w-36 sm:w-44 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-[65%] space-y-1.5">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-orange-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Swords className="w-3 h-3 text-orange-600" />
              <span>{t('epic.pvpArenaTag')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              {t('epic.pvpTitle')}
            </h3>

            <p className="text-xs text-amber-100/90 font-medium leading-tight">
              {t('epic.pvpHubDesc')}
            </p>

            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onOpenPlayHub?.('quick');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-orange-600 hover:bg-amber-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('epic.pvpHubBtn')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Clean Badge */}
          <div className="hidden sm:flex flex-col items-end space-y-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-black/25 backdrop-blur-md text-amber-200 font-heading font-bold text-[10px] border border-white/20">
              100% FAIRPLAY
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2b. STRATEGY DUELS HUB (Cyber Shotgun, Forza 4, Split)        */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenPlayHub?.('strategy');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-700 to-indigo-800 p-4 sm:p-5 shadow-xl border border-red-400/30 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-red-400/20 blur-2xl pointer-events-none" />

        {/* 2D Minimal Graphic in Background */}
        <CardBackgroundArt
          type="menu_strategy"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-32 sm:w-40 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-[65%] space-y-1.5">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-red-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Flame className="w-3 h-3 text-red-600 fill-red-600" />
              <span>{t('epic.strategyTag')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              {t('epic.strategyTitle')}
            </h3>

            <p className="text-xs text-rose-100/90 font-medium leading-tight">
              {t('epic.strategyDesc')}
            </p>

            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onOpenPlayHub?.('strategy');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-rose-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('epic.strategyBtn')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Clean Badge */}
          <div className="hidden sm:flex flex-col items-end space-y-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-black/25 backdrop-blur-md text-amber-200 font-heading font-bold text-[10px] border border-white/20">
              100% STRATEGIA
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SPECTATE & BETTING HUB (Opens Duels Tab directly)           */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenSpectate?.();
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-cyan-800 p-4 sm:p-5 shadow-xl border border-cyan-400/30 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
      >
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />

        {/* 2D Minimal Graphic in Background */}
        <CardBackgroundArt
          type="menu_spectate"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-32 sm:w-40 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-[65%] space-y-1.5">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-purple-700 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Eye className="w-3 h-3 text-purple-700" />
              <span>{t('epic.spectateBadge')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              {t('epic.spectateTitle')}
            </h3>

            <p className="text-xs text-indigo-100/90 font-medium leading-tight">
              {t('epic.spectateDesc')}
            </p>

            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onOpenSpectate?.();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 hover:bg-cyan-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('epic.spectateBtn')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Clean Badge */}
          <div className="hidden sm:flex flex-col items-end space-y-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-black/25 backdrop-blur-md text-cyan-300 font-heading font-black text-xs shadow-md border border-cyan-400/40">
              {t('epic.pariMutuel')}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TWO-COLUMN GRID: TRUST JACKPOT & COMMUNITY REWARDS         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Left Card: TRUST JACKPOT (Luxury Dark Gold) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onOpenJackpotModal?.();
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#171412] p-3.5 sm:p-4 border border-amber-500/40 shadow-xl cursor-pointer group active:scale-95 transition-all"
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[9px] uppercase tracking-wider truncate">
              {t('epic.jackpotSub')}
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 ml-1.5 shadow-sm">
              <Trophy className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            </div>
          </div>

          <span className="text-xs font-heading font-extrabold text-white block uppercase tracking-wide">
            {t('epic.trustJackpot')}
          </span>

          <div className="mt-1 flex items-center space-x-1 text-amber-400">
            <GramIcon className="w-4 h-4" />
            <span className="text-lg font-heading font-black text-amber-300 tracking-tight">
              {jackpotAmountGram}
            </span>
            <span className="text-[10px] font-bold text-amber-400/80">GRAM</span>
          </div>

          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            {t('epic.jackpotCardDesc')}
          </p>
        </div>

        {/* Right Card: COMMUNITY & AFFILIATES (Vivid Berry Magenta) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onOpenAffiliates?.();
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#500724] via-[#701a75] to-[#3b0764] p-3.5 sm:p-4 border border-pink-500/40 shadow-xl cursor-pointer group active:scale-95 transition-all"
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 border border-pink-400/40 text-pink-300 font-heading font-black text-[9px] uppercase tracking-wider truncate">
              {t('epic.earnCardPill')}
            </span>
            <div className="w-7 h-7 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center shrink-0 ml-1.5 shadow-sm">
              <Users className="w-3.5 h-3.5 text-pink-300 group-hover:scale-110 transition-transform" />
            </div>
          </div>

          <span className="text-xs font-heading font-extrabold text-white block uppercase tracking-wide">
            {t('epic.inviteTitle')}
          </span>

          <div className="mt-1 flex items-center space-x-1 text-pink-200">
            <Zap className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-heading font-black text-white">
              {t('epic.earnCardChat')}
            </span>
          </div>

          <p className="text-[10px] text-slate-300 mt-1 leading-tight">
            {t('epic.earnCardDesc')}
          </p>
        </div>

      </div>

    </div>
  );
};
