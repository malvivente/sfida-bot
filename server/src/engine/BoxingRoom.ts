import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { BoxingState, BoxerState, BoxingHitEvent, CoinTossData } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const ARENA_W = 800;
const RING_MIN_X = 140;
const RING_MAX_X = 660;
const MIN_BOXER_DIST = 55;
const MOVE_SPEED = 6.4;

const TICK_RATE_HZ = 30;
const TICK_MS = Math.round(1000 / TICK_RATE_HZ); // 33ms

interface PlayerInput {
  left: boolean;
  right: boolean;
  block: boolean;
  jabBufferTicks: number;
  hookBufferTicks: number;
  dodgeBufferTicks: number;
  superBufferTicks: number;
}

export class BoxingRoom extends BaseGameRoom {
  public phase: BoxingState['phase'] = 'COUNTDOWN';
  public timeRemainingMs: number = 60 * 1000;
  public round: number = 1;
  public countdownSec: number = 3;
  public lastHitEvent?: BoxingHitEvent;
  public coinToss?: CoinTossData;

  public boxerA: BoxerState;
  public boxerB: BoxerState;

  private inputA: PlayerInput = {
    left: false,
    right: false,
    block: false,
    jabBufferTicks: 0,
    hookBufferTicks: 0,
    dodgeBufferTicks: 0,
    superBufferTicks: 0,
  };

  private inputB: PlayerInput = {
    left: false,
    right: false,
    block: false,
    jabBufferTicks: 0,
    hookBufferTicks: 0,
    dodgeBufferTicks: 0,
    superBufferTicks: 0,
  };

