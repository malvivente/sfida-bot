import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
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
  userRaffleTickets?: number;
}

type PlaceholderType = 'original' | 'bot' | 'casino' | 'raffle' | null;

/**
 * Generates a seamless continuous SVG path for a card with an inverted
 * rounded notch cutout in the top-right corner.
 */
function getCardPath(W: number, H: number, offset = 0): string {
  const R = 24; // Outer corner radius
  const NW = 56; // Notch width
  const NH = 38; // Notch height
  const r = 14; // Notch inner fillet radius

  const x0 = offset;
  const y0 = offset;
  const x1 = W - offset;
  const y1 = H - offset;

  if (x1 <= x0 || y1 <= y0) return '';

  return (
    `M ${x0 + R} ${y0} ` +
    `L ${x1 - NW - r} ${y0} ` +
    `A ${r} ${r} 0 0 1 ${x1 - NW} ${y0 + r} ` +
    `L ${x1 - NW} ${y0 + NH - r} ` +
    `A ${r} ${r} 0 0 0 ${x1 - NW + r} ${y0 + NH} ` +
    `L ${x1 - R} ${y0 + NH} ` +
    `A ${R} ${R} 0 0 1 ${x1} ${y0 + NH + R} ` +
    `L ${x1} ${y1 - R} ` +
    `A ${R} ${R} 0 0 1 ${x1 - R} ${y1} ` +
    `L ${x0 + R} ${y1} ` +
    `A ${R} ${R} 0 0 1 ${x0} ${y1 - R} ` +
    `L ${x0} ${y0 + R} ` +
    `A ${R} ${R} 0 0 1 ${x0 + R} ${y0} Z`
  );
}

interface NotchedCardProps {
  cardId: string;
  className?: string;
  gradientBg: string;
  badgeValue?: number | string;
  badgeIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  minHeightClass?: string;
}

