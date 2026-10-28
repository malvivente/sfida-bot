import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, ArrowRight, Zap, Target, Info, Sparkles, Trophy, Gamepad2 } from 'lucide-react';
import { GameType, MatchData } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { GameRulesModal } from './GameRulesModal.js';
import { GAMES_METADATA, F2P_GAMES } from '../config/gamesConfig.js';

interface PlayHubViewProps {
  onBack: () => void;
  matches: MatchData[];
  onSelectGame: (gameType: GameType) => void;
  onNavigateToDuels?: (gameType?: string) => void;
  onCreateMatchForGame: (gameType: GameType) => void;
  initialSection?: 'all' | 'f2p';
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

  const [activeCategory, setActiveCategory] = useState<'all' | 'f2p'>(initialSection === 'f2p' ? 'f2p' : 'all');
  const [selectedRulesGame, setSelectedRulesGame] = useState<GameType | null>(null);

  useEffect(() => {
    if (initialSection) {
      setActiveCategory(initialSection === 'f2p' ? 'f2p' : 'all');
    }
  }, [initialSection]);

  // Count open rooms per game
  const getOpenRoomsCount = (type: GameType) => {
    return matches.filter((m) => m.gameType === type && m.state === 'LOBBY' && (!m.playerB || (m.gameType === 'poker' && (m.currentPlayers || 1) < (m.maxPlayers || 2)))).length;
  };

  // Ordered games list for display
  const allGameKeys: GameType[] = [
    'uno',
    'headsoccer',
    'shotgun',
    'roulette',
    'blackjack',
    'connect4',
    'poker',
    'bridge',
    'chrono',
    'split',
    'cubecount',
  ];

