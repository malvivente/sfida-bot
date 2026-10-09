import React from 'react';
import { Target, Trophy, X, ArrowRight, Zap, Info } from 'lucide-react';
import { GameType } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType | null;
  onPlayGame?: (gameType: GameType) => void;
}

interface GameMeta {
  title: string;
  badge: string;
  gradient: string;
  border: string;
  glow: string;
  accentText: string;
  badgeBg: string;
}

const GAME_CONFIGS: Record<GameType, GameMeta> = {
  shotgun: {
    title: 'CYBER SHOTGUN',
    badge: '1V1 BUCKSHOT',
    gradient: 'from-red-600 via-rose-700 to-amber-800',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.25)]',
    accentText: 'text-red-400',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  connect4: {
    title: 'FORZA 4',
    badge: 'STRATEGIA 7x6',
    gradient: 'from-blue-600 via-indigo-700 to-blue-950',
    border: 'border-blue-500/40',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.25)]',
    accentText: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  split: {
    title: 'SPLIT OR STEAL',
    badge: '3 TURNI • JACKPOT',
    gradient: 'from-purple-700 via-indigo-900 to-slate-900',
    border: 'border-purple-500/40',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.25)]',
    accentText: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  cubecount: {
    title: 'CUBE COUNT',
    badge: 'FLASH IQ • 3 VITE',
    gradient: 'from-amber-600 via-orange-700 to-amber-900',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.25)]',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  roulette: {
    title: 'RUSSIAN ROULETTE',
    badge: '8 CAMERE • 1 VERA',
    gradient: 'from-emerald-600 via-teal-700 to-slate-900',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]',
    accentText: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  blackjack: {
    title: 'BLACKJACK FACE-UP',
    badge: 'CARTE SCOPERTE • 21',
    gradient: 'from-rose-600 via-red-800 to-slate-900',
    border: 'border-rose-500/40',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.25)]',
    accentText: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  bridge: {
    title: 'GLASS BRIDGE',
    badge: '12 PANNELLI • 2 VITE',
    gradient: 'from-sky-600 via-cyan-800 to-slate-900',
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.25)]',
    accentText: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  chrono: {
    title: 'CHRONO BLIND',
    badge: 'BLIND ZONE • TEMPO ZERO',
    gradient: 'from-amber-600 via-yellow-700 to-amber-950',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_30px_rgba(217,119,6,0.25)]',
    accentText: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  gameType,
  onPlayGame,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const { isFullscreen, topInset } = useTelegramViewport();

  if (!isOpen || !gameType) return null;

  const config = GAME_CONFIGS[gameType] || GAME_CONFIGS.roulette;
  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 12;
  const modalBottomOffset = isFullscreen ? 24 : 12;

  const goalText = t(`gameRules.${gameType}.goal`);
  const r1Text = t(`gameRules.${gameType}.r1`);
  const r2Text = t(`gameRules.${gameType}.r2`);
  const r3Text = t(`gameRules.${gameType}.r3`);
  const winText = t(`gameRules.${gameType}.win`);

  return (
    <div
      style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center px-3 sm:px-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
        className={`bg-[#121520] border ${config.border} rounded-3xl max-w-sm sm:max-w-md w-full ${config.glow} flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150 font-sans`}
      >
        {/* Header with Visual Banner */}
        <div className={`relative p-4 sm:p-5 pb-4 border-b border-white/10 bg-gradient-to-r ${config.gradient} overflow-hidden shrink-0`}>
          {/* Subtle background art */}
          <CardBackgroundArt
            type={gameType}
            className="absolute -right-4 -bottom-4 w-32 h-32 opacity-30 pointer-events-none"
          />

          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-white/20 text-white text-[10px] font-heading font-black tracking-wider uppercase backdrop-blur-sm shadow-sm">
                <Info className="w-3 h-3 text-white" />
                <span>{t('gameRules.modalTitle')}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wide drop-shadow-md">
                {config.title}
              </h3>
              <span className={`inline-block text-[9.5px] font-heading font-bold px-2 py-0.5 rounded-lg border ${config.badgeBg}`}>
                {config.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerImpact('light');
                onClose();
              }}
              className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-white/80 hover:text-white transition-all shrink-0 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 font-sans">
          {/* 1. Objective Card */}
          <div className="bg-[#161a29]/90 border border-white/10 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-heading font-black text-[11px] uppercase tracking-wider text-cyan-300">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('gameRules.goal')}</span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              {goalText}
            </p>
          </div>

          {/* 2. Mechanics / How It Works */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 px-1 font-heading font-bold text-[10.5px] uppercase tracking-wider text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('gameRules.howItWorks')}</span>
            </div>

            <div className="space-y-2">
              {r1Text && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 text-white font-heading font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-white/15">
                    1
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {r1Text}
                  </p>
                </div>
              )}

              {r2Text && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 text-white font-heading font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-white/15">
                    2
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {r2Text}
                  </p>
                </div>
              )}

              {r3Text && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 text-white font-heading font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-white/15">
                    3
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {r3Text}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Victory & Payouts */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-heading font-black text-[11px] uppercase tracking-wider text-emerald-400">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('gameRules.victoryCondition')}</span>
            </div>
            <p className="text-emerald-100 font-medium leading-relaxed">
              {winText}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-heading font-bold text-xs uppercase tracking-wider active:scale-95 transition-all text-center"
          >
            {t('gameRules.close')}
          </button>

          {onPlayGame && (
            <button
              type="button"
              onClick={() => {
                triggerImpact('medium');
                onClose();
                onPlayGame(gameType);
              }}
              className={`flex-1 py-2.5 rounded-2xl bg-gradient-to-r ${config.gradient} text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1 border border-white/20`}
            >
              <span>{t('gameRules.playNow')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
