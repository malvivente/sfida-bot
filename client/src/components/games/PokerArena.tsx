import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Sparkles,
  Users,
  Coins,
  ShieldAlert,
  ArrowRight,
  Flame,
  Check,
  X,
  ChevronUp,
  WifiOff,
} from 'lucide-react';
import {
  PokerState,
  PokerCard,
  PokerPlayerSeat,
  PokerActionType,
} from '../../types/index.js';
import { evaluatePokerHandClient } from '../../utils/pokerEvaluator.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';

interface PokerArenaProps {
  gameData?: PokerState;
  role: 'player' | 'spectator';
  isPlayerTurn?: boolean;
  onAction?: (action: PokerActionType, amount?: number) => void;
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
  onReturnToLobby?: () => void;
  userAddress?: string;
  userId?: string;
  userBalanceGram?: string;
  onOpenDeposit?: (missing?: string) => void;
  socketError?: string | null;
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
  forfeitCountdown?: number | null;
}

const suitStyles: Record<
  PokerCard['suit'],
  { text: string; border: string; glow: string; iconClass: string }
> = {
  '♠': {
    text: 'text-cyan-400',
    border: 'border-cyan-400/70',
    glow: 'shadow-[0_0_10px_rgba(6,182,212,0.3)]',
    iconClass: 'text-cyan-400',
  },
  '♥': {
    text: 'text-rose-500',
    border: 'border-rose-500/70',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    iconClass: 'text-rose-500',
  },
  '♦': {
    text: 'text-amber-400',
    border: 'border-amber-400/70',
    glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]',
    iconClass: 'text-amber-400',
  },
  '♣': {
    text: 'text-emerald-400',
    border: 'border-emerald-400/70',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    iconClass: 'text-emerald-400',
  },
};

const PlayingCardView: React.FC<{
  card?: PokerCard;
  isFaceDown?: boolean;
  isWinning?: boolean;
  isConnecting?: boolean;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}> = ({
  card,
  isFaceDown = false,
  isWinning = false,
  isConnecting = false,
  size = 'md',
  delay = 0,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12 text-[10px] rounded-lg',
    md: 'w-11 h-16 sm:w-12 sm:h-18 text-xs rounded-xl',
    lg: 'w-14 h-20 sm:w-16 sm:h-24 text-sm rounded-xl',
  }[size];

  if (isFaceDown || !card) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay, duration: 0.2 }}
        className={`${sizeClasses} bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-purple-500/40 rounded-xl flex items-center justify-center shadow-md select-none relative overflow-hidden`}
      >
        <div className="absolute inset-1 border border-purple-400/20 rounded-lg flex items-center justify-center bg-black/40">
          <div className="w-3 h-3 rounded-full border border-purple-400/40 flex items-center justify-center">
            <span className="text-[7px] text-purple-300 font-mono font-bold">♠</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const style = suitStyles[card.suit] || suitStyles['♠'];

  return (
    <motion.div
      initial={{ scale: 0.8, y: -10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.25 }}
      className={`${sizeClasses} bg-gradient-to-br from-slate-900 to-black border-2 flex flex-col justify-between p-1 select-none relative shadow-lg ${
        isWinning
          ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)] ring-2 ring-amber-400/80 z-10'
          : isConnecting
          ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.7)] ring-2 ring-emerald-400/80 animate-pulse z-10'
          : `${style.border} ${style.glow}`
      }`}
    >
      <div className={`font-mono font-black leading-none flex justify-between ${style.text}`}>
        <span>{card.value}</span>
        <span className="text-[9px]">{card.suit}</span>
      </div>
      <div className={`text-center text-sm sm:text-base my-auto leading-none ${style.iconClass}`}>
        <span className="font-black">{card.suit}</span>
      </div>
      <div className={`font-mono font-black leading-none flex justify-between rotate-180 ${style.text}`}>
        <span>{card.value}</span>
        <span className="text-[9px]">{card.suit}</span>
      </div>
    </motion.div>
  );
};

