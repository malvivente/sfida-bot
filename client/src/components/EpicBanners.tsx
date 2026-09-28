import React from 'react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { UserAvatar } from './UserAvatar.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { Swords, Plus, Flame, Sparkles, Trophy, Users, Shield, ArrowRight, Zap, ChevronRight } from 'lucide-react';

interface EpicBannersProps {
  matches: MatchData[];
  onOpenCreateModal: (defaultGame?: GameType) => void;
  onJoinMatch: (match: MatchData) => void;
  onSelectGame: (gameType: GameType) => void;
  onOpenPlayHub?: () => void;
  onOpenPvpSection?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  jackpotAmountGram?: string;
}

export const EpicBanners: React.FC<EpicBannersProps> = ({
  matches,
  onOpenCreateModal,
  onJoinMatch,
  onSelectGame,
  onOpenPlayHub,
  onOpenPvpSection,
  onOpenAffiliates,
  onOpenJackpotModal,
  jackpotAmountGram = '24.50',
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  // Find open matches waiting for an opponent (PVP queue)
  const openDuels = matches.filter((m) => m.state === 'LOBBY' && !m.playerB);

  return (
    <div className="w-full space-y-3 select-none">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO BANNER: SPLIT OR STEAL (#1 Position)                   */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onSelectGame('split');
          onOpenCreateModal('split');
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-4 sm:p-5 shadow-xl border border-sky-400/30 cursor-pointer group active:scale-[0.99] transition-all"
      >
        {/* Ambient glow & backdrop icon */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none" />
        <div className="absolute right-4 bottom-2 opacity-15 text-8xl pointer-events-none select-none font-black text-white">
          🤝
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-[65%] space-y-1.5">
            {/* Top Badge */}
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-orange-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
              <span>{t('epic.hot')}</span>
            </div>

            {/* Title */}
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                SPLIT OR STEAL
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-sky-100/90 font-medium leading-tight">
              {t('epic.splitHeroDesc')}
            </p>

            {/* Action pill */}
            <div className="pt-1 flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('medium');
                  onOpenCreateModal('split');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-sky-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
              >
                <span>{t('epic.fastJoin')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Floating Badges */}
          <div className="flex flex-col items-end space-y-1.5">
            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/90 text-white font-heading font-black text-xs shadow-md border border-emerald-300/40">
              {t('epic.splitPeaceBadge')}
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-500/90 text-white font-heading font-black text-xs shadow-md border border-amber-300/40">
              {t('epic.splitStealBadge')}
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-md text-white font-heading font-bold text-[10px] border border-white/30">
              {t('epic.zeroRake')}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PVP DUELS HUB (Opens dedicated PVP Section)                */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenPvpSection?.();
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-4 sm:p-5 shadow-xl border border-amber-400/30 cursor-pointer active:scale-[0.99] transition-all group"
      >
        <div className="flex items-center justify-between gap-3">
          
          {/* Left Title & Create Action */}
          <div className="shrink-0 space-y-2 max-w-[130px] sm:max-w-[150px]">
            <div className="flex items-center space-x-2">
              <Swords className="w-6 h-6 text-white drop-shadow-md" />
              <span className="text-2xl font-heading font-black text-white tracking-wider drop-shadow-md">
                {t('epic.pvpTitle')}
              </span>
            </div>

            <p className="text-[11px] font-medium text-amber-100 leading-tight">
              {t('epic.pvpSubtitle')}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerImpact('medium');
                onOpenCreateModal();
              }}
              className="px-3 py-1.5 rounded-xl bg-white text-orange-600 hover:bg-amber-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('epic.createDuel')}</span>
            </button>
          </div>

          {/* Right: Live Challengers Horizontal Stream */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 -my-1">
              {openDuels.length > 0 ? (
                openDuels.slice(0, 4).map((duel) => {
                  const wager = (parseFloat(duel.wagerAmountNano) / 1e9).toFixed(1);
                  const challengerName = duel.playerA.name.replace(/^@/, '');

                  return (
                    <div
                      key={duel.matchId}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerImpact('medium');
                        onJoinMatch(duel);
                      }}
                      className="w-24 sm:w-28 p-2 rounded-2xl bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/25 flex flex-col items-center text-center shrink-0 cursor-pointer active:scale-95 transition-all group shadow-md"
                    >
                      <UserAvatar
                        photoUrl={(duel.playerA as any)?.photoUrl}
                        name={challengerName}
                        sizeClass="w-9 h-9"
                        roundedClass="rounded-full"
                        className="ring-2 ring-white/30 group-hover:ring-white mb-1 shadow-sm"
                      />
                      <span className="text-[11px] font-heading font-bold text-white truncate w-full block">
                        {challengerName}
                      </span>
                      <div className="mt-0.5 px-2 py-0.5 rounded-lg bg-white/20 text-white text-[10px] font-extrabold flex items-center space-x-0.5">
                        <span>{wager}</span>
                        <GramIcon className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Fallback preview cards if queue is temporarily empty */
                [
                  { name: 'CHRONO', stake: '1.0', type: 'chrono' as GameType, icon: '⏱️' },
                  { name: 'ROULETTE', stake: '2.0', type: 'roulette' as GameType, icon: '🎯' },
                  { name: 'BRIDGE', stake: '1.0', type: 'bridge' as GameType, icon: '🌉' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('medium');
                      onOpenCreateModal(item.type);
                    }}
                    className="w-24 sm:w-28 p-2 rounded-2xl bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/20 flex flex-col items-center text-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-base mb-1 shadow-sm">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-heading font-extrabold text-white truncate w-full block">
                      {item.name}
                    </span>
                    <div className="mt-0.5 px-2 py-0.5 rounded-lg bg-white/20 text-white text-[10px] font-extrabold flex items-center space-x-0.5">
                      <span>{item.stake}</span>
                      <GramIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PLAY HUB (Opens dedicated Play Hub Section Page)            */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenPlayHub?.();
        }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-800 p-4 sm:p-5 shadow-xl border border-purple-400/30 cursor-pointer active:scale-[0.99] transition-all group"
      >
        <div className="flex items-center justify-between gap-3">
          
          <div className="space-y-1.5 max-w-[50%]">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-heading font-black tracking-wide shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
              <span>{t('epic.playHubSubtitle')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
              {t('epic.playHubTitle')}
            </h3>

            <p className="text-xs text-purple-100/90 font-medium leading-tight">
              {t('epic.playHubCardDesc')}
            </p>
          </div>

          {/* Mini Interactive Game Cards */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 -my-1">
            {[
              { id: 'roulette' as GameType, title: 'Roulette', icon: '🎯', color: 'from-cyan-500 to-blue-600' },
              { id: 'blackjack' as GameType, title: 'Blackjack', icon: '🃏', color: 'from-rose-500 to-pink-600' },
              { id: 'bridge' as GameType, title: 'Bridge', icon: '🌉', color: 'from-emerald-500 to-teal-600' },
              { id: 'chrono' as GameType, title: 'Chrono', icon: '⏱️', color: 'from-amber-500 to-orange-600' },
            ].map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  onSelectGame(game.id);
                  onOpenPlayHub?.();
                }}
                className={`w-18 sm:w-20 p-2.5 rounded-2xl bg-gradient-to-b ${game.color} border border-white/20 text-center flex flex-col items-center justify-center shrink-0 active:scale-95 transition-all shadow-md hover:brightness-110`}
              >
                <span className="text-xl mb-1 drop-shadow-sm">{game.icon}</span>
                <span className="text-[10px] font-heading font-extrabold text-white uppercase tracking-tight block">
                  {game.title}
                </span>
              </button>
            ))}
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
          
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[9px] uppercase tracking-wider">
              {t('epic.jackpotSub')}
            </span>
            <Trophy className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
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
          
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-pink-500/20 border border-pink-400/40 text-pink-300 font-heading font-black text-[9px] uppercase tracking-wider">
              {t('epic.earnCardPill')}
            </span>
            <Users className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
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
