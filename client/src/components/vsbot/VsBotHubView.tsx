import React, { useState } from 'react';
import { ArrowLeft, Bot } from 'lucide-react';
import { GameType } from '../../types/index.js';
import { GAMES_METADATA } from '../../config/gamesConfig.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { VsBotArenaRunner } from './VsBotArenaRunner.js';

interface VsBotHubViewProps {
  onBack: () => void;
  userProfile?: {
    displayName?: string;
    username?: string;
    photoUrl?: string;
  };
}

// Exactly the 7 games selected for VS BOT (excluding split, chrono, cubecount)
const BOT_GAMES: GameType[] = ['shotgun', 'roulette', 'blackjack', 'connect4', 'bridge', 'headsoccer', 'poker', 'boxing'];
const BOT_QUICK_GAMES: GameType[] = ['roulette', 'blackjack', 'bridge', 'headsoccer', 'boxing'];
const BOT_STRATEGY_GAMES: GameType[] = ['shotgun', 'connect4', 'poker'];

export const VsBotHubView: React.FC<VsBotHubViewProps> = ({ onBack, userProfile }) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [activeCategory, setActiveCategory] = useState<'all' | 'quick' | 'strategy'>('all');
  const [activeBotGame, setActiveBotGame] = useState<GameType | null>(null);

  if (activeBotGame) {
    return (
      <VsBotArenaRunner
        gameType={activeBotGame}
        onExit={() => setActiveBotGame(null)}
        userProfile={userProfile}
      />
    );
  }

  const filteredGames = Object.values(GAMES_METADATA)
    .filter((g) => BOT_GAMES.includes(g.id))
    .filter((g) => {
      if (activeCategory === 'quick') return BOT_QUICK_GAMES.includes(g.id);
      if (activeCategory === 'strategy') return BOT_STRATEGY_GAMES.includes(g.id);
      return true;
    });

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-12 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            onBack();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-heading font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-heading font-black text-white tracking-wider uppercase">
            {t('vsbot.title')}
          </h2>
        </div>
      </div>

      {/* Hero Explainer Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950/70 via-slate-900/90 to-emerald-950/60 border border-teal-500/30 p-4 shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-teal-500/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-heading font-black text-[9px] uppercase tracking-wider">
              {t('vsbot.heroBadge')}
            </span>
          </div>
          <h3 className="text-base font-heading font-black text-white uppercase tracking-wide">
            {t('vsbot.heroTitle')}
          </h3>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {t('vsbot.heroDesc')}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1 items-stretch">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('all');
          }}
          className={`py-2 px-1 rounded-xl text-center select-none active:scale-95 transition-all border ${
            activeCategory === 'all'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm border-white/20 font-black'
              : 'border-transparent text-slate-400 hover:text-white font-bold'
          }`}
        >
          <span className="text-[10px] font-heading uppercase tracking-wider block">
            {t('vsbot.tabAll')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('quick');
          }}
          className={`py-2 px-1 rounded-xl text-center select-none active:scale-95 transition-all border ${
            activeCategory === 'quick'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm border-white/20 font-black'
              : 'border-transparent text-slate-400 hover:text-white font-bold'
          }`}
        >
          <span className="text-[10px] font-heading uppercase tracking-wider block">
            {t('vsbot.tabQuick')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('strategy');
          }}
          className={`py-2 px-1 rounded-xl text-center select-none active:scale-95 transition-all border ${
            activeCategory === 'strategy'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-sm border-white/20 font-black'
              : 'border-transparent text-slate-400 hover:text-white font-bold'
          }`}
        >
          <span className="text-[10px] font-heading uppercase tracking-wider block">
            {t('vsbot.tabStrategy')}
          </span>
        </button>
      </div>

      {/* Games Grid / Cards */}
      <div className="space-y-3">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            onClick={() => {
              triggerImpact('medium');
              setActiveBotGame(game.id);
            }}
            className="relative overflow-hidden rounded-3xl bg-[#141724]/90 border border-white/10 hover:border-teal-500/50 p-4 shadow-lg cursor-pointer active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 font-heading font-black text-[9px] uppercase tracking-wider">
                    {game.badge}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {t('vsbot.cpuOpponent')}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-heading font-black text-white uppercase tracking-wider truncate group-hover:text-teal-300 transition-colors">
                  {game.title}
                </h4>

                <p className="text-[11px] text-slate-300 font-sans line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 group-hover:from-teal-400 group-hover:to-emerald-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-md shrink-0 flex items-center space-x-1"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{t('vsbot.playBtn')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
