import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Users,
  WifiOff,
  X,
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
import { UserAvatar } from '../UserAvatar.js';

interface PokerArenaProps {
  gameData?: PokerState;
  role: 'player' | 'spectator' | string;
  isPlayerTurn?: boolean;
  onAction?: (action: PokerActionType, amount?: number) => void;
  playerAName?: string;
  playerBName?: string;
  playerAReady?: boolean;
  playerBReady?: boolean;
  isReady?: boolean;
  onReady?: () => void;
  countdownSeconds?: number | null;
  roomState?: string;
  wagerTon?: string;
  isCreator?: boolean;
  onCancelMatch?: () => void;
  isWinner?: boolean;
  winnerName?: string;
  onReturnToLobby?: () => void;
  rematchOffer?: { proposerName: string; newWagerTon: string } | null;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B';
  userAddress?: string;
  userId?: string;
  userBalanceGram?: string;
  onOpenDeposit?: (missingGram?: string) => void;
  socketError?: string | null;
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
  forfeitCountdown?: number | null;
}

/**
 * Authentic Scalable Casino Poker Chip Graphic
 */
const CasinoChipIcon: React.FC<{
  className?: string;
  color?: 'red' | 'blue' | 'black' | 'gold' | 'green';
}> = ({ className = 'w-4 h-4', color = 'red' }) => {
  const scheme = {
    red: { fill: '#dc2626', border: '#991b1b', dash: '#ffffff', center: '#7f1d1d' },
    blue: { fill: '#2563eb', border: '#1e40af', dash: '#ffffff', center: '#1e3a8a' },
    black: { fill: '#1f2937', border: '#111827', dash: '#fbbf24', center: '#030712' },
    gold: { fill: '#f59e0b', border: '#b45309', dash: '#ffffff', center: '#78350f' },
    green: { fill: '#059669', border: '#047857', dash: '#ffffff', center: '#064e3b' },
  }[color];

  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 drop-shadow ${className}`} fill="none">
      <circle cx="20" cy="20" r="19" fill={scheme.fill} stroke={scheme.border} strokeWidth="2" />
      <circle
        cx="20"
        cy="20"
        r="15"
        stroke={scheme.dash}
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="9" fill={scheme.center} stroke="#ffffff" strokeWidth="1" />
      <circle cx="20" cy="20" r="3" fill="#ffffff" />
    </svg>
  );
};

/**
 * Authentic Crisp Playing Card Face
 */
const PlayingCardView: React.FC<{
  card?: PokerCard;
  isFaceDown?: boolean;
  isWinning?: boolean;
  isDimmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  edgeTucked?: boolean;
}> = ({
  card,
  isFaceDown = false,
  isWinning = false,
  isDimmed = false,
  size = 'md',
  edgeTucked = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12 text-[10px] rounded-[6px]',
    md: 'w-11 sm:w-12 h-16 sm:h-18 text-xs rounded-lg',
    lg: 'w-14 sm:w-16 h-20 sm:h-24 text-sm rounded-xl',
  }[size];

  if (isFaceDown || !card) {
    return (
      <div
        className={`${sizeClasses} ${
          edgeTucked ? 'opacity-90' : ''
        } bg-gradient-to-br from-blue-900 via-indigo-950 to-blue-900 border border-blue-400/40 shadow-md relative overflow-hidden flex items-center justify-center`}
      >
        <div className="absolute inset-0.5 border border-dashed border-blue-300/30 rounded-[4px]" />
        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rotate-45 bg-blue-300/60" />
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const suitColor = isRed ? 'text-[#dc2626]' : 'text-[#111827]';

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${sizeClasses} relative bg-[#fcfbf7] border transition-all flex flex-col justify-between p-1 select-none overflow-hidden ${
        isWinning
          ? 'border-amber-300 ring-4 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.95)] scale-105 z-20'
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
  hasPlayerB,
  onInviteChallenger,
  forfeitCountdown,
}) => {
  const { triggerImpact } = useHaptics();
  const { t, language } = useI18n();

  const [customRaiseAmount, setCustomRaiseAmount] = useState<number>(0);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [dismissedHandNumber, setDismissedHandNumber] = useState<number | null>(null);

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

  const isMatchActive = !isLobby && !isMatchSettled;

  // Rematch calculations
  const rematchWager = rematchOffer
    ? parseFloat(rematchOffer.newWagerTon || '0')
    : parseFloat(wagerTon || '0') * 2;
  const currentBal = parseFloat(userBalanceGram || '0');
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = Math.max(0, rematchWager - currentBal).toFixed(2);

  // Robust Hero Seat Index detection
  const heroSeatIndex = useMemo(() => {
    if (!gameData || !gameData.seats) {
      return userSide === 'B' ? 1 : 0;
    }

    if (role && typeof role === 'string') {
      const match = role.match(/PLAYER_(\d+)/i);
      if (match) return parseInt(match[1], 10);
      if (role === 'PLAYER_A') return 0;
      if (role === 'PLAYER_B') return 1;
    }

    const cleanAddr = userAddress?.toLowerCase();
    if (cleanAddr) {
      const idx = gameData.seats.findIndex((s) => s.walletAddress && s.walletAddress.toLowerCase() === cleanAddr);
      if (idx !== -1) return idx;
    }

    const cleanTg = userId ? String(userId) : '';
    if (cleanTg) {
      const idx = gameData.seats.findIndex((s) => s.telegramId && String(s.telegramId) === cleanTg);
      if (idx !== -1) return idx;
    }

    if (isCreator) return 0;
    return userSide === 'B' ? 1 : 0;
  }, [gameData?.seats, role, userAddress, userId, userSide, isCreator]);

  const heroSeat = useMemo(() => {
    if (!gameData?.seats || heroSeatIndex === -1) return null;
    return gameData.seats[heroSeatIndex] || null;
  }, [gameData?.seats, heroSeatIndex]);

  const isHeroTurn = Boolean(
    isMatchActive &&
      gameData &&
      gameData.stage !== 'WAITING' &&
      gameData.stage !== 'SHOWDOWN' &&
      gameData.stage !== 'HAND_OVER' &&
      gameData.stage !== 'TOURNAMENT_OVER' &&
      heroSeatIndex !== -1 &&
      gameData.activeSeat === heroSeatIndex &&
      heroSeat &&
      !heroSeat.hasFolded &&
      !heroSeat.isAllIn
  );

  // Hero betting limits & calculations
  const heroChips = heroSeat?.chips || 0;
  const heroCurrentBet = heroSeat?.currentBet || 0;
  const currentTableBet = gameData?.currentBet || 0;
  const toCall = Math.max(0, currentTableBet - heroCurrentBet);

  // Total stack of Hero this hand
  const heroTotalStack = heroCurrentBet + heroChips;
  const maxLegalRaise = heroTotalStack;

  // Can Hero raise?
  // In poker, to raise above currentTableBet, Hero MUST have more chips than toCall!
  const canRaise = Boolean(
    isHeroTurn &&
    heroChips > toCall &&
    maxLegalRaise > currentTableBet
  );

  // Minimum raise target
  // Standard poker: currentTableBet + max(bigBlind, minRaiseDelta)
  const standardMinRaise = Math.max(
    gameData?.minRaise || 0,
    currentTableBet + (gameData?.bigBlind || 20)
  );
  const minLegalRaise = Math.min(maxLegalRaise, standardMinRaise);

  // Can Hero make a raise that is strictly less than All-In?
  const canMakeNormalRaise = canRaise && maxLegalRaise > minLegalRaise;

  // Preset calculation: only meaningful, strictly increasing values
  const presets = useMemo(() => {
    if (!canMakeNormalRaise || !gameData) return [];

    const halfPotAmount = Math.min(
      maxLegalRaise,
      Math.max(minLegalRaise, Math.round(currentTableBet + (gameData.pot + toCall) / 2))
    );
    const potAmount = Math.min(
      maxLegalRaise,
      Math.max(minLegalRaise, currentTableBet + gameData.pot + toCall)
    );

    const candidates = [
      { label: 'MIN', val: 'min' as const, amount: minLegalRaise },
      { label: t('poker.halfPotLabel'), val: 'half_pot' as const, amount: halfPotAmount },
      { label: t('poker.potLabel'), val: 'pot' as const, amount: potAmount },
      { label: t('poker.btnAllIn'), val: 'all_in' as const, amount: maxLegalRaise },
    ];

    // Filter candidate presets so every button is strictly larger than the preceding one!
    const filtered: typeof candidates = [];
    for (const cand of candidates) {
      if (filtered.length === 0 || cand.amount > filtered[filtered.length - 1].amount) {
        filtered.push(cand);
      }
    }
    return filtered;
  }, [canMakeNormalRaise, gameData, minLegalRaise, maxLegalRaise, currentTableBet, toCall, t]);

  // Sync custom raise slider when it's hero's turn
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

  // Localized Rank Helper
  const getLocalizedRank = (res?: { rankName?: string; rankNameEn?: string } | null) => {
    if (!res) return '';
    if (language === 'en') {
      return res.rankNameEn || res.rankName || '';
    }
    return res.rankName || res.rankNameEn || '';
  };

  // Contributing cards set for visual highlight (pairs, straights, flushes etc.)
  const connectingCardKeys = useMemo(() => {
    const set = new Set<string>();
    if (!heroHandEval || heroSeat?.hasFolded) return set;
    for (const c of heroHandEval.contributingCards || []) {
      set.add(`${c.suit}_${c.value}`);
    }
    return set;
  }, [heroHandEval, heroSeat?.hasFolded]);

  // Reorder seats so hero is always anchored at bottom center (South)
  const orderedSeats = useMemo(() => {
    if (!gameData?.seats) return [];
    const count = gameData.seats.length;

    const list: (PokerPlayerSeat & { visualPos: number })[] = [];
    for (let i = 0; i < count; i++) {
      const seat = gameData.seats[i];
      const visualPos = heroSeatIndex !== -1 ? (i - heroSeatIndex + count) % count : i;
      list.push({ ...seat, visualPos });
    }
    return list;
  }, [gameData?.seats, heroSeatIndex]);

  // Compass seats based on total players (max 4 players)
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

  // Quick Bet presets handler
  const handlePreset = (amount: number) => {
    triggerImpact('light');
    const clamped = Math.max(minLegalRaise, Math.min(maxLegalRaise, amount));
    setCustomRaiseAmount(clamped);
  };

  const handleActionClick = (action: PokerActionType, amount?: number) => {
    triggerImpact('medium');
    onAction?.(action, amount);
  };

  const handleRaiseSubmit = () => {
    if (!heroSeat || !gameData) return;
    if (customRaiseAmount >= maxLegalRaise) {
      handleActionClick('all_in');
    } else if (gameData.currentBet === 0) {
      handleActionClick('bet', customRaiseAmount);
    } else {
      handleActionClick('raise', customRaiseAmount);
    }
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
    const rawSeats: Array<Partial<PokerPlayerSeat>> = (gameData?.seats as any) || [
      { seatIndex: 0, username: playerAName, isReady: playerAReady, walletAddress: 'playerA', photoUrl: undefined },
      { seatIndex: 1, username: playerBName, isReady: playerBReady, walletAddress: hasPlayerB ? 'playerB' : '', photoUrl: undefined },
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

  // Hands until blind increase (increases every 4 hands)
  const handsUntilBlindIncrease = Math.max(1, 4 - (((gameData?.handNumber || 1) - 1) % 4));

  // Round Winner popup detection (Full Modal)
  const primaryWinner = gameData?.handWinners?.[0];
  const showRoundWinnerModal = Boolean(
    isMatchActive &&
    (gameData?.stage === 'SHOWDOWN' || gameData?.stage === 'HAND_OVER') &&
    primaryWinner &&
    dismissedHandNumber !== (gameData?.handNumber || 1)
  );

  const winnerSeatData = primaryWinner ? gameData?.seats?.find((s) => s.seatIndex === primaryWinner.seatIndex) : null;

  // Hand hierarchy rules list localized
  const handHierarchy = useMemo(
    () => [
      { name: t('poker.rankRoyalFlush'), cards: 'A♥ K♥ Q♥ J♥ 10♥', desc: t('poker.descRoyalFlush') },
      { name: t('poker.rankStraightFlush'), cards: '9♠ 8♠ 7♠ 6♠ 5♠', desc: t('poker.descStraightFlush') },
      { name: t('poker.rankFourOfAKind'), cards: 'K♦ K♠ K♥ K♣', desc: t('poker.descFourOfAKind') },
      { name: t('poker.rankFullHouse'), cards: 'J♥ J♦ J♣ 8♠ 8♦', desc: t('poker.descFullHouse') },
      { name: t('poker.rankFlush'), cards: 'A♦ J♦ 9♦ 6♦ 3♦', desc: t('poker.descFlush') },
      { name: t('poker.rankStraight'), cards: '7♥ 6♦ 5♠ 4♣ 3♥', desc: t('poker.descStraight') },
      { name: t('poker.rankThreeOfAKind'), cards: 'Q♠ Q♥ Q♦', desc: t('poker.descThreeOfAKind') },
      { name: t('poker.rankTwoPair'), cards: '10♠ 10♦ 4♣ 4♥', desc: t('poker.descTwoPair') },
      { name: t('poker.rankOnePair'), cards: 'A♠ A♣', desc: t('poker.descOnePair') },
      { name: t('poker.rankHighCard'), cards: 'A♠', desc: t('poker.descHighCard') },
    ],
    [t]
  );

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between min-h-[660px] sm:min-h-[720px] select-none font-sans relative pb-4">
      {/* POKER TABLE CONTAINER: Deep green casino felt with subtle gold line */}
      <div className="w-full relative rounded-[38px] bg-gradient-to-b from-[#08351c] via-[#0d4a27] to-[#062413] border-4 border-[#092b18] shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex flex-col justify-between p-3 overflow-hidden">
        {/* Felt Inner Line Oval */}
        <div className="absolute inset-2 sm:inset-3 rounded-[30px] border-2 border-emerald-400/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_75%)] pointer-events-none" />

        {/* TOP STATUS HEADER: Game Title, Blinds Info & Rules Button (No exit button inside felt) */}
        <div className="w-full flex items-center justify-between z-20 pt-0.5 px-1 mb-2">
          {/* Left: Minimal Poker Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-emerald-500/25 text-emerald-300 font-heading font-black text-[10px] tracking-wider uppercase">
            <span>♠</span>
            <span>HOLD'EM</span>
          </div>

          {/* Center: Hand & Blinds Info (only during active game) */}
          {isMatchActive ? (
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-heading font-black text-amber-300 tracking-wider">
                {t('poker.hand').toUpperCase()} {gameData?.handNumber || 1} · {t('poker.blinds').toUpperCase()} {gameData?.smallBlind || 10}/{gameData?.bigBlind || 20}
              </div>
              <div className="text-[10px] text-emerald-200/70 font-medium">
                {t('poker.blindsIncreaseIn', {
                  count: handsUntilBlindIncrease,
                  unit: handsUntilBlindIncrease === 1 ? t('poker.handUnitSingular') : t('poker.handUnitPlural'),
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs font-heading font-black text-amber-300 tracking-wider">
              {gameData?.maxPlayers === 2
                ? t('poker.lobbyTitleHeadsUp')
                : t('poker.lobbyTitleMulti', { count: gameData?.maxPlayers || 4 })}
            </div>
          )}

          {/* Right: Rules Button (?) */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                triggerImpact('light');
                setShowRulesModal(true);
              }}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-slate-300 active:scale-95 transition-all shadow font-heading font-black text-xs"
              title={t('poker.rulesTitle')}
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
                      <UserAvatar
                        photoUrl={seat.photoUrl}
                        name={seat.displayName}
                        sizeClass="w-7 h-7"
                        textClass="text-[10px]"
                      />
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
                      <UserAvatar
                        photoUrl={seatNorth.photoUrl}
                        name={seatNorth.username}
                        sizeClass="w-9 h-9"
                        textClass="text-xs"
                      />
                    </div>

                    {/* Dealer / Blind Badges */}
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

                {/* North Cards (Face down or revealed at Showdown) */}
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

                  {/* Hand Rank Pill (Strictly localized) */}
                  {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatNorth.handResult && (
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/20 text-[10px] font-heading font-black text-amber-300 uppercase tracking-wider shadow">
                      {getLocalizedRank(seatNorth.handResult)}
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
                    <div className="relative mb-1">
                      <div
                        className={`w-9 h-9 rounded-full p-0.5 border-2 flex items-center justify-center shadow-md bg-slate-900 ${
                          !seatWest.isConnected
                            ? 'border-red-500/70 opacity-60'
                            : gameData.activeSeat === seatWest.seatIndex
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                            : seatWest.isAllIn
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      >
                        <UserAvatar
                          photoUrl={seatWest.photoUrl}
                          name={seatWest.username}
                          sizeClass="w-7 h-7"
                          textClass="text-[10px]"
                        />
                      </div>
                      {seatWest.role === 'BTN' && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-slate-950 font-black font-heading text-[8px] flex items-center justify-center shadow">
                          D
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-heading font-bold text-white max-w-[65px] truncate">
                      {seatWest.username}
                    </span>

                    <div className="flex items-center space-x-0.5">
                      <CasinoChipIcon color="blue" className="w-3 h-3" />
                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        {seatWest.chips.toLocaleString()}
                      </span>
                    </div>

                    {/* Edge-Tucked Cards (peek 50% from left boundary) */}
                    <div className="flex space-x-0.5 mt-1 -ml-3">
                      {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatWest.holeCards ? (
                        seatWest.holeCards.map((c, i) => (
                          <PlayingCardView
                            key={i}
                            card={c}
                            size="sm"
                            isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                          />
                        ))
                      ) : seatWest.hasHoleCards ? (
                        <>
                          <PlayingCardView isFaceDown size="sm" edgeTucked />
                          <PlayingCardView isFaceDown size="sm" edgeTucked />
                        </>
                      ) : null}
                    </div>

                    {/* Hand Rank Pill (Strictly localized) */}
                    {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatWest.handResult && (
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[9px] font-heading font-black text-amber-300 uppercase tracking-wider shadow">
                        {getLocalizedRank(seatWest.handResult)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CENTER: POT BANNER & COMMUNITY CARDS */}
              <div className="flex-1 flex flex-col items-center justify-center mx-1 z-0">
                {/* POT SECTION: "PIATTO X" with chip stack icon */}
                <div className="mb-2 px-4 py-1 rounded-full bg-[#051c0e]/90 border border-emerald-400/30 flex items-center space-x-2 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5">
                    <CasinoChipIcon color="gold" className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-heading font-black text-amber-300 tracking-wider">
                      {t('poker.potLabel')} {gameData.pot.toLocaleString()}
                    </span>
                  </div>
                  {gameData.sidePots && gameData.sidePots.length > 1 && (
                    <div className="flex items-center text-[10px] text-amber-400/80 font-mono space-x-0.5 pl-1 border-l border-emerald-400/20">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{gameData.sidePots.length} pots</span>
                    </div>
                  )}
                </div>

                {/* 5 COMMUNITY CARDS */}
                <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 min-h-[70px]">
                  {gameData.communityCards.map((card, idx) => (
                    <PlayingCardView
                      key={idx}
                      card={card}
                      size="md"
                      isWinning={winningCardsSet.has(`${card.suit}_${card.value}`)}
                      isDimmed={
                        gameData.stage === 'SHOWDOWN' &&
                        winningCardsSet.size > 0 &&
                        !winningCardsSet.has(`${card.suit}_${card.value}`)
                      }
                    />
                  ))}

                  {/* Empty card slots for remaining streets */}
                  {Array.from({ length: 5 - gameData.communityCards.length }).map((_, idx) => (
                    <div
                      key={`empty_${idx}`}
                      className="w-11 sm:w-12 h-16 sm:h-18 rounded-lg border-2 border-dashed border-emerald-500/25 bg-emerald-950/20 flex items-center justify-center"
                    >
                      <span className="text-emerald-500/30 text-xs">♠</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EAST OPPONENT (Right) - attached to edge */}
              <div className="w-16 flex flex-col items-end relative z-10 text-right">
                {seatEast && (
                  <div
                    className={`flex flex-col items-end transition-all ${
                      seatEast.hasFolded ? 'opacity-40 grayscale' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative mb-1">
                      <div
                        className={`w-9 h-9 rounded-full p-0.5 border-2 flex items-center justify-center shadow-md bg-slate-900 ${
                          !seatEast.isConnected
                            ? 'border-red-500/70 opacity-60'
                            : gameData.activeSeat === seatEast.seatIndex
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                            : seatEast.isAllIn
                            ? 'border-red-500'
                            : 'border-white/30'
                        }`}
                      >
                        <UserAvatar
                          photoUrl={seatEast.photoUrl}
                          name={seatEast.username}
                          sizeClass="w-7 h-7"
                          textClass="text-[10px]"
                        />
                      </div>
                      {seatEast.role === 'BTN' && (
                        <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-white text-slate-950 font-black font-heading text-[8px] flex items-center justify-center shadow">
                          D
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-heading font-bold text-white max-w-[65px] truncate">
                      {seatEast.username}
                    </span>

                    <div className="flex items-center space-x-0.5">
                      <CasinoChipIcon color="blue" className="w-3 h-3" />
                      <span className="text-[10px] font-mono font-bold text-amber-300">
                        {seatEast.chips.toLocaleString()}
                      </span>
                    </div>

                    {/* Edge-Tucked Cards (peek 50% from right boundary) */}
                    <div className="flex space-x-0.5 mt-1 -mr-3">
                      {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatEast.holeCards ? (
                        seatEast.holeCards.map((c, i) => (
                          <PlayingCardView
                            key={i}
                            card={c}
                            size="sm"
                            isWinning={winningCardsSet.has(`${c.suit}_${c.value}`)}
                          />
                        ))
                      ) : seatEast.hasHoleCards ? (
                        <>
                          <PlayingCardView isFaceDown size="sm" edgeTucked />
                          <PlayingCardView isFaceDown size="sm" edgeTucked />
                        </>
                      ) : null}
                    </div>

                    {/* Hand Rank Pill (Strictly localized) */}
                    {(gameData.stage === 'SHOWDOWN' || isMatchSettled) && seatEast.handResult && (
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[9px] font-heading font-black text-amber-300 uppercase tracking-wider shadow">
                        {getLocalizedRank(seatEast.handResult)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. HERO AREA (South / Bottom): Cards, Points Pill, Stack, Controls */}
            <div className="w-full flex flex-col items-center mt-1">
              {/* Hand Rank Pill (e.g. "YOUR HAND: TWO PAIR") */}
              {heroHandEval && !heroSeat?.hasFolded && (
                <div className="mb-1.5 px-3 py-0.5 rounded-full bg-black/80 border border-amber-400/40 text-amber-300 text-xs font-heading font-black tracking-wider uppercase shadow-md flex items-center space-x-1.5">
                  <span className="text-[11px] text-amber-400">★</span>
                  <span>
                    {t('poker.yourHand', {
                      rank: getLocalizedRank(heroHandEval),
                    })}
                  </span>
                </div>
              )}

              {/* Hero Cards & Player Info Row */}
              <div className="w-full flex items-center justify-between px-2 mb-2">
                {/* Left: Hero Info & Stack */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-full p-0.5 border-2 flex items-center justify-center transition-all shadow-md bg-slate-900 ${
                        isHeroTurn
                          ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-pulse'
                          : heroSeat?.isAllIn
                          ? 'border-red-500'
                          : 'border-emerald-400/60'
                      }`}
                    >
                      <UserAvatar
                        photoUrl={heroSeat?.photoUrl}
                        name={heroSeat?.username || playerAName}
                        sizeClass="w-8 h-8"
                        textClass="text-xs"
                      />
                    </div>
                    {heroSeat?.role === 'BTN' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-slate-950 font-black font-heading text-[9px] flex items-center justify-center shadow border border-slate-300">
                        D
                      </div>
                    )}
                    {heroSeat?.role === 'SB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-cyan-400 text-slate-950 font-black font-heading text-[8px] shadow">
                        SB
                      </div>
                    )}
                    {heroSeat?.role === 'BB' && (
                      <div className="absolute -bottom-1 -right-1 px-1 rounded-full bg-purple-500 text-white font-black font-heading text-[8px] shadow">
                        BB
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-heading font-black text-white">
                        {heroSeat?.username || t('poker.you')}
                      </span>
                      {heroSeat?.isAllIn && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-heading font-black text-[8px] uppercase tracking-wider shadow">
                          ALL-IN
                        </span>
                      )}
                    </div>
                    {/* Hero Chips */}
                    <div className="flex items-center space-x-1 pt-0.5">
                      <CasinoChipIcon color="gold" className="w-4 h-4" />
                      <span className="text-sm font-heading font-black text-amber-300">
                        {(heroSeat?.chips || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Hero Hole Cards (Large & Prominent) */}
                <div className="flex space-x-1.5">
                  {heroSeat?.holeCards && heroSeat.holeCards.length >= 2 ? (
                    heroSeat.holeCards.map((c, i) => (
                      <PlayingCardView
                        key={i}
                        card={c}
                        size="md"
                        isWinning={
                          winningCardsSet.has(`${c.suit}_${c.value}`) ||
                          connectingCardKeys.has(`${c.suit}_${c.value}`)
                        }
                        isDimmed={heroSeat.hasFolded}
                      />
                    ))
                  ) : (
                    <>
                      <PlayingCardView isFaceDown size="md" />
                      <PlayingCardView isFaceDown size="md" />
                    </>
                  )}
                </div>

                {/* Right: Current Round Bet Info (Strictly localized) */}
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-slate-300 font-medium">{t('poker.roundBet')}</span>
                  <div className="flex items-center space-x-1 pt-0.5">
                    <CasinoChipIcon color="red" className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {(heroSeat?.currentBet || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* HERO ACTION BAR */}
            {isHeroTurn ? (
              <div className="w-full bg-[#051c0e]/95 border-2 border-emerald-500/50 rounded-3xl p-2.5 sm:p-3 shadow-2xl space-y-2 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
                {/* 1. Quick Presets Row (Only when multiple distinct raise levels exist) */}
                {canMakeNormalRaise && presets.length > 0 && (
                  <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${presets.length}, minmax(0, 1fr))` }}>
                    {presets.map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handlePreset(p.amount)}
                        className="py-1.5 px-1 rounded-xl bg-[#092616] hover:bg-[#0e3b23] border border-emerald-500/30 text-white font-heading font-black text-xs transition-all active:scale-95 flex flex-col items-center justify-center shadow"
                      >
                        <span className="text-[11px] font-black tracking-wide text-emerald-200">
                          {p.label}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 font-medium">
                          {p.amount.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Raise Slider (Only when multiple raise options exist) */}
                {canMakeNormalRaise && (
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
                )}

                {/* 3. Action Buttons */}
                {!canRaise ? (
                  /* Hero has <= toCall: Only Fold or Call All-In */
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick('fold')}
                      className="py-3 px-2 rounded-2xl bg-[#14261d] hover:bg-[#1a3326] border border-red-500/40 text-rose-200 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black text-rose-300">{t('poker.btnFold')}</span>
                      <span className="text-[9px] font-normal text-rose-400/80">{t('poker.btnFoldSub')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionClick('call')}
                      className="py-3 px-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black">{t('poker.callAllIn')}</span>
                      <span className="text-[9px] font-mono text-emerald-100">
                        {t('poker.callAllInSub', { amount: heroChips.toLocaleString() })}
                      </span>
                    </button>
                  </div>
                ) : !canMakeNormalRaise ? (
                  /* Hero only has chips for All-In Raise */
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick('fold')}
                      className="py-2.5 px-1.5 rounded-2xl bg-[#14261d] hover:bg-[#1a3326] border border-red-500/40 text-rose-200 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black text-rose-300">{t('poker.btnFold')}</span>
                      <span className="text-[9px] font-normal text-rose-400/80">{t('poker.btnFoldSub')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionClick(toCall === 0 ? 'check' : 'call')}
                      className="py-2.5 px-1.5 rounded-2xl bg-[#183626] hover:bg-[#1f4531] border border-emerald-500/50 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black text-emerald-300">
                        {toCall === 0 ? t('poker.btnCheck') : t('poker.btnCall')}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-200/80">
                        {toCall === 0 ? t('poker.btnCheckSub') : t('poker.btnCallSub', { amount: toCall.toLocaleString() })}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionClick('all_in')}
                      className="py-2.5 px-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black">{t('poker.btnAllIn')}</span>
                      <span className="text-[9px] font-mono font-bold">
                        {maxLegalRaise.toLocaleString()} {t('poker.chips')}
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Standard 3 Buttons: FOLD | CHECK/CALL | RAISE */
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick('fold')}
                      className="py-2.5 px-1.5 rounded-2xl bg-[#14261d] hover:bg-[#1a3326] border border-red-500/40 text-rose-200 font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black text-rose-300">{t('poker.btnFold')}</span>
                      <span className="text-[9px] font-normal text-rose-400/80">{t('poker.btnFoldSub')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionClick(toCall === 0 ? 'check' : 'call')}
                      className="py-2.5 px-1.5 rounded-2xl bg-[#183626] hover:bg-[#1f4531] border border-emerald-500/50 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black text-emerald-300">
                        {toCall === 0 ? t('poker.btnCheck') : t('poker.btnCall')}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-200/80">
                        {toCall === 0 ? t('poker.btnCheckSub') : t('poker.btnCallSub', { amount: toCall.toLocaleString() })}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRaiseSubmit}
                      className="py-2.5 px-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center"
                    >
                      <span className="text-sm font-black">
                        {customRaiseAmount >= maxLegalRaise
                          ? t('poker.btnAllIn')
                          : gameData?.currentBet === 0
                          ? t('poker.btnBet')
                          : t('poker.btnRaise')}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-100">
                        {customRaiseAmount.toLocaleString()} {t('poker.chips')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* In-game waiting status during active street when it is not hero's turn */
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

      {/* FULL-SCREEN PROMINENT ROUND / HAND WINNER MODAL */}
      <AnimatePresence>
        {showRoundWinnerModal && primaryWinner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-xs sm:max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.65)] text-center space-y-4 relative"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <div className="text-[11px] font-heading font-black text-amber-300 uppercase tracking-widest">
                  {t('poker.roundWinnerTitle')}
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1.5">
                  <UserAvatar
                    photoUrl={winnerSeatData?.photoUrl}
                    name={primaryWinner.username}
                    sizeClass="w-8 h-8"
                    textClass="text-xs"
                  />
                  <h4 className="text-xl font-heading font-black text-white">
                    {primaryWinner.username}
                  </h4>
                </div>
              </div>

              {/* Pot Won in Chips */}
              <div className="px-5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center space-x-2 shadow-inner">
                <CasinoChipIcon color="gold" className="w-6 h-6" />
                <span className="text-2xl font-mono font-black text-amber-300">
                  +{primaryWinner.amount.toLocaleString()} {t('poker.chips')}
                </span>
              </div>

              {/* Winning Hand Combination or Fold (Strictly localized) */}
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-heading font-black text-emerald-300 uppercase tracking-wide">
                  {getLocalizedRank(primaryWinner) || t('poker.wonByFold')}
                </div>
                {primaryWinner.winningCards && primaryWinner.winningCards.length > 0 && (
                  <div className="flex items-center justify-center space-x-1.5 pt-1">
                    {primaryWinner.winningCards.map((c, i) => (
                      <PlayingCardView key={i} card={c} size="sm" isWinning={true} />
                    ))}
                  </div>
                )}
              </div>

              {/* Dismiss Button & Next Hand Notice */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setDismissedHandNumber(gameData?.handNumber || 1)}
                  className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow"
                >
                  {t('poker.continue')}
                </button>
                <div className="text-[10px] text-slate-400 font-sans italic">
                  {t('poker.autoNextHand')}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RULES / HAND RANKINGS MODAL */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-emerald-500/50 shadow-2xl text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">♠</span>
                  <h3 className="text-base font-heading font-black text-white">
                    {t('poker.rulesHandHierarchy')}
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
                {handHierarchy.map((rank, i) => (
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
                {t('poker.close')}
              </button>
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
                    Number(wagerTon) * (gameData?.maxPlayers || 4)
                  ).toFixed(2)}{' '}
                  GRAM
                </span>
              </div>
              {isWinner && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold pt-1">
                  {t('poker.prizeCreditedAuto')}
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
                          <span>{t('poker.balanceLabel')}: {currentBal.toFixed(2)} GRAM</span>
                          <span className="font-bold">{t('poker.missingLabel')}: {missingForRematch} GRAM</span>
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
