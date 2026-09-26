export type GameType = 'roulette' | 'blackjack' | 'bridge' | 'chrono' | 'split';

export type RoomState =
  | 'WAITING_FOR_DEPLOY'
  | 'LOBBY'
  | 'BETTING_WINDOW'
  | 'GAME_ACTIVE'
  | 'ROUND_START'
  | 'WAITING_FOR_SIGNAL'
  | 'SIGNAL_FIRED'
  | 'ROUND_END'
  | 'MATCH_SETTLED'
  | 'FORFEITED';

export interface PlayerInfo {
  wallet: string;
  name: string;
  ready: boolean;
  score: number;
  connected?: boolean;
  telegramUserId?: string;
}

export interface MatchResolution {
  matchId: string;
  escrowAddress: string;
  winner: string;
  timestamp: number;
  signatureHex: string;
  signatureCellBoc: string;
}

export interface MatchData {
  matchId: string;
  gameType?: GameType;
  escrowAddress?: string;
  state: RoomState;
  currentRound?: number;
  winnerAddress?: string;
  winnerName?: string;
  resolution?: MatchResolution;
  playerA: PlayerInfo;
  playerB: PlayerInfo | null;
  wagerAmountNano: string;
  totalBetsA: string;
  totalBetsB: string;
  totalBetsX?: string;
  oddsA: number;
  oddsB: number;
  oddsX?: number;
  distributablePoolNano?: string;
  spectatorCount?: number;
  gameData?: any;
  isPrivate?: boolean;
  inviteCode?: string;
}

// --- Russian Roulette Types ---
export type RouletteTarget = 'self' | 'opponent';

export interface RouletteState {
  chambersRemaining: number;
  totalChambers: number;
  currentTurn: 'A' | 'B';
  offensiveShotsA: number;
  offensiveShotsB: number;
  shieldA?: boolean;
  shieldB?: boolean;
  shieldsEarnedA?: number;
  shieldsEarnedB?: number;
  maxShields?: number;
  lethalOddsPercent: number;
  lastOutcome?: {
    shooter: 'A' | 'B';
    target: RouletteTarget;
    result: 'BLANK' | 'BANG';
    shieldAbsorbed?: boolean;
    message: string;
  };
}

// --- Blackjack Face-Up Types ---
export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  numericValue: number;
}

export interface BlackjackState {
  deckRemaining: number;
  handA: Card[];
  handB: Card[];
  scoreA: number;
  scoreB: number;
  currentTurn: 'A' | 'B' | 'FINISHED';
  standA: boolean;
  standB: boolean;
  bustA: boolean;
  bustB: boolean;
  bustOddsPercentA: number;
  bustOddsPercentB: number;
  lastAction?: {
    player: 'A' | 'B';
    action: 'HIT' | 'STAND';
    cardDrawn?: Card;
    message: string;
  };
}

// --- Glass Bridge Types ---
export type BridgeTileChoice = 'LEFT' | 'RIGHT';

export interface GlassBridgeState {
  totalSteps?: number;
  currentStepA: number;
  currentStepB: number;
  activeStep: number;
  currentTurn: 'A' | 'B';
  livesA: number;
  livesB: number;
  passesRemainingA?: number;
  passesRemainingB?: number;
  revealedSteps: Record<number, BridgeTileChoice>;
  lastOutcome?: {
    player: 'A' | 'B';
    step: number;
    choice: BridgeTileChoice;
    result: 'SAFE' | 'SHATTER';
    livesRemaining: number;
    message: string;
  };
}

// --- Chrono Blind Types ---
export interface ChronoBlindState {
  currentRound: number;
  maxRounds: number;
  scoreA: number;
  scoreB: number;
  targetDurationMs: number;
  blindThresholdMs: number;
  startEpochMs: number;
  serverTime?: number;
  stoppedA: boolean;
  stoppedB: boolean;
  stopTimeA?: number;
  stopTimeB?: number;
  diffMsA?: number;
  diffMsB?: number;
  bustedA: boolean;
  bustedB: boolean;
  roundWinner?: 'A' | 'B' | 'TIE';
  roundEndMessage?: string;
}

