import React, { useState, useMemo } from 'react';
import { UnoState, UnoCard, UnoColor, UnoSeat } from '../../types/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';
import {
  Trophy,
  Clock,
  Swords,
  Layers,
  Loader2,
  CheckCircle2,
  XCircle,
  Share2,
  User,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Ban,
  RefreshCw,
  Zap,
} from 'lucide-react';

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
  hasPlayerB?: boolean;
  onInviteChallenger?: () => void;
  onJoinAsPlayer?: () => void;
}

const COLOR_CLASSES: Record<UnoColor | 'WILD', { bg: string; border: string; text: string; glow: string; hex: string }> = {
  RED: {
    bg: 'bg-gradient-to-br from-rose-500 via-red-600 to-rose-700',
    border: 'border-red-400',
    text: 'text-red-600',
    glow: 'shadow-[0_0_18px_rgba(239,68,68,0.6)]',
    hex: '#ef4444',
  },
  BLUE: {
    bg: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700',
    border: 'border-sky-400',
    text: 'text-blue-600',
    glow: 'shadow-[0_0_18px_rgba(59,130,246,0.6)]',
    hex: '#3b82f6',
  },
  GREEN: {
    bg: 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800',
    border: 'border-emerald-300',
    text: 'text-emerald-600',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.6)]',
    hex: '#10b981',
  },
  YELLOW: {
    bg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600',
    border: 'border-amber-200',
    text: 'text-amber-500',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.6)]',
    hex: '#f59e0b',
  },
  WILD: {
    bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-950',
    border: 'border-amber-300',
    text: 'text-white',
    glow: 'shadow-[0_0_22px_rgba(168,85,247,0.7)]',
    hex: '#a855f7',
  },
};

