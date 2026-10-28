import React, { useState, useEffect } from 'react';
import { ArrowLeft, Flame, ArrowRight, Zap, Target, Info, Gamepad2 } from 'lucide-react';
import { GameType, MatchData } from '../types/index.js';
import { CardBackgroundArt } from './CardBackgroundArt.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { GameRulesModal } from './GameRulesModal.js';

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

  const [activeCategory, setActiveCategory] = useState<'all' | 'f2p'>(
    initialSection === 'f2p' ? 'f2p' : 'all'
  );
  const [selectedRulesGame, setSelectedRulesGame] = useState<GameType | null>(null);

  useEffect(() => {
    if (initialSection) {
      setActiveCategory(initialSection === 'f2p' ? 'f2p' : 'all');
    }
  }, [initialSection]);

  // Count open rooms per game
  const getOpenRoomsCount = (type: GameType) => {
    return matches.filter(
      (m) =>
        m.gameType === type &&
        m.state === 'LOBBY' &&
        (!m.playerB || (m.gameType === 'poker' && (m.currentPlayers || 1) < (m.maxPlayers || 2)))
    ).length;
  };

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
          <span>{t('common.back') || 'Torna'}</span>
        </button>

        <h2 className="text-sm font-heading font-black text-white tracking-wider uppercase">
          PVP DUELS
        </h2>
      </div>

      {/* Category Filter Switcher Tabs: ALL vs FREE TO PLAY (F2P) */}
      <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1 items-stretch">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('all');
          }}
          style={{ outline: 'none' }}
          className={`h-full min-h-[46px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center select-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-95 transition-all border ${
            activeCategory === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm border-white/20'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase tracking-tight sm:tracking-wider leading-tight block truncate max-w-full">
            {t('playHub.allGamesLabel') || 'TUTTI I GIOCHI'}
          </span>
          <span className="text-[9px] font-heading font-bold opacity-80 leading-tight block">
            (11)
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveCategory('f2p');
          }}
          style={{ outline: 'none' }}
          className={`h-full min-h-[46px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center select-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] active:scale-95 transition-all border ${
            activeCategory === 'f2p'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-sm border-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-heading font-black uppercase tracking-tight sm:tracking-wider leading-tight block truncate max-w-full flex items-center space-x-1">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>FREE TO PLAY (F2P)</span>
          </span>
          <span className="text-[9px] font-heading font-bold opacity-90 leading-tight block">
            (2)
          </span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* SECTION: FREE TO PLAY GIOCHI (UNO & HEAD SOCCER)               */}
      {/* ============================================================= */}
      {activeCategory === 'f2p' && (
        <div className="space-y-3">
          <div className="px-1 flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-heading font-black text-white tracking-wide uppercase">
                GIOCHI CON MODALITÀ GRATUITA (F2P)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Sfida altri giocatori a costo zero oppure scegli di scommettere GRAM per vincere il piatto!
            </p>
          </div>

          {/* UNO Card Duel Hero Card */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('uno');
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 bg-origin-border p-4 sm:p-5 shadow-xl border border-amber-400/30 hover:border-amber-400/60 transition-all active:scale-[0.99] cursor-pointer min-h-[145px]"
          >
            {/* Rules info button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerImpact('light');
                setSelectedRulesGame('uno');
              }}
              className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
              title={t('gameRules.infoTooltip') || 'Regole del gioco'}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl pointer-events-none" />

            <CardBackgroundArt
              type="uno"
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-40 sm:w-48 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5 max-w-[68%]">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-slate-950 text-[10px] font-heading font-black tracking-wide shadow-sm">
                  <Gamepad2 className="w-3 h-3 text-emerald-600" />
                  <span>F2P & SCOMMESSE</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                  UNO CARD DUEL
                </h3>

                <p className="text-xs text-amber-100/90 font-medium leading-tight">
                  Duello classico 1v1 con carte a 4 colori, carte azione Salta, Inverti, +2, +4 Jolly e grido UNO!
                </p>

                <div className="pt-1 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('medium');
                      onCreateMatchForGame('uno');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-amber-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                  >
                    <span>{t('playHub.playNow') || 'GIOCA ORA'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('uno') }) || `${getOpenRoomsCount('uno')} stanze`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Head Soccer Hero Card */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('headsoccer');
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-900 bg-origin-border p-4 sm:p-5 shadow-xl border border-emerald-400/30 hover:border-emerald-400/60 transition-all active:scale-[0.99] cursor-pointer min-h-[145px]"
          >
            {/* Rules info button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerImpact('light');
                setSelectedRulesGame('headsoccer');
              }}
              className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
              title={t('gameRules.infoTooltip') || 'Regole del gioco'}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-emerald-400/25 blur-2xl pointer-events-none" />

            <CardBackgroundArt
              type="headsoccer"
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-40 sm:w-48 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5 max-w-[68%]">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-heading font-black tracking-wide shadow-sm">
                  <Gamepad2 className="w-3 h-3 text-emerald-600" />
                  <span>F2P & SCOMMESSE</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                  HEAD SOCCER
                </h3>

                <p className="text-xs text-emerald-100/90 font-medium leading-tight">
                  {t('playHub.headSoccerDesc') || 'Calcio arcade 1v1 da 60s con tiri infuocati, rovesciate e salti acrobatici.'}
                </p>

                <div className="pt-1 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('medium');
                      onCreateMatchForGame('headsoccer');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                  >
                    <span>{t('playHub.playNow') || 'GIOCA ORA'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('headsoccer') }) || `${getOpenRoomsCount('headsoccer')} stanze`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SECTION: TUTTI I GIOCHI PVP (ALL GAMES - ORIGINAL RICH CARDS) */}
      {/* ============================================================= */}
      {activeCategory === 'all' && (
        <div className="space-y-4">
          {/* 1. Cyber Shotgun (Hero Card) */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('shotgun');
            }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-700 to-amber-800 bg-origin-border p-4 sm:p-5 shadow-xl border border-white/15 cursor-pointer active:scale-[0.99] transition-all group min-h-[145px]"
          >
            {/* Rules info button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerImpact('light');
                setSelectedRulesGame('shotgun');
              }}
              className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
              title={t('gameRules.infoTooltip') || 'Regole del gioco'}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-red-400/25 blur-2xl pointer-events-none" />

            <CardBackgroundArt
              type="shotgun"
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-44 sm:w-52 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5 max-w-[68%]">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-heading font-black tracking-wide shadow-sm">
                  <Flame className="w-3 h-3 fill-red-500 text-red-500" />
                  <span>{t('playHub.newGame') || 'PIÙ GIOCATO'}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                  CYBER SHOTGUN
                </h3>

                <p className="text-xs text-red-100/90 font-medium leading-tight">
                  {t('playHub.shotgunDesc') || 'Duello a turni col fucile a pompa: cartucce vere e a salve, oggetti strategici e adrenalina pura.'}
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
                    <span>{t('playHub.playNow') || 'GIOCA ORA'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('shotgun') }) || `${getOpenRoomsCount('shotgun')} stanze`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. UNO Card Duel (Rich Hero Card) */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('uno');
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 bg-origin-border p-4 sm:p-5 shadow-xl border border-amber-400/30 hover:border-amber-400/60 transition-all active:scale-[0.99] cursor-pointer min-h-[145px]"
          >
            {/* Rules info button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerImpact('light');
                setSelectedRulesGame('uno');
              }}
              className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
              title={t('gameRules.infoTooltip') || 'Regole del gioco'}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl pointer-events-none" />

            <CardBackgroundArt
              type="uno"
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-40 sm:w-48 h-auto opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5 max-w-[68%]">
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white text-slate-950 text-[10px] font-heading font-black tracking-wide shadow-sm">
                  <Gamepad2 className="w-3 h-3 text-emerald-600" />
                  <span>F2P & SCOMMESSE</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide drop-shadow-md">
                  UNO CARD DUEL
                </h3>

                <p className="text-xs text-amber-100/90 font-medium leading-tight">
                  Duello classico 1v1 con carte a 4 colori, carte azione Salta, Inverti, +2, +4 Jolly e grido UNO!
                </p>

                <div className="pt-1 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('medium');
                      onCreateMatchForGame('uno');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-amber-50 font-heading font-extrabold text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center space-x-1"
                  >
                    <span>{t('playHub.playNow') || 'GIOCA ORA'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('uno') }) || `${getOpenRoomsCount('uno')} stanze`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 2-Column Grid: Forza 4 & Split or Steal */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card: Forza 4 (Connect 4) */}
            <div
              onClick={() => {
                triggerImpact('medium');
                onCreateMatchForGame('connect4');
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('connect4');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="connect4"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeConnect4') || 'STRATEGIA'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  {t('playHub.titleConnect4') || 'FORZA 4'}
                </h4>
                <p className="text-[10px] text-blue-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.connect4Desc') || 'Allinea 4 dischi del tuo colore in orizzontale, verticale o diagonale.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('connect4') }) || `${getOpenRoomsCount('connect4')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
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
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 to-slate-900 bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('split');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="split"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeSplit') || 'DILEMMA'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  SPLIT OR STEAL
                </h4>
                <p className="text-[10px] text-purple-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.splitDesc') || 'Dividi o Ruba? Scegli in segreto: se entrambi dividete vincete a metà, se rubi prendi tutto.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('split') }) || `${getOpenRoomsCount('split')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
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
              className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-700 to-amber-900 bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex items-center justify-between min-h-[110px]"
            >
              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="cubecount"
                className="absolute right-20 top-1/2 -translate-y-1/2 w-28 h-28 opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 flex items-center min-w-0 flex-1 pr-3">
                <div className="space-y-1 min-w-0 max-w-[68%]">
                  <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                    {t('playHub.badgeCubeCount') || 'VISIONE 3D'}
                  </span>
                  <h4 className="text-base font-heading font-black text-white">
                    CUBE COUNT
                  </h4>
                  <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-1">
                    {t('playHub.cubeCountDesc') || 'Conta i cubi 3D nel minor tempo possibile.'}
                  </p>
                </div>
              </div>

              <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch">
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-xl bg-white/20 text-white text-[9px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('cubecount') }) || `${getOpenRoomsCount('cubecount')} stanze`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('light');
                      setSelectedRulesGame('cubecount');
                    }}
                    className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                    title={t('gameRules.infoTooltip') || 'Regole del gioco'}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform mt-auto">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* 4. 2x2 Grid: Russian Roulette, Blackjack, Glass Bridge, Chrono Blind */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card: Russian Roulette */}
            <div
              onClick={() => {
                triggerImpact('medium');
                onCreateMatchForGame('roulette');
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('roulette');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="roulette"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeRoulette') || 'FORTUNA'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  ROULETTE
                </h4>
                <p className="text-[10px] text-emerald-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.rouletteDesc') || 'Ruota a 6 colpi. Spara a te stesso o all\'avversario con decisioni ad alto rischio.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('roulette') }) || `${getOpenRoomsCount('roulette')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card: Blackjack Face-Up */}
            <div
              onClick={() => {
                triggerImpact('medium');
                onCreateMatchForGame('blackjack');
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e11d48] to-[#881337] bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('blackjack');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="blackjack"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeBlackjack') || '21 RAPIDO'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  BLACKJACK
                </h4>
                <p className="text-[10px] text-pink-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.blackjackDesc') || 'Duello a carte scoperte: chiedi carta, stai o busta. Chi si avvicina di più a 21 vince.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('blackjack') }) || `${getOpenRoomsCount('blackjack')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card: Glass Bridge */}
            <div
              onClick={() => {
                triggerImpact('medium');
                onCreateMatchForGame('bridge');
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0284c7] to-[#0f172a] bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('bridge');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="bridge"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeBridge') || 'MEMORIA'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  GLASS BRIDGE
                </h4>
                <p className="text-[10px] text-sky-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.bridgeDesc') || 'Ponte di vetro sospeso: un pannello regge, l\'altro cede. Attraversa senza cadere.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('bridge') }) || `${getOpenRoomsCount('bridge')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card: Chrono Blind */}
            <div
              onClick={() => {
                triggerImpact('medium');
                onCreateMatchForGame('chrono');
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#d97706] to-[#78350f] bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer group active:scale-95 transition-all flex flex-col justify-between min-h-[175px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImpact('light');
                  setSelectedRulesGame('chrono');
                }}
                className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                title={t('gameRules.infoTooltip') || 'Regole del gioco'}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

              <CardBackgroundArt
                type="chrono"
                className="absolute -right-2 top-8 w-24 h-24 opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
              />

              <div className="relative z-10 space-y-1.5 pt-1">
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                  {t('playHub.badgeChrono') || 'TEMPO BUIO'}
                </span>
                <h4 className="text-base font-heading font-black text-white">
                  CHRONO BLIND
                </h4>
                <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-3">
                  {t('playHub.chronoDesc') || 'Ferma il cronometro al buio esattamente sul target. Chi è più preciso si prende il piatto.'}
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/90">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('chrono') }) || `${getOpenRoomsCount('chrono')} stanze`}
                </span>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* 5. Head Soccer (Full Width Card) */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('headsoccer');
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-900 bg-origin-border p-4 border border-white/15 shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-between min-h-[115px]"
          >
            <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

            <CardBackgroundArt
              type="headsoccer"
              className="absolute right-20 top-1/2 -translate-y-1/2 w-28 h-28 opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center min-w-0 flex-1 pr-3">
              <div className="space-y-1 min-w-0 max-w-[68%]">
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-heading font-black tracking-wide shadow-sm">
                  <Gamepad2 className="w-3 h-3 text-emerald-600" />
                  <span>F2P & SCOMMESSE</span>
                </div>
                <h4 className="text-base font-heading font-black text-white">
                  HEAD SOCCER
                </h4>
                <p className="text-[10px] text-emerald-100 font-medium leading-tight line-clamp-2">
                  {t('playHub.headSoccerDesc') || 'Calcio arcade 1v1 da 60s in stile retro con super tiri.'}
                </p>
              </div>
            </div>

            <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch">
              <div className="flex items-center space-x-1.5">
                <span className="px-2 py-0.5 rounded-xl bg-white/20 text-white text-[9px] font-bold">
                  {t('playHub.openRooms', { count: getOpenRoomsCount('headsoccer') }) || `${getOpenRoomsCount('headsoccer')} stanze`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerImpact('light');
                    setSelectedRulesGame('headsoccer');
                  }}
                  className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                  title={t('gameRules.infoTooltip') || 'Regole del gioco'}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform mt-auto">
                <span>{t('playHub.playNow') || 'GIOCA'}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 6. Texas Hold'em Poker (Full Width Card) */}
          <div
            onClick={() => {
              triggerImpact('medium');
              onCreateMatchForGame('poker');
            }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-emerald-800 to-slate-950 p-3.5 border border-amber-400/30 hover:border-amber-400/60 transition-all active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-amber-900/20 min-h-[115px]"
          >
            <CardBackgroundArt
              type="poker"
              className="absolute right-20 top-1/2 -translate-y-1/2 w-28 h-28 opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="relative z-10 flex items-center min-w-0 flex-1 pr-3">
                <div className="space-y-1 min-w-0 max-w-[68%]">
                  <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-white/20 text-white inline-block">
                    {t('playHub.badgePoker') || 'POKER TOURNAMENT'}
                  </span>
                  <h4 className="text-base font-heading font-black text-white">
                    TEXAS HOLD'EM
                  </h4>
                  <p className="text-[10px] text-amber-100 font-medium leading-tight line-clamp-2">
                    {t('playHub.pokerDesc') || 'Tavolo No-Limit Hold\'em con Flop, Turn, River e showdown finale.'}
                  </p>
                </div>
              </div>

              <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch">
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-xl bg-white/20 text-white text-[9px] font-bold">
                    {t('playHub.openRooms', { count: getOpenRoomsCount('poker') }) || `${getOpenRoomsCount('poker')} stanze`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpact('light');
                      setSelectedRulesGame('poker');
                    }}
                    className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 shadow-md backdrop-blur-sm"
                    title={t('gameRules.infoTooltip') || 'Regole del gioco'}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[11px] font-heading font-black text-white flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform mt-auto">
                  <span>{t('playHub.playNow') || 'GIOCA'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Game-Specific Rules Modal */}
      <GameRulesModal
        isOpen={selectedRulesGame !== null}
        onClose={() => setSelectedRulesGame(null)}
        gameType={selectedRulesGame}
        onPlayGame={(gType) => onCreateMatchForGame(gType)}
      />
    </div>
  );
};
