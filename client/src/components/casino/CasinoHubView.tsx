import React, { useState } from 'react';
import { ArrowLeft, Dices, Layers, Rocket, Bomb, CircleDot, Disc, Sparkles, ShieldCheck, Trophy, Flame } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';

// Modular Casino Games
import { CrashGame } from './games/CrashGame.js';
import { MinesGame } from './games/MinesGame.js';
import { PlinkoGame } from './games/PlinkoGame.js';
import { RouletteGame } from './games/RouletteGame.js';
import { DiceGame } from './games/DiceGame.js';
import { HiLoGame } from './games/HiLoGame.js';

interface CasinoHubViewProps {
  onBack: () => void;
  userBalanceGram?: string;
  onBalanceUpdated?: (newBalance: string) => void;
}

export type CasinoGameType = 'crash' | 'mines' | 'plinko' | 'roulette' | 'dice' | 'hilo';

interface CasinoCardData {
  id: CasinoGameType;
  title: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  rtp: string;
  gradient: string;
  borderColor: string;
  icon: React.ReactNode;
  placeholderArt: string;
}

export const CasinoHubView: React.FC<CasinoHubViewProps> = ({
  onBack,
  userBalanceGram = '0.00',
  onBalanceUpdated,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [activeGame, setActiveGame] = useState<CasinoGameType | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoBalance, setDemoBalance] = useState<number>(100.0);

  const realBalance = parseFloat(userBalanceGram || '0');
  const currentBalance = isDemoMode ? demoBalance : realBalance;

  // Update balance delta helper
  const updateBalanceDelta = (delta: number) => {
    if (isDemoMode) {
      setDemoBalance((prev) => Math.max(0, parseFloat((prev + delta).toFixed(2))));
    } else {
      const next = Math.max(0, parseFloat((realBalance + delta).toFixed(2)));
      onBalanceUpdated?.(next.toFixed(2));
      try {
        const saved = localStorage.getItem('sfidabot_user_balance');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.balanceGram = next.toFixed(2);
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(parsed));
          window.dispatchEvent(new CustomEvent('sfida_balance_updated', { detail: { balance: next.toFixed(2) } }));
        }
      } catch {}
    }
  };

  const CASINO_GAMES: CasinoCardData[] = [
    {
      id: 'crash',
      title: 'Crash / Aviator',
      tagline: 'Moltiplicatore a razzo esponenziale in salita rapida',
      badge: '🔥 PIÙ GIOCATO',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
      rtp: '96.0% RTP',
      gradient: 'from-cyan-950/40 via-teal-950/20 to-black',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      icon: <Rocket className="w-5 h-5 text-cyan-400" />,
      placeholderArt: '🚀',
    },
    {
      id: 'mines',
      title: 'Mines',
      tagline: 'Griglia 5x5 con 25 tessere, gemme luccicanti e mine',
      badge: '💎 TOP STRATEGY',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      rtp: '96.0% RTP',
      gradient: 'from-emerald-950/40 via-teal-950/20 to-black',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      icon: <Bomb className="w-5 h-5 text-emerald-400" />,
      placeholderArt: '💣',
    },
    {
      id: 'plinko',
      title: 'Plinko',
      tagline: 'Piramide a pioli con caduta a rimbalzi e vaschette',
      badge: '⚡ CASINO ARCADE',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      rtp: '96.0% RTP',
      gradient: 'from-purple-950/40 via-indigo-950/20 to-black',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
      icon: <CircleDot className="w-5 h-5 text-purple-400" />,
      placeholderArt: '⚡',
    },
    {
      id: 'roulette',
      title: 'Roulette Europea',
      tagline: 'Tavolo classico a 37 numeri con green zero e rosso/nero',
      badge: '👑 CLASSIC 37',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      rtp: '97.3% RTP',
      gradient: 'from-amber-950/40 via-orange-950/20 to-black',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      icon: <Disc className="w-5 h-5 text-amber-400" />,
      placeholderArt: '🎡',
    },
    {
      id: 'dice',
      title: 'Dice (Dado)',
      tagline: 'Lancio matematico con slider probabilità e payout istantaneo',
      badge: '🎲 PROVABLY FAIR',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
      rtp: '96.0% RTP',
      gradient: 'from-yellow-950/40 via-amber-950/20 to-black',
      borderColor: 'border-yellow-500/40 hover:border-yellow-400',
      icon: <Dices className="w-5 h-5 text-yellow-400" />,
      placeholderArt: '🎲',
    },
    {
      id: 'hilo',
      title: 'HiLo (Alta/Bassa)',
      tagline: 'Previsione carta successiva con moltiplicatori a catena',
      badge: '🃏 CARD GAME',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
      rtp: '96.0% RTP',
      gradient: 'from-rose-950/40 via-pink-950/20 to-black',
      borderColor: 'border-rose-500/40 hover:border-rose-400',
      icon: <Layers className="w-5 h-5 text-rose-400" />,
      placeholderArt: '🃏',
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-12 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            if (activeGame !== null) {
              setActiveGame(null); // Return to casino cards lobby
            } else {
              onBack(); // Return to home
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-heading font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{activeGame ? 'Lobby Casino' : t('common.back')}</span>
        </button>

        {/* Balance & Demo Toggle */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setIsDemoMode(!isDemoMode);
            }}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-heading font-bold uppercase tracking-wider border transition-all active:scale-95 ${
              isDemoMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {isDemoMode ? t('casino.demoMode') : t('casino.realGram')}
          </button>

          <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300 text-xs font-heading font-bold">
            <GramIcon className="w-3.5 h-3.5" />
            <span>{currentBalance.toFixed(2)}</span>
            <span className="text-[9px] text-slate-400">{isDemoMode ? 'CHIP' : 'G'}</span>
          </div>
        </div>
      </div>

      {/* Main Title Banner (shown when in lobby) */}
      {!activeGame && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/30 via-purple-950/30 to-black border border-amber-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-heading font-black text-[9px] uppercase tracking-wider">
                  SFIDA CASINO ORIGINALS
                </span>
                <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>PROVABLY FAIR</span>
                </span>
              </div>
              <h2 className="text-base font-heading font-black text-white uppercase tracking-wider">
                Tavoli & Giochi del Banco
              </h2>
              <p className="text-[11px] text-slate-300">
                Scegli un gioco per iniziare. Algoritmi crittografici certificati e pagamenti immediati.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Dices className="w-7 h-7" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. CASINO CARDS LOBBY VIEW (MODULAR GRID - NO SPACE ISSUE) */}
      {/* ======================================================== */}
      {!activeGame ? (
        <div className="grid grid-cols-2 gap-3">
          {CASINO_GAMES.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                triggerImpact('light');
                setActiveGame(game.id);
              }}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-b ${game.gradient} border ${game.borderColor} p-3.5 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer flex flex-col justify-between min-h-[195px]`}
            >
              {/* Card Top: Badge & RTP */}
              <div className="flex items-center justify-between w-full">
                <span className={`px-2 py-0.5 rounded-md border text-[8.5px] font-heading font-black uppercase tracking-wider ${game.badgeColor}`}>
                  {game.badge}
                </span>
                <span className="text-[9px] font-mono text-slate-400 font-bold">
                  {game.rtp}
                </span>
              </div>

              {/* Placeholder Art Box (customizable / replaceable by user) */}
              <div className="my-2.5 w-full h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-200">
                <span>{game.placeholderArt}</span>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-0.5">
                <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  {game.icon}
                  <span className="truncate">{game.title}</span>
                </h3>
                <p className="text-[9.5px] text-slate-400 line-clamp-2 leading-tight">
                  {game.tagline}
                </p>
              </div>

              {/* Play Button */}
              <div className="pt-2">
                <button
                  type="button"
                  className="w-full py-1.5 rounded-xl bg-white/10 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-yellow-500 group-hover:text-slate-950 text-white font-heading font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>GIOCA ORA</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ======================================================== */
        /* 2. DEDICATED CASINO GAME VIEW                            */
        /* ======================================================== */
        <div className="space-y-3">
          {/* Active Game Header Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {CASINO_GAMES.find((g) => g.id === activeGame)?.placeholderArt}
              </span>
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                {CASINO_GAMES.find((g) => g.id === activeGame)?.title}
              </h3>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{CASINO_GAMES.find((g) => g.id === activeGame)?.rtp}</span>
            </div>
          </div>

          {/* Mount Selected Game */}
          {activeGame === 'crash' && (
            <CrashGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}

          {activeGame === 'mines' && (
            <MinesGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}

          {activeGame === 'plinko' && (
            <PlinkoGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}

          {activeGame === 'roulette' && (
            <RouletteGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}

          {activeGame === 'dice' && (
            <DiceGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}

          {activeGame === 'hilo' && (
            <HiLoGame
              currentBalance={currentBalance}
              isDemoMode={isDemoMode}
              onUpdateBalance={updateBalanceDelta}
            />
          )}
        </div>
      )}
    </div>
  );
};
