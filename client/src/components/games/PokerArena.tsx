import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Users,
  WifiOff,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  Flag,
  AlertTriangle,
  Lock,
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
  winnerName?: string;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B';
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

// Authentic casino poker chip component
const CasinoChipIcon: React.FC<{ className?: string; color?: 'red' | 'purple' | 'gold' }> = ({
  className = 'w-4 h-4',
  color = 'red',
}) => {
  const outerFill = color === 'red' ? '#dc2626' : color === 'purple' ? '#7e22ce' : '#d97706';
  const innerFill = color === 'red' ? '#991b1b' : color === 'purple' ? '#581c87' : '#92400e';
  const centerFill = color === 'red' ? '#fef08a' : color === 'purple' ? '#fde047' : '#fef08a';
  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0 drop-shadow`} fill="none">
      <circle cx="50" cy="50" r="48" fill={outerFill} stroke="#ffffff" strokeWidth="4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <rect
          key={i}
          x="44"
          y="2"
          width="12"
          height="16"
          rx="2"
          fill="#ffffff"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="32" fill={innerFill} stroke="#ffffff" strokeWidth="3" strokeDasharray="6 4" />
      <circle cx="50" cy="50" r="16" fill={centerFill} stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
};

// Playing card view: authentic white card face with clean suits and gold winning glow
const PlayingCardView: React.FC<{
  card?: PokerCard;
  isFaceDown?: boolean;
  isWinning?: boolean;
  isConnecting?: boolean;
  isDimmed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'peek';
  delay?: number;
}> = ({
  card,
  isFaceDown = false,
  isWinning = false,
  isConnecting = false,
  isDimmed = false,
  size = 'md',
  delay = 0,
}) => {
  const sizeClasses = {
    peek: 'w-8 h-12 text-[10px] rounded-lg',
    sm: 'w-10 h-14 sm:w-11 sm:h-16 text-xs rounded-xl',
    md: 'w-12 h-17 sm:w-14 sm:h-20 text-xs sm:text-sm rounded-xl',
    lg: 'w-16 h-24 sm:w-18 sm:h-26 text-sm sm:text-base rounded-2xl',
  }[size];

  if (isFaceDown || !card) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay, duration: 0.2 }}
        className={`${sizeClasses} bg-[#162544] border-2 border-[#caa455] rounded-xl flex items-center justify-center shadow-lg select-none relative overflow-hidden`}
      >
        {/* Intricate casino diamond lattice card back */}
        <div className="absolute inset-1 border border-[#e2c77d]/60 rounded-lg flex items-center justify-center bg-[#0d182e] p-1">
          <div className="w-full h-full border border-dashed border-[#caa455]/40 rounded-sm flex items-center justify-center">
            <span className="text-[#e2c77d] font-serif font-black text-[10px]">♠</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const suitColor = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <motion.div
      initial={{ scale: 0.8, y: -8, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.22 }}
      className={`${sizeClasses} bg-[#fcfbf7] border-2 flex flex-col justify-between p-1 select-none relative shadow-md transition-all ${
        isWinning
          ? 'border-amber-300 ring-4 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.9)] z-20'
          : isConnecting
          ? 'border-amber-300 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.6)] z-10'
          : isDimmed
          ? 'border-slate-300 opacity-40 grayscale'
          : 'border-slate-300 shadow-md'
      }`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`font-mono font-black leading-none flex items-center space-x-0.5 ${suitColor}`}>
        <span className="font-extrabold">{card.value}</span>
        <span className="text-[10px] sm:text-xs">{card.suit}</span>
      </div>

      {/* Center Suit Graphic */}
      <div className={`text-center my-auto leading-none ${suitColor} select-none`}>
        <span className="text-base sm:text-xl font-black">{card.suit}</span>
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className={`font-mono font-black leading-none flex items-center space-x-0.5 justify-end rotate-180 ${suitColor}`}>
        <span className="font-extrabold">{card.value}</span>
        <span className="text-[10px] sm:text-xs">{card.suit}</span>
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
  onCancelMatch,
  isWinner = false,
  winnerName,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userSide,
  userAddress,
  userId,
  userBalanceGram,
  onOpenDeposit,
  socketError,
  hasPlayerB,
  onInviteChallenger,
  forfeitCountdown,
}) => {
  const { triggerImpact } = useHaptics();
  const { t, language } = useI18n();

  const [customRaiseAmount, setCustomRaiseAmount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // Match lifecycle states
  const isMatchSettled =
    roomState === 'MATCH_SETTLED' ||
    roomState === 'FORFEITED' ||
    gameData?.stage === 'TOURNAMENT_OVER';

  const isLobby =
    !isMatchSettled &&
    (roomState === 'LOBBY' ||
      roomState === 'WAITING_FOR_DEPLOY' ||
      !gameData ||
      gameData.stage === 'WAITING');

  const isMatchActive = !isLobby;

  // Rematch calculations
  const rematchWager = rematchOffer
    ? parseFloat(rematchOffer.newWagerTon || '0')
    : parseFloat(wagerTon || '0') * 2;
  const currentBal = parseFloat(userBalanceGram || '0');
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = Math.max(0, rematchWager - currentBal).toFixed(2);

  // Identify hero's seat index
  const heroSeatIndex = useMemo(() => {
    if (!gameData || !gameData.seats) {
      if (userSide === 'A') return 0;
      if (userSide === 'B') return 1;
      return -1;
    }
    const cleanAddr = userAddress?.toLowerCase();
    const cleanId = userId ? String(userId) : '';

    const found = gameData.seats.findIndex((s) => {
      if (cleanAddr && s.walletAddress && s.walletAddress.toLowerCase() === cleanAddr) return true;
      if (cleanId && s.telegramId && String(s.telegramId) === cleanId) return true;
      return false;
    });

    if (found !== -1) return found;
    if (userSide === 'A') return 0;
    if (userSide === 'B') return 1;
    return -1;
  }, [gameData, userAddress, userId, userSide]);

  const heroSeat: PokerPlayerSeat | undefined =
    heroSeatIndex !== -1 && gameData?.seats ? gameData.seats[heroSeatIndex] : undefined;

  const isHeroTurn = Boolean(
    !isMatchSettled &&
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

  // Contributing cards set for visual highlight (pairs, straights, flushes etc.)
  const connectingCardKeys = useMemo(() => {
    const set = new Set<string>();
    if (!heroHandEval || heroSeat?.hasFolded) return set;
    for (const c of heroHandEval.contributingCards || []) {
      set.add(`${c.suit}_${c.value}`);
    }
    return set;
  }, [heroHandEval, heroSeat?.hasFolded]);

  // Reorder seats so hero is always anchored at bottom center (South)!
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

  // Assign compass seats based on total players (max 4 players)
  const seatNorth = useMemo(() => {
    if (orderedSeats.length === 2) return orderedSeats.find((s) => s.visualPos === 1);
    return orderedSeats.find((s) => s.visualPos === 2);
  }, [orderedSeats]);

  const seatWest = useMemo(() => {
    if (orderedSeats.length <= 2) return undefined;
    return orderedSeats.find((s) => s.visualPos === 1);
  }, [orderedSeats]);

  const seatEast = useMemo(() => {
    if (orderedSeats.length <= 3) return undefined;
    return orderedSeats.find((s) => s.visualPos === 3);
  }, [orderedSeats]);

  // Quick Bet presets
  const handlePreset = (fraction: 'min' | 'half_pot' | 'pot' | 'all_in') => {
    if (!heroSeat || !gameData) return;
    triggerImpact('light');
    let target = minLegalRaise;

    switch (fraction) {
      case 'min':
        target = minLegalRaise;
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

  // Seated players in lobby with multi-source ready sync
  const displaySeats = useMemo(() => {
    const rawSeats = gameData?.seats || [
      { seatIndex: 0, username: playerAName, isReady: playerAReady, walletAddress: 'playerA' },
      { seatIndex: 1, username: playerBName, isReady: playerBReady, walletAddress: hasPlayerB ? 'playerB' : '' },
    ];

    return rawSeats.map((seat, idx) => {
      let displayName = seat.username;
      let isOccupied = Boolean(seat.walletAddress);

      if (idx === 0) {
        if (!displayName || displayName === 'Player A' || displayName === 'Seat 1') {
          displayName = playerAName || 'Player 1';
        }
        isOccupied = true;
      } else if (idx === 1) {
        if (hasPlayerB) {
          if (!displayName || displayName === 'Player B' || displayName === 'Seat 2') {
            displayName = playerBName || 'Player 2';
          }
          isOccupied = true;
        }
      }

      const isThisUserSeat = heroSeatIndex !== -1 ? idx === heroSeatIndex : ((idx === 0 && userSide === 'A') || (idx === 1 && userSide === 'B'));
      const isReadyState = Boolean(
        seat.isReady ||
        (idx === 0 && playerAReady) ||
        (idx === 1 && playerBReady) ||
        (isThisUserSeat && isReady)
      );

      return {
        ...seat,
        displayName,
        isReadyState,
        isOccupied,
      };
    });
  }, [gameData?.seats, playerAName, playerBName, playerAReady, playerBReady, hasPlayerB, userSide, isReady, heroSeatIndex]);

  // Hands until blind level increase (increases every 4 hands)
  const handsUntilBlindIncrease = Math.max(1, 4 - (((gameData?.handNumber || 1) - 1) % 4));

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between min-h-[660px] sm:min-h-[720px] select-none font-sans relative pb-4">
      {/* POKER TABLE CONTAINER: Deep green casino felt with subtle gold line */}
      <div className="w-full relative rounded-[38px] bg-gradient-to-b from-[#08351c] via-[#0d4a27] to-[#062413] border-4 border-[#092b18] shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex flex-col justify-between p-3 overflow-hidden">
        {/* Felt Inner Line Oval */}
        <div className="absolute inset-2 sm:inset-3 rounded-[30px] border-2 border-emerald-400/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_75%)] pointer-events-none" />

        {/* TOP STATUS HEADER (As shown in reference: ESCI, MANO & BUI, AUDIO, RULES) */}
        <div className="w-full flex items-center justify-between z-20 pt-0.5 px-1 mb-2">
          {/* Left: ESCI button */}
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              if (isMatchActive) {
                setShowExitModal(true);
              } else if (onCancelMatch) {
                onCancelMatch();
              } else {
                onReturnToLobby?.();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white font-heading font-black text-xs active:scale-95 transition-all shadow"
          >
            <Flag className="w-3.5 h-3.5 text-slate-300" />
            <span>ESCI</span>
          </button>

          {/* Center: Hand & Blinds Info */}
          <div className="flex flex-col items-center">
            <div className="text-xs sm:text-sm font-heading font-black text-amber-300 tracking-wider">
              {t('poker.hand').toUpperCase()} {gameData?.handNumber || 1} · {t('poker.blinds').toUpperCase()} {gameData?.smallBlind || 10}/{gameData?.bigBlind || 20}
            </div>
            <div className="text-[10px] text-emerald-200/70 font-medium">
              salgono tra {handsUntilBlindIncrease} {handsUntilBlindIncrease === 1 ? 'mano' : 'mani'}
            </div>
          </div>

          {/* Right: Sound & Rules Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                triggerImpact('light');
                setSoundEnabled(!soundEnabled);
              }}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-slate-300 active:scale-95 transition-all shadow"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerImpact('light');
                setShowRulesModal(true);
              }}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-slate-300 active:scale-95 transition-all shadow font-heading font-black text-xs"
              title="Regole Poker"
            >
              ?
            </button>
          </div>
        </div>

        {/* LOBBY / WAITING SCREEN (Before match begins) */}
        {isLobby && (
          <div className="w-full p-4 rounded-3xl bg-black/65 border border-white/10 backdrop-blur-xl space-y-4 my-auto text-center z-20 animate-in fade-in duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-500 via-emerald-600 to-indigo-700 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <span className="text-3xl text-amber-400">♠</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-heading font-black text-white">
                {gameData?.maxPlayers === 2
                  ? t('poker.lobbyTitleHeadsUp')
                  : t('poker.lobbyTitleMulti', { count: gameData?.maxPlayers || 4 })}
              </h3>
              <p className="text-xs text-slate-300 pt-0.5">
                {gameData?.maxPlayers === 2
                  ? t('poker.headsUpDesc')
                  : t('poker.multiMaxDesc')}
              </p>
            </div>

            {/* Seated Players List in Lobby */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-heading font-bold text-slate-300 uppercase tracking-wider text-left px-1">
                {t('poker.seatedPlayers')} ({displaySeats.filter((s) => s.isOccupied).length}/{gameData?.maxPlayers || 4})
              </div>
              <div className="space-y-1">
                {displaySeats.map((seat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow">
                        {seat.displayName?.[0]?.toUpperCase() || `P${idx + 1}`}
                      </div>
                      <span className="font-heading font-bold text-white truncate max-w-[150px]">
                        {seat.isOccupied ? seat.displayName : `${t('poker.seatOpen')} ${idx + 1}`}
                      </span>
                    </div>
                    <div>
                      {seat.isOccupied ? (
                        seat.isReadyState ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/25 text-emerald-300 text-[10px] font-bold flex items-center space-x-1">
                            <span>✓</span>
                            <span>{t('lobby.ready')}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/25 text-amber-300 text-[10px] font-bold">
                            {t('lobby.waitingReady')}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">
                          {t('poker.seatOpen')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lobby Action Buttons */}
            <div className="pt-2 space-y-2">
              {(() => {
                const maxTablePlayers = gameData?.maxPlayers || 4;
                const occupiedCount = displaySeats.filter((s) => s.isOccupied).length;
                const hasEnoughPlayersToReady = maxTablePlayers === 2 ? hasPlayerB : occupiedCount >= maxTablePlayers;
                const canShowInviteButton = occupiedCount < maxTablePlayers && Boolean(onInviteChallenger);

                return (
                  <>
                    {!hasEnoughPlayersToReady ? (
                      <div className="w-full py-3 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-300 font-heading font-bold text-xs flex items-center justify-center space-x-2 shadow">
                        <Clock className="w-4 h-4 animate-spin text-amber-400" />
                        <span>
                          {maxTablePlayers === 2
                            ? t('arena.waitingForOpponentBtn')
                            : t('poker.waitingOtherPlayers', { count: occupiedCount, max: maxTablePlayers })}
                        </span>
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
                      <div className="p-3 rounded-2xl bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-heading font-bold text-xs flex items-center justify-center space-x-2 shadow">
                        <span>✓</span>
                        <span>{t('lobby.readyStatusWaiting')}</span>
                      </div>
                    )}

                    {canShowInviteButton && onInviteChallenger && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerImpact('light');
                          onInviteChallenger();
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-purple-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 border border-purple-500/40 text-purple-200 font-heading font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow"
                      >
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>{t('poker.shareTableInvite')}</span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ACTIVE POKER TABLE (Vertical 4-Compass Layout: North, West, East, South) */}
        {isMatchActive && gameData && (
          <div className="w-full flex-1 flex flex-col justify-between relative z-10 py-1">
            {/* 1. TOP OPPONENT (North) */}
            {seatNorth && (
              <div
                className={`w-full flex flex-col items-center transition-all ${
                  seatNorth.hasFolded ? 'opacity-40 grayscale' : ''
                }`}
              >
                {/* North Player Info Row */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    {/* Disconnect indicator */}
                    {(!seatNorth.isConnected || (seatNorth.disconnectCountdown !== undefined && seatNorth.disconnectCountdown > 0)) && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-950/95 border border-red-500 text-red-300 font-mono font-bold text-[8px] flex items-center space-x-0.5 shadow z-30 animate-pulse">
                        <WifiOff className="w-2.5 h-2.5 text-red-400" />
                        <span>{seatNorth.disconnectCountdown !== undefined ? `${seatNorth.disconnectCountdown}s` : 'DISC'}</span>
                      </div>
                    )}

                    {/* Avatar with Turn Ring */}
                    <div
                      className={`w-11 h-11 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md bg-slate-900 ${
                        !seatNorth.isConnected
                          ? 'border-red-500/70 opacity-60'
                          : gameData.activeSeat === seatNorth.seatIndex
                          ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                          : seatNorth.isAllIn
                          ? 'border-red-500'
                          : 'border-white/30'
                      }`}
                    >
                      <span className="font-heading font-black text-xs text-white">
                        {seatNorth.username?.[0]?.toUpperCase() || `P${seatNorth.seatIndex + 1}`}
                      </span>
                    </div>

                    {/* Dealer Button Badge "D" */}
                    {seatNorth.role === 'BTN' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-slate-950 font-black font-heading text-[9px] flex items-center justify-center shadow border border-slate-300">
                        D
                      </div>
                    )}
                    {seatNorth.role === 'SB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-cyan-400 text-slate-950 font-black font-heading text-[8px] shadow">
                        SB
                      </div>
                    )}
                    {seatNorth.role === 'BB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-purple-500 text-white font-black font-heading text-[8px] shadow">
                        BB
                      </div>
                    )}
                  </div>

                  {/* Username & Action / All-In Pill */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-heading font-bold text-white max-w-[90px] truncate">
                        {seatNorth.username}
                      </span>
                      {seatNorth.isAllIn && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-heading font-black text-[8px] uppercase tracking-wider shadow">
                          ALL-IN
                        </span>
                      )}
                    </div>
                    {/* Chip Count */}
                    <div className="flex items-center space-x-1 pt-0.5">
                      <CasinoChipIcon color="red" className="w-3.5 h-3.5" />
                      <span className="text-xs font-heading font-black text-amber-300">
                        {seatNorth.chips.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* North Cards (Hidden back or revealed at Showdown) */}
                <div className="flex flex-col items-center mt-1">
                  <div className="flex space-x-1">
                    {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatNorth.holeCards ? (
                      seatNorth.holeCards.map((c, i) => (
                        <PlayingCardView
                          key={i}
                          card={c}
                          size="sm"
                          isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                        />
                      ))
                    ) : seatNorth.hasHoleCards ? (
                      <>
                        <PlayingCardView isFaceDown size="sm" />
                        <PlayingCardView isFaceDown size="sm" />
                      </>
                    ) : null}
                  </div>

                  {/* Hand Rank Pill (e.g. SCALA as in screenshot) */}
                  {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatNorth.handResult && (
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/20 text-[10px] font-heading font-black text-amber-300 uppercase tracking-wider shadow">
                      {seatNorth.handResult.rankName}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. MIDDLE AREA: WEST (Left) + COMMUNITY CARDS & POT + EAST (Right) */}
            <div className="w-full flex items-center justify-between relative my-auto py-2">
              {/* WEST OPPONENT (Left) - attached to edge */}
              <div className="w-16 flex flex-col items-start relative z-10">
                {seatWest && (
                  <div
                    className={`flex flex-col items-start transition-all ${
                      seatWest.hasFolded ? 'opacity-40 grayscale' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {/* Disconnect indicator */}
                      {(!seatWest.isConnected || (seatWest.disconnectCountdown !== undefined && seatWest.disconnectCountdown > 0)) && (
                        <div className="absolute -top-3 left-0 px-1 py-0.2 rounded-full bg-red-950/95 border border-red-500 text-red-300 font-mono font-bold text-[7px] flex items-center space-x-0.5 shadow z-30 animate-pulse whitespace-nowrap">
                          <WifiOff className="w-2 h-2 text-red-400" />
                          <span>{seatWest.disconnectCountdown !== undefined ? `${seatWest.disconnectCountdown}s` : 'DISC'}</span>
                        </div>
                      )}

                      <div
                        className={`w-9 h-9 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md bg-slate-900 ${
                          !seatWest.isConnected
                            ? 'border-red-500/70 opacity-60'
                            : gameData.activeSeat === seatWest.seatIndex
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse'
                            : seatWest.isAllIn
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      >
                        <span className="font-heading font-black text-[10px] text-white">
                          {seatWest.username?.[0]?.toUpperCase() || `P${seatWest.seatIndex + 1}`}
                        </span>
                      </div>

                      {seatWest.role === 'BTN' && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-slate-950 font-black font-heading text-[8px] flex items-center justify-center shadow">
                          D
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-heading font-bold text-white max-w-[65px] truncate mt-0.5">
                      {seatWest.username}
                    </span>
                    <div className="flex items-center space-x-0.5">
                      <CasinoChipIcon color="red" className="w-3 h-3" />
                      <span className="text-[10px] font-heading font-black text-amber-300">
                        {seatWest.chips.toLocaleString()}
                      </span>
                    </div>

                    {/* Cards: when face-down, attached to edge peeking half-way; when showdown, animated full */}
                    <div className="mt-1">
                      {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatWest.holeCards ? (
                        <div className="flex space-x-0.5 animate-in slide-in-from-left duration-200">
                          {seatWest.holeCards.map((c, i) => (
                            <PlayingCardView
                              key={i}
                              card={c}
                              size="peek"
                              isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                            />
                          ))}
                        </div>
                      ) : seatWest.hasHoleCards ? (
                        <div className="flex -space-x-4 -ml-4" title="Carte coperte">
                          <PlayingCardView isFaceDown size="peek" />
                          <PlayingCardView isFaceDown size="peek" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* CENTER: POT & 5 COMMUNITY CARDS */}
              <div className="flex-1 flex flex-col items-center justify-center px-1 z-10">
                {/* Pot Banner (As shown in reference: PIATTO 0 with chips) */}
                <div className="flex items-center space-x-1.5 mb-2 px-3 py-1 rounded-full bg-black/50 border border-amber-400/30 shadow-md">
                  {gameData.sidePots && gameData.sidePots.length > 1 && (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <CasinoChipIcon color="purple" className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-heading font-black text-amber-300 tracking-wider">
                    PIATTO {gameData.pot.toLocaleString()}
                  </span>
                </div>

                {/* 5 Community Cards */}
                <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 min-h-[76px]">
                  {gameData.communityCards && gameData.communityCards.length > 0 ? (
                    gameData.communityCards.map((card, idx) => {
                      const isConnecting = connectingCardKeys.has(`${card.suit}_${card.value}`);
                      const isWinning = winningCardsSet.has(`${card.suit}_${card.value}`);
                      const isDimmed =
                        gameData.stage === 'SHOWDOWN' && !isWinning && !isConnecting;

                      return (
                        <PlayingCardView
                          key={idx}
                          card={card}
                          size="md"
                          isWinning={isWinning}
                          isConnecting={isConnecting}
                          isDimmed={isDimmed}
                          delay={idx * 0.08}
                        />
                      );
                    })
                  ) : (
                    /* Preflop Placeholder slot */
                    <div className="flex space-x-1 opacity-25">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-12 h-17 sm:w-14 sm:h-20 rounded-xl border border-dashed border-emerald-300/40"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Hand evaluation pill: "il tuo punto: DOPPIA COPPIA" */}
                {heroHandEval && !heroSeat?.hasFolded && (
                  <div className="mt-2 px-3 py-1 rounded-full bg-black/85 border border-white/20 text-[10px] sm:text-xs font-heading font-black text-white tracking-wide shadow-md">
                    il tuo punto:{' '}
                    <span className="text-amber-300 uppercase">
                      {language === 'en'
                        ? heroHandEval.rankNameEn || heroHandEval.rankName
                        : heroHandEval.rankName}
                    </span>
                  </div>
                )}
              </div>

              {/* EAST OPPONENT (Right) - attached to edge */}
              <div className="w-16 flex flex-col items-end relative z-10">
                {seatEast && (
                  <div
                    className={`flex flex-col items-end transition-all ${
                      seatEast.hasFolded ? 'opacity-40 grayscale' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {/* Disconnect indicator */}
                      {(!seatEast.isConnected || (seatEast.disconnectCountdown !== undefined && seatEast.disconnectCountdown > 0)) && (
                        <div className="absolute -top-3 right-0 px-1 py-0.2 rounded-full bg-red-950/95 border border-red-500 text-red-300 font-mono font-bold text-[7px] flex items-center space-x-0.5 shadow z-30 animate-pulse whitespace-nowrap">
                          <WifiOff className="w-2 h-2 text-red-400" />
                          <span>{seatEast.disconnectCountdown !== undefined ? `${seatEast.disconnectCountdown}s` : 'DISC'}</span>
                        </div>
                      )}

                      <div
                        className={`w-9 h-9 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md bg-slate-900 ${
                          !seatEast.isConnected
                            ? 'border-red-500/70 opacity-60'
                            : gameData.activeSeat === seatEast.seatIndex
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse'
                            : seatEast.isAllIn
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      >
                        <span className="font-heading font-black text-[10px] text-white">
                          {seatEast.username?.[0]?.toUpperCase() || `P${seatEast.seatIndex + 1}`}
                        </span>
                      </div>

                      {seatEast.role === 'BTN' && (
                        <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-white text-slate-950 font-black font-heading text-[8px] flex items-center justify-center shadow">
                          D
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-heading font-bold text-white max-w-[65px] truncate mt-0.5">
                      {seatEast.username}
                    </span>
                    <div className="flex items-center space-x-0.5">
                      <CasinoChipIcon color="red" className="w-3 h-3" />
                      <span className="text-[10px] font-heading font-black text-amber-300">
                        {seatEast.chips.toLocaleString()}
                      </span>
                    </div>

                    {/* Cards: when face-down, attached to edge peeking half-way */}
                    <div className="mt-1">
                      {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatEast.holeCards ? (
                        <div className="flex space-x-0.5 animate-in slide-in-from-right duration-200">
                          {seatEast.holeCards.map((c, i) => (
                            <PlayingCardView
                              key={i}
                              card={c}
                              size="peek"
                              isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                            />
                          ))}
                        </div>
                      ) : seatEast.hasHoleCards ? (
                        <div className="flex -space-x-4 -mr-4" title="Carte coperte">
                          <PlayingCardView isFaceDown size="peek" />
                          <PlayingCardView isFaceDown size="peek" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. HERO (South - Bottom) */}
            {heroSeat && (
              <div className="w-full flex flex-col items-center z-10 pt-1 pb-1">
                {/* Hero Hole Cards (Large, authentic, slight fan) */}
                <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-2">
                  {heroSeat.holeCards?.map((c, i) => (
                    <PlayingCardView
                      key={i}
                      card={c}
                      size="lg"
                      isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                      isConnecting={connectingCardKeys.has(`${c.suit}_${c.value}`)}
                      delay={i * 0.1}
                    />
                  ))}
                </div>

                {/* Hero Info Row (Avatar, "TU", All-In Badge, Chips) */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    {/* Disconnect indicator */}
                    {(!heroSeat.isConnected || (heroSeat.disconnectCountdown !== undefined && heroSeat.disconnectCountdown > 0)) && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-950/95 border border-red-500 text-red-300 font-mono font-bold text-[8px] flex items-center space-x-0.5 shadow z-30 animate-pulse">
                        <WifiOff className="w-2.5 h-2.5 text-red-400" />
                        <span>{heroSeat.disconnectCountdown !== undefined ? `${heroSeat.disconnectCountdown}s` : 'DISC'}</span>
                      </div>
                    )}

                    <div
                      className={`w-11 h-11 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md bg-slate-900 ${
                        !heroSeat.isConnected
                          ? 'border-red-500/70 opacity-60'
                          : isHeroTurn
                          ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-pulse'
                          : heroSeat.isAllIn
                          ? 'border-red-500'
                          : 'border-emerald-400'
                      }`}
                    >
                      <span className="font-heading font-black text-xs text-white">
                        {heroSeat.username?.[0]?.toUpperCase() || 'TU'}
                      </span>
                    </div>

                    {heroSeat.role === 'BTN' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-slate-950 font-black font-heading text-[9px] flex items-center justify-center shadow border border-slate-300">
                        D
                      </div>
                    )}
                    {heroSeat.role === 'SB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-cyan-400 text-slate-950 font-black font-heading text-[8px] shadow">
                        SB
                      </div>
                    )}
                    {heroSeat.role === 'BB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-purple-500 text-white font-black font-heading text-[8px] shadow">
                        BB
                      </div>
                    )}
                  </div>

                  {/* Name, All-In, Chips */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-heading font-black text-white">
                        {heroSeat.username} ({t('poker.you')})
                      </span>
                      {heroSeat.isAllIn && (
                        <span className="px-2 py-0.2 rounded-full bg-red-600 text-white font-heading font-black text-[9px] uppercase tracking-wider shadow">
                          ALL-IN
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 pt-0.5">
                      <CasinoChipIcon color="red" className="w-4 h-4" />
                      <span className="text-sm font-heading font-black text-amber-300">
                        {heroSeat.chips.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BAR CONTROLS (Formatted exactly as in the reference image) */}
        {!isMatchSettled && (
          <div className="w-full mt-2 pt-1 border-t border-white/10 z-20">
            {isHeroTurn ? (
              <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-150">
                {/* 1. Presets Bar: [MIN] [½ PIATTO] [PIATTO] [ALL-IN] */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'MIN', val: 'min' as const, amount: minLegalRaise },
                    {
                      label: '½ PIATTO',
                      val: 'half_pot' as const,
                      amount: Math.floor((gameData?.pot || 0) / 2) + (gameData?.currentBet || 0),
                    },
                    {
                      label: 'PIATTO',
                      val: 'pot' as const,
                      amount: (gameData?.pot || 0) + (gameData?.currentBet || 0),
                    },
                    { label: 'ALL-IN', val: 'all_in' as const, amount: maxLegalRaise },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handlePreset(p.val)}
                      className="py-1.5 px-1 rounded-xl bg-[#092616] hover:bg-[#0e3b23] border border-emerald-500/30 text-white font-heading font-black text-xs transition-all active:scale-95 flex flex-col items-center justify-center shadow"
                    >
                      <span className="text-[11px] font-black tracking-wide text-emerald-200">
                        {p.label}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-medium">
                        {Math.min(maxLegalRaise, Math.max(minLegalRaise, p.amount)).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 2. Raise Slider */}
                <div className="px-1 py-1">
                  <input
                    type="range"
                    min={minLegalRaise}
                    max={maxLegalRaise}
                    step={gameData?.bigBlind || 20}
                    value={customRaiseAmount}
                    onChange={(e) => setCustomRaiseAmount(Number(e.target.value))}
                    className="w-full accent-amber-400 h-2 bg-[#061e11] rounded-lg cursor-pointer"
                  />
                </div>

                {/* 3. Three Large Action Buttons: LASCIA | PASSO/CHIAMA | PUNTA/RILANCIA */}
                <div className="grid grid-cols-3 gap-2">
                  {/* LASCIA (Fold) */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('fold')}
                    className="py-2.5 px-1.5 rounded-2xl bg-[#14261d] hover:bg-[#1a3326] border border-red-500/40 text-rose-200 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span className="text-sm font-black text-rose-300">LASCIA</span>
                    <span className="text-[9px] font-normal text-rose-400/80">butti le carte</span>
                  </button>

                  {/* PASSO (Check) or CHIAMA (Call) */}
                  <button
                    type="button"
                    onClick={() => handleActionClick(toCall === 0 ? 'check' : 'call')}
                    className="py-2.5 px-1.5 rounded-2xl bg-[#183626] hover:bg-[#1f4531] border border-emerald-500/50 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span className="text-sm font-black text-emerald-300">
                      {toCall === 0 ? 'PASSO' : 'CHIAMA'}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-200/80">
                      {toCall === 0 ? 'gratis' : `${toCall.toLocaleString()} chips`}
                    </span>
                  </button>

                  {/* PUNTA (Bet) or RILANCIA (Raise) */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('raise', customRaiseAmount)}
                    className="py-2.5 px-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span className="text-sm font-black">
                      {customRaiseAmount >= maxLegalRaise
                        ? 'ALL-IN'
                        : gameData?.currentBet === 0
                        ? 'PUNTA'
                        : 'RILANCIA'}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-100">
                      {customRaiseAmount.toLocaleString()} chips
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Waiting status when not hero turn */
              <div className="p-3 bg-black/50 border border-white/10 rounded-2xl text-center text-xs text-slate-300 flex items-center justify-center space-x-2 shadow">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>
                  {gameData?.stage === 'SHOWDOWN'
                    ? t('poker.statusShowdown')
                    : gameData?.stage === 'HAND_OVER'
                    ? t('poker.statusHandOver')
                    : heroSeat?.hasFolded
                    ? t('poker.statusHeroFolded')
                    : heroSeat?.isAllIn
                    ? t('poker.statusHeroAllIn')
                    : t('poker.statusWaitingFor', {
                        name:
                          gameData?.seats[gameData.activeSeat || 0]?.username ||
                          t('arena.waitingForOpponent'),
                      })}
                </span>
                {gameData?.turnTimeRemaining !== undefined && !heroSeat?.hasFolded && (
                  <span className="font-mono text-amber-300 font-bold ml-1">
                    ({gameData.turnTimeRemaining}s)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RULES / HAND RANKINGS MODAL */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-emerald-500/50 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">♠</span>
                  <h3 className="text-base font-heading font-black text-white">
                    PUNTEGGI TEXAS HOLD'EM
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: 'Scala Reale', cards: 'A♥ K♥ Q♥ J♥ 10♥', desc: 'La combinazione imbattibile.' },
                  { name: 'Scala Colore', cards: '9♠ 8♠ 7♠ 6♠ 5♠', desc: '5 carte in sequenza dello stesso seme.' },
                  { name: 'Poker', cards: 'K♦ K♠ K♥ K♣', desc: '4 carte dello stesso valore.' },
                  { name: 'Full', cards: 'J♥ J♦ J♣ 8♠ 8♦', desc: 'Tris + Coppia.' },
                  { name: 'Colore', cards: 'A♦ J♦ 9♦ 6♦ 3♦', desc: '5 carte dello stesso seme.' },
                  { name: 'Scala', cards: '7♥ 6♦ 5♠ 4♣ 3♥', desc: '5 carte in sequenza di semi diversi.' },
                  { name: 'Tris', cards: 'Q♠ Q♥ Q♦', desc: '3 carte dello stesso valore.' },
                  { name: 'Doppia Coppia', cards: '10♠ 10♦ 4♣ 4♥', desc: '2 coppie distinte.' },
                  { name: 'Coppia', cards: 'A♠ A♣', desc: '2 carte dello stesso valore.' },
                  { name: 'Carta Alta', cards: 'A♠', desc: 'La carta singola più alta.' },
                ].map((rank, i) => (
                  <div key={i} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-heading font-black text-amber-300 text-xs">
                        {i + 1}. {rank.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{rank.desc}</div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                      {rank.cards}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-heading font-black text-xs uppercase"
              >
                CHIUDI
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* EXIT MATCH CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-xs p-5 rounded-3xl bg-slate-900 border-2 border-red-500/60 text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-heading font-black text-white">
                  ABBANDONARE LA PARTITA?
                </h4>
                <p className="text-xs text-slate-300 pt-1">
                  Se esci adesso dal tavolo, le tue fiches andranno perse.
                </p>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white font-heading font-bold text-xs"
                >
                  ANNULLA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    if (onCancelMatch) {
                      onCancelMatch();
                    } else {
                      onReturnToLobby?.();
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white font-heading font-black text-xs"
                >
                  ESCI
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* TOURNAMENT SETTLEMENT & WINNER MODAL */}
      {isMatchSettled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.3)] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl">
              <Trophy className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-heading font-black text-white">
                {t('poker.tournamentOver')}
              </h3>
              <p className="text-xs text-amber-300 font-heading font-bold pt-1">
                🏆 {t('poker.champion')}:{' '}
                {gameData?.tournamentWinner?.username ||
                  winnerName ||
                  (isWinner
                    ? userSide === 'A'
                      ? playerAName
                      : playerBName
                    : userSide === 'A'
                    ? playerBName
                    : playerAName)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <div className="text-[10px] uppercase font-mono tracking-wider">
                {t('poker.firstPlacePrize')}
              </div>
              <div className="text-xl font-mono font-black text-amber-400 flex items-center justify-center space-x-1 pt-0.5">
                <GramIcon className="w-5 h-5" />
                <span>
                  {(
                    gameData?.tournamentWinner?.totalPrizeGram ||
                    Number(wagerTon) * (gameData?.maxPlayers || 4) * 0.92
                  ).toFixed(2)}{' '}
                  GRAM
                </span>
              </div>
              {isWinner && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold pt-1">
                  ✓ Premio accreditato automaticamente sul saldo!
                </div>
              )}
            </div>

            {/* Rematch Section (for players in Heads-Up) */}
            {role === 'player' && (gameData?.maxPlayers || 2) === 2 && (
              <div className="space-y-2 pt-1">
                {rematchOffer && isRematchProposer && (
                  <div className="w-full p-2.5 rounded-xl bg-pink-500/20 border border-pink-500/60 flex flex-col space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-white flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin text-pink-400" />
                        <span>{t('arena.rematchOfferSent')}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {rematchOffer.newWagerTon} GRAM
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {t('arena.waitingForOpponentRematch')}
                    </span>
                    {onDeclineRematch && (
                      <button
                        type="button"
                        onClick={onDeclineRematch}
                        className="w-full py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-300 hover:text-white"
                      >
                        {t('arena.decline')}
                      </button>
                    )}
                  </div>
                )}

                {rematchOffer && !isRematchProposer && (
                  <div className="w-full p-2.5 rounded-xl bg-pink-500/25 border border-pink-500 flex flex-col space-y-2 text-left animate-pulse">
                    <span className="text-xs font-heading font-bold text-white">
                      {t('arena.rematchChallengeReceived')}
                    </span>
                    <span className="text-[11px] text-slate-200">
                      {rematchOffer.proposerName}: {rematchOffer.newWagerTon} GRAM
                    </span>
                    {!hasEnoughForRematch ? (
                      <div className="flex flex-col space-y-1.5 pt-1">
                        <div className="p-2 rounded-lg bg-black/70 border border-pink-500/50 text-[10px] text-pink-300 flex items-center justify-between">
                          <span>Saldo: {currentBal.toFixed(2)} GRAM</span>
                          <span className="font-bold">Mancano: {missingForRematch} GRAM</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={onDeclineRematch}
                            className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300"
                          >
                            {t('arena.decline')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDeposit?.(missingForRematch)}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-400 text-slate-950 text-xs font-bold font-heading flex items-center justify-center space-x-1 hover:brightness-110 active:scale-95"
                          >
                            <span>{t('arena.depositForRematch')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={onDeclineRematch}
                          className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300"
                        >
                          {t('arena.decline')}
                        </button>
                        <button
                          type="button"
                          onClick={onAcceptRematch}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold font-heading shadow hover:brightness-110 active:scale-95"
                        >
                          {t('arena.accept2x')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!rematchOffer && onRequestRematch && (
                  !opponentConnected ? (
                    <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-heading font-bold text-center">
                      {t('arena.opponentLeft')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('medium');
                        onRequestRematch();
                      }}
                      className="w-full py-2.5 rounded-xl font-heading font-extrabold text-xs uppercase bg-gradient-to-r from-pink-500 to-cyan-400 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('arena.rematch2x')}</span>
                    </button>
                  )
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                triggerImpact('medium');
                onReturnToLobby?.();
              }}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow"
            >
              {t('poker.returnToLobby')}
            </button>
          </div>
        </div>
      )}

      {/* In-Game Disconnect & Forfeit Countdown Popup (Heads-Up only) */}
      {role === 'player' && (gameData?.maxPlayers || 2) === 2 && roomState === 'GAME_ACTIVE' && typeof forfeitCountdown === 'number' && forfeitCountdown > 0 && (
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