// --- Split or Steal Types ---
export type SplitStealChoice = 'SPLIT' | 'STEAL';
export type SplitStealOutcome = 'P1_STEAL' | 'P2_STEAL' | 'PEACE' | 'DOUBLE_STEAL';

export interface SplitStealState {
  phase: 'COUNTDOWN' | 'REVEALED';
  secondsLeft?: number;
  durationSeconds?: number;
  choicesRevealed: boolean;
  choiceA?: SplitStealChoice;
  choiceB?: SplitStealChoice;
  hasChosenA: boolean;
  hasChosenB: boolean;
  outcome?: SplitStealOutcome;
  jackpotGram: number;
  jackpotStatus: 'ACTIVE' | 'CHARGING';
  bonusAwardedGram?: number;
  bonusPerPlayerGram?: number;
  message?: string;
  oddsX?: number;
  totalBetsX?: string;
}

export interface WsMessage {
  type: string;
  matchId?: string;
  gameType?: GameType;
  role?: string;
  side?: 'A' | 'B';
  state?: RoomState;
  round?: number;
  currentRound?: number;
  scoreA?: number;
  scoreB?: number;
  oddsA?: number;
  oddsB?: number;
  oddsX?: number;
  totalBetsA?: string;
  totalBetsB?: string;
  totalBetsX?: string;
  winnerAddress?: string;
  winnerName?: string;
  resolution?: MatchResolution;
  playerAName?: string;
  playerBName?: string;
  wagerTon?: string;
  durationSeconds?: number;
  secondsLeft?: number;
  forfeiterName?: string;
  gracePeriodSeconds?: number;
  target?: string;
  payoutTon?: string;
  reactionTimeMs?: number;
  message?: string;
  proposerWallet?: string;
  proposerName?: string;
  newWagerTon?: string;
  newWagerNano?: string;
  declinerWallet?: string;
  playerA?: any;
  playerB?: any;
  gameData?: any;
  lastOutcome?: any;
  lastAction?: any;
  jackpotGram?: number;
}

export interface FeeConfig {
  creationFeeTon?: number;
  creationFeeGram: number;
  joinFeeGram?: number;
  spectatorFeeGram?: number;
  duelRakePercent?: number;
  spectatorRakePercent?: number;
  winnerFeePercent?: number;
  withdrawalFeeTon?: number;
  withdrawalFeeGram?: number;
  minWagerGram?: number;
  maxWagerGram?: number;
  currency?: string;
}

export type UserBalance = InternalAccount;
export type DuelHistoryRecord = MatchHistoryItem;

export interface UserStats {
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  bestReaction: string;
  totalProfitsTon: string;
  totalProfitsGram: string;
  dailyStreak?: number;
  hasWonToday?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  telegramId?: string;
  username: string;
  photoUrl?: string;
  duelsPlayed: number;
  duelsWon: number;
  winRate: number;
  dailyStreak: number;
  totalProfitsGram: string;
}

export interface MatchHistoryItem {
  matchId: string;
  timestamp: number;
  opponentName: string;
  opponentWallet?: string;
  wagerTon: string;
  wagerGram: string;
  payoutTon: string;
  payoutGram: string;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  reactionTimeMs?: number;
  score: string;
  gameType?: GameType;
}

export interface InternalAccount {
  walletAddress: string;
  balanceNano: string;
  balanceTon: string;
  balanceGram: string;
  depositedTotalTon: string;
  depositedTotalGram: string;
  withdrawnTotalTon: string;
  withdrawnTotalGram: string;
}

export interface BalanceTransaction {
  id: string;
  walletAddress: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'MATCH_BET' | 'MATCH_WIN' | 'REFUND';
  amountNano: string;
  amountTon: string;
  amountGram: string;
  timestamp: number;
  txHash?: string;
  details?: string;
}
