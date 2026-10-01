export type GameType = 'roulette' | 'blackjack' | 'bridge' | 'chrono' | 'split' | 'shotgun' | 'connect4' | 'cubecount';

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
  photoUrl?: string;
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
  groupChatId?: string;
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

// --- Cyber Shotgun Types (Buckshot Roulette Style) ---
export type ShotgunItem = 'saw' | 'ejector' | 'handcuffs' | 'inverter';
export type ShellType = 'LIVE' | 'BLANK';
export type ShotgunTarget = 'self' | 'opponent';

export interface CyberShotgunState {
  hpA: number;
  hpB: number;
  maxHp: number;
  currentTurn: 'A' | 'B';
  liveCount: number;
  blankCount: number;
  totalShellsRemaining: number;
  isSawActive: boolean;
  isHandcuffedA: boolean;
  isHandcuffedB: boolean;
  itemsA: ShotgunItem[];
  itemsB: ShotgunItem[];
  lastAction?: {
    player: 'A' | 'B';
    type: 'SHOOT' | 'USE_ITEM';
    target?: ShotgunTarget;
    item?: ShotgunItem;
    result?: 'BANG' | 'BLANK' | 'EJECTED' | 'CONVERTED' | 'HANDCUFFED' | 'SAWED';
    damage?: number;
    extraTurn?: boolean;
    ejectedShell?: ShellType;
    message: string;
  };
  mancheNumber: number;
}

// --- Connect 4 (Forza 4) Types ---
export type Connect4Cell = 0 | 1 | 2; // 0: empty, 1: playerA, 2: playerB

export interface Connect4State {
  board: Connect4Cell[][]; // 6 rows x 7 columns
  currentTurn: 'A' | 'B';
  movesCount: number;
  lastMove?: {
    player: 'A' | 'B';
    row: number;
    col: number;
  };
  winningLine?: [number, number][]; // Coordinates of winning 4 chips
  isDraw?: boolean;
  message?: string;
}

// --- Cube Count (Survival IQ) Types ---
export type CubeCountPhase = 'COUNTDOWN' | 'FLASH' | 'INPUT' | 'REVEAL' | 'ROUND_OVER';

export interface CubeCountState {
  currentRound: number;
  phase: CubeCountPhase;
  hpA: number;
  hpB: number;
  maxHp: number;
  isSuddenDeath: boolean;
  gridSize: number; // 5x5
  grid: number[][]; // 5x5 array of stacked cube column heights
  exactCount?: number; // only revealed during REVEAL phase
  flashDurationMs: number;
  phaseEndEpochMs: number;
  hasAnsweredA: boolean;
  hasAnsweredB: boolean;
  answerA?: number; // revealed in REVEAL
  answerB?: number; // revealed in REVEAL
  roundDamageA?: number; // 0 or 1
  roundDamageB?: number; // 0 or 1
  roundMessage?: string;
}
