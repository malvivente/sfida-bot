import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { GlassBridgeState, BridgeTileChoice } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

export class GlassBridgeRoom extends BaseGameRoom {
  private safePath: BridgeTileChoice[] = [];
  public currentStepA: number = 0;
  public currentStepB: number = 0;
  public currentTurn: 'A' | 'B' = 'A';
  public livesA: number = GAMES_CONFIG.bridge.initialLives;
  public livesB: number = GAMES_CONFIG.bridge.initialLives;
  public passesRemainingA: number = 1;
  public passesRemainingB: number = 1;
  public revealedSteps: Record<number, BridgeTileChoice> = {};
  public lastOutcome?: GlassBridgeState['lastOutcome'];

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'bridge', onSettled);
  }

  private getSafeChoice(stepIndex: number): BridgeTileChoice {
    while (this.safePath.length <= stepIndex) {
      this.safePath.push(Math.random() > 0.5 ? 'LEFT' : 'RIGHT');
    }
    return this.safePath[stepIndex];
  }

  public getGamePayload(): GlassBridgeState {
    const activeStep = Math.max(1, Math.max(this.currentStepA, this.currentStepB) + 1);
    return {
      currentStepA: this.currentStepA,
      currentStepB: this.currentStepB,
      activeStep,
      currentTurn: this.currentTurn,
      livesA: this.livesA,
      livesB: this.livesB,
      passesRemainingA: this.passesRemainingA,
      passesRemainingB: this.passesRemainingB,
      revealedSteps: this.revealedSteps,
      lastOutcome: this.lastOutcome,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.safePath = [];
    this.currentStepA = 0;
    this.currentStepB = 0;
    this.livesA = GAMES_CONFIG.bridge.initialLives;
    this.livesB = GAMES_CONFIG.bridge.initialLives;
    this.passesRemainingA = 1;
    this.passesRemainingB = 1;
    this.revealedSteps = {};
    this.currentTurn = 'A';
    this.lastOutcome = undefined;

    this.broadcast({
      type: 'BRIDGE_START',
      message: `The Endless Glass Bridge looms over the abyss! ${this.playerA.username} has the first leap!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    this.turnTimeout = setTimeout(() => {
      console.log(`[GlassBridge] Match #${this.matchId}: Player ${this.currentTurn} timed out. Auto-step LEFT.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.handleBridgeStep(activeWallet, 'LEFT');
    }, GAMES_CONFIG.bridge.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (data.type === 'BRIDGE_STEP' && (data.choice === 'LEFT' || data.choice === 'RIGHT')) {
      this.handleBridgeStep(wallet, data.choice);
    } else if (data.type === 'BRIDGE_PASS') {
      this.handleBridgePass(wallet);
    }
  }

  public handleBridgePass(wallet: string) {
    if (this.state !== 'GAME_ACTIVE') return;
    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side || side !== this.currentTurn) return;

    const passesLeft = side === 'A' ? this.passesRemainingA : this.passesRemainingB;
    if (passesLeft <= 0) {
      console.warn(`[GlassBridge] Player ${side} attempted to PASS but 0 passes remaining.`);
      const playerWs = side === 'A' ? this.playerA.ws : this.playerB?.ws;
      if (playerWs) {
        this.sendTo(playerWs, {
          type: 'ERROR',
          message: 'Pass limit reached! You can only pass the lead once per match.',
        });
      }
      return;
    }

    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    // Deduct pass
    if (side === 'A') {
      this.passesRemainingA = 0;
    } else {
      this.passesRemainingB = 0;
    }

    const currentStep = side === 'A' ? this.currentStepA : this.currentStepB;
    const playerName = side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentSide = side === 'A' ? 'B' : 'A';

    // Synchronize opponent up to the current safe step
    if (opponentSide === 'A') {
      this.currentStepA = Math.max(this.currentStepA, currentStep);
    } else {
      this.currentStepB = Math.max(this.currentStepB, currentStep);
    }

    this.currentTurn = opponentSide;
    const opponentName = opponentSide === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.lastOutcome = {
      player: side,
      step: currentStep,
      choice: 'LEFT',
      result: 'SAFE',
      livesRemaining: side === 'A' ? this.livesA : this.livesB,
      message: `✋ ${playerName} used their 1 PASS at Step #${currentStep}! ${opponentName} must now take the next leap.`,
    };

    this.broadcast({
      type: 'BRIDGE_UPDATE',
      lastOutcome: this.lastOutcome,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();
    this.startTurnTimer();
  }

  public handleBridgeStep(wallet: string, choice: BridgeTileChoice) {
    if (this.state !== 'GAME_ACTIVE') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side || side !== this.currentTurn) {
      console.warn(`[GlassBridge] Action from ${wallet} ignored: not active turn (${this.currentTurn}).`);
      return;
    }

    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    const currentStep = side === 'A' ? this.currentStepA : this.currentStepB;
    const targetStep = currentStep + 1; // 1, 2, 3 ...
    const targetStepIndex = targetStep - 1;

    const playerName = side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentSide = side === 'A' ? 'B' : 'A';
    const opponentWallet = side === 'A' ? (this.playerB?.walletAddress || '') : this.playerA.walletAddress;

    const correctChoice = this.getSafeChoice(targetStepIndex);
    const isSafe = choice === correctChoice;

    if (isSafe) {
      // Safe tempered glass!
      this.revealedSteps[targetStep] = correctChoice;
      if (side === 'A') this.currentStepA = targetStep; else this.currentStepB = targetStep;

      this.lastOutcome = {
        player: side,
        step: targetStep,
        choice,
        result: 'SAFE',
        livesRemaining: side === 'A' ? this.livesA : this.livesB,
        message: `🟩 SAFE! ${playerName} stepped on ${choice} glass at Step #${targetStep} and it held! Keep leaping or pass turn?`,
      };

      this.broadcast({
        type: 'BRIDGE_UPDATE',
        lastOutcome: this.lastOutcome,
        gameData: this.getGamePayload(),
      });
      this.broadcastRoomState();
      this.startTurnTimer();
    } else {
      // Fragile glass shatters!
      this.revealedSteps[targetStep] = correctChoice; // The OTHER tile was safe!

      if (side === 'A') {
        this.livesA -= 1;
      } else {
        this.livesB -= 1;
      }

      const livesLeft = side === 'A' ? this.livesA : this.livesB;

      if (livesLeft <= 0) {
        // Out of lives! Opponent wins immediately!
        this.lastOutcome = {
          player: side,
          step: targetStep,
          choice,
          result: 'SHATTER',
          livesRemaining: 0,
          message: `💥 SHATTER! Glass broke at Step #${targetStep}! ${playerName} fell into the abyss with no lives remaining!`,
        };
        this.broadcast({
          type: 'BRIDGE_UPDATE',
          lastOutcome: this.lastOutcome,
          gameData: this.getGamePayload(),
        });
        this.settleMatch(opponentWallet);
        return;
      }

      // Lost 1 life, respawns and turn passes to opponent
      this.lastOutcome = {
        player: side,
        step: targetStep,
        choice,
        result: 'SHATTER',
        livesRemaining: livesLeft,
        message: `💥 CRASH! The ${choice} glass shattered! ${playerName} lost 1 life (${livesLeft} left). Turn passes to opponent.`,
      };

      // Opponent automatically moves up to the known safe step
      if (opponentSide === 'A') {
        this.currentStepA = Math.max(this.currentStepA, targetStep);
      } else {
        this.currentStepB = Math.max(this.currentStepB, targetStep);
      }

      this.currentTurn = opponentSide;

      this.broadcast({
        type: 'BRIDGE_UPDATE',
        lastOutcome: this.lastOutcome,
        gameData: this.getGamePayload(),
      });
      this.broadcastRoomState();
      this.startTurnTimer();
    }
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }
}