// Reusable Authentic UNO Card Renderer
const UnoCardGraphic: React.FC<{
  card: UnoCard;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}> = ({ card, isPlayable = false, size = 'md', className = '', onClick }) => {
  const colorDef = COLOR_CLASSES[card.color] || COLOR_CLASSES.RED;
  const isWild = card.color === 'WILD';

  const sizeClasses = {
    sm: 'w-14 h-20 text-[10px]',
    md: 'w-16 h-24 text-xs',
    lg: 'w-24 h-36 text-sm',
  }[size];

  const renderCardContent = () => {
    if (card.type === 'SKIP') {
      return <Ban className={size === 'lg' ? 'w-10 h-10 stroke-[2.5]' : 'w-5 h-5 stroke-[2.5]'} />;
    }
    if (card.type === 'REVERSE') {
      return <RefreshCw className={size === 'lg' ? 'w-9 h-9 stroke-[2.5]' : 'w-5 h-5 stroke-[2.5]'} />;
    }
    if (card.type === 'DRAW2') {
      return <span className={`font-mono font-black ${size === 'lg' ? 'text-3xl' : 'text-base'}`}>+2</span>;
    }
    if (card.type === 'WILD_DRAW4') {
      return <span className={`font-mono font-black ${size === 'lg' ? 'text-3xl' : 'text-base'}`}>+4</span>;
    }
    if (card.type === 'WILD') {
      return (
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black/30 overflow-hidden grid grid-cols-2 grid-rows-2">
          <div className="bg-red-500" />
          <div className="bg-blue-500" />
          <div className="bg-yellow-400" />
          <div className="bg-emerald-500" />
        </div>
      );
    }
    return (
      <span className={`font-mono font-black italic tracking-tighter ${size === 'lg' ? 'text-4xl' : 'text-xl'}`}>
        {card.type}
      </span>
    );
  };

  const cornerBadge = () => {
    if (card.type === 'SKIP') return '⊘';
    if (card.type === 'REVERSE') return '⇄';
    if (card.type === 'DRAW2') return '+2';
    if (card.type === 'WILD_DRAW4') return '+4';
    if (card.type === 'WILD') return '★';
    return card.type;
  };

  return (
    <div
      onClick={onClick}
      className={`relative select-none rounded-2xl border-2 border-white/80 p-1 flex flex-col justify-between overflow-hidden shadow-lg transition-transform ${sizeClasses} ${colorDef.bg} ${className}`}
    >
      {/* Top Left Corner */}
      <span className="font-mono font-black text-[10px] sm:text-xs text-white leading-none drop-shadow">
        {cornerBadge()}
      </span>

      {/* Central Authentic Tilted Oval */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[78%] h-[68%] rounded-[50%] -rotate-[24deg] bg-white shadow-md flex items-center justify-center border border-black/10 ${
            isWild ? 'text-purple-600' : colorDef.text
          }`}
        >
          <div className="rotate-[24deg] flex items-center justify-center">
            {renderCardContent()}
          </div>
        </div>
      </div>

      {/* Bottom Right Corner (inverted) */}
      <span className="font-mono font-black text-[10px] sm:text-xs text-white leading-none self-end rotate-180 drop-shadow">
        {cornerBadge()}
      </span>

      {/* Playable Aura Overlay */}
      {isPlayable && (
        <div className="absolute inset-0 ring-2 ring-white/90 rounded-2xl pointer-events-none animate-pulse" />
      )}
    </div>
  );
};

export const UnoArena: React.FC<UnoArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onPlayCard,
  onDrawCard,
  playerAName,
  playerBName = 'Avversario',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
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
  hasPlayerB = Boolean(playerBName && playerBName !== 'In attesa...'),
  onInviteChallenger,
  onJoinAsPlayer,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [wildPickerCardIndex, setWildPickerCardIndex] = useState<number | null>(null);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);

  const isF2P = parseFloat(wagerTon || '0') === 0;
  const isSettled = roomState === 'MATCH_SETTLED' || roomState === 'SETTLED' || roomState === 'FORFEITED';
  const isLobby = roomState === 'LOBBY' || (!gameData?.discardPileTop && !isSettled);

  const maxPlayers = gameData?.maxPlayers || 2;
  const currentTurnSeat = gameData?.currentTurnSeat ?? (gameData?.currentTurn === 'B' ? 1 : 0);
  const seats: UnoSeat[] = useMemo(() => {
    if (gameData?.seats && gameData.seats.length > 0) return gameData.seats;
    return [
      {
        seatIndex: 0,
        side: 'A',
        walletAddress: '',
        telegramId: '',
        username: playerAName || 'Player 1',
        handCount: gameData?.handCountA ?? 7,
        unoCalled: Boolean(gameData?.unoCalledA),
        ready: Boolean(playerAReady),
        connected: true,
      },
      {
        seatIndex: 1,
        side: 'B',
        walletAddress: '',
        telegramId: '',
        username: playerBName || 'Player 2',
        handCount: gameData?.handCountB ?? 7,
        unoCalled: Boolean(gameData?.unoCalledB),
        ready: Boolean(playerBReady),
        connected: hasPlayerB,
      },
    ];
  }, [gameData, playerAName, playerBName, playerAReady, playerBReady, hasPlayerB]);

  // Determine user seat index
  const mySeatIndex = useMemo(() => {
    if (role !== 'player') return 0;
    if (userSide === 'B') return 1;
    return 0;
  }, [role, userSide]);

  const myTurn = role === 'player' && currentTurnSeat === mySeatIndex;

  // Retrieve user's hand
  const myHand: UnoCard[] = useMemo(() => {
    if (gameData?.handsBySeat && gameData.handsBySeat[mySeatIndex]) {
      return gameData.handsBySeat[mySeatIndex];
    }
    if (mySeatIndex === 1) return gameData?.handB || [];
    return gameData?.handA || [];
  }, [gameData, mySeatIndex]);

  const topCard = gameData?.discardPileTop;
  const activeColor = gameData?.currentColor || 'RED';
  const direction = gameData?.direction ?? 1;

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
      triggerImpact('medium');
      setWildPickerCardIndex(index);
    } else {
      triggerImpact('heavy');
      onPlayCard(index);
    }
  };

  const handleChooseColorAndPlay = (chosenColor: UnoColor) => {
    if (wildPickerCardIndex === null) return;
    triggerImpact('heavy');
    const idx = wildPickerCardIndex;
    setWildPickerCardIndex(null);
    onPlayCard(idx, chosenColor);
  };

  // Seated opponents (all seats except user's seat)
  const opponents = useMemo(() => {
    return seats.filter((s) => s.seatIndex !== mySeatIndex);
  }, [seats, mySeatIndex]);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col space-y-3 pb-8 select-none">
      {/* 1. MATCH RESOLUTION MODAL */}
      {isSettled && (
        <div className="p-5 rounded-3xl bg-gradient-to-b from-[#171a29] to-[#0e101a] border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center space-y-2">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                isWinner
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-400/40'
              }`}
            >
              {isWinner ? <Trophy className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
            </div>
            <h2 className="text-xl font-heading font-black tracking-wider text-white uppercase">
              {isWinner ? (t('uno.winTitle') || 'HAI VINTO IL DUELLO!') : (t('uno.overTitle') || 'DUELLO TERMINATO')}
            </h2>
            <p className="text-xs text-slate-400 font-sans max-w-xs">
              {isWinner
                ? (t('uno.winDesc') || 'Tutte le carte scartate con successo!')
                : (t('uno.loseDesc') || "L'avversario ha scartato prima tutte le carte.")}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-heading font-bold uppercase">
              {t('arena.prizePot') || 'MONTEPREMI:'}
            </span>
            <div className="flex items-center space-x-1.5 font-heading font-black text-amber-300">
              {isF2P ? (
                <span className="text-xs text-emerald-400">FREE TO PLAY</span>
              ) : (
                <>
                  <GramIcon className="w-4 h-4" />
                  <span className="text-sm">{(parseFloat(wagerTon || '0') * maxPlayers * 0.95).toFixed(2)} GRAM</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {onRequestRematch && !rematchOffer && (
              <button
                type="button"
                onClick={onRequestRematch}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('uno.rematch') || 'CHIEDI RIVINCITA'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReturnToLobby}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {t('uno.returnLobby') || 'TORNA ALLA LOBBY'}
            </button>
          </div>
        </div>
      )}

      {/* Top Match Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-heading font-black text-white uppercase tracking-wider">
            {t('uno.title') || 'UNO CYBER DUEL'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-slate-300">
            {maxPlayers}P
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

      {/* 2. LOBBY PRE-MATCH VIEW */}
      {isLobby ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-heading font-black text-slate-400 uppercase tracking-widest">
              TAVOLO {maxPlayers} GIOCATORI
            </span>
            <p className="text-xs text-slate-300 font-sans">
              {seats.filter((s) => Boolean(s.walletAddress || s.username !== `Player ${s.seatIndex + 1}`)).length} / {maxPlayers} Giocatori al tavolo
            </p>
          </div>

          {/* Dynamic Seats Grid for 2, 3 or 4 Players */}
          <div className={`grid gap-2.5 ${maxPlayers === 2 ? 'grid-cols-2' : maxPlayers === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {seats.slice(0, maxPlayers).map((seat) => {
              const isOccupied = Boolean(seat.walletAddress || (seat.username && !seat.username.startsWith('Player ')));
              const isMe = seat.seatIndex === mySeatIndex;

              return (
                <div
                  key={seat.seatIndex}
                  className={`p-3.5 rounded-3xl border flex flex-col items-center text-center space-y-2 transition-all ${
                    seat.ready
                      ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
                      : isOccupied
                      ? 'bg-[#141724] border-white/10'
                      : 'bg-black/20 border-dashed border-white/10'
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-black text-base border ${
                        seat.ready
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : isOccupied
                          ? 'bg-purple-600/30 border-purple-400/40 text-purple-200'
                          : 'bg-white/5 border-white/10 text-slate-600'
                      }`}
                    >
                      {isOccupied ? (seat.username ? seat.username.slice(0, 2).toUpperCase() : `P${seat.seatIndex + 1}`) : '+'}
                    </div>
                    {seat.ready && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-1 bg-black rounded-full" />
                    )}
                  </div>

                  <div className="w-full truncate px-1">
                    <span className="text-xs font-heading font-black text-white truncate block">
                      {isOccupied ? seat.displayName || seat.username : `Posto ${seat.seatIndex + 1}`}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-heading font-bold text-amber-400 uppercase">
                        (Tu)
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase ${
                      seat.ready
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isOccupied
                        ? 'bg-white/5 text-slate-400 border border-white/10'
                        : 'bg-white/5 text-slate-600 border border-white/5'
                    }`}
                  >
                    {seat.ready ? (t('arena.ready') || 'PRONTO') : isOccupied ? (t('arena.waiting') || 'IN ATTESA') : 'LIBERO'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Lobby Info Notice */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-center">
            <span className="text-xs text-slate-300 font-sans">
              {isReady
                ? (t('uno.waitingOpponentDesc') || 'Sei pronto! In attesa che gli altri giocatori confermino...')
                : (t('uno.readyDesc') || 'Clicca su PRONTO PER IL DUELLO per avviare la partita!')}
            </span>
          </div>

          {/* Controls: PRONTO / READY Button */}
          {role === 'player' ? (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerImpact('heavy');
                  onReady?.();
                }}
                disabled={isReady}
                className={`w-full py-4 rounded-2xl font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg active:scale-95 ${
                  isReady
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 cursor-not-allowed shadow-inner'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>{t('arena.readyWaiting') || 'IN ATTESA DEGLI ALTRI...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-slate-950" />
                    <span>{t('arena.readyBtn') || 'PRONTO PER IL DUELLO!'}</span>
                  </>
                )}
              </button>

              {onInviteChallenger && (
                <button
                  type="button"
                  onClick={onInviteChallenger}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('arena.inviteChallengerBtn') || 'INVITA SFIDANTI'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {onJoinAsPlayer && (
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('heavy');
                    onJoinAsPlayer();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>{t('uno.enterChallenger') || 'SIEDITI AL TAVOLO'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 3. ACTIVE UNO DUEL TABLE */
        <div className="space-y-3">
          {/* Opponents Seats Row around the table */}
          <div className={`grid gap-2 ${opponents.length === 1 ? 'grid-cols-1' : opponents.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {opponents.map((opp) => {
              const isOppTurn = currentTurnSeat === opp.seatIndex;
              return (
                <div
                  key={opp.seatIndex}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isOppTurn
                      ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-400'
                      : 'bg-[#141724]/90 border-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center font-heading font-black text-xs text-purple-300">
                        {opp.username ? opp.username.slice(0, 2).toUpperCase() : `P${opp.seatIndex + 1}`}
                      </div>
                      {isOppTurn && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 animate-ping" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-1 truncate">
                        <span className="text-[11px] font-heading font-black text-white truncate">
                          {opp.displayName || opp.username}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-sans block">
                        {opp.handCount} {t('uno.cardsLeft') || 'carte'}
                      </span>
                    </div>
                  </div>

                  {/* UNO Shout Badge if 1 card */}
                  {opp.handCount === 1 ? (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-heading font-black text-[10px] animate-bounce shadow-md">
                      📢 UNO!
                    </span>
                  ) : (
                    <div className="flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-mono font-black text-amber-300">{opp.handCount}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center Table: Discard Pile, Draw Pile & Rotation Indicator */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#131622] via-[#0e111a] to-[#0a0c12] border border-white/10 p-4 shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
            {/* Top Table Info: Active Color & Turn Status */}
            <div className="w-full flex items-center justify-between px-1 mb-2">
              {/* Active Color Badge */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-black/50 border border-white/10">
                <span className="text-[9px] font-heading font-bold text-slate-400 uppercase">
                  {t('uno.activeColor') || 'COLORE:'}
                </span>
                <span
                  className={`w-3 h-3 rounded-full ${COLOR_CLASSES[activeColor]?.glow || ''} ${
                    activeColor === 'RED'
                      ? 'bg-red-500'
                      : activeColor === 'BLUE'
                      ? 'bg-blue-500'
                      : activeColor === 'GREEN'
                      ? 'bg-emerald-500'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-heading font-black text-white">{activeColor}</span>
              </div>

              {/* Rotation Direction (Clockwise / Counter-Clockwise) */}
              {maxPlayers > 2 && (
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/50 border border-white/10 text-[10px] font-heading font-black text-slate-300">
                  {direction === 1 ? (
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
                  )}
                  <span>{direction === 1 ? 'ORARIO' : 'ANTIORARIO'}</span>
                </div>
              )}

              {/* Turn Indicator */}
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/50 border border-white/10 text-xs font-heading font-black">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className={myTurn ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}>
                  {myTurn ? (t('uno.turn') || 'IL TUO TURNO') : (t('uno.opponentTurn') || 'IN ATTESA...')}
                </span>
              </div>
            </div>

            {/* Central Cards Arena */}
            <div className="flex items-center justify-center space-x-6 my-2">
              {/* Draw Pile Button */}
              <button
                type="button"
                disabled={!myTurn}
                onClick={() => {
                  triggerImpact('heavy');
                  onDrawCard();
                }}
                className={`relative w-20 h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-black border-2 border-white/20 p-2 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 ${
                  myTurn
                    ? 'hover:border-cyan-400 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-500/40 -translate-y-1'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-1">
                  <Layers className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-[10px] font-heading font-black text-white uppercase text-center leading-tight">
                  {myTurn ? (t('uno.drawCard') || 'PESCA') : (t('uno.deck') || 'MAZZO')}
                </span>
                <span className="text-[9px] font-mono text-cyan-300 font-bold">
                  {gameData?.drawPileCount ?? 50}
                </span>
              </button>

              {/* Discard Pile Top Card */}
              {topCard ? (
                <div className="transform rotate-1 transition-transform">
                  <UnoCardGraphic card={topCard} size="lg" />
                </div>
              ) : (
                <div className="w-24 h-36 rounded-2xl bg-black/40 border border-white/10" />
              )}
            </div>

            {/* Last Action Announcement banner */}
            {gameData?.lastAction && (
              <div className="text-[11px] font-sans font-medium text-slate-300 text-center max-w-sm mt-1 px-3 py-1 rounded-xl bg-black/30 border border-white/5">
                {gameData.lastAction.message}
              </div>
            )}
          </div>

          {/* Wild Color Picker Modal */}
          {wildPickerCardIndex !== null && (
            <div className="p-4 rounded-3xl bg-[#141724] border border-amber-400/50 shadow-2xl space-y-3 animate-in zoom-in-95">
              <span className="text-xs font-heading font-black text-white uppercase tracking-wider block text-center">
                {t('uno.chooseColor') || 'SCEGLI IL COLORE PER IL JOLLY'}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['RED', 'BLUE', 'GREEN', 'YELLOW'] as UnoColor[]).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleChooseColorAndPlay(col)}
                    className={`py-3.5 rounded-xl font-heading font-black text-xs uppercase shadow-md active:scale-95 border ${
                      col === 'RED'
                        ? 'bg-red-600 text-white border-red-400 shadow-red-500/30'
                        : col === 'BLUE'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                        : col === 'GREEN'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30'
                        : 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. PLAYER HAND: BEAUTIFIED FAN / ARC LAYOUT */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-2 text-xs font-heading font-bold text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span>{t('uno.yourCards') || 'LE TUE CARTE'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono font-bold text-white">
                  {myHand.length}
                </span>
              </div>
              {myHand.length === 1 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.7)]">
                  {t('uno.saidUno') || 'HAI DETTO UNO!'}
                </span>
              )}
            </div>

            {/* Fanned Arc Deck Container with smooth horizontal pan */}
            <div className="relative w-full overflow-x-auto overflow-y-visible pt-8 pb-4 no-scrollbar">
              <div
                className="flex items-end justify-center min-w-full px-4"
                style={{
                  height: '130px',
                }}
              >
                {myHand.map((card, idx) => {
                  const playable = isCardPlayable(card);
                  const N = myHand.length;
                  const centerIdx = (N - 1) / 2;
                  const distFromCenter = idx - centerIdx;

                  // Dynamic angular rotation
                  const maxRotDeg = Math.min(30, Math.max(12, N * 2.5));
                  const rotDeg = N > 1 ? (distFromCenter / centerIdx) * (maxRotDeg / 2) : 0;

                  // Vertical arch curve
                  const yOffset = Math.abs(distFromCenter) * 3;

                  // Negative margin overlap if many cards
                  const overlapMargin = N > 5 ? -14 : -6;
                  const isHovered = hoveredCardIdx === idx;

                  return (
                    <div
                      key={card.id || idx}
                      onMouseEnter={() => setHoveredCardIdx(idx)}
                      onMouseLeave={() => setHoveredCardIdx(null)}
                      style={{
                        marginLeft: idx === 0 ? 0 : `${overlapMargin}px`,
                        transform: isHovered
                          ? `translateY(-26px) scale(1.18) rotate(0deg)`
                          : playable
                          ? `translateY(-${10 - yOffset}px) rotate(${rotDeg}deg)`
                          : `translateY(${yOffset}px) rotate(${rotDeg}deg)`,
                        zIndex: isHovered ? 50 : playable ? 20 + idx : 10 + idx,
                        transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), z-index 0.1s',
                      }}
                      className="shrink-0 cursor-pointer"
                    >
                      <UnoCardGraphic
                        card={card}
                        isPlayable={playable}
                        size="md"
                        className={
                          playable
                            ? 'shadow-2xl ring-2 ring-white cursor-pointer active:scale-95'
                            : 'opacity-45 brightness-75 cursor-not-allowed'
                        }
                        onClick={() => handleCardClick(idx)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
