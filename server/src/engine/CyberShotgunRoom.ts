import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { CyberShotgunState, ShotgunItem, ShellType, ShotgunTarget } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const AVAILABLE_ITEMS: ShotgunItem[] = ['saw', 'ejector', 'handcuffs', 'inverter'];

function getRandomItem(): ShotgunItem {
  return AVAILABLE_ITEMS[Math.floor(Math.random() * AVAILABLE_ITEMS.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class CyberShotgunRoom extends BaseGameRoom {
  public hpA: number = GAMES_CONFIG.shotgun.initialHp;
  public hpB: number = GAMES_CONFIG.shotgun.initialHp;
  public readonly maxHp: number = GAMES_CONFIG.shotgun.initialHp;

  public currentTurn: 'A' | 'B' = 'A';
  public shells: ShellType[] = [];
  public isSawActive: boolean = false;
  public isHandcuffedA: boolean = false;
  public isHandcuffedB: boolean = false;

  public itemsA: ShotgunItem[] = [];
  public itemsB: ShotgunItem[] = [];

  public lastAction?: CyberShotgunState['lastAction'];
  public mancheNumber: number = 0;

  private turnTimeout?: NodeJS.Timeout;

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'shotgun', onSettled);
  }

  public getGamePayload(): CyberShotgunState {
    const liveCount = this.shells.filter((s) => s === 'LIVE').length;
    const blankCount = this.shells.filter((s) => s === 'BLANK').length;

    return {
      hpA: this.hpA,
      hpB: this.hpB,
      maxHp: this.maxHp,
      currentTurn: this.currentTurn,
      liveCount,
      blankCount,
      totalShellsRemaining: this.shells.length,
      isSawActive: this.isSawActive,
      isHandcuffedA: this.isHandcuffedA,
      isHandcuffedB: this.isHandcuffedB,
      itemsA: [...this.itemsA],
      itemsB: [...this.itemsB],
      lastAction: this.lastAction,
      mancheNumber: this.mancheNumber,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.hpA = this.maxHp;
    this.hpB = this.maxHp;
    this.isSawActive = false;
    this.isHandcuffedA = false;
    this.isHandcuffedB = false;
    this.lastAction = undefined;
    this.mancheNumber = 0;

    // Both players start with 2 random tactical items
    this.itemsA = [getRandomItem(), getRandomItem()];
    this.itemsB = [getRandomItem(), getRandomItem()];

    // Random coin toss for first turn
    this.currentTurn = Math.random() < 0.5 ? 'A' : 'B';

    // Load initial magazine
    this.loadNewMagazine();

    const activePlayerName = this.currentTurn === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');
    const live = this.shells.filter((s) => s === 'LIVE').length;
    const blank = this.shells.filter((s) => s === 'BLANK').length;

    this.broadcast({
      type: 'SHOTGUN_START',
      message: `⚡ Cyber Shotgun Loaded: ${live} Live, ${blank} Blank! ${activePlayerName} takes the first shot!`,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  private loadNewMagazine() {
    this.mancheNumber += 1;
    this.isSawActive = false;

    // Generate balanced shell pool (between 3 and 5 shells)
    // Manche 1: 3 shells (e.g. 2 live 1 blank or 1 live 2 blank)
    // Later manches: 4-6 shells
    let liveCount = 1;
    let blankCount = 1;

    if (this.mancheNumber === 1) {
      if (Math.random() < 0.5) {
        liveCount = 2;
        blankCount = 1;
      } else {
        liveCount = 1;
        blankCount = 2;
      }
    } else {
      const total = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      liveCount = Math.floor(Math.random() * (total - 1)) + 1;
      blankCount = total - liveCount;
    }

    const pool: ShellType[] = [];
    for (let i = 0; i < liveCount; i++) pool.push('LIVE');
    for (let i = 0; i < blankCount; i++) pool.push('BLANK');

    this.shells = shuffleArray(pool);

    // Give players 1 additional item if inventory not full (max 4)
    if (this.mancheNumber > 1) {
      if (this.itemsA.length < 4) this.itemsA.push(getRandomItem());
      if (this.itemsB.length < 4) this.itemsB.push(getRandomItem());
    }
  }

  private startTurnTimer() {
    if (this.turnTimeout) clearTimeout(this.turnTimeout);

    this.turnTimeout = setTimeout(() => {
      console.log(`[CyberShotgun] Match #${this.matchId}: Player ${this.currentTurn} timed out. Auto-shooting opponent.`);
      const activeWallet = this.currentTurn === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.handleShoot(activeWallet, 'opponent');
    }, GAMES_CONFIG.shotgun.turnTimeoutSeconds * 1000);
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE') return;

    if (data.type === 'SHOTGUN_SHOOT') {
      const target: ShotgunTarget = data.target === 'self' ? 'self' : 'opponent';
      this.handleShoot(wallet, target);
    } else if (data.type === 'SHOTGUN_USE_ITEM') {
      const item: ShotgunItem = data.item;
      this.handleUseItem(wallet, item);
    }
  }

  public handleUseItem(wallet: string, item: ShotgunItem) {
    if (this.state !== 'GAME_ACTIVE') return;

    const isA = wallet.toLowerCase() === this.playerA.walletAddress.toLowerCase();
    const isB = this.playerB && wallet.toLowerCase() === this.playerB.walletAddress.toLowerCase();

    if (!isA && !isB) return;
    const actorSide = isA ? 'A' : 'B';

    if (this.currentTurn !== actorSide) {
      this.sendError(wallet, 'Not your turn!');
      return;
    }

    const items = isA ? this.itemsA : this.itemsB;
    const itemIndex = items.indexOf(item);
    if (itemIndex === -1) {
      this.sendError(wallet, `You do not have a ${item}!`);
      return;
    }

    // Consume item
    items.splice(itemIndex, 1);
    const playerName = isA ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentName = isA ? (this.playerB?.username || 'Player B') : this.playerA.username;

    let resultMsg = '';
    let resultType: 'BANG' | 'BLANK' | 'EJECTED' | 'CONVERTED' | 'HANDCUFFED' | 'SAWED' = 'SAWED';

    switch (item) {
      case 'saw':
        this.isSawActive = true;
        resultType = 'SAWED';
        resultMsg = `🪚 ${playerName} used the SAW! Barrel sawed off—the next shot deals 2X DAMAGE!`;
        break;

      case 'ejector':
        if (this.shells.length === 0) {
          this.loadNewMagazine();
        }
        const ejected = this.shells.shift();
        resultType = 'EJECTED';
        resultMsg = `🍺 ${playerName} used the EJECTOR! Racked slide: ejected a ${ejected} shell without firing!`;
        this.lastAction = {
          player: actorSide,
          type: 'USE_ITEM',
          item: 'ejector',
          result: 'EJECTED',
          ejectedShell: ejected,
          message: resultMsg,
        };

        // If magazine emptied by ejection, reload immediately
        if (this.shells.length === 0) {
          this.loadNewMagazine();
          const l = this.shells.filter((s) => s === 'LIVE').length;
          const b = this.shells.filter((s) => s === 'BLANK').length;
          resultMsg += ` Reloaded: ${l} Live, ${b} Blank.`;
        }
        break;

      case 'handcuffs':
        if (isA) {
          this.isHandcuffedB = true;
        } else {
          this.isHandcuffedA = true;
        }
        resultType = 'HANDCUFFED';
        resultMsg = `🔗 ${playerName} HANDCUFFED ${opponentName}! Their next turn will be skipped.`;
        break;

      case 'inverter':
        if (this.shells.length === 0) {
          this.loadNewMagazine();
        }
        const currentTop = this.shells[0];
        const newTop: ShellType = currentTop === 'LIVE' ? 'BLANK' : 'LIVE';
        this.shells[0] = newTop;
        resultType = 'CONVERTED';
        resultMsg = `🔄 ${playerName} used the INVERTER! Chambered shell converted from ${currentTop} to ${newTop}!`;
        break;
    }

    if (item !== 'ejector') {
      this.lastAction = {
        player: actorSide,
        type: 'USE_ITEM',
        item,
        result: resultType,
        message: resultMsg,
      };
    }

    this.broadcast({
      type: 'SHOTGUN_ITEM_USED',
      message: resultMsg,
      gameData: this.getGamePayload(),
    });

    // Reset turn timer for remainder of turn
    this.startTurnTimer();
    this.broadcastRoomState();
  }

  public handleShoot(wallet: string, target: ShotgunTarget) {
    if (this.state !== 'GAME_ACTIVE') return;

    const isA = wallet.toLowerCase() === this.playerA.walletAddress.toLowerCase();
    const isB = this.playerB && wallet.toLowerCase() === this.playerB.walletAddress.toLowerCase();

    if (!isA && !isB) return;
    const actorSide = isA ? 'A' : 'B';

    if (this.currentTurn !== actorSide) {
      this.sendError(wallet, 'Not your turn!');
      return;
    }

    // Ensure magazine has shells
    if (this.shells.length === 0) {
      this.loadNewMagazine();
    }

    const shell = this.shells.shift()!;
    const damage = this.isSawActive ? 2 : 1;
    this.isSawActive = false; // Saw is consumed on fire

    const playerName = isA ? this.playerA.username : (this.playerB?.username || 'Player B');
    const opponentName = isA ? (this.playerB?.username || 'Player B') : this.playerA.username;

    let message = '';
    let result: 'BANG' | 'BLANK' = 'BLANK';
    let extraTurn = false;

    if (target === 'opponent') {
      if (shell === 'LIVE') {
        result = 'BANG';
        if (isA) {
          this.hpB = Math.max(0, this.hpB - damage);
        } else {
          this.hpA = Math.max(0, this.hpA - damage);
        }
        message = `💥 BANG! ${playerName} fired a LIVE shell at ${opponentName} for -${damage} HP!`;
      } else {
        result = 'BLANK';
        message = `💨 CLICK! ${playerName} fired a BLANK shell at ${opponentName}. No damage!`;
      }
    } else {
      // Shot self
      if (shell === 'BLANK') {
        result = 'BLANK';
        extraTurn = true;
        message = `💨 CLICK! ${playerName} shot themselves with a BLANK and survives! EXTRA TURN GAINED!`;
      } else {
        result = 'BANG';
        if (isA) {
          this.hpA = Math.max(0, this.hpA - damage);
        } else {
          this.hpB = Math.max(0, this.hpB - damage);
        }
        message = `💥 BANG! ${playerName} shot themselves with a LIVE shell for -${damage} HP!`;
      }
    }

    this.lastAction = {
      player: actorSide,
      type: 'SHOOT',
      target,
      result,
      damage: result === 'BANG' ? damage : 0,
      extraTurn,
      message,
    };

    // Check for match elimination
    if (this.hpA <= 0 || this.hpB <= 0) {
      if (this.turnTimeout) clearTimeout(this.turnTimeout);

      const winnerSide = this.hpA > 0 ? 'A' : 'B';
      const winnerWallet = winnerSide === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      const winnerName = winnerSide === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B');

      this.broadcast({
        type: 'SHOTGUN_OUTCOME',
        message,
        gameData: this.getGamePayload(),
      });

      setTimeout(() => {
        this.settleMatch(winnerWallet);
      }, 1000);
      return;
    }

    // Determine next turn
    if (extraTurn) {
      // Keeps same turn
    } else {
      // Check handcuffs
      const nextSide = actorSide === 'A' ? 'B' : 'A';
      const isNextHandcuffed = nextSide === 'A' ? this.isHandcuffedA : this.isHandcuffedB;

      if (isNextHandcuffed) {
        if (nextSide === 'A') this.isHandcuffedA = false;
        else this.isHandcuffedB = false;

        message += ` 🔗 ${nextSide === 'A' ? this.playerA.username : (this.playerB?.username || 'Player B')} was handcuffed! Turn returns to ${playerName}!`;
        // Turn remains with actorSide
      } else {
        this.currentTurn = nextSide;
      }
    }

    // If shells empty and players alive, reload magazine
    if (this.shells.length === 0) {
      this.loadNewMagazine();
      const l = this.shells.filter((s) => s === 'LIVE').length;
      const b = this.shells.filter((s) => s === 'BLANK').length;
      message += ` 🔄 Magazine empty! New reload: ${l} Live, ${b} Blank.`;
    }

    this.broadcast({
      type: 'SHOTGUN_OUTCOME',
      message,
      gameData: this.getGamePayload(),
    });

    this.startTurnTimer();
    this.broadcastRoomState();
  }

  public cleanupGameTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = undefined;
    }
  }

  public override resetForRematch() {
    this.cleanupGameTimers();
    this.hpA = this.maxHp;
    this.hpB = this.maxHp;
    this.isSawActive = false;
    this.isHandcuffedA = false;
    this.isHandcuffedB = false;
    this.lastAction = undefined;
    this.mancheNumber = 0;
    this.itemsA = [getRandomItem(), getRandomItem()];
    this.itemsB = [getRandomItem(), getRandomItem()];
    this.currentTurn = Math.random() < 0.5 ? 'A' : 'B';
    this.loadNewMagazine();
  }
}
