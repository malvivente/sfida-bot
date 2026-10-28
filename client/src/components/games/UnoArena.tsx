import React, { useState } from 'react';
import { UnoState, UnoCard, UnoColor } from '../../types/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';
import { Trophy, Clock, Swords, ShieldCheck, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { CoinTossOverlay } from '../CoinTossOverlay.js';

interface UnoArenaProps {
  gameData?: UnoState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onPlayCard: (cardIndex: number, chosenColor?: UnoColor) => void;
  onDrawCard: () => void;
  playerAName: string;
  playerBName?: string;
  playerAReady?: boolean;
  playerBReady?: boolean;
  isReady?: boolean;
  onReady?: () => void;
  countdownSeconds?: number | null;
  roomState: string;
  wagerTon: string;
  isCreator: boolean;
  onCancelMatch?: () => void;
  isWinner?: boolean;
  winnerName?: string;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  userSide?: 'A' | 'B';
}

const COLOR_CLASSES: Record<UnoColor | 'WILD', { bg: string; border: string; text: string; glow: string }> = {
  RED: {
    bg: 'bg-gradient-to-br from-red-600 to-rose-700',
    border: 'border-red-400',
    text: 'text-white',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
  },
  BLUE: {
    bg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    border: 'border-blue-400',
    text: 'text-white',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
  },
  GREEN: {
    bg: 'bg-gradient-to-br from-emerald-600 to-green-700',
    border: 'border-emerald-400',
    text: 'text-white',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
  },
  YELLOW: {
    bg: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    border: 'border-amber-300',
    text: 'text-slate-950',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]',
  },
  WILD: {
    bg: 'bg-gradient-to-br from-purple-700 via-pink-600 to-amber-500',
    border: 'border-white',
    text: 'text-white',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]',
  },
};

