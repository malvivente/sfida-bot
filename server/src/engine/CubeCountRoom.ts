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
    // In Sudden Death: balanced, readable 3D layout (7 to 10 cubes, max height 2)
    targetMin = 7;
    targetMax = 10;
    maxHeight = 2;
  } else if (round === 1) {
    // Round 1: 3 to 4 flat cubes (height 1)
    targetMin = 3;
    targetMax = 4;
    maxHeight = 1;
  } else if (round === 2) {
    // Round 2: 4 to 5 flat cubes (height 1)
    targetMin = 4;
    targetMax = 5;
    maxHeight = 1;
  } else if (round === 3) {
    // Round 3: 5 to 6 flat cubes (height 1)
    targetMin = 5;
    targetMax = 6;
    maxHeight = 1;
  } else if (round === 4) {
    // Round 4: 6 to 7 cubes (light stacking, max height 2)
    targetMin = 6;
    targetMax = 7;
    maxHeight = 2;
  } else if (round === 5) {
    // Round 5: 7 to 9 cubes (max height 2)
    targetMin = 7;
    targetMax = 9;
    maxHeight = 2;
  } else if (round === 6) {
    // Round 6: 9 to 11 cubes (max height 2)
    targetMin = 9;
    targetMax = 11;
    maxHeight = 2;
  } else if (round === 7) {
    // Round 7: 11 to 13 cubes (max height 3)
    targetMin = 11;
    targetMax = 13;
    maxHeight = 3;
  } else if (round === 8) {
    // Round 8: 13 to 15 cubes (max height 3)
    targetMin = 13;
    targetMax = 15;
    maxHeight = 3;
  } else if (round === 9) {
    // Round 9: 15 to 18 cubes (max height 3)
    targetMin = 15;
    targetMax = 18;
    maxHeight = 3;
  } else {
    // Round 10+: 18 to 22 cubes (max height 4)
    targetMin = 18;
    targetMax = 22;
    maxHeight = 4;
  }

  const targetCount = Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
  let remaining = targetCount;

  // For rounds 1, 2 & 3: ensure cubes are distributed flat on distinct cells across the grid (no stacking)
  if (round <= 3 && !isSuddenDeath) {
    const availableCoords: [number, number][] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        availableCoords.push([x, y]);
      }
    }
    // Fisher-Yates shuffle
    for (let i = availableCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCoords[i], availableCoords[j]] = [availableCoords[j], availableCoords[i]];
    }

    // Place 1 cube per coordinate
    for (let i = 0; i < targetCount && i < availableCoords.length; i++) {
      const [x, y] = availableCoords[i];
      grid[x][y] = 1;
    }
  } else {
    // Rounds 4+: Natural vertical stacking and clustering
    let attempts = 0;
    while (remaining > 0 && attempts < 1000) {
      attempts++;
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const currentHeight = grid[x][y];
      if (currentHeight < maxHeight) {
        const maxAddPerStep = round <= 5 ? 1 : Math.min(2, maxHeight - currentHeight);
        const add = Math.min(remaining, Math.min(maxHeight - currentHeight, maxAddPerStep));
        grid[x][y] += add;
        remaining -= add;
      }
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
  if (isSuddenDeath) return 2400; // 2.4s: comfortable, humanly readable, intense skill duel
  if (round === 1) return 3800;   // 3.8s for initial 3-4 flat cubes
  if (round === 2) return 3400;   // 3.4s for 4-5 flat cubes
  if (round === 3) return 3100;   // 3.1s for 5-6 flat cubes
  if (round === 4) return 2800;   // 2.8s for 6-7 cubes (height 2)
  if (round === 5) return 2500;   // 2.5s for 7-9 cubes (height 2)
  if (round === 6) return 2300;   // 2.3s for 9-11 cubes (height 2)
  if (round === 7) return 2100;   // 2.1s for 11-13 cubes (height 3)
  if (round === 8) return 1900;   // 1.9s for 13-15 cubes (height 3)
  if (round === 9) return 1700;   // 1.7s for 15-18 cubes (height 3)
  return 1500;                    // 1.5s for round 10+
}

export class CubeCountRoom extends BaseGameRoom {
  public currentRound: number = 1;
  public phase: CubeCountPhase = 'FLASH';
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

    this.beginFlashPhase();
  }

  private beginFlashPhase(): void {
    this.phase = 'FLASH';
    this.phaseEndEpochMs = Date.now() + this.flashDurationMs;

    this.broadcast({
      type: 'CUBECOUNT_ROUND_START',
      round: this.currentRound,
      isSuddenDeath: this.isSuddenDeath,
      flashDurationMs: this.flashDurationMs,
      phaseEndEpochMs: this.phaseEndEpochMs,
      gameData: this.getGamePayload(),
    });

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
        this.hpA = 1;
        this.hpB = 0;
        this.roundMessage = `🎯 Totale: ${this.exactCount} cubi! • ${pAName} indovina esatto! Vince il Death Match!`;
        this.broadcast({
          type: 'CUBECOUNT_REVEAL',
          exactCount: this.exactCount,
          answerA: this.answerA,
          answerB: this.answerB,
          roundDamageA: 0,
          roundDamageB: 1,
          hpA: 1,
          hpB: 0,
          roundMessage: this.roundMessage,
          gameData: this.getGamePayload(),
        });
        this.resolveTimer = setTimeout(() => this.settleWinner('A'), 3500);
        return;
      }
      if (isBCorrect && !isACorrect) {
        this.hpA = 0;
        this.hpB = 1;
        this.roundMessage = `🎯 Totale: ${this.exactCount} cubi! • ${pBName} indovina esatto! Vince il Death Match!`;
        this.broadcast({
          type: 'CUBECOUNT_REVEAL',
          exactCount: this.exactCount,
          answerA: this.answerA,
          answerB: this.answerB,
          roundDamageA: 1,
          roundDamageB: 0,
          hpA: 0,
          hpB: 1,
          roundMessage: this.roundMessage,
          gameData: this.getGamePayload(),
        });
        this.resolveTimer = setTimeout(() => this.settleWinner('B'), 3500);
        return;
      }

      // 2. Both wrong OR both correct:
      // Death Match continues round after round until one player loses!
      this.hpA = 1;
      this.hpB = 1;
      if (isACorrect && isBCorrect) {
        this.roundMessage = `🎯 Totale: ${this.exactCount} cubi! • Entrambi corretti (✓)! Il Death Match continua...`;
      } else {
        this.roundMessage = `🎯 Totale: ${this.exactCount} cubi! • Entrambi hanno sbagliato! Il Death Match continua...`;
      }
      this.broadcast({
        type: 'CUBECOUNT_REVEAL',
        exactCount: this.exactCount,
        answerA: this.answerA,
        answerB: this.answerB,
        roundDamageA: this.roundDamageA,
        roundDamageB: this.roundDamageB,
        hpA: 1,
        hpB: 1,
        roundMessage: this.roundMessage,
        gameData: this.getGamePayload(),
      });
      this.resolveTimer = setTimeout(() => {
        this.startRound(this.currentRound + 1);
      }, 3500);
      return;
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
        this.roundMessage = `🎯 Totale: ${this.exactCount} cubi! • Parità a 0 vite! Si va al DEATH MATCH!`;
        this.broadcast({
          type: 'CUBECOUNT_REVEAL',
          exactCount: this.exactCount,
          answerA: this.answerA,
          answerB: this.answerB,
          roundDamageA: this.roundDamageA,
          roundDamageB: this.roundDamageB,
          hpA: 1,
          hpB: 1,
          roundMessage: this.roundMessage,
          gameData: this.getGamePayload(),
        });
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
    this.phase = 'FLASH';
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
