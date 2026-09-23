import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { ChronoBlindState } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

export class ChronoBlindRoom extends BaseGameRoom {
  public currentRound: number = 1;
  public maxRounds: number = GAMES_CONFIG.chrono.maxRounds;
  public roundsToWin: number = GAMES_CONFIG.chrono.roundsToWin;

  public targetDurationMs: number = 5000;
  public blindThresholdMs: number = GAMES_CONFIG.chrono.blindThresholdSeconds * 1000;
  public startEpochMs: number = 0;

  public stoppedA: boolean = false;
  public stoppedB: boolean = false;
  public stopTimeA?: number;
  public stopTimeB?: number;
  public diffMsA?: number;
  public diffMsB?: number;
  public bustedA: boolean = false;
  public bustedB: boolean = false;

  public roundWinner?: 'A' | 'B' | 'TIE';
  public roundEndMessage?: string;

  private roundTimer?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'chrono', onSettled);
  }

  private pickRandomDurationMs(): number {
    const min = GAMES_CONFIG.chrono.minDurationSeconds;
    const max = GAMES_CONFIG.chrono.maxDurationSeconds;
    const sec = Math.random() * (max - min) + min;
    // Round to nearest 10ms for clean precision e.g. 5.750s
    return Math.round(sec * 100) * 10;
  }

  public getGamePayload(): ChronoBlindState {
    return {
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      scoreA: this.playerA.score,
      scoreB: this.playerB ? this.playerB.score : 0,
      targetDurationMs: this.targetDurationMs,
      blindThresholdMs: this.blindThresholdMs,
      startEpochMs: this.startEpochMs,
      stoppedA: this.stoppedA,
      stoppedB: this.stoppedB,
      stopTimeA: this.stopTimeA,
      stopTimeB: this.stopTimeB,
      diffMsA: this.diffMsA,
      diffMsB: this.diffMsB,
      bustedA: this.bustedA,
      bustedB: this.bustedB,
      roundWinner: this.roundWinner,
      roundEndMessage: this.roundEndMessage,
    };
  }

  public onGameStart() {
    this.currentRound = 1;
    this.playerA.score = 0;
    if (this.playerB) this.playerB.score = 0;
    this.startChronoRound(1);
  }

  private startChronoRound(roundNum: number) {
    this.currentRound = roundNum;
    this.state = 'GAME_ACTIVE';
    this.stoppedA = false;
    this.stoppedB = false;
    this.stopTimeA = undefined;
    this.stopTimeB = undefined;
    this.diffMsA = undefined;
    this.diffMsB = undefined;
    this.bustedA = false;
    this.bustedB = false;
    this.roundWinner = undefined;
    this.roundEndMessage = undefined;

    this.targetDurationMs = this.pickRandomDurationMs();
    this.blindThresholdMs = GAMES_CONFIG.chrono.blindThresholdSeconds * 1000;
    this.startEpochMs = Date.now() + 1500; // 1.5s countdown before timer begins

    this.broadcast({
      type: 'CHRONO_ROUND_START',
      round: this.currentRound,
      targetDurationMs: this.targetDurationMs,
      blindThresholdMs: this.blindThresholdMs,
      startEpochMs: this.startEpochMs,
      message: `Round ${this.currentRound}! Timer: ${(this.targetDurationMs / 1000).toFixed(2)}s. Blackout at ${(this.blindThresholdMs / 1000).toFixed(2)}s. Get ready!`,
      gameData: this.getGamePayload(),
    });

    this.broadcastRoomState();

    // Auto-cutoff 3 seconds after 0.000s in case players never hit stop
    if (this.roundTimer) clearTimeout(this.roundTimer);
    const maxWaitMs = (this.startEpochMs - Date.now()) + this.targetDurationMs + 3000;
    this.roundTimer = setTimeout(() => {
      if (this.state === 'GAME_ACTIVE') {
        if (!this.stoppedA) this.recordStop('A', Date.now());
        if (!this.stoppedB) this.recordStop('B', Date.now());
        this.evaluateRound();
      }
    }, maxWaitMs);
  }

  public handleGameAction(wallet: string, data: any) {
    if (data.type === 'CHRONO_STOP') {
      this.handleChronoStop(wallet);
    }
  }

  public handleChronoStop(wallet: string) {
    if (this.state !== 'GAME_ACTIVE') return;
    const now = Date.now();
    if (now < this.startEpochMs) {
      console.warn(`[ChronoBlind] Stop attempted before timer officially started.`);
      return;
    }

    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side) return;

    if (side === 'A' && this.stoppedA) return;
    if (side === 'B' && this.stoppedB) return;

    this.recordStop(side, now);

    this.broadcast({
      type: 'CHRONO_PLAYER_STOPPED',
      side,
      gameData: this.getGamePayload(),
    });

    // If both players have stopped, evaluate round immediately!
    if (this.stoppedA && this.stoppedB) {
      if (this.roundTimer) clearTimeout(this.roundTimer);
      this.evaluateRound();
    }
  }

  private recordStop(side: 'A' | 'B', timestamp: number) {
    const elapsedMs = timestamp - this.startEpochMs;
    const remainingMs = this.targetDurationMs - elapsedMs;

    if (side === 'A') {
      this.stoppedA = true;
      this.stopTimeA = remainingMs;
      this.diffMsA = Math.abs(remainingMs);
      this.bustedA = remainingMs < 0;
    } else {
      this.stoppedB = true;
      this.stopTimeB = remainingMs;
      this.diffMsB = Math.abs(remainingMs);
      this.bustedB = remainingMs < 0;
    }
  }

  private evaluateRound() {
    this.cleanupGameTimers();

    const diffA = this.diffMsA ?? 99999;
    const diffB = this.diffMsB ?? 99999;
    const secA = ((this.stopTimeA ?? 0) / 1000).toFixed(3);
    const secB = ((this.stopTimeB ?? 0) / 1000).toFixed(3);

    const nameA = this.playerA.username;
    const nameB = this.playerB?.username || 'Player B';

    let roundWinSide: 'A' | 'B' | 'TIE' = 'TIE';
    let msg = '';

    if (this.bustedA && !this.bustedB) {
      roundWinSide = 'B';
      this.playerB ? this.playerB.score++ : null;
      msg = `${nameA} BUSTED (${secA}s past zero)! ${nameB} wins round with ${secB}s remaining!`;
    } else if (!this.bustedA && this.bustedB) {
      roundWinSide = 'A';
      this.playerA.score++;
      msg = `${nameB} BUSTED (${secB}s past zero)! ${nameA} wins round with ${secA}s remaining!`;
    } else if (this.bustedA && this.bustedB) {
      // Both busted: closer to 0 wins
      if (diffA < diffB) {
        roundWinSide = 'A';
        this.playerA.score++;
        msg = `Both busted! ${nameA} was closer (+${(diffA / 1000).toFixed(3)}s vs +${(diffB / 1000).toFixed(3)}s).`;
      } else if (diffB < diffA) {
        roundWinSide = 'B';
        this.playerB ? this.playerB.score++ : null;
        msg = `Both busted! ${nameB} was closer (+${(diffB / 1000).toFixed(3)}s vs +${(diffA / 1000).toFixed(3)}s).`;
      } else {
        msg = `Exact tie bust! Both +${(diffA / 1000).toFixed(3)}s!`;
      }
    } else {
      // Neither busted: closest to 0 wins!
      if (diffA < diffB) {
        roundWinSide = 'A';
        this.playerA.score++;
        msg = `🎯 ${nameA} stopped at ${secA}s to 0.000s, beating ${nameB} (${secB}s)!`;
      } else if (diffB < diffA) {
        roundWinSide = 'B';
        this.playerB ? this.playerB.score++ : null;
        msg = `🎯 ${nameB} stopped at ${secB}s to 0.000s, beating ${nameA} (${secA}s)!`;
      } else {
        msg = `Incredible! Both stopped at exact same millisecond (${secA}s)!`;
      }
    }

    this.roundWinner = roundWinSide;
    this.roundEndMessage = msg;

    this.broadcast({
      type: 'CHRONO_ROUND_END',
      roundWinner: this.roundWinner,
      message: msg,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    // Check match victory (Best of 3: first to 2 wins)
    if (this.playerA.score >= this.roundsToWin) {
      setTimeout(() => this.settleMatch(this.playerA.walletAddress), 2500);
    } else if (this.playerB && this.playerB.score >= this.roundsToWin) {
      setTimeout(() => this.settleMatch(this.playerB!.walletAddress), 2500);
    } else if (this.currentRound < this.maxRounds) {
      setTimeout(() => this.startChronoRound(this.currentRound + 1), 3500);
    } else {
      // Tiebreak or higher score
      const winner = this.playerA.score >= (this.playerB?.score || 0)
        ? this.playerA.walletAddress
        : this.playerB!.walletAddress;
      setTimeout(() => this.settleMatch(winner), 2500);
    }
  }

  public cleanupGameTimers() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = undefined;
    }
  }
}