export const PokerArena: React.FC<PokerArenaProps> = ({
  gameData,
  role,
  onAction,
  playerAName,
  playerBName = 'Opponent',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
  onReady,
  roomState,
  wagerTon,
  isCreator,
  onReturnToLobby,
  userAddress,
  userId,
  hasPlayerB,
  onInviteChallenger,
  forfeitCountdown,
}) => {
  const { triggerImpact } = useHaptics();
  const { t, language } = useI18n();

  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [customRaiseAmount, setCustomRaiseAmount] = useState<number>(0);

  // Identify hero's seat index
  const heroSeatIndex = useMemo(() => {
    if (!gameData || !gameData.seats) return -1;
    const cleanAddr = userAddress?.toLowerCase();
    const cleanId = userId ? String(userId) : '';

    return gameData.seats.findIndex((s) => {
      if (cleanAddr && s.walletAddress && s.walletAddress.toLowerCase() === cleanAddr) return true;
      if (cleanId && s.telegramId && String(s.telegramId) === cleanId) return true;
      return false;
    });
  }, [gameData, userAddress, userId]);

  const heroSeat: PokerPlayerSeat | undefined =
    heroSeatIndex !== -1 && gameData?.seats ? gameData.seats[heroSeatIndex] : undefined;

  const isHeroTurn = Boolean(
    gameData &&
      gameData.activeSeat !== null &&
      gameData.activeSeat === heroSeatIndex &&
      heroSeat &&
      !heroSeat.hasFolded &&
      !heroSeat.isAllIn &&
      gameData.stage !== 'SHOWDOWN' &&
      gameData.stage !== 'HAND_OVER' &&
      gameData.stage !== 'TOURNAMENT_OVER'
  );

  // To Call calculation
  const toCall = useMemo(() => {
    if (!gameData || !heroSeat) return 0;
    return Math.max(0, gameData.currentBet - heroSeat.currentBet);
  }, [gameData, heroSeat]);

  const minLegalRaise = useMemo(() => {
    if (!gameData || !heroSeat) return 0;
    return Math.max(gameData.minRaise, gameData.currentBet + gameData.bigBlind);
  }, [gameData, heroSeat]);

  const maxLegalRaise = useMemo(() => {
    if (!heroSeat || !gameData) return 0;
    const otherSeats = (gameData.seats || []).filter(
      (s) => s.seatIndex !== heroSeat.seatIndex && !s.eliminated && !s.hasFolded
    );
    const maxOpponentReach =
      otherSeats.length > 0
        ? Math.max(...otherSeats.map((s) => s.currentBet + s.chips))
        : heroSeat.currentBet + heroSeat.chips;
    return Math.min(heroSeat.currentBet + heroSeat.chips, maxOpponentReach);
  }, [heroSeat, gameData]);

  // Sync custom raise slider when it's hero turn
  useEffect(() => {
    if (isHeroTurn) {
      setCustomRaiseAmount(Math.min(maxLegalRaise, minLegalRaise));
    }
  }, [isHeroTurn, minLegalRaise, maxLegalRaise]);

  // Live Hand Evaluation for Hero
  const heroHandEval = useMemo(() => {
    if (!heroSeat?.holeCards || heroSeat.holeCards.length < 2) return null;
    const cards = [...heroSeat.holeCards, ...(gameData?.communityCards || [])];
    return evaluatePokerHandClient(cards);
  }, [heroSeat?.holeCards, gameData?.communityCards]);

  // Connecting cards set for intuitive visual highlight (pairs, straights, flushes etc.)
  const connectingCardKeys = useMemo(() => {
    const set = new Set<string>();
    if (!heroHandEval || heroSeat?.hasFolded) return set;
    for (const c of heroHandEval.contributingCards || []) {
      set.add(`${c.suit}_${c.value}`);
    }
    return set;
  }, [heroHandEval, heroSeat?.hasFolded]);

  // Reorder seats so hero is always anchored at bottom center!
  const orderedSeats = useMemo(() => {
    if (!gameData?.seats) return [];
    const count = gameData.seats.length;

    const list: (PokerPlayerSeat & { visualPos: number })[] = [];
    for (let i = 0; i < count; i++) {
      const seat = gameData.seats[i];
      // Offset so heroSeatIndex becomes position 0 (bottom)
      const visualPos = heroSeatIndex !== -1 ? (i - heroSeatIndex + count) % count : i;
      list.push({ ...seat, visualPos });
    }
    return list;
  }, [gameData?.seats, heroSeatIndex]);

  // Quick Bet presets
  const handlePreset = (fraction: 'min' | '2.5x' | 'half_pot' | 'pot' | 'all_in') => {
    if (!heroSeat || !gameData) return;
    triggerImpact('light');
    let target = minLegalRaise;

    switch (fraction) {
      case 'min':
        target = minLegalRaise;
        break;
      case '2.5x':
        target = Math.floor(gameData.bigBlind * 2.5);
        break;
      case 'half_pot':
        target = Math.floor(gameData.pot / 2) + gameData.currentBet;
        break;
      case 'pot':
        target = gameData.pot + gameData.currentBet;
        break;
      case 'all_in':
        target = maxLegalRaise;
        break;
    }

    const clamped = Math.max(minLegalRaise, Math.min(maxLegalRaise, target));
    setCustomRaiseAmount(clamped);
  };

  const handleActionClick = (action: PokerActionType, amount?: number) => {
    triggerImpact('medium');
    setShowRaiseSlider(false);
    onAction?.(action, amount);
  };

  // Winning cards set for visual highlight at showdown
  const winningCardsSet = useMemo(() => {
    const set = new Set<string>();
    if (gameData?.handWinners) {
      for (const w of gameData.handWinners) {
        if (w.winningCards) {
          for (const c of w.winningCards) {
            set.add(`${c.suit}_${c.value}`);
          }
        }
      }
    }
    return set;
  }, [gameData?.handWinners]);

  // Is game actively running?
  const isMatchActive =
    roomState === 'GAME_ACTIVE' &&
    gameData &&
    gameData.stage !== 'WAITING';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center select-none font-sans relative pb-6">
      {/* Top Header: Table Info & Blinds */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-black/40 border border-white/10 rounded-2xl mb-2 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
            ♠
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-heading font-black text-white">
                {gameData?.maxPlayers === 2 ? "Heads-Up" : `${gameData?.maxPlayers || 5}-Max`} Poker
              </span>
              <span className="text-[9px] font-heading font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                SIT & GO
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {t('poker.blinds')}: {gameData?.smallBlind || 10}/{gameData?.bigBlind || 20} · {t('poker.hand')} #{gameData?.handNumber || 1}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-2.5 py-1">
          <GramIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-mono font-bold text-emerald-300">
            {wagerTon} GRAM
          </span>
        </div>
      </div>

      {/* LOBBY / WAITING SCREEN */}
      {!isMatchActive && (
        <div className="w-full p-4 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl space-y-4 my-2 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-500 via-emerald-600 to-indigo-700 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <span className="text-3xl">♠</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-heading font-black text-white">
              {gameData?.maxPlayers === 2
                ? t('poker.lobbyTitleHeadsUp')
                : t('poker.lobbyTitleMulti', { count: gameData?.maxPlayers || 5 })}
            </h3>
            <p className="text-xs text-slate-400 pt-0.5">
              {gameData?.maxPlayers === 2
                ? t('poker.headsUpDesc')
                : t('poker.multiMaxDesc')}
            </p>
          </div>

          {/* Seated Players List in Lobby */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider text-left px-1">
              {t('poker.seatedPlayers')} ({gameData?.seats?.filter((s) => s.walletAddress).length || (hasPlayerB ? 2 : 1)}/{gameData?.maxPlayers || 2})
            </div>
            <div className="space-y-1">
              {(gameData?.seats || [
                { seatIndex: 0, username: playerAName, isReady: playerAReady, walletAddress: 'playerA' },
                { seatIndex: 1, username: playerBName, isReady: playerBReady, walletAddress: hasPlayerB ? 'playerB' : '' },
              ]).map((seat, idx) => {
                let displayName = seat.username;
                let isReadyState = Boolean(seat.isReady);
                let isOccupied = Boolean(seat.walletAddress);

                if (idx === 0) {
                  if (!displayName || displayName === 'Player A' || displayName === 'Seat 1') {
                    displayName = playerAName || 'Player 1';
                  }
                  isReadyState = Boolean(seat.isReady || playerAReady);
                  isOccupied = true;
                } else if (idx === 1) {
                  if (hasPlayerB) {
                    if (!displayName || displayName === 'Player B' || displayName === 'Seat 2') {
                      displayName = playerBName || 'Player 2';
                    }
                    isReadyState = Boolean(seat.isReady || playerBReady);
                    isOccupied = true;
                  }
                }

                return (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                        {displayName?.[0]?.toUpperCase() || `P${idx + 1}`}
                      </div>
                      <span className="font-heading font-bold text-white truncate max-w-[150px]">
                        {isOccupied ? displayName : `${t('poker.seatOpen')} ${idx + 1}`}
                      </span>
                    </div>
                    <div>
                      {isOccupied ? (
                        isReadyState ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            ✓ {t('lobby.ready')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            {t('lobby.waitingReady')}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">
                          {t('poker.seatOpen')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {!hasPlayerB ? (
              <div className="w-full py-3 rounded-2xl bg-slate-800/60 border border-white/10 text-slate-400 font-heading font-bold text-xs flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4 animate-spin text-slate-400" />
                <span>{t('arena.waitingForOpponentBtn')}</span>
              </div>
            ) : !isReady ? (
              <button
                type="button"
                onClick={() => {
                  triggerImpact('medium');
                  onReady?.();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                ✓ {t('lobby.readyButton')}
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-heading font-bold text-xs flex items-center justify-center space-x-2">
                <span>✓</span>
                <span>{t('lobby.readyStatusWaiting')}</span>
              </div>
            )}

            {onInviteChallenger && (
              <button
                type="button"
                onClick={() => {
                  triggerImpact('light');
                  onInviteChallenger();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('lobby.inviteFriend')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE POKER TABLE */}
      {isMatchActive && (
        <div className="w-full relative flex flex-col items-center">
          {/* Cyber Poker Table Oval */}
          <div className="w-full min-h-[360px] sm:min-h-[400px] rounded-[60px] sm:rounded-[80px] bg-gradient-to-b from-emerald-950 via-slate-950 to-emerald-950 border-[6px] border-slate-900 shadow-[0_0_35px_rgba(16,185,129,0.25)] relative overflow-hidden flex flex-col items-center justify-between p-3 my-1">
            {/* Table Neon Rail Inner Glow */}
            <div className="absolute inset-2 rounded-[52px] sm:rounded-[72px] border-2 border-emerald-500/30 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

            {/* TOP SEATS (Opponents) */}
            <div className="w-full flex justify-around items-start z-10 pt-1">
              {orderedSeats
                .filter((s) => s.visualPos !== 0)
                .map((seat) => {
                  const isCurrentTurn = gameData.activeSeat === seat.seatIndex;
                  return (
                    <div
                      key={seat.seatIndex}
                      className={`flex flex-col items-center transition-all ${
                        seat.hasFolded ? 'opacity-40 grayscale' : ''
                      }`}
                    >
                      {/* Avatar with Turn Ring */}
                      <div className="relative">
                        <div
                          className={`w-11 h-11 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md ${
                            isCurrentTurn
                              ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                              : seat.isAllIn
                              ? 'border-red-500'
                              : 'border-white/20'
                          } bg-slate-900`}
                        >
                          <span className="font-heading font-black text-xs text-white">
                            {seat.username?.[0]?.toUpperCase() || `P${seat.seatIndex + 1}`}
                          </span>
                        </div>

                        {/* Dealer / Blind Badge */}
                        {seat.role !== 'NORMAL' && (
                          <span
                            className={`absolute -top-1 -right-1 text-[8px] font-heading font-black px-1 rounded-full ${
                              seat.role === 'BTN'
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : seat.role === 'SB'
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-purple-500 text-white'
                            }`}
                          >
                            {seat.role}
                          </span>
                        )}

                        {/* Action Clock Countdown Bar */}
                        {isCurrentTurn && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-[8px] shadow">
                            {gameData.turnTimeRemaining}s
                          </div>
                        )}
                      </div>

                      {/* Opponent Info */}
                      <span className="text-[10px] font-heading font-bold text-white max-w-[70px] truncate mt-1">
                        {seat.username}
                      </span>
                      <div className="flex items-center space-x-0.5 text-[9px] font-mono text-amber-300 font-bold">
                        <span>🪙</span>
                        <span>{seat.chips.toLocaleString()}</span>
                      </div>

                      {/* Opponent Cards (Revealed at showdown or card backs) */}
                      <div className="flex space-x-0.5 mt-0.5">
                        {gameData.stage === 'SHOWDOWN' && seat.holeCards ? (
                          seat.holeCards.map((c, i) => (
                            <PlayingCardView
                              key={i}
                              card={c}
                              size="sm"
                              isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                            />
                          ))
                        ) : seat.hasHoleCards ? (
                          <>
                            <PlayingCardView isFaceDown size="sm" />
                            <PlayingCardView isFaceDown size="sm" />
                          </>
                        ) : null}
                      </div>

                      {/* Last Action / Current Bet */}
                      {seat.lastAction && (
                        <div className="mt-0.5 px-1.5 py-0.2 rounded-full bg-black/70 border border-white/20 text-[8px] font-heading font-black text-white">
                          {seat.lastAction.message}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* CENTER TABLE: Pots & Community Cards */}
            <div className="flex flex-col items-center justify-center my-auto z-10 space-y-2">
              {/* Pot Display */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-2xl bg-black/70 border border-amber-400/40 shadow-lg backdrop-blur-md">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-center">
                  <span className="text-[9px] font-heading font-bold text-amber-300 uppercase tracking-wider block leading-none">
                    POT
                  </span>
                  <span className="text-sm font-mono font-black text-white leading-none">
                    {gameData.pot.toLocaleString()} 🪙
                  </span>
                </div>
              </div>

              {/* Side Pots only when someone is All-In */}
              {gameData.sidePots && gameData.sidePots.length > 1 && gameData.seats.some((s) => s.isAllIn) && (
                <div className="flex space-x-1.5 text-[9px] text-amber-200/80 font-mono">
                  {gameData.sidePots.slice(1).map((sp, idx) => (
                    <span key={idx} className="px-1.5 py-0.2 rounded bg-black/50 border border-white/10">
                      Side #{idx + 1}: {sp.amount}
                    </span>
                  ))}
                </div>
              )}

              {/* 5 Community Cards */}
              <div className="flex items-center space-x-1 sm:space-x-1.5 pt-1">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const card = gameData.communityCards[idx];
                  if (!card) {
                    return (
                      <div
                        key={idx}
                        className="w-11 h-16 sm:w-12 sm:h-18 rounded-xl border-2 border-dashed border-white/15 bg-black/20 flex items-center justify-center text-[10px] text-slate-600 font-mono"
                      >
                        {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                      </div>
                    );
                  }
                  return (
                    <PlayingCardView
                      key={idx}
                      card={card}
                      size="md"
                      isWinning={winningCardsSet.has(`${card.suit}_${card.value}`)}
                      isConnecting={connectingCardKeys.has(`${card.suit}_${card.value}`)}
                      delay={idx * 0.05}
                    />
                  );
                })}
              </div>

              {/* Showdown / Hand Winner Banner (Redesigned modern cyber-card) */}
              <AnimatePresence>
                {gameData.handWinners && gameData.handWinners.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: -8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="p-3 rounded-2xl bg-slate-950/95 border border-amber-400/60 shadow-[0_0_35px_rgba(251,191,36,0.35)] text-center max-w-[280px] backdrop-blur-xl space-y-1.5 z-20 my-1"
                  >
                    {gameData.handWinners.map((hw, idx) => (
                      <div key={idx} className={idx > 0 ? "pt-2 border-t border-white/10" : "space-y-1"}>
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[11px] uppercase tracking-wider">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{hw.username} {t('poker.wins')}</span>
                        </div>
                        {hw.rankName && (
                          <div className="text-xs font-heading font-black text-cyan-300 tracking-wide">
                            {language === 'en' ? (hw.rankNameEn || hw.rankName) : hw.rankName}
                          </div>
                        )}
                        <div>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-black">
                            +{hw.amount.toLocaleString()} {t('poker.chips')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BOTTOM: Hero Player Station */}
            {heroSeat && (
              <div className="w-full flex flex-col items-center z-10 pb-1">
                {/* Live Hand Evaluation Badge - detached with clean top margin */}
                {heroHandEval && !heroSeat.hasFolded && (
                  <div className="mt-3.5 mb-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/30 to-cyan-500/20 border border-cyan-400/50 text-[10px] font-heading font-black text-cyan-300 shadow">
                    ✨ {language === 'en' ? (heroHandEval.rankNameEn || heroHandEval.rankName) : heroHandEval.rankName}
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  {/* Hero Hole Cards */}
                  <div className="flex space-x-1">
                    {heroSeat.holeCards?.map((c, i) => (
                      <PlayingCardView
                        key={i}
                        card={c}
                        size="md"
                        isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                        isConnecting={connectingCardKeys.has(`${c.suit}_${c.value}`)}
                        delay={i * 0.1}
                      />
                    ))}
                  </div>

                  {/* Hero Status */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-heading font-black text-white">
                        {heroSeat.username} ({t('poker.you')})
                      </span>
                      {heroSeat.role !== 'NORMAL' && (
                        <span className="text-[8px] font-heading font-black px-1.5 rounded-full bg-amber-400 text-slate-950">
                          {heroSeat.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-mono text-amber-300 font-bold">
                      <span>🪙</span>
                      <span>{heroSeat.chips.toLocaleString()}</span>
                    </div>
                    {heroSeat.lastAction && (
                      <span className="text-[9px] text-slate-300 font-heading">
                        {heroSeat.lastAction.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BAR CONTROLS (Active when it's Hero's turn) */}
          <div className="w-full mt-2">
            {isHeroTurn ? (
              <div className="space-y-2 p-3 bg-black/60 border border-white/10 rounded-3xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200">
                {/* Turn Alert Header */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-heading font-black">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('poker.yourTurn')}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    ⏱ {gameData?.turnTimeRemaining}s
                  </span>
                </div>

                {/* Custom Raise Panel / Slider */}
                {showRaiseSlider && (
                  <div className="p-3 bg-black/70 border border-amber-400/30 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{t('poker.raiseAmount')}</span>
                      <span className="text-amber-300 font-bold text-sm">
                        {customRaiseAmount.toLocaleString()} 🪙
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { label: 'Min', val: 'min' as const },
                        { label: '2.5x', val: '2.5x' as const },
                        { label: '1/2 Pot', val: 'half_pot' as const },
                        { label: 'Pot', val: 'pot' as const },
                        { label: 'All-In', val: 'all_in' as const },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => handlePreset(p.val)}
                          className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold transition-all active:scale-95"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={minLegalRaise}
                      max={maxLegalRaise}
                      step={gameData.bigBlind}
                      value={customRaiseAmount}
                      onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() => handleActionClick('raise', customRaiseAmount)}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95"
                    >
                      {t('poker.confirmRaise')} ({customRaiseAmount.toLocaleString()} 🪙)
                    </button>
                  </div>
                )}

                {/* Primary Action Buttons: FOLD | CHECK/CALL | RAISE */}
                <div className="grid grid-cols-3 gap-2">
                  {/* FOLD */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('fold')}
                    className="py-3 px-2 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span>FOLD</span>
                    <span className="text-[9px] font-normal opacity-70">{t('poker.foldDesc')}</span>
                  </button>

                  {/* CHECK or CALL */}
                  <button
                    type="button"
                    onClick={() => handleActionClick(toCall === 0 ? 'check' : 'call')}
                    className="py-3 px-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span>{toCall === 0 ? 'CHECK' : 'CALL'}</span>
                    <span className="text-[9px] font-mono font-bold">
                      {toCall === 0 ? t('poker.free') : `${toCall.toLocaleString()} 🪙`}
                    </span>
                  </button>

                  {/* RAISE */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('light');
                      setShowRaiseSlider(!showRaiseSlider);
                    }}
                    className={`py-3 px-2 rounded-2xl font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center border ${
                      showRaiseSlider
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 border-amber-300/40'
                    }`}
                  >
                    <span>{gameData.currentBet === 0 ? 'BET' : 'RAISE'}</span>
                    <span className="text-[9px] font-mono font-bold">
                      {minLegalRaise.toLocaleString()} 🪙 +
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-black/40 border border-white/5 rounded-2xl text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                <span>
                  {gameData.stage === 'SHOWDOWN'
                    ? t('poker.statusShowdown')
                    : gameData.stage === 'HAND_OVER'
                    ? t('poker.statusHandOver')
                    : heroSeat?.hasFolded
                    ? t('poker.statusHeroFolded')
                    : heroSeat?.isAllIn
                    ? t('poker.statusHeroAllIn')
                    : t('poker.statusWaitingFor', {
                        name:
                          gameData.seats[gameData.activeSeat || 0]?.username ||
                          t('arena.waitingForOpponent'),
                      })}
                </span>
              </div>
            )}
          </div>

          {/* Tournament Settlement / Winner Overlay */}
          {gameData.stage === 'TOURNAMENT_OVER' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-black border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.3)] text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl">
                  <Trophy className="w-9 h-9" />
                </div>

                <div>
                  <h3 className="text-xl font-heading font-black text-white">
                    {t('poker.tournamentOver')}
                  </h3>
                  <p className="text-xs text-amber-300 font-heading font-bold pt-1">
                    🏆 {t('poker.champion')}: {gameData.tournamentWinner?.username}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <div className="text-[10px] uppercase font-mono tracking-wider">
                    {t('poker.firstPlacePrize')}
                  </div>
                  <div className="text-xl font-mono font-black text-amber-400 flex items-center justify-center space-x-1 pt-0.5">
                    <GramIcon className="w-5 h-5" />
                    <span>{gameData.tournamentWinner?.totalPrizeGram.toFixed(2)} GRAM</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('medium');
                    onReturnToLobby?.();
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  {t('poker.returnToLobby')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-Game Disconnect & Forfeit Countdown Popup */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && typeof forfeitCountdown === 'number' && forfeitCountdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/70 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center animate-pulse">
              <WifiOff className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-black text-amber-400 tracking-wider uppercase">
                {t('arena.opponentDisconnectedTitle')}
              </h3>
              <p className="text-xs text-slate-300 pt-1">
                {t('arena.opponentDisconnectedDesc')}
              </p>
            </div>
            <div className="w-full py-3 px-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col items-center justify-center">
              <span className="text-[10px] font-heading font-bold text-amber-300 uppercase tracking-widest mb-0.5">
                {t('arena.forfeitCountdownNotice')}
              </span>
              <span className="text-4xl font-mono font-black text-white tracking-widest animate-pulse">
                00:{forfeitCountdown < 10 ? `0${forfeitCountdown}` : forfeitCountdown}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t('arena.forfeitRuleInfo')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