const NotchedCard: React.FC<NotchedCardProps> = ({
  cardId,
  className = '',
  gradientBg,
  badgeValue,
  badgeIcon,
  onClick,
  children,
  minHeightClass = 'min-h-[165px] sm:min-h-[180px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (containerRef.current) {
      setDim({
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setDim({ w, h });
        }
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const path = useMemo(() => {
    if (!dim.w || !dim.h) return '';
    return getCardPath(dim.w, dim.h, 0);
  }, [dim.w, dim.h]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative cursor-pointer group active:scale-[0.98] transition-all select-none ${minHeightClass} ${className}`}
    >
      {/* SVG ClipPath Definition without any border stroke */}
      {path && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-0"
          width={dim.w}
          height={dim.h}
        >
          <defs>
            <clipPath id={`clip-${cardId}`}>
              <path d={path} />
            </clipPath>
          </defs>
        </svg>
      )}

      {/* Content wrapper clipped cleanly without borders */}
      <div
        style={path ? { clipPath: `url(#clip-${cardId})` } : undefined}
        className={`absolute inset-0 w-full h-full overflow-hidden ${
          !path ? 'rounded-[26px]' : ''
        } ${gradientBg} shadow-lg`}
      >
        {children}
      </div>

      {/* Counter/Badge in the scooped notch negative space */}
      {badgeValue !== undefined && (
        <div className="absolute top-2.5 right-3.5 z-20 flex items-center space-x-1.5 pointer-events-none select-none">
          {badgeIcon || <Users className="w-3.5 h-3.5 text-white/90" />}
          <span className="font-mono font-bold text-xs text-white leading-none">
            {badgeValue}
          </span>
        </div>
      )}
    </div>
  );
};

export const EpicBanners: React.FC<EpicBannersProps> = ({
  matches = [],
  onOpenPlayHub,
  onOpenSpectate,
  onOpenJackpotModal,
  jackpotAmountGram = '5.00',
  userRaffleTickets = 0,
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
      <NotchedCard
        cardId="banner-original"
        gradientBg="bg-gradient-to-r from-[#a855f7] via-[#9333ea] to-[#7e22ce]"
        badgeValue={0}
        badgeIcon={<Users className="w-3.5 h-3.5 text-white/90" />}
        minHeightClass="min-h-[145px] sm:min-h-[160px]"
        onClick={() => {
          triggerImpact('medium');
          setActivePlaceholder('original');
        }}
      >
        {/* Ambient glow effects */}
        <div className="absolute -right-8 -top-8 w-60 h-60 rounded-full bg-fuchsia-400/30 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-10 w-48 h-48 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />

        {/* Section Artwork Image */}
        <CardBackgroundArt
          type="menu_split"
          className="absolute right-3 sm:right-7 top-1/2 -translate-y-1/2 w-48 sm:w-56 max-h-[92%] h-auto opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
        />

        {/* Content: Title Only */}
        <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
            ORIGINALS
          </h2>
        </div>
      </NotchedCard>

      {/* ------------------------------------------------------------- */}
      {/* 2. 2x2 GRID: PVP, GAMES VS BOT, CASINO & HOUSE, SPECTATE & BET*/}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        {/* CARD 1: PVP (Quick Match + Strategy Duels Fused - Radiant Magma) */}
        <NotchedCard
          cardId="grid-pvp"
          gradientBg="bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c]"
          badgeValue={pvpPlayerBadge}
          badgeIcon={<Users className="w-3.5 h-3.5 text-white/90" />}
          minHeightClass="min-h-[165px] sm:min-h-[180px]"
          onClick={() => {
            triggerImpact('medium');
            onOpenPlayHub?.('all');
          }}
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-rose-400/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="menu_quick"
            className="absolute right-1 sm:right-2.5 top-[44%] -translate-y-1/2 w-[105px] sm:w-[120px] max-h-[66%] h-auto opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
          />

          {/* Card Content: Title Only */}
          <div className="relative z-10 flex flex-col justify-end h-full p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
              PVP
            </h3>
          </div>
        </NotchedCard>

        {/* CARD 2: GAMES VS BOT (Electric Neon Teal - NO NOTCH, NO ICON, NO BORDER) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('bot');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-lg cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end select-none"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-teal-300/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="games_vs_bot"
            className="absolute right-1.5 sm:right-3 top-[43%] -translate-y-1/2 w-[110px] sm:w-[124px] max-h-[66%] h-auto opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
          />

          {/* Card Content: Title Only */}
          <div className="relative z-10 flex flex-col justify-end h-full p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
              GAMES VS BOT
            </h3>
          </div>
        </div>

        {/* CARD 3: CASINO & HOUSE (Rich Warm Amber Gold - NO NOTCH, NO ICON, NO BORDER) */}
        <div
          onClick={() => {
            triggerImpact('medium');
            setActivePlaceholder('casino');
          }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#f59e0b] via-[#ea580c] to-[#d97706] shadow-lg cursor-pointer group active:scale-[0.98] transition-all min-h-[165px] sm:min-h-[180px] flex flex-col justify-end select-none"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-amber-400/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-orange-400/20 blur-2xl pointer-events-none" />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="casino_house"
            className="absolute right-1.5 sm:right-3 top-[42%] -translate-y-1/2 w-[105px] sm:w-[120px] max-h-[66%] h-auto opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
          />

          {/* Card Content: Title Only */}
          <div className="relative z-10 flex flex-col justify-end h-full p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
              CASINO & HOUSE
            </h3>
          </div>
        </div>

        {/* CARD 4: SPECTATE & BET (Electric Stadium Cobalt Sapphire) */}
        <NotchedCard
          cardId="grid-spectate"
          gradientBg="bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]"
          badgeValue={spectateCount}
          badgeIcon={<Users className="w-3.5 h-3.5 text-white/90" />}
          minHeightClass="min-h-[165px] sm:min-h-[180px]"
          onClick={() => {
            triggerImpact('medium');
            onOpenSpectate?.();
          }}
        >
          {/* Ambient Glow */}
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-cyan-400/30 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

          {/* Section Artwork Image */}
          <CardBackgroundArt
            type="menu_spectate"
            className="absolute right-1 sm:right-2.5 top-[43%] -translate-y-1/2 w-[114px] sm:w-[128px] max-h-[66%] h-auto opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
          />

          {/* Card Content: Title Only */}
          <div className="relative z-10 flex flex-col justify-end h-full p-3.5 sm:p-4">
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
              SPECTATE & BET
            </h3>
          </div>
        </NotchedCard>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM BANNER: RAFFLE (Tickets Icon & User Tickets Count)  */}
      {/* ------------------------------------------------------------- */}
      <NotchedCard
        cardId="banner-raffle"
        gradientBg="bg-gradient-to-r from-[#a855f7] via-[#9333ea] to-[#6d28d9]"
        badgeValue={userRaffleTickets}
        badgeIcon={<Ticket className="w-3.5 h-3.5 text-amber-300 -rotate-12" />}
        minHeightClass="min-h-[145px] sm:min-h-[155px]"
        onClick={() => {
          triggerImpact('medium');
          setActivePlaceholder('raffle');
        }}
      >
        {/* Ambient Glow */}
        <div className="absolute -right-8 -top-8 w-60 h-60 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 -bottom-10 w-48 h-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

        {/* Section Artwork Image */}
        <CardBackgroundArt
          type="raffle"
          className="absolute right-3 sm:right-7 top-1/2 -translate-y-1/2 w-46 sm:w-54 max-h-[92%] h-auto opacity-95 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none drop-shadow-md object-contain"
        />

        {/* Content: Title Only */}
        <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-5">
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wider uppercase drop-shadow-sm">
            RAFFLE
          </h2>
        </div>
      </NotchedCard>

      {/* ------------------------------------------------------------- */}
      {/* 4. STANDALONE LUXURY TRUST JACKPOT CARD (Borderless Dark Gold)*/}
      {/* ------------------------------------------------------------- */}
      <div
        onClick={() => {
          triggerImpact('medium');
          onOpenJackpotModal?.();
        }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#2a1d0f] via-[#3d2914] to-[#20150b] p-4 sm:p-5 shadow-xl cursor-pointer group active:scale-[0.99] transition-all"
      >
        <div className="absolute -right-8 -top-8 w-56 h-56 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-amber-400/25 flex items-center justify-center shrink-0 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/25 text-amber-300 font-heading font-black text-[9px] uppercase tracking-wider">
                {t('epic.jackpotStandaloneTag')}
              </span>
            </div>

            <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
              {t('epic.jackpotStandaloneTitle')}
            </h3>

            <p className="text-[11px] text-slate-200 leading-snug max-w-sm">
              {t('epic.jackpotStandaloneDesc')}
            </p>
          </div>

          {/* Right: Jackpot Amount & CTA */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10 gap-1.5">
            <div className="flex items-center space-x-1.5 text-amber-400">
              <GramIcon className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-2xl sm:text-3xl font-heading font-black text-amber-300 tracking-tight drop-shadow-sm">
                {jackpotAmountGram}
              </span>
              <span className="text-xs font-bold text-amber-400/90">GRAM</span>
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
