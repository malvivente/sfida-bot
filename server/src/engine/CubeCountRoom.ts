import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { CubeCountState, CubeCountPhase } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const GRID_SIZE = 5;

function generateCubeGrid(round: number, isSuddenDeath: boolean): { grid: number[][]; totalCount: number } {
  const grid: number[][] = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));

  let targetMin: number;
  let targetMax: number;
  let maxHeight: number;

  if (isSuddenDeath) {
    targetMin = 10;
    targetMax = 18;
    maxHeight = 4;
  } else if (round === 1) {
    targetMin = 5;
    targetMax = 8;
    maxHeight = 2;
  } else if (round === 2) {
    targetMin = 9;
    targetMax = 13;
    maxHeight = 3;
  } else if (round === 3) {
    targetMin = 14;
    targetMax = 18;
    maxHeight = 4;
  } else if (round === 4) {
    targetMin = 19;
    targetMax = 24;
    maxHeight = 5;
  } else {
    targetMin = 25;
    targetMax = 32;
    maxHeight = 5;
  }

  const targetCount = Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
  let remaining = targetCount;

  // Distribute cubes across the 5x5 grid in vertical column stacks
  let attempts = 0;
  while (remaining > 0 && attempts < 1000) {
    attempts++;
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const currentHeight = grid[x][y];
    if (currentHeight < maxHeight) {
      const add = Math.min(remaining, Math.min(maxHeight - currentHeight, Math.floor(Math.random() * 2) + 1));
      grid[x][y] += add;
      remaining -= add;
    }
  }

  // Count exact total
  let totalCount = 0;
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      totalCount += grid[x][y];
    }
  }

  return { grid, totalCount };
}

function getFlashDurationMs(round: number, isSuddenDeath: boolean): number {
  if (isSuddenDeath) return 700;
  if (round === 1) return 3000;
  if (round === 2) return 2200;
  if (round === 3) return 1600;
  if (round === 4) return 1100;
  return 800;
}

export class CubeCountRoom extends BaseGameRoom {
  public currentRound: number = 1;
  public phase: CubeCountPhase = 'COUNTDOWN';
  public hpA: number = GAMES_CONFIG.cubecount.initialLives;
  public hpB: number = GAMES_CONFIG.cubecount.initialLives;
  public readonly maxHp: number = GAMES_CONFIG.cubecount.initialLives;
  public isSuddenDeath: boolean = false;

