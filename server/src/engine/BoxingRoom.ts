import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import { BoxingState, BoxerState, BoxerAction, BoxingHitEvent, CoinTossData } from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const ARENA_W = 800;
const RING_MIN_X = 140;
const RING_MAX_X = 660;
const MIN_BOXER_DIST = 70;
const MOVE_SPEED = 5.8;

const TICK_RATE_HZ = 30;
const TICK_MS = Math.round(1000 / TICK_RATE_HZ); // 33ms

interface PlayerInput {
  left: boolean;
  right: boolean;
  block: boolean;
  jabTrigger: boolean;
  hookTrigger: boolean;
  dodgeTrigger: boolean;
  superTrigger: boolean;
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
    jabTrigger: false,
    hookTrigger: false,
    dodgeTrigger: false,
    superTrigger: false,
  };

  private inputB: PlayerInput = {
    left: false,
    right: false,
    block: false,
    jabTrigger: false,
    hookTrigger: false,
    dodgeTrigger: false,
    superTrigger: false,
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
      timeRemainingMs: this.timeRemainingMs,
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
      message: `Cyber Boxing started! Round 1!`,
      gameData: this.getGamePayload(),
    });

    this.startPreMatchCountdown();
  }

  private startPreMatchCountdown() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.countdownSec -= 1;
      if (this.countdownSec <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = undefined;
        this.phase = 'FIGHTING';
        this.startPhysicsLoop();
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
      this.stepCombat();
      if (this.state !== 'GAME_ACTIVE') {
        this.cleanupGameTimers();
        return;
      }
      this.broadcast({
        type: 'BOXING_TICK',
        gameData: this.getGamePayload(),
      });
      // Clear hit event so it triggers only once
      if (this.lastHitEvent && this.phase === 'FIGHTING') {
        this.lastHitEvent = undefined;
      }
    }, TICK_MS);
  }

  private stepCombat() {
    const now = Date.now();
    const dtMs = Math.min(100, Math.max(10, now - this.lastTickEpoch));
    this.lastTickEpoch = now;

    if (this.phase !== 'FIGHTING') return;

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
      b.stamina = Math.min(100, b.stamina + 0.45); // ~14 stamina/s
    } else if (b.state === 'BLOCK') {
      b.stamina = Math.min(100, b.stamina + 0.1);
    }

    // Passive super meter slow tick (+1.5%/s)
    b.superMeter = Math.min(100, b.superMeter + 0.05);

    // Decrement state ticks
    if (b.stateTicks > 0) {
      b.stateTicks--;
      // Resolve action at exact hit frame
      this.processActionHitFrame(b, opponent);

      if (b.stateTicks <= 0) {
        // Return to idle / block
        b.isDodging = false;
        b.isCounterVulnerable = false;
        if (inp.block && b.stamina >= 10) {
          b.state = 'BLOCK';
          b.isGuarding = true;
        } else {
          b.state = 'IDLE';
          b.isGuarding = false;
        }
      }
      return; // Boxer is locked into animation
    }

    // Handle new inputs when not locked
    // 1. Super KO Uppercut
    if (inp.superTrigger && b.superMeter >= 100) {
      inp.superTrigger = false;
      b.superMeter = 0;
      b.state = 'UPPERCUT';
      b.stateTicks = 16; // 16 ticks = ~528ms
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 2. Dodge / Weave
    if (inp.dodgeTrigger && b.stamina >= 15) {
      inp.dodgeTrigger = false;
      b.stamina = Math.max(0, b.stamina - 15);
      b.state = 'DODGE';
      b.stateTicks = 8; // ~264ms invulnerability window
      b.isDodging = true;
      b.isGuarding = false;

      // Check if dodged during opponent's startup -> grant counter vulnerability on opponent!
      if (opponent.state === 'JAB' || opponent.state === 'HOOK' || opponent.state === 'UPPERCUT') {
        opponent.isCounterVulnerable = true;
      }
      return;
    }

    // 3. Hook
    if (inp.hookTrigger && b.stamina >= 20) {
      inp.hookTrigger = false;
      b.stamina = Math.max(0, b.stamina - 20);
      b.state = 'HOOK';
      b.stateTicks = 12; // ~396ms
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 4. Jab
    if (inp.jabTrigger && b.stamina >= 10) {
      inp.jabTrigger = false;
      b.stamina = Math.max(0, b.stamina - 10);
      b.state = 'JAB';
      b.stateTicks = 7; // ~231ms
      b.isGuarding = false;
      b.isDodging = false;
      return;
    }

    // 5. Block
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
      // Clamp within ring
      if (b.x < RING_MIN_X) b.x = RING_MIN_X;
      if (b.x > RING_MAX_X) b.x = RING_MAX_X;
    } else {
      b.state = 'IDLE';
    }
  }

  private processActionHitFrame(attacker: BoxerState, defender: BoxerState) {
    const dist = Math.abs(defender.x - attacker.x);

    // Hit frame checks:
    // JAB hits on tick 4 (stateTicks === 3)
    // HOOK hits on tick 6 (stateTicks === 6)
    // UPPERCUT hits on tick 8 (stateTicks === 8)
    const isJabHitFrame = attacker.state === 'JAB' && attacker.stateTicks === 3;
    const isHookHitFrame = attacker.state === 'HOOK' && attacker.stateTicks === 6;
    const isUppercutHitFrame = attacker.state === 'UPPERCUT' && attacker.stateTicks === 8;

    if (!isJabHitFrame && !isHookHitFrame && !isUppercutHitFrame) return;

    let range = 135;
    let baseDmg = 8;
    let hitType: BoxingHitEvent['type'] = 'JAB';
    let superGain = 10;

    if (attacker.state === 'HOOK') {
      range = 115;
      baseDmg = 18;
      hitType = 'HOOK';
      superGain = 18;
    } else if (attacker.state === 'UPPERCUT') {
      range = 140;
      baseDmg = 38;
      hitType = 'UPPERCUT';
      superGain = 0;
    }

    // Distance check
    if (dist > range) {
      return; // Whiffed
    }

    // Dodge check: if defender is dodging, punch whiffs completely!
    if (defender.isDodging) {
      return;
    }

    // Counter check: if defender was counter vulnerable, double damage and trigger CRIT!
    const isCrit = Boolean(defender.isCounterVulnerable);
    if (isCrit) {
      hitType = 'COUNTER';
      baseDmg = Math.round(baseDmg * 1.5);
    }

    // Block check:
    const isBlocked = defender.isGuarding && defender.stamina >= 10 && attacker.state !== 'UPPERCUT';
    let finalDmg = baseDmg;

    if (isBlocked) {
      finalDmg = Math.max(2, Math.round(baseDmg * 0.22));
      defender.stamina = Math.max(0, defender.stamina - (baseDmg * 0.8));
    } else {
      // Full hit: defender flinches into HURT
      defender.state = 'HURT';
      defender.stateTicks = attacker.state === 'UPPERCUT' ? 14 : isCrit ? 10 : 6;
      defender.isGuarding = false;
      defender.isCounterVulnerable = false;

      // Knockback away from attacker
      const pushDir = defender.side === 'B' ? 1 : -1;
      const pushAmount = attacker.state === 'UPPERCUT' ? 36 : isCrit ? 22 : 12;
      defender.x = Math.max(RING_MIN_X, Math.min(RING_MAX_X, defender.x + pushDir * pushAmount));
    }

    // Deduct HP
    defender.hp = Math.max(0, defender.hp - finalDmg);
    attacker.superMeter = Math.min(100, attacker.superMeter + superGain);
    attacker.consecutiveHits += 1;

    // Create hit event for broadcast
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

    // Check Knockdown / KO
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
    }, 2800);
  }

  private onTimerExpired() {
    this.phase = 'MATCH_OVER';
    let winnerWallet = this.playerA.walletAddress;

    if (this.boxerA.hp > this.boxerB.hp) {
      winnerWallet = this.playerA.walletAddress;
    } else if (this.boxerB.hp > this.boxerA.hp && this.playerB) {
      winnerWallet = this.playerB.walletAddress;
    } else {
      // Tie breaker: higher stamina or random
      winnerWallet = this.boxerA.stamina >= this.boxerB.stamina ? this.playerA.walletAddress : (this.playerB?.walletAddress || this.playerA.walletAddress);
    }

    this.broadcastRoomState();
    this.settleMatch(winnerWallet);
  }

  public handleGameAction(wallet: string, data: any) {
    if (this.state !== 'GAME_ACTIVE' || this.phase !== 'FIGHTING') return;

    const side = this.isSameWallet(wallet, this.playerA.walletAddress)
      ? 'A'
      : (this.playerB && this.isSameWallet(wallet, this.playerB.walletAddress) ? 'B' : null);

    if (!side) return;

    const inp = side === 'A' ? this.inputA : this.inputB;

    if (data.type === 'BOXING_INPUT') {
      if (typeof data.left === 'boolean') inp.left = data.left;
      if (typeof data.right === 'boolean') inp.right = data.right;
      if (typeof data.block === 'boolean') inp.block = data.block;
      if (data.jab) inp.jabTrigger = true;
      if (data.hook) inp.hookTrigger = true;
      if (data.dodge) inp.dodgeTrigger = true;
      if (data.super) inp.superTrigger = true;
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
