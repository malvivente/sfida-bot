import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { RouletteState, RouletteTarget } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

export class RussianRouletteRoom extends BaseGameRoom {
  public chambersRemaining: number = GAMES_CONFIG.roulette.totalChambers;
  public totalChambers: number = GAMES_CONFIG.roulette.totalChambers;
  public currentTurn: 'A' | 'B' = 'A';
  public shieldA: boolean = false;
  public shieldB: boolean = false;
  public lastOutcome?: RouletteState['lastOutcome'];

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'roulette', onSettled);
  }

  public getGamePayload(): RouletteState {
    const lethalOdds = Math.round((1 / this.chambersRemaining) * 100);
    return {
      chambersRemaining: this.chambersRemaining,
      totalChambers: this.totalChambers,
      currentTurn: this.currentTurn,
      shieldA: this.shieldA,
      shieldB: this.shieldB,
      lethalOddsPercent: lethalOdds,
      lastOutcome: this.lastOutcome,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.chambersRemaining = this.totalChambers;
    this.shieldA = false;
    this.shieldB = false;
    this.lastOutcome = undefined;

    // First turn assigned randomly (or Player A)
    this.currentTurn = Math.random() > 0.5 ? 'A' : 'B';
    const activePlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

    this.broadcast({
      type: 'ROULETTE_START',
      message: `The 8-chamber cylinder spins! 1 live bullet loaded. ${activePlayerName} has the first turn!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    this.turnTimeout = setTimeout(() => {
      // Auto-shoot opponent if turn times out
      console.log(`[RussianRoulette] Match #${this.matchId}: Player ${this.currentTurn} turn timed out. Auto-shooting opponent.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.handleRouletteShoot(activeWallet, 'opponent');
    }, GAMES_CONFIG.roulette.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (data.type === 'ROULETTE_SHOOT') {
      const target: RouletteTarget = data.target === 'self' ? 'self' : 'opponent';
      this.handleRouletteShoot(wallet, target);
    }
  }

  public handleRouletteShoot(wallet: string, target: RouletteTarget) {
    if (this.state !== 'GAME_ACTIVE') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress) ? 'A' : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);
    if (!side || side !== this.currentTurn) {
      console.warn(`[RussianRoulette] Shoot attempted by ${wallet} but not their turn (${this.currentTurn}).`);
      return;
    }

    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }

    const shooter = side;
    const opponentSide = side === 'A' ? 'B' : 'A';
    const shooterName = side === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentName = side === 'A' ? (this.playerB?.username || 'Player B') : this.playerA.username;
    const opponentWallet = side === 'A' ? (this.playerB?.walletAddress || '') : this.playerA.walletAddress;

    // Roll chamber: random from 1 to chambersRemaining. If roll == 1, it's the live bullet!
    const isBullet = Math.floor(Math.random() * this.chambersRemaining) + 1 === 1;

    if (target === 'self') {
      if (isBullet) {
        // Live bullet shot at oneself!
        const hasShield = shooter === 'A' ? this.shieldA : this.shieldB;
        if (hasShield) {
          // Shield absorbs!
          if (shooter === 'A') this.shieldA = false; else this.shieldB = false;
          this.chambersRemaining = this.totalChambers; // Reload cylinder
          this.currentTurn = opponentSide;

          this.lastOutcome = {
            shooter,
            target,
            result: 'BANG',
            shieldAbsorbed: true,
            message: `💥 BANG! ${shooterName} shot themselves with the live bullet, but their SHIELD absorbed the fatal blow! Cylinder reloaded.`,
          };
          this.broadcastOutcome();
          this.startTurnTimer();
        } else {
          // Fatal! Opponent wins
          this.lastOutcome = {
            shooter,
            target,
            result: 'BANG',
            shieldAbsorbed: false,
            message: `💥 BANG! ${shooterName} pulled the trigger on themselves and fired the live bullet! Fatal shot!`,
          };
          this.broadcastOutcome();
          this.settleMatch(opponentWallet);
          return;
        }
      } else {
        // Blank! Survival reward: Shield gained + turn passes
        if (shooter === 'A') this.shieldA = true; else this.shieldB = true;
        this.chambersRemaining -= 1;
        this.currentTurn = opponentSide;

        this.lastOutcome = {
          shooter,
          target,
          result: 'BLANK',
          shieldAbsorbed: false,
          message: `🔒 CLICK! ${shooterName} risked shooting themselves and SURVIVED! Gained +1 Shield defense.`,
        };
        this.broadcastOutcome();
        this.startTurnTimer();
      }
    } else {
      // Shoot opponent
      if (isBullet) {
        const opponentHasShield = opponentSide === 'A' ? this.shieldA : this.shieldB;
        if (opponentHasShield) {
          // Opponent shield breaks!
          if (opponentSide === 'A') this.shieldA = false; else this.shieldB = false;
          this.chambersRemaining = this.totalChambers;
          this.currentTurn = opponentSide;

          this.lastOutcome = {
            shooter,
            target,
            result: 'BANG',
            shieldAbsorbed: true,
            message: `💥 BANG! ${shooterName} shot ${opponentName}, but ${opponentName}'s SHIELD absorbed the shot! Cylinder reloaded.`,
          };
          this.broadcastOutcome();
          this.startTurnTimer();
        } else {
          // Fatal! Shooter wins
          this.lastOutcome = {
            shooter,
            target,
            result: 'BANG',
            shieldAbsorbed: false,
            message: `💥 BANG! ${shooterName} fired the live bullet directly at ${opponentName}! Fatal hit!`,
          };
          this.broadcastOutcome();
          const shooterWallet = shooter === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
          this.settleMatch(shooterWallet);
          return;
        }
      } else {
        // Blank on opponent!
        this.chambersRemaining -= 1;
        this.currentTurn = opponentSide;

        this.lastOutcome = {
          shooter,
          target,
          result: 'BLANK',
          shieldAbsorbed: false,
          message: `💨 CLICK! ${shooterName} aimed at ${opponentName} and fired... Empty chamber! Odds increase for the next shot!`,
        };
        this.broadcastOutcome();
        this.startTurnTimer();
      }
    }
  }

  private broadcastOutcome() {
    this.broadcast({
      type: 'ROULETTE_RESULT',
      lastOutcome: this.lastOutcome,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }
}
