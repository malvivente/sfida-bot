export type GameType = 'roulette' | 'blackjack' | 'bridge' | 'chrono' | 'split' | 'shotgun' | 'connect4' | 'cubecount' | 'headsoccer' | 'poker' | 'uno';

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
  | 'FORFEITED'
  | 'CANCELLED';

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
  allowSpectators?: boolean;
  groupChatId?: string;
  inviteCode?: string;
  createdAt?: number;
  expiresAt?: number;
  targetOpponentUsername?: string;
  targetOpponentId?: string;
  maxPlayers?: number;
  currentPlayers?: number;
}

export interface FriendUser {
  id?: string;
  telegramId?: string;
  walletAddress?: string;
  username?: string;
  displayName?: string;
  name?: string;
  photoUrl?: string;
  lastPlayedGame?: string;
}

export interface FriendRequestItem {
  id: string;
  fromUserKey: string;
  fromTelegramId?: string;
  fromUsername?: string;
  fromDisplayName?: string;
  fromPhotoUrl?: string;
  toUserKey: string;
  toTelegramId?: string;
  toUsername?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: number;
}

// --- Coin Toss Types (For Turn-Based Games) ---
export interface CoinTossData {
  playerASide: 'HEADS';
  playerBSide: 'TAILS';
  winningFace: 'HEADS' | 'TAILS';
  starterSide: 'A' | 'B';
  starterName: string;
  timestamp: number;
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
  coinToss?: CoinTossData;
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
  isDeathMatch?: boolean;
  deathMatchRound?: number;
  lastAction?: {
    player: 'A' | 'B';
    action: 'HIT' | 'STAND';
    cardDrawn?: Card;
    message: string;
  };
  coinToss?: CoinTossData;
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
  coinToss?: CoinTossData;
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
  phase: 'COUNTDOWN' | 'REVEALED' | 'ROUND_TRANSITION';
  currentRound: number;
  maxRounds: number;
  roundHistory?: Array<{
    round: number;
    choiceA: SplitStealChoice;
    choiceB: SplitStealChoice;
    outcome: string;
  }>;
  roundProbabilities?: {
    peaceBonusPercent: number;
    stealBonusPercent: number;
    probabilityPercent: number;
  };
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
  oddsC?: number;
  oddsD?: number;
  oddsX?: number;
  totalBetsA?: string;
  totalBetsB?: string;
  totalBetsC?: string;
  totalBetsD?: string;
  totalBetsX?: string;
  winnerAddress?: string;
  winnerName?: string;
  winnerSide?: 'A' | 'B';
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
  amountGram?: string;
  feePaidGram?: string;
  spectatorSettlements?: Array<{
    walletAddress: string;
    telegramId?: string;
    target: string;
    won: boolean;
    payoutGram: string;
    refunded?: boolean;
  }>;
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
    id?: string;
    timestamp?: number;
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
  coinToss?: CoinTossData;
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
  coinToss?: CoinTossData;
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
  serverTime?: number;
}

// --- Head Soccer Types ---
export type HeadSoccerPhase = 'KICKOFF_COUNTDOWN' | 'PLAYING' | 'GOAL_CELEBRATION' | 'OVERTIME_INTRO' | 'FULL_TIME';

export interface HeadSoccerPlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  kickTimer: number;
  superCharge: number;
  superActive: boolean;
}

export interface HeadSoccerBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  isSuperShot: boolean;
  superOwner?: 'A' | 'B';
  lastTouch?: 'A' | 'B';
}

export interface HeadSoccerState {
  phase: HeadSoccerPhase;
  scoreA: number;
  scoreB: number;
  timeRemainingMs: number;
  isOvertime: boolean;
  countdownSec: number;
  playerA: HeadSoccerPlayerState;
  playerB: HeadSoccerPlayerState;
  ball: HeadSoccerBallState;
  lastGoalBy?: 'A' | 'B';
  lastEvent?: {
    type: 'KICK' | 'HEADER' | 'SUPER_SHOT' | 'CROSSBAR' | 'GOAL';
    side?: 'A' | 'B';
    x: number;
    y: number;
    ts: number;
  };
  serverTs: number;
}

// --- Texas Hold'em Poker Types ---
export interface PokerCard {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  numericValue: number;
}

export type PokerStage =
  | 'WAITING'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'HAND_OVER'
  | 'TOURNAMENT_OVER';

export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export interface PokerPlayerSeat {
  seatIndex: number;
  walletAddress: string;
  telegramId: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  chips: number;
  currentBet: number;
  totalInvestedThisHand: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  isReady: boolean;
  isTurn: boolean;
  role: 'BTN' | 'SB' | 'BB' | 'NORMAL';
  holeCards?: PokerCard[];
  hasHoleCards?: boolean;
  lastAction?: {
    type: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN' | 'BLIND';
    amount?: number;
    message?: string;
  };
  handResult?: {
    rankName: string;
    rankNameEn?: string;
    score: number;
    bestFiveCards: PokerCard[];
  };
  eliminated?: boolean;
  payoutGram?: number;
  finishRank?: number;
  consecutiveTimeouts?: number;
  disconnectCountdown?: number;
}

export interface PokerPot {
  amount: number;
  eligibleSeats: number[];
}

export interface PokerState {
  stage: PokerStage;
  maxPlayers: number;
  seats: PokerPlayerSeat[];
  communityCards: PokerCard[];
  pot: number;
  sidePots: PokerPot[];
  currentBet: number;
  minRaise: number;
  buttonSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  activeSeat: number | null;
  turnTimeLimit: number;
  turnTimeRemaining: number;
  handNumber: number;
  blindLevel: number;
  smallBlind: number;
  bigBlind: number;
  handWinners?: {
    seatIndex: number;
    username: string;
    amount: number;
    rankName?: string;
    rankNameEn?: string;
    winningCards?: PokerCard[];
  }[];
  tournamentWinner?: {
    seatIndex: number;
    username: string;
    walletAddress: string;
    totalPrizeGram: number;
  };
}

// --- UNO Types ---
export type UnoColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type UnoCardType =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REVERSE' | 'DRAW2'
  | 'WILD' | 'WILD_DRAW4';

export interface UnoCard {
  id: string;
  color: UnoColor | 'WILD';
  type: UnoCardType;
  value: number;
}

export interface UnoState {
  currentTurn: 'A' | 'B';
  discardPileTop: UnoCard;
  currentColor: UnoColor;
  drawPileCount: number;
  handA: UnoCard[];
  handB: UnoCard[];
  handCountA: number;
  handCountB: number;
  unoCalledA: boolean;
  unoCalledB: boolean;
  lastAction?: {
    player: 'A' | 'B';
    type: 'PLAY' | 'DRAW' | 'PASS' | 'UNO_CALLED';
    card?: UnoCard;
    message: string;
  };
  coinToss?: CoinTossData;
}
