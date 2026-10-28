import React, { useState } from 'react';
import { ArrowLeft, Dices, Layers, Rocket, Bomb, CircleDot, Disc, Sparkles } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';
import { CasinoCardArt, CasinoArtType } from './CasinoCardArt.js';

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
  titleKey: string;
  taglineKey: string;
  gradient: string;
  borderColor: string;
  icon: React.ReactNode;
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
  const [liveBalance, setLiveBalance] = useState<number>(() => parseFloat(userBalanceGram || '0'));

  // Keep liveBalance in sync when external balance prop changes
  React.useEffect(() => {
    if (userBalanceGram !== undefined) {
      setLiveBalance(parseFloat(userBalanceGram || '0'));
    }
  }, [userBalanceGram]);

  const currentBalance = isDemoMode ? demoBalance : liveBalance;

  // Update balance delta helper - strictly updates running live balance
  const updateBalanceDelta = (delta: number) => {
    if (isDemoMode) {
      setDemoBalance((prev) => Math.max(0, parseFloat((prev + delta).toFixed(2))));
    } else {
      setLiveBalance((prev) => {
        const next = Math.max(0, parseFloat((prev + delta).toFixed(2)));
        onBalanceUpdated?.(next.toFixed(2));
        try {
          const saved = localStorage.getItem('sfidabot_user_balance');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.balanceGram = next.toFixed(2);
            localStorage.setItem('sfidabot_user_balance', JSON.stringify(parsed));
          }
          window.dispatchEvent(
            new CustomEvent('sfida_balance_updated', { detail: { balance: next.toFixed(2) } })
          );
        } catch {}
        return next;
      });
    }
  };

  const CASINO_GAMES: CasinoCardData[] = [
    {
      id: 'crash',
      titleKey: 'casino.crashTitle',
      taglineKey: 'casino.crashDesc',
      gradient: 'from-[#0e1628] via-[#090e1a] to-black',
      borderColor: 'border-rose-500/30 hover:border-rose-400',
      icon: <Rocket className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'mines',
      titleKey: 'casino.minesTitle',
      taglineKey: 'casino.minesDesc',
      gradient: 'from-[#06241a] via-[#04140e] to-black',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400',
      icon: <Bomb className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'plinko',
      titleKey: 'casino.plinkoTitle',
      taglineKey: 'casino.plinkoDesc',
      gradient: 'from-[#1e0d33] via-[#0f071a] to-black',
      borderColor: 'border-purple-500/30 hover:border-purple-400',
      icon: <CircleDot className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'roulette',
      titleKey: 'casino.rouletteTitle',
      taglineKey: 'casino.rouletteDesc',
      gradient: 'from-[#2a1707] via-[#140b03] to-black',
      borderColor: 'border-amber-500/30 hover:border-amber-400',
      icon: <Disc className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'dice',
      titleKey: 'casino.diceTitle',
      taglineKey: 'casino.diceDesc',
      gradient: 'from-[#2b2106] via-[#140f03] to-black',
      borderColor: 'border-yellow-500/30 hover:border-yellow-400',
      icon: <Dices className="w-4 h-4 text-yellow-400" />,
    },
    {
      id: 'hilo',
      titleKey: 'casino.hiloTitle',
      taglineKey: 'casino.hiloDesc',
      gradient: 'from-[#2a0815] via-[#14040a] to-black',
      borderColor: 'border-pink-500/30 hover:border-pink-400',
      icon: <Layers className="w-4 h-4 text-pink-400" />,
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
          <span>{activeGame ? t('casino.lobby') || 'Lobby Casino' : t('common.back') || 'Torna'}</span>
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
            {isDemoMode ? t('casino.demoMode') || 'MODALITÀ DEMO' : t('casino.realGram') || 'GRAM REALI'}
          </button>

          <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300 text-xs font-heading font-bold">
            <GramIcon className="w-3.5 h-3.5" />
            <span>{currentBalance.toFixed(2)}</span>
            <span className="text-[9px] text-slate-400">{isDemoMode ? 'CHIP' : 'G'}</span>
          </div>
        </div>
      </div>


      {/* ======================================================== */}
      {/* 1. CASINO CARDS LOBBY VIEW (CLEAN AESTHETIC RICH CARDS)  */}
      {/* ======================================================== */}
      {!activeGame ? (
        <div className="grid grid-cols-2 gap-3">
          {CASINO_GAMES.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                triggerImpact('medium');
                setActiveGame(game.id);
              }}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-b ${game.gradient} border ${game.borderColor} p-3.5 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer flex flex-col justify-between min-h-[205px]`}
            >
              {/* Card Illustration Banner */}
              <div className="w-full h-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300 relative">
                <CasinoCardArt type={game.id} />
              </div>

              {/* Title & Tagline */}
              <div className="space-y-1 pt-2">
                <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  {game.icon}
                  <span className="truncate">{t(game.titleKey) || game.id.toUpperCase()}</span>
                </h3>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {t(game.taglineKey)}
                </p>
              </div>

              {/* Play Button */}
              <div className="pt-2">
                <button
                  type="button"
                  className="w-full py-1.5 rounded-xl bg-white/10 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-yellow-500 group-hover:text-slate-950 text-white font-heading font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('casino.playNow') || 'GIOCA ORA'}</span>
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
              <span className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white">
                {CASINO_GAMES.find((g) => g.id === activeGame)?.icon}
              </span>
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                {t(CASINO_GAMES.find((g) => g.id === activeGame)?.titleKey || '')}
              </h3>
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