  private loopInterval?: NodeJS.Timeout;
  private countdownTimer?: NodeJS.Timeout;
  private knockoutTimer?: NodeJS.Timeout;
  private lastTickEpoch: number = Date.now();

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'boxing', onSettled);
    this.boxerA = this.createInitialBoxer('A', config.playerAAddress);
    this.boxerB = this.createInitialBoxer('B', config.playerBAddress || '');
  }

  private createInitialBoxer(side: 'A' | 'B', _wallet: string): BoxerState {
    const isA = side === 'A';
    return {
      side,
      name: isA ? this.playerA.username : (this.playerB?.username || 'Boxer B'),
      x: isA ? 260 : 540,
      hp: 100,
      stamina: 100,
      superMeter: 0,
      state: 'IDLE',
      stateTicks: 0,
      isGuarding: false,
      isDodging: false,
      isCounterVulnerable: false,
      consecutiveHits: 0,
      score: 0,
    };
  }

  public getGamePayload(): BoxingState {
    return {
      phase: this.phase,
      timeRemainingMs: Math.max(0, Math.round(this.timeRemainingMs)),
      round: this.round,
      boxerA: this.boxerA,
      boxerB: this.boxerB,
      countdownSec: this.countdownSec,
      lastHitEvent: this.lastHitEvent,
      coinToss: this.coinToss,
    };
  }

  public onGameStart() {
    this.state = 'GAME_ACTIVE';
    this.phase = 'COUNTDOWN';
    this.countdownSec = 3;
    this.timeRemainingMs = 60 * 1000;
    this.round = 1;
    this.lastHitEvent = undefined;

    this.boxerA = this.createInitialBoxer('A', this.playerA.walletAddress);
    this.boxerB = this.createInitialBoxer('B', this.playerB?.walletAddress || '');

    this.coinToss = {
      playerASide: 'HEADS',
      playerBSide: 'TAILS',
      winningFace: 'HEADS',
      starterSide: 'A',
      starterName: this.playerA.username,
      timestamp: Date.now(),
    };

    this.broadcast({
      type: 'BOXING_START',
      message: `Boxing started! Round 1!`,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    this.startPreMatchCountdown();
    this.startPhysicsLoop();
  }

  private startPreMatchCountdown() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.countdownSec -= 1;
      if (this.countdownSec <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = undefined;
        this.phase = 'FIGHTING';
      }
      this.broadcastRoomState();
    }, 1000);
  }

  private startPhysicsLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);
    this.lastTickEpoch = Date.now();

    this.loopInterval = setInterval(() => {
      if (this.state !== 'GAME_ACTIVE') {
        this.cleanupGameTimers();
        return;
      }

      if (this.phase === 'FIGHTING') {
        this.stepCombat();
      }

      if (this.state !== 'GAME_ACTIVE') {
        this.cleanupGameTimers();
        return;
      }

      this.broadcast({
        type: 'BOXING_TICK',
        gameData: this.getGamePayload(),
      });

      // Clear one-shot hit event
      if (this.lastHitEvent) {
        this.lastHitEvent = undefined;
      }
    }, TICK_MS);
  }

  private stepCombat() {
    const now = Date.now();
    const dtMs = Math.min(100, Math.max(10, now - this.lastTickEpoch));
    this.lastTickEpoch = now;

    // Decrement round timer
    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - dtMs);

    // Update boxers
    this.updateBoxer(this.boxerA, this.inputA, this.boxerB);
    this.updateBoxer(this.boxerB, this.inputB, this.boxerA);

    // Constrain distance between boxers so they never cross or overlap inside MIN_BOXER_DIST
    if (this.boxerA.x + MIN_BOXER_DIST > this.boxerB.x) {
      const mid = (this.boxerA.x + this.boxerB.x) / 2;
      this.boxerA.x = mid - MIN_BOXER_DIST / 2;
      this.boxerB.x = mid + MIN_BOXER_DIST / 2;
    }

    // Check round timer expiration
    if (this.timeRemainingMs <= 0) {
      this.onTimerExpired();
    }
  }

  private updateBoxer(b: BoxerState, inp: PlayerInput, opponent: BoxerState) {
    // Passive stamina recovery
    if (b.state === 'IDLE' || b.state === 'MOVE') {
      b.stamina = Math.min(100, b.stamina + 0.6); // ~18 stamina/s
    } else if (b.state === 'BLOCK') {
      b.stamina = Math.min(100, b.stamina + 0.15);
    }

    // Passive super meter charge (+2%/s)
    b.superMeter = Math.min(100, b.superMeter + 0.07);

    // Decrement input buffers
    if (inp.jabBufferTicks > 0) inp.jabBufferTicks--;
    if (inp.hookBufferTicks > 0) inp.hookBufferTicks--;
    if (inp.dodgeBufferTicks > 0) inp.dodgeBufferTicks--;
    if (inp.superBufferTicks > 0) inp.superBufferTicks--;

    // Decrement state ticks
    if (b.stateTicks > 0) {
      b.stateTicks--;
      // Resolve action at exact hit frame
      this.processActionHitFrame(b, opponent);

      if (b.stateTicks <= 0) {
        b.isDodging = false;
        b.isCounterVulnerable = false;
        if (inp.block && b.stamina >= 8) {
          b.state = 'BLOCK';
          b.isGuarding = true;
        } else {
          b.state = 'IDLE';
          b.isGuarding = false;
        }
      }
      return; // Boxer locked in current animation
    }

    // Process buffered or active inputs
    // 1. Super KO Uppercut
    if (inp.superBufferTicks > 0 && b.superMeter >= 100) {
      inp.superBufferTicks = 0;
      b.superMeter = 0;
      b.state = 'UPPERCUT';
      b.stateTicks = 14;
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 2. Dodge / Weave
    if (inp.dodgeBufferTicks > 0 && b.stamina >= 15) {
      inp.dodgeBufferTicks = 0;
      b.stamina = Math.max(0, b.stamina - 15);
      b.state = 'DODGE';
      b.stateTicks = 8;
      b.isDodging = true;
      b.isGuarding = false;

      // Counter window on opponent if dodging during their punch windup
      if (opponent.state === 'JAB' || opponent.state === 'HOOK' || opponent.state === 'UPPERCUT') {
        opponent.isCounterVulnerable = true;
      }
      return;
    }

    // 3. Hook (Heavy body blow)
    if (inp.hookBufferTicks > 0 && b.stamina >= 18) {
      inp.hookBufferTicks = 0;
      b.stamina = Math.max(0, b.stamina - 18);
      b.state = 'HOOK';
      b.stateTicks = 9;
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 4. Jab (Fast head strike)
    if (inp.jabBufferTicks > 0 && b.stamina >= 8) {
      inp.jabBufferTicks = 0;
      b.stamina = Math.max(0, b.stamina - 8);
      b.state = 'JAB';
      b.stateTicks = 5;
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 5. Block / Guard
    if (inp.block && b.stamina >= 8) {
      b.state = 'BLOCK';
      b.isGuarding = true;
      b.isDodging = false;
      return;
    } else {
      b.isGuarding = false;
    }

    // 6. Movement
    let moveDir = 0;
    if (inp.left) moveDir -= 1;
    if (inp.right) moveDir += 1;

    if (moveDir !== 0) {
      b.state = 'MOVE';
      b.x += moveDir * MOVE_SPEED;
      if (b.x < RING_MIN_X) b.x = RING_MIN_X;
      if (b.x > RING_MAX_X) b.x = RING_MAX_X;
    } else {
      b.state = 'IDLE';
    }
  }

  private processActionHitFrame(attacker: BoxerState, defender: BoxerState) {
    const dist = Math.abs(defender.x - attacker.x);

    // Hit frames:
    // JAB hits on tick 2 (stateTicks === 3)
    // HOOK hits on tick 4 (stateTicks === 5)
    // UPPERCUT hits on tick 7 (stateTicks === 7)
    const isJabHitFrame = attacker.state === 'JAB' && attacker.stateTicks === 3;
    const isHookHitFrame = attacker.state === 'HOOK' && attacker.stateTicks === 5;
    const isUppercutHitFrame = attacker.state === 'UPPERCUT' && attacker.stateTicks === 7;

    if (!isJabHitFrame && !isHookHitFrame && !isUppercutHitFrame) return;

    let range = 82;
    let baseDmg = 9;
    let hitType: BoxingHitEvent['type'] = 'JAB';
    let superGain = 12;

    if (attacker.state === 'HOOK') {
      range = 72;
      baseDmg = 19;
      hitType = 'HOOK';
      superGain = 20;
    } else if (attacker.state === 'UPPERCUT') {
      range = 78;
      baseDmg = 40;
      hitType = 'UPPERCUT';
      superGain = 0;
    }

    if (dist > range) return;
    if (defender.isDodging) return;

    const isCrit = Boolean(defender.isCounterVulnerable);
    if (isCrit) {
      hitType = 'COUNTER';
      baseDmg = Math.round(baseDmg * 1.5);
    }

    const isBlocked = defender.isGuarding && defender.stamina >= 10 && attacker.state !== 'UPPERCUT';
    let finalDmg = baseDmg;

    if (isBlocked) {
      finalDmg = Math.max(2, Math.round(baseDmg * 0.22));
      defender.stamina = Math.max(0, defender.stamina - (baseDmg * 0.7));
    } else {
      defender.state = 'HURT';
      defender.stateTicks = attacker.state === 'UPPERCUT' ? 12 : isCrit ? 8 : 4;
      defender.isGuarding = false;
      defender.isCounterVulnerable = false;

      const pushDir = defender.side === 'B' ? 1 : -1;
      const pushAmount = attacker.state === 'UPPERCUT' ? 32 : isCrit ? 20 : 12;
      defender.x = Math.max(RING_MIN_X, Math.min(RING_MAX_X, defender.x + pushDir * pushAmount));
    }

    defender.hp = Math.max(0, defender.hp - finalDmg);
    attacker.superMeter = Math.min(100, attacker.superMeter + superGain);
    attacker.consecutiveHits += 1;

    this.lastHitEvent = {
      id: `hit_${Date.now()}_${Math.random()}`,
      attacker: attacker.side,
      defender: defender.side,
      type: hitType,
      damage: finalDmg,
      isCrit,
      isBlocked,
      timestamp: Date.now(),
    };

    if (defender.hp <= 0) {
      this.triggerKnockdown(attacker.side, defender.side);
    }
  }

  private triggerKnockdown(winnerSide: 'A' | 'B', loserSide: 'A' | 'B') {
    this.phase = 'KNOCKOUT';
    const loser = loserSide === 'A' ? this.boxerA : this.boxerB;
    loser.state = 'KNOCKED_DOWN';
    loser.stateTicks = 999;

    this.broadcast({
      type: 'BOXING_KNOCKDOWN',
      message: `💥 K.O.! ${winnerSide === 'A' ? this.playerA.username : this.playerB?.username} lands the KO punch!`,
      gameData: this.getGamePayload(),
    });

    if (this.knockoutTimer) clearTimeout(this.knockoutTimer);
    this.knockoutTimer = setTimeout(() => {
      const winnerWallet = winnerSide === 'A' ? this.playerA.walletAddress : (this.playerB?.walletAddress || '');
      this.phase = 'MATCH_OVER';
      this.broadcastRoomState();
      this.settleMatch(winnerWallet);
    }, 2500);
  }

  private onTimerExpired() {
    this.phase = 'MATCH_OVER';
    let winnerWallet = this.playerA.walletAddress;

    if (this.boxerA.hp > this.boxerB.hp) {
      winnerWallet = this.playerA.walletAddress;
    } else if (this.boxerB.hp > this.boxerA.hp && this.playerB) {
      winnerWallet = this.playerB.walletAddress;
    } else {
      winnerWallet = this.boxerA.stamina >= this.boxerB.stamina ? this.playerA.walletAddress : (this.playerB?.walletAddress || this.playerA.walletAddress);
    }

    this.broadcastRoomState();
    this.settleMatch(winnerWallet);
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE' || this.phase !== 'FIGHTING') return;

    const side = this.getPlayerSide(wallet);
    if (side !== 'A' && side !== 'B') return;

    const inp = side === 'A' ? this.inputA : this.inputB;

    if (data.type === 'BOXING_INPUT') {
      if (typeof data.left === 'boolean') inp.left = data.left;
      if (typeof data.right === 'boolean') inp.right = data.right;
      if (typeof data.block === 'boolean') inp.block = data.block;
      if (data.jab) inp.jabBufferTicks = 8;
      if (data.hook) inp.hookBufferTicks = 8;
      if (data.dodge) inp.dodgeBufferTicks = 8;
      if (data.super) inp.superBufferTicks = 8;
    }
  }

  public cleanupGameTimers() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = undefined;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
    if (this.knockoutTimer) {
      clearTimeout(this.knockoutTimer);
      this.knockoutTimer = undefined;
    }
  }

  public override resetForRematch() {
    this.cleanupGameTimers();
    this.boxerA = this.createInitialBoxer('A', this.playerA.walletAddress);
    this.boxerB = this.createInitialBoxer('B', this.playerB?.walletAddress || '');
  }
}
