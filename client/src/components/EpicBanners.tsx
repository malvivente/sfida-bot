import React, { useState } from 'react';
import { MatchData, GameType } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import {
  Trophy,
  Users,
  ArrowRight,
  Bot,
  Dices,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';

interface EpicBannersProps {
  matches?: MatchData[];
  onOpenCreateModal?: (defaultGame?: GameType, category?: 'all' | 'quick' | 'strategy') => void;
  onJoinMatch?: (match: MatchData) => void;
  onSelectGame?: (gameType: GameType) => void;
  onOpenPlayHub?: (section?: 'all' | 'quick' | 'strategy') => void;
  onOpenSpectate?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  jackpotAmountGram?: string;
}

type PlaceholderType = 'original' | 'bot' | 'casino' | 'raffle' | null;

/**
 * Top-right corner notch with inverted rounded fillet curves
 * matching the signature styling from the reference design.
 */
interface CardCornerNotchProps {
  count: number | string;
  borderColor?: string;
  iconColor?: string;
}

const CardCornerNotch: React.FC<CardCornerNotchProps> = ({
  count,
  borderColor = 'rgba(255,255,255,0.15)',
  iconColor = 'text-white',
}) => {
  return (
    <div className="absolute top-0 right-0 z-20 pointer-events-none select-none">
      {/* Top-Left concave fillet */}
      <svg
        className="absolute -left-[14px] top-0 w-[14px] h-[14px]"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path d="M 0 0 A 14 14 0 0 0 14 14 L 14 0 Z" fill="#0e1015" />
        <path d="M 0 0 A 14 14 0 0 0 14 14" stroke={borderColor} strokeWidth="1" fill="none" />
      </svg>

      {/* Bottom-Right concave fillet */}
      <svg
        className="absolute -bottom-[14px] right-0 w-[14px] h-[14px]"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path d="M 0 0 A 14 14 0 0 0 14 14 L 14 0 Z" fill="#0e1015" />
        <path d="M 0 0 A 14 14 0 0 0 14 14" stroke={borderColor} strokeWidth="1" fill="none" />
      </svg>

      {/* Main notch badge body */}
      <div
        style={{ borderColor }}
        className="bg-[#0e1015] border-l border-b rounded-bl-[16px] px-3.5 py-1.5 flex items-center space-x-1.5"
      >
        <Users className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="font-mono font-bold text-xs text-white leading-none">
          {count}
        </span>
      </div>
    </div>
  );
};

export const EpicBanners: React.FC<EpicBannersProps> = ({
  matches = [],
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
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#170a2c] via-[#120b22] to-[#080512] shadow-2xl border border-purple-500/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[145px] sm:min-h-[160px] flex flex-col justify-end"
      >
        {/* Ambient glow effects */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-10 w-36 h-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        {/* Top-Right Signature Notched Badge */}
        <CardCornerNotch
          count={0}
          borderColor="rgba(168, 85, 247, 0.35)"
          iconColor="text-purple-400"
        />

        {/* Section Artwork Image */}
        <CardBackgroundArt
          type="menu_split"
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-44 sm:w-52 h-auto opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        />

        {/* Dark Vignette Overlay for Crisp Bottom Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

        {/* Foreground Content: Title Only */}
        <div className="relative z-10 p-4 sm:p-5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
            ORIGINALS
          </h2>
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
            onOpenPlayHub?.('all');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2f0e0c] via-[#200909] to-[#120506] shadow-xl border border-rose-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

          {/* Top-Right Signature Notched Badge */}
          <CardCornerNotch
            count={pvpPlayerBadge}
            borderColor="rgba(244, 63, 94, 0.35)"
            iconColor="text-rose-400"
          />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="menu_quick"
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-32 sm:w-40 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
          />

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

          {/* Card Content: Title Only */}
          <div className="relative z-10 p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
              PVP
            </h3>
          </div>
        </div>

        {/* CARD 2: GAMES VS BOT (AI Practice / Duel • Placeholder) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('bot');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#072421] via-[#061817] to-[#040e0e] shadow-xl border border-teal-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-teal-400/15 blur-2xl pointer-events-none" />

          {/* Top-Right Signature Notched Badge */}
          <CardCornerNotch
            count={0}
            borderColor="rgba(20, 184, 166, 0.35)"
            iconColor="text-teal-400"
          />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="shotgun"
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-28 sm:w-36 h-auto opacity-75 group-hover:scale-105 group-hover:opacity-95 transition-all duration-300 pointer-events-none"
          />

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

          {/* Card Content: Title Only */}
          <div className="relative z-10 p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
              GAMES VS BOT
            </h3>
          </div>
        </div>

        {/* CARD 3: CASINO & HOUSE (House Tables • Placeholder) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('casino');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2a0e19] via-[#1a0810] to-[#0d0408] shadow-xl border border-amber-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

          {/* Top-Right Signature Notched Badge */}
          <CardCornerNotch
            count={0}
            borderColor="rgba(245, 158, 11, 0.35)"
            iconColor="text-amber-400"
          />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="roulette"
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-28 sm:w-36 h-auto opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
          />

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

          {/* Card Content: Title Only */}
          <div className="relative z-10 p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
              CASINO & HOUSE
            </h3>
          </div>
        </div>

        {/* CARD 4: SPECTATE & BET (Live Duels & Dynamic Betting) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            onOpenSpectate?.();
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#12133c] via-[#0a0c24] to-[#050614] shadow-xl border border-indigo-500/25 cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          {/* Top-Right Signature Notched Badge */}
          <CardCornerNotch
            count={spectateCount}
            borderColor="rgba(99, 102, 241, 0.35)"
            iconColor="text-indigo-400"
          />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="menu_spectate"
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-32 sm:w-40 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
          />

          {/* Dark Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

          {/* Card Content: Title Only */}
          <div className="relative z-10 p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
              SPECTATE & BET
            </h3>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM BANNER: RAFFLE (Placeholder)                        */}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          setActivePlaceholder('raffle');
        }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#281b0a] via-[#1d1307] to-[#0e0903] shadow-2xl border border-amber-500/25 cursor-pointer group active:scale-[0.99] transition-all min-h-[140px] sm:min-h-[155px] flex flex-col justify-end"
      >
        {/* Ambient Glow */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Top-Right Signature Notched Badge */}
        <CardCornerNotch
          count={0}
          borderColor="rgba(245, 158, 11, 0.35)"
          iconColor="text-amber-300"
        />

        {/* Section Artwork Image */}
        <CardBackgroundArt
          type="menu_strategy"
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-36 sm:w-44 h-auto opacity-75 group-hover:scale-105 group-hover:opacity-95 transition-all duration-300 pointer-events-none"
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-0" />

        {/* Content: Title Only */}
        <div className="relative z-10 p-4 sm:p-5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wider uppercase drop-shadow-lg">
            RAFFLE
          </h2>
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

          {/* Right: Jackpot Amount & CTA */}
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
                {activePlaceholder === 'original' && 'ORIGINALS'}
                {activePlaceholder === 'bot' && 'GAMES VS BOT'}
                {activePlaceholder === 'casino' && 'CASINO & HOUSE'}
                {activePlaceholder === 'raffle' && 'RAFFLE'}
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
