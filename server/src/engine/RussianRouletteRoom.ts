import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { RouletteState, RouletteTarget } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

export class RussianRouletteRoom extends BaseGameRoom {
  public chambersRemaining: number = GAMES_CONFIG.roulette.totalChambers;
  public totalChambers: number = GAMES_CONFIG.roulette.totalChambers;
  public currentTurn: 'A' | 'B' = 'A';
  public offensiveShotsA: number = 1;
  public offensiveShotsB: number = 1;
  public lastOutcome?: RouletteState['lastOutcome'];

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'roulette', onSettled);
  }

  public getGamePayload(): RouletteState {
    const lethalOdds = Math.round((1 / Math.max(1, this.chambersRemaining)) * 100);
    return {
      chambersRemaining: this.chambersRemaining,
      totalChambers: this.totalChambers,
      currentTurn: this.currentTurn,
      offensiveShotsA: this.offensiveShotsA,
      offensiveShotsB: this.offensiveShotsB,
      lethalOddsPercent: lethalOdds,
      lastOutcome: this.lastOutcome,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.chambersRemaining = this.totalChambers;
    this.offensiveShotsA = 1;
    this.offensiveShotsB = 1;
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
      console.log(`[RussianRoulette] Match #${this.matchId}: Player ${this.currentTurn} turn timed out. Auto-shooting self.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.handleRouletteShoot(activeWallet, 'self');
    }, GAMES_CONFIG.roulette.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (data.type === 'ROULETTE_SHOOT') {
      const target: RouletteTarget = data.target === 'opponent' ? 'opponent' : 'self';
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
    const shooterWallet = side === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');

    // Check offensive shot limits
    if (target === 'opponent') {
      const shotsAvailable = shooter === 'A' ? this.offensiveShotsA : this.offensiveShotsB;
      if (shotsAvailable <= 0) {
        console.warn(`[RussianRoulette] ${shooterName} attempted SHOOT OPPONENT but offensive shot was already used.`);
        const shooterWs = shooter === 'A' ? this.playerA.ws : this.playerB?.ws;
        if (shooterWs) {
          this.sendTo(shooterWs, {
            type: 'ERROR',
            message: 'Offensive shot already used! You can only shoot yourself.',
          });
        }
        this.startTurnTimer();
        return;
      }
      // Consume offensive shot
      if (shooter === 'A') {
        this.offensiveShotsA = 0;
      } else {
        this.offensiveShotsB = 0;
      }
    }

    // Roll chamber: random from 1 to chambersRemaining. If roll == 1, it's the live bullet!
    const isBullet = Math.floor(Math.random() * this.chambersRemaining) + 1 === 1;

    if (target === 'self') {
      if (isBullet) {
        // Fatal shot on self! Opponent wins
        this.lastOutcome = {
          shooter,
          target,
          result: 'BANG',
          message: `💥 BANG! ${shooterName} pulled the trigger on themselves and fired the live bullet! Fatal hit!`,
        };
        this.broadcastOutcome();
        this.settleMatch(opponentWallet);
        return;
      } else {
        // Blank on self! Survived!
        this.chambersRemaining = Math.max(1, this.chambersRemaining - 1);
        this.currentTurn = opponentSide;

        this.lastOutcome = {
          shooter,
          target,
          result: 'BLANK',
          message: `🔒 CLICK! ${shooterName} risked shooting themselves and SURVIVED! Cylinder odds increase!`,
        };
        this.broadcastOutcome();
        this.startTurnTimer();
      }
    } else {
      // Shoot opponent
      if (isBullet) {
        // Fatal shot on opponent! Shooter wins
        this.lastOutcome = {
          shooter,
          target,
          result: 'BANG',
          message: `💥 BANG! ${shooterName} fired the live bullet directly at ${opponentName}! Fatal hit!`,
        };
        this.broadcastOutcome();
        this.settleMatch(shooterWallet);
        return;
      } else {
        // Blank on opponent!
        this.chambersRemaining = Math.max(1, this.chambersRemaining - 1);
        this.currentTurn = opponentSide;

        this.lastOutcome = {
          shooter,
          target,
          result: 'BLANK',
          message: `💨 CLICK! ${shooterName} aimed at ${opponentName} and fired... Empty chamber! Offensive shot exhausted!`,
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