  public grid: number[][] = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));
  public exactCount: number = 0;
  public flashDurationMs: number = 3000;
  public phaseEndEpochMs: number = 0;

  public answerA?: number;
  public answerB?: number;
  public hasAnsweredA: boolean = false;
  public hasAnsweredB: boolean = false;

  public roundDamageA?: number;
  public roundDamageB?: number;
  public roundMessage?: string;

  private phaseTimer?: NodeJS.Timeout;
  private resolveTimer?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'cubecount', onSettled);
  }

  public getGamePayload(): CubeCountState {
    return {
      currentRound: this.currentRound,
      phase: this.phase,
      hpA: this.hpA,
      hpB: this.hpB,
      maxHp: this.maxHp,
      isSuddenDeath: this.isSuddenDeath,
      gridSize: GRID_SIZE,
      grid: this.grid,
      // Only reveal exactCount, answerA and answerB during REVEAL or when match settled
      exactCount: this.phase === 'REVEAL' || this.state === 'MATCH_SETTLED' ? this.exactCount : undefined,
      flashDurationMs: this.flashDurationMs,
      phaseEndEpochMs: this.phaseEndEpochMs,
      hasAnsweredA: this.hasAnsweredA,
      hasAnsweredB: this.hasAnsweredB,
      answerA: this.phase === 'REVEAL' || this.state === 'MATCH_SETTLED' ? this.answerA : undefined,
      answerB: this.phase === 'REVEAL' || this.state === 'MATCH_SETTLED' ? this.answerB : undefined,
      roundDamageA: this.roundDamageA,
      roundDamageB: this.roundDamageB,
      roundMessage: this.roundMessage,
    };
  }

  public onGameStart(): void {
    this.state = 'GAME_ACTIVE';
    this.hpA = this.maxHp;
    this.hpB = this.maxHp;
    this.isSuddenDeath = false;
    this.currentRound = 1;
    this.startRound(1);
  }

  private startRound(roundNum: number): void {
    this.cleanupGameTimers();

    this.currentRound = roundNum;
    this.hasAnsweredA = false;
    this.hasAnsweredB = false;
    this.answerA = undefined;
    this.answerB = undefined;
    this.roundDamageA = undefined;
    this.roundDamageB = undefined;
    this.roundMessage = undefined;

    const { grid, totalCount } = generateCubeGrid(this.currentRound, this.isSuddenDeath);
    this.grid = grid;
    this.exactCount = totalCount;
    this.flashDurationMs = getFlashDurationMs(this.currentRound, this.isSuddenDeath);

    // Phase 1: 1.5s Countdown ("Get Ready")
    this.phase = 'COUNTDOWN';
    this.phaseEndEpochMs = Date.now() + 1500;

    this.broadcast({
      type: 'CUBECOUNT_ROUND_START',
      round: this.currentRound,
      isSuddenDeath: this.isSuddenDeath,
      flashDurationMs: this.flashDurationMs,
      phaseEndEpochMs: this.phaseEndEpochMs,
      gameData: this.getGamePayload(),
    });

    this.phaseTimer = setTimeout(() => {
      this.beginFlashPhase();
    }, 1500);
  }

  private beginFlashPhase(): void {
    this.phase = 'FLASH';
    this.phaseEndEpochMs = Date.now() + this.flashDurationMs;

    this.broadcast({
      type: 'CUBECOUNT_FLASH',
      round: this.currentRound,
      flashDurationMs: this.flashDurationMs,
      phaseEndEpochMs: this.phaseEndEpochMs,
      gameData: this.getGamePayload(),
    });

    this.phaseTimer = setTimeout(() => {
      this.beginInputPhase();
    }, this.flashDurationMs);
  }

  private beginInputPhase(): void {
    this.phase = 'INPUT';
    const inputDurationMs = GAMES_CONFIG.cubecount.inputTimeoutSeconds * 1000;
    this.phaseEndEpochMs = Date.now() + inputDurationMs;

    this.broadcast({
      type: 'CUBECOUNT_INPUT',
      round: this.currentRound,
      phaseEndEpochMs: this.phaseEndEpochMs,
      gameData: this.getGamePayload(),
    });

    this.phaseTimer = setTimeout(() => {
      this.resolveRound();
    }, inputDurationMs);
  }

  public handleGameAction(wallet: string, data: any): void {
    if (this.state !== 'GAME_ACTIVE') return;

    if (data.type === 'CUBECOUNT_SUBMIT') {
      if (this.phase !== 'INPUT') return;

      const isPlayerA = this.isSameWallet(wallet, this.playerA.walletAddress);
      const isPlayerB = this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress);
      if (!isPlayerA && !isPlayerB) return;

      const rawCount = Math.max(0, Math.floor(Number(data.count) || 0));

      if (isPlayerA) {
        if (this.hasAnsweredA) return;
        this.answerA = rawCount;
        this.hasAnsweredA = true;
      } else {
        if (this.hasAnsweredB) return;
        this.answerB = rawCount;
        this.hasAnsweredB = true;
      }

      this.broadcast({
        type: 'CUBECOUNT_ANSWER_STATUS',
        hasAnsweredA: this.hasAnsweredA,
        hasAnsweredB: this.hasAnsweredB,
        gameData: this.getGamePayload(),
      });

      // If both players have submitted, wait 500ms then resolve
      if (this.hasAnsweredA && this.hasAnsweredB) {
        if (this.phaseTimer) {
          clearTimeout(this.phaseTimer);
          this.phaseTimer = undefined;
        }
        this.phaseTimer = setTimeout(() => {
          this.resolveRound();
        }, 500);
      }
    }
  }

  private resolveRound(): void {
    this.cleanupGameTimers();
    this.phase = 'REVEAL';

    const pAName = this.playerA.username || 'Player A';
    const pBName = this.playerB?.username || 'Player B';

    const isACorrect = this.hasAnsweredA && this.answerA === this.exactCount;
    const isBCorrect = this.hasAnsweredB && this.answerB === this.exactCount;

    if (isACorrect) {
      this.roundDamageA = 0;
    } else {
      this.roundDamageA = 1;
      this.hpA = Math.max(0, this.hpA - 1);
    }

    if (isBCorrect) {
      this.roundDamageB = 0;
    } else {
      this.roundDamageB = 1;
      this.hpB = Math.max(0, this.hpB - 1);
    }

    const aResultText = isACorrect
      ? `${pAName}: ${this.answerA} (✓)`
      : this.hasAnsweredA
      ? `${pAName}: ${this.answerA} (❌ -1 HP)`
      : `${pAName}: Tempo scaduto (❌ -1 HP)`;

    const bResultText = isBCorrect
      ? `${pBName}: ${this.answerB} (✓)`
      : this.hasAnsweredB
      ? `${pBName}: ${this.answerB} (❌ -1 HP)`
      : `${pBName}: Tempo scaduto (❌ -1 HP)`;

    this.roundMessage = `🎯 Totale Esatto: ${this.exactCount} cubi! • ${aResultText} | ${bResultText}`;

    this.broadcast({
      type: 'CUBECOUNT_REVEAL',
      exactCount: this.exactCount,
      answerA: this.answerA,
      answerB: this.answerB,
      roundDamageA: this.roundDamageA,
      roundDamageB: this.roundDamageB,
      hpA: this.hpA,
      hpB: this.hpB,
      roundMessage: this.roundMessage,
      gameData: this.getGamePayload(),
    });

    // Check game termination or sudden death
    if (this.isSuddenDeath) {
      // In Sudden Death:
      // 1. If one got it exact and other didn't: exact wins
      if (isACorrect && !isBCorrect) {
        this.resolveTimer = setTimeout(() => this.settleMatch('A'), 3500);
        return;
      }
      if (isBCorrect && !isACorrect) {
        this.resolveTimer = setTimeout(() => this.settleMatch('B'), 3500);
        return;
      }

      // 2. Both wrong or both correct: whoever is closer wins!
      const diffA = Math.abs((this.answerA ?? 999) - this.exactCount);
      const diffB = Math.abs((this.answerB ?? 999) - this.exactCount);

      if (diffA < diffB) {
        this.resolveTimer = setTimeout(() => this.settleWinner('A'), 3500);
        return;
      } else if (diffB < diffA) {
        this.resolveTimer = setTimeout(() => this.settleWinner('B'), 3500);
        return;
      } else {
        // Equal distance! Another sudden death round
        this.resolveTimer = setTimeout(() => {
          this.startRound(this.currentRound + 1);
        }, 3500);
        return;
      }
    } else {
      // Standard 3 Lives mode
      if (this.hpA > 0 && this.hpB === 0) {
        this.resolveTimer = setTimeout(() => this.settleWinner('A'), 3500);
        return;
      }
      if (this.hpB > 0 && this.hpA === 0) {
        this.resolveTimer = setTimeout(() => this.settleWinner('B'), 3500);
        return;
      }
      if (this.hpA === 0 && this.hpB === 0) {
        // Both lost their last life simultaneously => SUDDEN DEATH ROUND!
        this.isSuddenDeath = true;
        this.hpA = 1;
        this.hpB = 1;
        this.resolveTimer = setTimeout(() => {
          this.startRound(this.currentRound + 1);
        }, 3500);
        return;
      }

      // Both still have lives => Next round with increased speed & cubes!
      this.resolveTimer = setTimeout(() => {
        this.startRound(this.currentRound + 1);
      }, 3500);
    }
  }

  private settleWinner(winningSide: 'A' | 'B'): void {
    if (this.state === 'MATCH_SETTLED' || this.state === 'FORFEITED') return;
    const winnerWallet = winningSide === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || this.playerA.walletAddress);
    this.settleMatch(winnerWallet);
  }

  public override resetForRematch(): void {
    this.cleanupGameTimers();
    this.hpA = this.maxHp;
    this.hpB = this.maxHp;
    this.isSuddenDeath = false;
    this.currentRound = 1;
    this.phase = 'COUNTDOWN';
    this.hasAnsweredA = false;
    this.hasAnsweredB = false;
    this.answerA = undefined;
    this.answerB = undefined;
    this.roundDamageA = undefined;
    this.roundDamageB = undefined;
    this.roundMessage = undefined;
  }

  public cleanupGameTimers(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = undefined;
    }
    if (this.resolveTimer) {
      clearTimeout(this.resolveTimer);
      this.resolveTimer = undefined;
    }
  }
}
