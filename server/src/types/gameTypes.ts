export type GameType = 'roulette' | 'blackjack' | 'bridge' | 'chrono' | 'split' | 'shotgun' | 'connect4' | 'cubecount' | 'headsoccer' | 'poker' | 'uno';

export type RoomState =
  | 'WAITING_FOR_DEPLOY'
  | 'LOBBY'
  | 'BETTING_WINDOW'
  | 'GAME_ACTIVE'
  | 'ROUND_START'
  | 'ROUND_END'
  | 'MATCH_SETTLED'
  | 'FORFEITED'
  | 'CANCELLED';

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
  lethalOddsPercent: number;
  lastOutcome?: {
    shooter: 'A' | 'B';
    target: RouletteTarget;
    result: 'BLANK' | 'BANG';
    message: string;
  };
  coinToss?: CoinTossData;
}

// --- Blackjack Face-Up Types ---
export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  numericValue: number; // 2-10, 10, 10, 10, 11 (Ace handles 1/11 in evaluation)
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

export interface BridgeStepInfo {
  step: number;
  safeChoice?: BridgeTileChoice; // Only revealed once stepped on or broken
  shatteredChoice?: BridgeTileChoice;
}

export interface GlassBridgeState {
  totalSteps?: number;
  currentStepA: number;
  currentStepB: number;
  activeStep: number;
  currentTurn: 'A' | 'B';
  livesA: number;
  livesB: number;
  passesRemainingA: number;
  passesRemainingB: number;
  revealedSteps: Record<number, BridgeTileChoice>; // step index -> safe choice
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
  stopTimeA?: number; // ms remaining when stopped (positive = before 0, negative = busted)
  stopTimeB?: number;
  diffMsA?: number; // absolute ms from 0.000
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
  kickTimer: number; // > 0 when shoe is swinging
  superCharge: number; // 0 to 100
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

export * from '../engine/poker/pokerTypes.js';

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

