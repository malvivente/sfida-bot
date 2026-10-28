import React, { useState } from 'react';
import { UnoState, UnoCard, UnoColor } from '../../types/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';
import {
  Trophy,
  Clock,
  Swords,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Layers,
  Loader2,
  CheckCircle2,
  XCircle,
  Share2,
  User,
  ArrowLeft,
} from 'lucide-react';
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
  hasPlayerB?: boolean;
  onInviteChallenger?: () => void;
  onJoinAsPlayer?: () => void;
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

  const isF2P = parseFloat(wagerTon || '0') === 0;
  const isLobby = roomState === 'LOBBY' || (!gameData?.discardPileTop && roomState !== 'SETTLED');
  const isSettled = roomState === 'SETTLED' || isWinner !== undefined;

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
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-8 animate-in fade-in duration-200 font-sans relative">
      {/* 1. STARTING COUNTDOWN OVERLAY */}
      {countdownSeconds !== null && countdownSeconds !== undefined && countdownSeconds > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="text-center space-y-3">
            <span className="text-xs font-heading font-black tracking-widest text-cyan-400 uppercase">
              IL DUELLO STA PER INIZIARE
            </span>
            <div className="text-8xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
              {countdownSeconds}
            </div>
            <span className="text-xs font-heading font-bold text-slate-300 uppercase">
              PREPARATI A SCARTARE!
            </span>
          </div>
        </div>
      )}

      {/* 2. MATCH SETTLED / VICTORY OVERLAY */}
      {isSettled && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141724] border border-white/15 p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
                isWinner
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-amber-500/30'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-500/20'
              }`}
            >
              {isWinner ? <Trophy className="w-9 h-9 animate-bounce" /> : <XCircle className="w-9 h-9" />}
            </div>

            <div>
              <h3 className="text-2xl font-heading font-black text-white uppercase tracking-wider">
                {isWinner ? 'HAI VINTO IL DUELLO!' : 'DUELLO TERMINATO'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {winnerName ? `Vincitore: ${winnerName}` : isWinner ? 'Tutte le carte scartate con successo!' : 'L\'avversario ha scartato prima tutte le carte.'}
              </p>
            </div>

            <div className="p-3 w-full rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-slate-300 uppercase">
                {isF2P ? 'MODALITÀ:' : 'MONTEPREMI:'}
              </span>
              {isF2P ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-bold text-xs uppercase">
                  🎮 FREE TO PLAY
                </span>
              ) : (
                <div className="flex items-center space-x-1 font-mono font-bold text-amber-400 text-sm">
                  <GramIcon className="w-4 h-4" />
                  <span>{(parseFloat(wagerTon || '0') * 1.95).toFixed(2)} GRAM</span>
                </div>
              )}
            </div>

            {/* Rematch Controls */}
            {rematchOffer?.status === 'PENDING' && !isRematchProposer && (
              <div className="w-full space-y-2 animate-in zoom-in-95">
                <span className="text-xs text-cyan-300 font-heading font-bold uppercase block">
                  L'avversario ha richiesto la rivincita!
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onAcceptRematch}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xs uppercase"
                  >
                    Accetta
                  </button>
                  <button
                    type="button"
                    onClick={onDeclineRematch}
                    className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-heading font-bold text-xs uppercase"
                  >
                    Rifiuta
                  </button>
                </div>
              </div>
            )}

            {onRequestRematch && !rematchOffer && (
              <button
                type="button"
                onClick={onRequestRematch}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>CHIEDI RIVINCITA</span>
              </button>
            )}

            {/* Back to lobby */}
            <button
              type="button"
              onClick={onReturnToLobby}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              TORNA ALLA LOBBY
            </button>
          </div>
        </div>
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

      {/* 3. LOBBY PRE-MATCH VIEW (WITH "PRONTO" READY BUTTON) */}
      {isLobby ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Duelists Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Player A */}
            <div
              className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2 transition-all ${
                playerAReady
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-[#141724] border-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center font-heading font-black text-lg text-purple-300">
                  {playerAName ? playerAName.slice(0, 2).toUpperCase() : 'P1'}
                </div>
                {playerAReady && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-black rounded-full" />
                )}
              </div>
              <span className="text-xs font-heading font-black text-white truncate max-w-full">
                {playerAName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase ${
                  playerAReady
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {playerAReady ? 'PRONTO' : 'IN ATTESA'}
              </span>
            </div>

            {/* Player B */}
            <div
              className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2 transition-all ${
                playerBReady
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-[#141724] border-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-heading font-black text-lg text-cyan-300">
                  {hasPlayerB && playerBName ? playerBName.slice(0, 2).toUpperCase() : '?'}
                </div>
                {playerBReady && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-black rounded-full" />
                )}
              </div>
              <span className="text-xs font-heading font-black text-white truncate max-w-full">
                {hasPlayerB ? playerBName : 'In attesa sfidante...'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase ${
                  playerBReady
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {playerBReady ? 'PRONTO' : hasPlayerB ? 'IN ATTESA' : 'LIBERO'}
              </span>
            </div>
          </div>

          {/* Lobby Info Notice */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-center">
            <span className="text-xs text-slate-300 font-sans">
              {!hasPlayerB
                ? 'Condividi il link o attendi che un avversario entri nella stanza.'
                : isReady
                ? 'Sei pronto! In attesa che anche l\'avversario confermi...'
                : 'Clicca su PRONTO PER IL DUELLO per avviare la partita!'}
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
                disabled={isReady || !hasPlayerB}
                className={`w-full py-4 rounded-2xl font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg active:scale-95 ${
                  isReady
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 cursor-not-allowed shadow-inner'
                    : !hasPlayerB
                    ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>{t('arena.readyWaiting') || 'IN ATTESA DELL\'AVVERSARIO...'}</span>
                  </>
                ) : !hasPlayerB ? (
                  <span>{t('arena.waitingForOpponentBtn') || 'IN ATTESA DI UNO SFIDANTE...'}</span>
                ) : (
                  <>
                    <Swords className="w-5 h-5" />
                    <span>{t('arena.readyToDuel') || 'PRONTO PER IL DUELLO'}</span>
                  </>
                )}
              </button>

              {/* Creator actions when waiting for player B */}
              {isCreator && !hasPlayerB && (
                <div className="space-y-2 pt-1">
                  {onInviteChallenger && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        onInviteChallenger();
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-md"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{t('arena.inviteChallengerBtn') || 'INVITA SFIDANTE'}</span>
                    </button>
                  )}

                  {onCancelMatch && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('medium');
                        onCancelMatch();
                      }}
                      className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-rose-400 border border-rose-500/20 font-heading font-bold text-xs uppercase transition-all"
                    >
                      ANNULLA PARTITA
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Spectator View */
            <div className="space-y-2 pt-1">
              {!hasPlayerB && onJoinAsPlayer && (
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('heavy');
                    onJoinAsPlayer();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>ENTRA COME SFIDANTE</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 4. ACTIVE UNO DUEL TABLE */
        <div className="space-y-4">
          {/* Coin Toss Overlay on Start */}
          {gameData?.coinToss && (
            <CoinTossOverlay
              coinToss={gameData.coinToss}
              playerAName={playerAName}
              playerBName={playerBName}
              onComplete={() => {}}
            />
          )}

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
      )}
    </div>
  );
};