export const UnoArena: React.FC<UnoArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onPlayCard,
  onDrawCard,
  playerAName,
  playerBName = 'Avversario',
  playerAReady,
  playerBReady,
  isReady,
  onReady,
  countdownSeconds,
  roomState,
  wagerTon,
  isCreator,
  onCancelMatch,
  isWinner,
  winnerName,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer,
  userSide = 'A',
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wildPickerCardIndex, setWildPickerCardIndex] = useState<number | null>(null);

  const isF2P = parseFloat(wagerTon || '0') === 0;
  const currentTurnSide = gameData?.currentTurn || 'A';
  const myTurn = role === 'player' && currentTurnSide === userSide;

  const myHand = (userSide === 'A' ? gameData?.handA : gameData?.handB) || [];
  const opponentCardCount = (userSide === 'A' ? gameData?.handCountB : gameData?.handCountA) ?? 7;

  const topCard = gameData?.discardPileTop;
  const activeColor = gameData?.currentColor || 'RED';

  const isCardPlayable = (card: UnoCard) => {
    if (!myTurn) return false;
    if (card.color === 'WILD') return true;
    if (card.color === activeColor) return true;
    if (topCard && card.type === topCard.type) return true;
    return false;
  };

  const handleCardClick = (index: number) => {
    if (!myTurn) return;
    const card = myHand[index];
    if (!isCardPlayable(card)) {
      triggerNotification('error');
      return;
    }

    if (card.color === 'WILD') {
      triggerImpact('light');
      setWildPickerCardIndex(index);
    } else {
      triggerImpact('heavy');
      onPlayCard(index);
    }
  };

  const handleChooseColorAndPlay = (color: UnoColor) => {
    if (wildPickerCardIndex === null) return;
    triggerImpact('heavy');
    onPlayCard(wildPickerCardIndex, color);
    setWildPickerCardIndex(null);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-8 animate-in fade-in duration-200 font-sans">
      {/* Coin Toss Overlay on Start */}
      {gameData?.coinToss && (
        <CoinTossOverlay
          coinToss={gameData.coinToss}
          playerAName={playerAName}
          playerBName={playerBName}
          onComplete={() => {}}
        />
      )}

      {/* Top Match Bar */}
      <div className="flex items-center justify-between px-2 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-heading font-black text-white uppercase tracking-wider">
            UNO CYBER DUEL
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isF2P ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-heading font-black text-[10px] uppercase">
              🎮 FREE TO PLAY
            </span>
          ) : (
            <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[10px]">
              <GramIcon className="w-3 h-3" />
              <span>{wagerTon} GRAM</span>
            </div>
          )}
        </div>
      </div>

      {/* Opponent Hand Box */}
      <div className="p-3 rounded-2xl bg-[#141724] border border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center font-heading font-bold text-xs text-purple-300">
            {opponentCardCount}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-heading font-black text-white">{playerBName}</span>
              {currentTurnSide !== userSide && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-heading font-black animate-pulse">
                  TURNO
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-sans">
              {opponentCardCount} carte rimaste
            </span>
          </div>
        </div>

        {/* Uno Shout Badge if 1 card */}
        {opponentCardCount === 1 && (
          <span className="px-2.5 py-1 rounded-xl bg-rose-500 text-white font-heading font-black text-xs animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.7)]">
            📢 UNO!
          </span>
        )}
      </div>

      {/* Center Table: Discard Pile & Draw Deck */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#131622] to-[#0c0e16] border border-white/10 p-5 shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
        {/* Active Color Orb */}
        <div className="absolute top-3 left-4 flex items-center space-x-2">
          <span className="text-[10px] font-heading font-bold text-slate-400 uppercase">COLORE ATTIVO:</span>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                COLOR_CLASSES[activeColor]?.glow || ''
              } ${
                activeColor === 'RED'
                  ? 'bg-red-500'
                  : activeColor === 'BLUE'
                  ? 'bg-blue-500'
                  : activeColor === 'GREEN'
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-heading font-black text-white">{activeColor}</span>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="absolute top-3 right-4 flex items-center space-x-1 text-xs font-heading font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className={myTurn ? 'text-emerald-400 animate-pulse font-black' : 'text-slate-400'}>
            {myTurn ? 'IL TUO TURNO' : 'TURNO AVVERSARIO'}
          </span>
        </div>

        {/* Discard & Draw Pile */}
        <div className="flex items-center space-x-6 my-4">
          {/* Draw Deck */}
          <button
            type="button"
            disabled={!myTurn}
            onClick={() => {
              triggerImpact('heavy');
              onDrawCard();
            }}
            className={`w-20 h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-black border-2 border-white/20 p-2 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 ${
              myTurn ? 'hover:border-cyan-400 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-2 ring-cyan-500/30' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <Layers className="w-7 h-7 text-cyan-400 mb-1" />
            <span className="text-[10px] font-heading font-black text-white uppercase text-center leading-tight">
              {myTurn ? 'PESCA CARTA' : 'MAZZO'}
            </span>
          </button>

          {/* Top Discard Card */}
          {topCard ? (
            <div
              className={`w-24 h-36 rounded-2xl p-2.5 flex flex-col justify-between border-2 transition-all shadow-2xl ${
                COLOR_CLASSES[topCard.color]?.bg
              } ${COLOR_CLASSES[topCard.color]?.border} ${COLOR_CLASSES[topCard.color]?.glow} ${
                COLOR_CLASSES[topCard.color]?.text
              }`}
            >
              <span className="font-mono font-black text-lg">{topCard.type}</span>
              <div className="text-center font-mono font-black text-3xl">{topCard.type}</div>
              <span className="font-mono font-black text-lg self-end rotate-180">{topCard.type}</span>
            </div>
          ) : (
            <div className="w-24 h-36 rounded-2xl bg-black/40 border border-white/10" />
          )}
        </div>

        {/* Last Action Announcement */}
        {gameData?.lastAction && (
          <div className="text-[11px] font-sans text-slate-300 text-center max-w-xs mt-1">
            {gameData.lastAction.message}
          </div>
        )}
      </div>

      {/* Wild Color Picker Modal */}
      {wildPickerCardIndex !== null && (
        <div className="p-4 rounded-3xl bg-[#141724] border border-amber-400/50 shadow-2xl space-y-3 animate-in zoom-in-95">
          <span className="text-xs font-heading font-black text-white uppercase tracking-wider block text-center">
            SCEGLI IL COLORE PER IL JOLLY
          </span>
          <div className="grid grid-cols-4 gap-2">
            {(['RED', 'BLUE', 'GREEN', 'YELLOW'] as UnoColor[]).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => handleChooseColorAndPlay(col)}
                className={`py-3 rounded-xl font-heading font-black text-xs uppercase shadow-md active:scale-95 border ${
                  col === 'RED'
                    ? 'bg-red-600 text-white border-red-400'
                    : col === 'BLUE'
                    ? 'bg-blue-600 text-white border-blue-400'
                    : col === 'GREEN'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-amber-400 text-slate-950 border-amber-300'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player Hand Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 text-xs font-heading font-bold text-slate-300">
          <span>LE TUE CARTE ({myHand.length})</span>
          {myHand.length === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-bounce">
              HAI DETTO UNO!
            </span>
          )}
        </div>

        {/* Scrollable Hand */}
        <div className="flex items-center space-x-2 overflow-x-auto py-2 px-1 scrollbar-none">
          {myHand.map((card, idx) => {
            const playable = isCardPlayable(card);
            return (
              <button
                key={card.id || idx}
                type="button"
                disabled={!myTurn}
                onClick={() => handleCardClick(idx)}
                className={`shrink-0 w-16 h-24 rounded-2xl p-2 flex flex-col justify-between border-2 transition-all select-none active:scale-95 ${
                  COLOR_CLASSES[card.color]?.bg
                } ${COLOR_CLASSES[card.color]?.border} ${COLOR_CLASSES[card.color]?.text} ${
                  playable
                    ? `${COLOR_CLASSES[card.color]?.glow} -translate-y-2.5 ring-2 ring-white cursor-pointer`
                    : 'opacity-40 brightness-75 cursor-not-allowed'
                }`}
              >
                <span className="font-mono font-black text-xs leading-none">{card.type}</span>
                <span className="font-mono font-black text-lg text-center leading-none">{card.type}</span>
                <span className="font-mono font-black text-xs leading-none self-end rotate-180">{card.type}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