  const displayedGames = allGameKeys.filter((g) => {
    if (activeCategory === 'f2p') return F2P_GAMES.includes(g);
    return true;
  });

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-8 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Navigation: Back to Home & Title */}
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

        <h2 className="text-sm font-heading font-black text-white tracking-wider uppercase">
          PVP DUELS
        </h2>
      </div>

      {/* Category Filter Switcher: ALL vs FREE TO PLAY (F2P) */}
      <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1 items-stretch">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('all');
          }}
          className={`h-full min-h-[46px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center select-none active:scale-95 transition-all border ${
            activeCategory === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm border-white/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-[11px] font-heading font-black uppercase tracking-wider block">
            {t('playHub.allGamesLabel')}
          </span>
          <span className="text-[9.5px] font-heading font-bold opacity-80 block">
            ({allGameKeys.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('f2p');
          }}
          className={`h-full min-h-[46px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center select-none active:scale-95 transition-all border ${
            activeCategory === 'f2p'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-sm border-emerald-400 font-black'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-[11px] font-heading font-black uppercase tracking-wider block flex items-center space-x-1">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>FREE TO PLAY (F2P)</span>
          </span>
          <span className="text-[9.5px] font-heading font-bold opacity-90 block">
            (2 GIOCHI)
          </span>
        </button>
      </div>

      {/* Header Info */}
      <div className="px-1 flex flex-col">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${activeCategory === 'f2p' ? 'bg-emerald-400' : 'bg-purple-500'} animate-pulse`} />
          <h3 className="text-sm font-heading font-black text-white tracking-wide uppercase">
            {activeCategory === 'f2p' ? 'GIOCHI CON MODALITÀ GRATUITA (F2P)' : 'TUTTI I GIOCHI PVP'}
          </h3>
        </div>
        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
          {activeCategory === 'f2p'
            ? 'Gioca gratis senza scommettere oppure scegli di puntare Gram per vincere il piatto.'
            : 'Scegli la tua disciplina, crea una stanza o affronta altri giocatori in tempo reale.'}
        </p>
      </div>

      {/* Hero Card 1: UNO CARD DUEL (When in F2P or at top of list) */}
      {displayedGames.includes('uno') && (
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('uno');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 bg-origin-border p-4 sm:p-5 shadow-xl border border-amber-400/30 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerImpact('light');
              setSelectedRulesGame('uno');
            }}
            className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
            title="Regole del gioco"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1.5 max-w-[70%]">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-heading font-black tracking-wide shadow-sm">
                <Gamepad2 className="w-3 h-3" />
                <span>FREE TO PLAY & SCOMMESSE</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                UNO CARD DUEL
              </h3>

              <p className="text-xs text-amber-100/90 font-medium leading-tight">
                Duello 1v1 con carte a 4 colori: Salta, Inverti, +2, +4 Jolly e grido finale UNO! Giocabile 100% gratis o con scommessa Gram.
              </p>

              <div className="pt-1 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerImpact('medium');
                    onCreateMatchForGame('uno');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>GIOCA ORA</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                  {getOpenRoomsCount('uno')} stanze
                </span>
              </div>
            </div>

            <div className="w-20 h-24 rounded-2xl bg-black/40 border-2 border-amber-300/40 p-2 flex flex-col justify-between items-center shadow-2xl group-hover:scale-105 transition-transform">
              <span className="font-mono font-black text-xs text-amber-300">UNO</span>
              <span className="text-3xl">🃏</span>
              <span className="text-[9px] font-mono font-bold text-white uppercase">4 COLORS</span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Card 2: HEAD SOCCER */}
      {displayedGames.includes('headsoccer') && (
        <div
          onClick={() => {
            triggerImpact('medium');
            onCreateMatchForGame('headsoccer');
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 bg-origin-border p-4 sm:p-5 shadow-xl border border-emerald-400/30 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerImpact('light');
              setSelectedRulesGame('headsoccer');
            }}
            className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
            title="Regole del gioco"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1.5 max-w-[70%]">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-heading font-black tracking-wide shadow-sm">
                <Gamepad2 className="w-3 h-3 text-emerald-600" />
                <span>FREE TO PLAY & SCOMMESSE</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                HEAD SOCCER
              </h3>

              <p className="text-xs text-emerald-100/90 font-medium leading-tight">
                Calcio arcade 1v1 da 60s in stile handheld retro. Salti, colpi di testa, rovesciate e Super Shot infuocati!
              </p>

              <div className="pt-1 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerImpact('medium');
                    onCreateMatchForGame('headsoccer');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>GIOCA ORA</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                  {getOpenRoomsCount('headsoccer')} stanze
                </span>
              </div>
            </div>

            <div className="w-20 h-24 rounded-2xl bg-black/40 border-2 border-emerald-400/40 p-2 flex flex-col justify-between items-center shadow-2xl group-hover:scale-105 transition-transform">
              <span className="font-mono font-black text-xs text-emerald-300">1V1</span>
              <span className="text-3xl">⚽</span>
              <span className="text-[9px] font-mono font-bold text-white uppercase">60 SEC</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Remaining Games (when in ALL mode) */}
      {activeCategory === 'all' && (
        <div className="grid grid-cols-2 gap-3">
          {displayedGames
            .filter((g) => g !== 'uno' && g !== 'headsoccer')
            .map((gameKey) => {
              const meta = GAMES_METADATA[gameKey];
              if (!meta) return null;
              const openCount = getOpenRoomsCount(gameKey);

              return (
                <div
                  key={gameKey}
                  onClick={() => {
                    triggerImpact('medium');
                    onCreateMatchForGame(gameKey);
                  }}
                  className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.bgGradient} p-3.5 border ${meta.borderColor} shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('light');
                      setSelectedRulesGame(gameKey);
                    }}
                    className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                    title="Regole"
                  >
                    <Info className="w-3 h-3" />
                  </button>

                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-heading font-black text-white/90 border border-white/10 uppercase tracking-wider inline-block">
                      {meta.badge}
                    </span>
                    <h4 className="text-sm font-heading font-black text-white tracking-wide uppercase">
                      {meta.title}
                    </h4>
                    <p className="text-[10px] text-slate-300 font-sans line-clamp-2 leading-tight">
                      {meta.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {openCount} stanze
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-xl bg-white/10 group-hover:bg-white group-hover:text-slate-950 text-white font-heading font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      GIOCA
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Rules Modal */}
      {selectedRulesGame && (
        <GameRulesModal
          gameType={selectedRulesGame}
          isOpen={Boolean(selectedRulesGame)}
          onClose={() => setSelectedRulesGame(null)}
        />
      )}
    </div>
  );
};
