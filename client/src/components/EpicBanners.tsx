import React, { useState } from 'react';
import { MatchData, GameType } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import {
  Swords,
  Eye,
  Trophy,
  Users,
  ArrowRight,
  Bot,
  Dices,
  Lock,
  Sparkles,
  Ticket,
  X,
  Zap,
} from 'lucide-react';

interface EpicBannersProps {
  matches?: MatchData[];
  onOpenCreateModal: (defaultGame?: GameType, category?: 'all' | 'quick' | 'strategy') => void;
  onJoinMatch?: (match: MatchData) => void;
  onSelectGame?: (gameType: GameType) => void;
  onOpenPlayHub?: (section?: 'all' | 'quick' | 'strategy') => void;
  onOpenSpectate?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  jackpotAmountGram?: string;
}

type PlaceholderType = 'original' | 'bot' | 'casino' | 'raffle' | null;

export const EpicBanners: React.FC<EpicBannersProps> = ({
  matches = [],
  onOpenCreateModal,
  onOpenPlayHub,
  onOpenSpectate,
  onOpenJackpotModal,
  jackpotAmountGram = '5.00',
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [activePlaceholder, setActivePlaceholder] = useState<PlaceholderType>(null);

  // Active PVP room count (open rooms + active rooms)
  const openPvpCount = matches.filter(
    (m) =>
      m.state === 'LOBBY' &&
      (!m.playerB || (m.gameType === 'poker' && (m.currentPlayers || 1) < (m.maxPlayers || 2)))
  ).length;
  const activePvpMatches = matches.filter((m) => m.state === 'GAME_ACTIVE' || m.state === 'LOBBY').length;
  const pvpPlayerBadge = openPvpCount > 0 ? openPvpCount : activePvpMatches;

  // Active Spectator room count
  const spectateCount = matches.filter(
    (m) => (m.state === 'GAME_ACTIVE' || m.state === 'ROUND_START') && m.allowSpectators !== false
  ).length;

  return (
    <div className="w-full space-y-3.5 select-none font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP BANNER: ORIGINAL CASINO GAME (Placeholder)             */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          setActivePlaceholder('original');
        }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#170a2c] via-[#120b22] to-[#080512] p-4 sm:p-5 shadow-2xl border border-purple-500/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[145px] sm:min-h-[155px]"
      >
        {/* Ambient glow effects */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-10 w-36 h-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        {/* Top-Right Player Count Badge */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-mono font-bold shadow-md">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>0</span>
        </div>

        {/* Futuristic Casino Emblem Background Art */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-40 sm:w-48 h-auto opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border border-purple-400/40 border-dashed animate-spin-slow" />
            <Sparkles className="w-16 h-16 text-purple-300 absolute inset-0 m-auto" />
          </div>
        </div>

        {/* Dark Vignette Overlay for Crisp Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none z-0" />

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-between h-full min-h-[120px] max-w-[75%] space-y-2">
          <div className="space-y-1.5">
            {/* Top Tag */}
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-heading font-black tracking-wider uppercase shadow-sm">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>{t('epic.originalTag')}</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
              {t('epic.originalTitle')}
            </h2>

            {/* Subtitle / Description */}
            <p className="text-xs text-purple-200/80 font-medium leading-tight line-clamp-2">
              {t('epic.originalDesc')}
            </p>
          </div>

          {/* Action indicator */}
          <div className="pt-1 flex items-center space-x-2">
            <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-slate-300 font-heading font-extrabold text-[10.5px] uppercase tracking-wider flex items-center space-x-1.5 shadow-sm group-hover:bg-white/15 transition-all">
              <Lock className="w-3 h-3 text-purple-400" />
              <span>{t('epic.placeholderComingSoon')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. 2x2 GRID: PVP, GAMES VS BOT, CASINO & HOUSE, SPECTATE & BET*/}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        {/* CARD 1: PVP (Quick Match + Strategy Duels Fused) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onOpenCreateModal();
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2f0e0c] via-[#200909] to-[#120506] p-3.5 sm:p-4 shadow-xl border border-rose-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[175px] flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

          {/* Top-Right Player Count Badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono font-bold shadow-sm">
            <Users className="w-3 h-3 text-rose-400" />
            <span>{pvpPlayerBadge}</span>
          </div>

          {/* Background Illustration */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-28 h-28 opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
            <Swords className="w-20 h-20 text-rose-400 stroke-1" />
          </div>

          {/* Dark Bottom Vignette for Crisp Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 flex flex-col justify-between h-full">
            {/* Top Indicator */}
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[9px] font-heading font-black tracking-wider uppercase self-start shadow-sm">
              <Zap className="w-2.5 h-2.5 text-rose-300" />
              <span>{t('epic.pvpBadge')}</span>
            </div>

            {/* Bottom Titles */}
            <div className="mt-auto pt-4 space-y-0.5">
              <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
                {t('epic.pvpCardTitle')}
              </h3>
              <p className="text-[10.5px] font-medium text-rose-100/80 leading-tight truncate">
                {t('epic.pvpCardSub')}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: GAMES VS BOT (AI Practice / Duel • Placeholder) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('bot');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#072421] via-[#061817] to-[#040e0e] p-3.5 sm:p-4 shadow-xl border border-teal-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[175px] flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-teal-400/15 blur-2xl pointer-events-none" />

          {/* Top-Right Player Count Badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono font-bold shadow-sm">
            <Users className="w-3 h-3 text-teal-400" />
            <span>0</span>
          </div>

          {/* Background Illustration */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-28 h-28 opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
            <Bot className="w-20 h-20 text-teal-400 stroke-1" />
          </div>

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-[9px] font-heading font-black tracking-wider uppercase self-start shadow-sm">
              <Bot className="w-2.5 h-2.5 text-teal-300" />
              <span>{t('epic.vsBotBadge')}</span>
            </div>

            <div className="mt-auto pt-4 space-y-0.5">
              <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
                {t('epic.vsBotCardTitle')}
              </h3>
              <p className="text-[10.5px] font-medium text-teal-100/80 leading-tight truncate">
                {t('epic.vsBotCardSub')}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: CASINO & HOUSE (House Tables • Placeholder) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('casino');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2a0e19] via-[#1a0810] to-[#0d0408] p-3.5 sm:p-4 shadow-xl border border-amber-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[175px] flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

          {/* Top-Right Player Count Badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono font-bold shadow-sm">
            <Users className="w-3 h-3 text-amber-400" />
            <span>0</span>
          </div>

          {/* Background Illustration */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-28 h-28 opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
            <Dices className="w-20 h-20 text-amber-400 stroke-1" />
          </div>

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-heading font-black tracking-wider uppercase self-start shadow-sm">
              <Dices className="w-2.5 h-2.5 text-amber-300" />
              <span>{t('epic.vsCasinoBadge')}</span>
            </div>

            <div className="mt-auto pt-4 space-y-0.5">
              <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
                {t('epic.vsCasinoCardTitle')}
              </h3>
              <p className="text-[10.5px] font-medium text-amber-100/80 leading-tight truncate">
                {t('epic.vsCasinoCardSub')}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 4: SPECTATE & BET (Live Duels & Dynamic Betting) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onOpenSpectate?.();
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#12133c] via-[#0a0c24] to-[#050614] p-3.5 sm:p-4 shadow-xl border border-indigo-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[175px] flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          {/* Top-Right Player Count Badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono font-bold shadow-sm">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{spectateCount}</span>
          </div>

          {/* Background Illustration */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-28 h-28 opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
            <Eye className="w-20 h-20 text-indigo-400 stroke-1" />
          </div>

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[9px] font-heading font-black tracking-wider uppercase self-start shadow-sm">
              <Eye className="w-2.5 h-2.5 text-indigo-300" />
              <span>{t('epic.spectateBadge')}</span>
            </div>

            <div className="mt-auto pt-4 space-y-0.5">
              <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
                {t('epic.spectateCardTitle')}
              </h3>
              <p className="text-[10.5px] font-medium text-indigo-100/80 leading-tight truncate">
                {t('epic.spectateCardSub')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM BANNER: SFIDA RAFFLE (Placeholder)                  */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          setActivePlaceholder('raffle');
        }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#281b0a] via-[#1d1307] to-[#0e0903] p-4 sm:p-5 shadow-2xl border border-amber-500/25 cursor-pointer group active:scale-[0.99] transition-all min-h-[140px] sm:min-h-[150px]"
      >
        {/* Ambient Glow */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Top-Right Badge */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center space-x-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/20 text-amber-300 text-[10px] font-heading font-black tracking-wider uppercase shadow-sm">
          <span>🎟️ RAFFLE</span>
        </div>

        {/* Graphic background */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-40 sm:w-48 h-auto opacity-35 group-hover:opacity-55 group-hover:scale-105 transition-all duration-300 pointer-events-none flex items-center justify-center">
          <Ticket className="w-24 h-24 text-amber-400 stroke-1 -rotate-12" />
        </div>

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent pointer-events-none z-0" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full min-h-[110px] max-w-[75%] space-y-2">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-heading font-black tracking-wider uppercase shadow-sm">
              <Ticket className="w-3 h-3 text-amber-300" />
              <span>{t('epic.raffleTag')}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-md">
              {t('epic.raffleTitle')}
            </h2>

            <p className="text-xs text-amber-200/80 font-medium leading-tight line-clamp-2">
              {t('epic.raffleDesc')}
            </p>
          </div>

          <div className="pt-1 flex items-center space-x-2">
            <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-slate-300 font-heading font-extrabold text-[10.5px] uppercase tracking-wider flex items-center space-x-1.5 shadow-sm group-hover:bg-white/15 transition-all">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>{t('epic.placeholderComingSoon')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. STANDALONE LUXURY TRUST JACKPOT CARD                       */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenJackpotModal?.();
        }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#1b1714] via-[#26201b] to-[#151210] p-4 sm:p-5 border border-amber-500/35 shadow-xl cursor-pointer group active:scale-[0.99] transition-all"
      >
        <div className="absolute -right-8 -top-8 w-52 h-52 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[9px] uppercase tracking-wider">
                {t('epic.jackpotStandaloneTag')}
              </span>
            </div>

            <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
              {t('epic.jackpotStandaloneTitle')}
            </h3>

            <p className="text-[11px] text-slate-300 leading-snug max-w-sm">
              {t('epic.jackpotStandaloneDesc')}
            </p>
          </div>

          {/* Right: Jackpots Amount & CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10 gap-1.5">
            <div className="flex items-center space-x-1.5 text-amber-400">
              <GramIcon className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-2xl sm:text-3xl font-heading font-black text-amber-300 tracking-tight">
                {jackpotAmountGram}
              </span>
              <span className="text-xs font-bold text-amber-400/80">GRAM</span>
            </div>

            <div className="inline-flex items-center space-x-1 text-[11px] font-heading font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
              <span>{t('epic.jackpotDetailsBtn')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. COMING SOON PLACEHOLDER MODAL                              */}
      {/* ------------------------------------------------------------- */}
      {activePlaceholder && (
        <div
          onClick={() => setActivePlaceholder(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[28px] bg-gradient-to-b from-slate-900 via-[#13111c] to-[#0a0910] border border-white/15 p-5 shadow-2xl relative space-y-4"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                triggerImpact('light');
                setActivePlaceholder(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/20 flex items-center justify-center shadow-lg">
              {activePlaceholder === 'original' && <Sparkles className="w-7 h-7 text-purple-400" />}
              {activePlaceholder === 'bot' && <Bot className="w-7 h-7 text-teal-400" />}
              {activePlaceholder === 'casino' && <Dices className="w-7 h-7 text-amber-400" />}
              {activePlaceholder === 'raffle' && <Ticket className="w-7 h-7 text-amber-300" />}
            </div>

            {/* Title & Tag */}
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-heading font-black text-[9.5px] uppercase tracking-wider inline-block">
                {t('epic.placeholderInDevelopment')}
              </span>
              <h3 className="text-xl font-heading font-black text-white tracking-wide uppercase">
                {activePlaceholder === 'original' && t('epic.originalTitle')}
                {activePlaceholder === 'bot' && t('epic.vsBotCardTitle')}
                {activePlaceholder === 'casino' && t('epic.vsCasinoCardTitle')}
                {activePlaceholder === 'raffle' && t('epic.raffleTitle')}
              </h3>
            </div>

            {/* Detailed Description */}
            <p className="text-xs text-slate-300 font-normal leading-relaxed">
              {activePlaceholder === 'original' && t('epic.originalModalDesc')}
              {activePlaceholder === 'bot' && t('epic.botModalDesc')}
              {activePlaceholder === 'casino' && t('epic.casinoModalDesc')}
              {activePlaceholder === 'raffle' && t('epic.raffleModalDesc')}
            </p>

            {/* Got It Button */}
            <button
              type="button"
              onClick={() => {
                triggerImpact('medium');
                setActivePlaceholder(null);
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {t('epic.gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
