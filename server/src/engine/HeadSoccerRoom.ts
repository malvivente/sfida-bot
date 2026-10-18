import { BaseGameRoom, RoomConfig } from './BaseGameRoom.js';
import {
  HeadSoccerState,
  HeadSoccerPlayerState,
  HeadSoccerBallState,
  HeadSoccerPhase,
} from '../types/gameTypes.js';
import { GAMES_CONFIG } from '../config/gamesConfig.js';

const ARENA_W = 800;
const ARENA_H = 450;
const GROUND_Y = 390;

// Goal geometry (profile goals on left & right)
const GOAL_LINE_LEFT = 62;
const GOAL_LINE_RIGHT = ARENA_W - 62; // 738
const GOAL_TOP_Y = 235;
const CROSSBAR_RADIUS = 9;

// Player physics constants
const PLAYER_RADIUS = 32;
const PLAYER_GROUND_Y = GROUND_Y - PLAYER_RADIUS; // 358
const MOVE_SPEED = 7.4;
const JUMP_VELOCITY = -14.4;
const PLAYER_GRAVITY = 0.82;

// Ball physics constants
const BALL_RADIUS = 20;
const BALL_GROUND_Y = GROUND_Y - BALL_RADIUS; // 370
const BALL_GRAVITY = 0.52;
const BALL_BOUNCE = 0.78;
const BALL_WALL_BOUNCE = 0.82;
const BALL_AIR_DRAG = 0.994;
const BALL_GROUND_FRICTION = 0.975;
const MAX_BALL_SPEED = 25;

const TICK_RATE_HZ = 30;
const TICK_MS = Math.round(1000 / TICK_RATE_HZ); // 33ms

interface PlayerInputState {
  left: boolean;
  right: boolean;
  jumpBufferTicks: number; // short buffer window (~160ms) to prevent stuck input or phantom landing jumps
  jumpCooldownTicks: number; // minimum delay between jumps (~360ms) to strictly prevent double jumping
  kick: boolean;
  super: boolean;
  kickCooldown: number;
  goalCampTicks: number;
}

export class HeadSoccerRoom extends BaseGameRoom {
  private phase: HeadSoccerPhase = 'KICKOFF_COUNTDOWN';
  private timeRemainingMs: number = GAMES_CONFIG.headsoccer.matchDurationSeconds * 1000;
  private isOvertime: boolean = false;
  private countdownSec: number = 3;
  private lastGoalBy?: 'A' | 'B';
  private lastEvent?: HeadSoccerState['lastEvent'];

  private pA: HeadSoccerPlayerState = this.createInitialPlayer('A');
  private pB: HeadSoccerPlayerState = this.createInitialPlayer('B');
  private ball: HeadSoccerBallState = this.createInitialBall();

  private inputA: PlayerInputState = {
    left: false,
    right: false,
    jumpBufferTicks: 0,
    jumpCooldownTicks: 0,
    kick: false,
    super: false,
    kickCooldown: 0,
    goalCampTicks: 0,
  };
  private inputB: PlayerInputState = {
    left: false,
    right: false,
    jumpBufferTicks: 0,
    jumpCooldownTicks: 0,
    kick: false,
    super: false,
    kickCooldown: 0,
    goalCampTicks: 0,
  };

  private loopInterval?: NodeJS.Timeout;
  private countdownTimer?: NodeJS.Timeout;
  private celebrationTimeout?: NodeJS.Timeout;
  private lastTickEpoch: number = Date.now();

  constructor(
    config: RoomConfig,
    onSettled?: (room: BaseGameRoom, winner: string) => Promise<void>
  ) {
    super(config, 'headsoccer', onSettled);
  }

  private createInitialPlayer(side: 'A' | 'B', keepSuper = 0, keepSuperActive = false): HeadSoccerPlayerState {
    return {
      x: side === 'A' ? 175 : ARENA_W - 175,
      y: PLAYER_GROUND_Y,
      vx: 0,
      vy: 0,
      isGrounded: true,
      kickTimer: 0,
      superCharge: keepSuper,
      superActive: keepSuperActive,
    };
  }

  private createInitialBall(kickoffSide?: 'A' | 'B'): HeadSoccerBallState {
    const slightVx = kickoffSide === 'A' ? -1.2 : kickoffSide === 'B' ? 1.2 : (Math.random() < 0.5 ? -1 : 1);
    return {
      x: ARENA_W / 2,
      y: 165,
      vx: slightVx,
      vy: -2,
      spin: 0,
      isSuperShot: false,
      superOwner: undefined,
      lastTouch: undefined,
    };
  }

  public getGamePayload(): HeadSoccerState {
    return {
      phase: this.phase,
      scoreA: this.playerA.score,
      scoreB: this.playerB?.score || 0,
      timeRemainingMs: Math.max(0, Math.round(this.timeRemainingMs)),
      isOvertime: this.isOvertime,
      countdownSec: this.countdownSec,
      playerA: { ...this.pA },
      playerB: { ...this.pB },
      ball: { ...this.ball },
      lastGoalBy: this.lastGoalBy,
      lastEvent: this.lastEvent,
      serverTs: Date.now(),
    };
  }

  public onGameStart(): void {
    this.state = 'GAME_ACTIVE';
    this.cleanupGameTimers();

    this.playerA.score = 0;
    if (this.playerB) this.playerB.score = 0;
    this.timeRemainingMs = GAMES_CONFIG.headsoccer.matchDurationSeconds * 1000;
    this.isOvertime = false;
    this.lastGoalBy = undefined;
    this.lastEvent = undefined;

    this.pA = this.createInitialPlayer('A', 20);
    this.pB = this.createInitialPlayer('B', 20);
    this.ball = this.createInitialBall();

    this.resetInputs();

    this.broadcast({
      type: 'HEADSOCCER_START',
      message: '⚽ Head Soccer Arena Ready! 60 seconds on the clock!',
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    this.startKickoffCountdown(3);
    this.startPhysicsLoop();
  }

  private resetInputs() {
    this.inputA = { left: false, right: false, jumpBufferTicks: 0, jumpCooldownTicks: 0, kick: false, super: false, kickCooldown: 0, goalCampTicks: 0 };
    this.inputB = { left: false, right: false, jumpBufferTicks: 0, jumpCooldownTicks: 0, kick: false, super: false, kickCooldown: 0, goalCampTicks: 0 };
  }

  private startKickoffCountdown(seconds: number, kickoffTo?: 'A' | 'B') {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.phase = 'KICKOFF_COUNTDOWN';
    this.countdownSec = seconds;
    this.resetInputs();

    this.pA = this.createInitialPlayer('A', this.pA.superCharge, this.pA.superActive);
    this.pB = this.createInitialPlayer('B', this.pB.superCharge, this.pB.superActive);
    this.ball = this.createInitialBall(kickoffTo);

    this.countdownTimer = setInterval(() => {
      if (this.state !== 'GAME_ACTIVE') {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        return;
      }
      this.countdownSec -= 1;
      if (this.countdownSec <= 0) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = undefined;
        }
        this.phase = 'PLAYING';
        this.lastTickEpoch = Date.now();
        this.resetInputs();
      }
    }, 850);
  }

  private startPhysicsLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);
    this.lastTickEpoch = Date.now();

    this.loopInterval = setInterval(() => {
      if (this.state !== 'GAME_ACTIVE') {
        this.cleanupGameTimers();
        return;
      }
      this.stepPhysics();
      if (this.state !== 'GAME_ACTIVE') {
        this.cleanupGameTimers();
        return;
      }
      this.broadcast({
        type: 'HEADSOCCER_TICK',
        scoreA: this.playerA.score,
        scoreB: this.playerB?.score || 0,
        gameData: this.getGamePayload(),
      });
      // Clear one-shot physics event so subsequent ticks do not re-broadcast stale events
      if (this.lastEvent && this.phase === 'PLAYING') {
        this.lastEvent = undefined;
      }
    }, TICK_MS);
  }

  private stepPhysics() {
    const now = Date.now();
    const dtMs = Math.min(100, Math.max(10, now - this.lastTickEpoch));
    this.lastTickEpoch = now;

    if (this.phase !== 'PLAYING') {
      return;
    }

    // If either player is temporarily disconnected during match, pause play while forfeit countdown runs
    if (!this.playerA.connected || (this.playerB && !this.playerB.connected)) {
      return;
    }

    // Decrement match clock
    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - dtMs);

    // Passive super charge (+3% per second)
    this.pA.superCharge = Math.min(100, this.pA.superCharge + 0.1);
    this.pB.superCharge = Math.min(100, this.pB.superCharge + 0.1);

    // Update players
    this.updatePlayer('A', this.pA, this.inputA);
    this.updatePlayer('B', this.pB, this.inputB);

    // Resolve player-vs-player collision so they can't walk through each other
    this.resolvePlayersCollision();

    // Update ball movement & collisions
    this.updateBall(now);

    // Check Goal scored
    const goalScorer = this.checkGoalScored();
    if (goalScorer) {
      this.onGoalScored(goalScorer, now);
      return;
    }

    // Check timer expiration
    if (this.timeRemainingMs <= 0) {
      this.onTimerExpired();
    }
  }

  private updatePlayer(side: 'A' | 'B', p: HeadSoccerPlayerState, input: PlayerInputState) {
    // Horizontal movement
    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;
    p.vx = moveDir * MOVE_SPEED;
    p.x += p.vx;

    // Constrain to arena field in front of goal posts so players don't get stuck inside the goal frame
    const minX = GOAL_LINE_LEFT + 18;
    const maxX = GOAL_LINE_RIGHT - 18;
    if (p.x < minX) p.x = minX;
    if (p.x > maxX) p.x = maxX;

    // Anti-camping right on own goal line (> 3.2 seconds)
    const inOwnGoal = side === 'A' ? p.x < GOAL_LINE_LEFT + 42 : p.x > GOAL_LINE_RIGHT - 42;
    if (inOwnGoal) {
      input.goalCampTicks += 1;
      if (input.goalCampTicks > TICK_RATE_HZ * 3.2) {
        p.x = side === 'A' ? GOAL_LINE_LEFT + 70 : GOAL_LINE_RIGHT - 70;
        p.vy = -6;
        p.isGrounded = false;
        input.goalCampTicks = 0;
      }
    } else {
      input.goalCampTicks = Math.max(0, input.goalCampTicks - 2);
    }

    // Jump Cooldown & Execution with buffer to prevent double jumps
    if (input.jumpCooldownTicks > 0) {
      input.jumpCooldownTicks -= 1;
    }
    if (input.jumpBufferTicks > 0) {
      if (p.isGrounded && input.jumpCooldownTicks <= 0) {
        p.vy = JUMP_VELOCITY;
        p.isGrounded = false;
        input.jumpBufferTicks = 0;
        input.jumpCooldownTicks = 11; // ~360ms cooldown before another jump
      } else {
        input.jumpBufferTicks -= 1;
      }
    }

    // Gravity
    if (!p.isGrounded) {
      p.vy += PLAYER_GRAVITY;
      p.y += p.vy;
      if (p.y >= PLAYER_GROUND_Y) {
        p.y = PLAYER_GROUND_Y;
        p.vy = 0;
        p.isGrounded = true;
      }
    }

    // Super activation toggle (arms or disarms for the next kick)
    if (input.super) {
      if (p.superCharge >= 100 || p.superActive) {
        p.superActive = !p.superActive;
      }
      input.super = false;
    }

    // Kick timer & cooldown
    if (input.kickCooldown > 0) input.kickCooldown -= 1;
    if (p.kickTimer > 0) p.kickTimer -= 1;

    // If Super Shot is armed, auto-fire immediately upon reaching or touching ball
    if (p.superActive) {
      this.tryKickBall(side, p);
    }

    if (input.kick && input.kickCooldown <= 0) {
      p.kickTimer = 8;
      input.kickCooldown = 12;
      input.kick = false;
      this.tryKickBall(side, p);
    } else {
      input.kick = false;
    }
  }

  private resolvePlayersCollision() {
    const dx = this.pB.x - this.pA.x;
    const dy = this.pB.y - this.pA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = PLAYER_RADIUS * 1.85;

    if (dist < minDist && dist > 0.001) {
      const overlap = (minDist - dist) * 0.5;
      const nx = dx / dist;
      this.pA.x = Math.max(GOAL_LINE_LEFT + 18, Math.min(GOAL_LINE_RIGHT - 18, this.pA.x - nx * overlap));
      this.pB.x = Math.max(GOAL_LINE_LEFT + 18, Math.min(GOAL_LINE_RIGHT - 18, this.pB.x + nx * overlap));
    }
  }

  private tryKickBall(side: 'A' | 'B', p: HeadSoccerPlayerState) {
    const dir = side === 'A' ? 1 : -1;
    // Ball must be in front of the player (cannot kick ball behind back)
    if ((this.ball.x - p.x) * dir < -6) {
      return;
    }

    // Kick sweet spot is slightly in front and lower/mid of the player
    const footX = p.x + dir * 22;
    const footY = p.y + 10;
    const dx = this.ball.x - footX;
    const dy = this.ball.y - footY;
    const dist = Math.hypot(dx, dy);

    const maxDist = p.superActive ? 58 : 48;
    const bodyDist = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);

    if (dist <= maxDist || (p.superActive && bodyDist <= 56)) {
      const now = Date.now();
      this.ball.lastTouch = side;

      if (p.superActive || (p.superCharge >= 100 && this.inputFor(side).super)) {
        // Unleash Super Shot!
        p.superActive = false;
        p.superCharge = 0;
        this.ball.isSuperShot = true;
        this.ball.superOwner = side;
        this.ball.vx = dir * 22.5;
        this.ball.vy = -5.2;
        this.ball.spin = dir * 0.45;
        this.lastEvent = {
          type: 'SUPER_SHOT',
          side,
          x: this.ball.x,
          y: this.ball.y,
          ts: now,
        };
      } else {
        // Normal or Volley Kick
        this.ball.isSuperShot = false;
        this.ball.superOwner = undefined;
        const isAerial = !p.isGrounded;
        const heightFactor = Math.max(-1, Math.min(0.4, (this.ball.y - p.y) / 45));
        this.ball.vx = dir * (isAerial ? 16.8 : 15.2) + p.vx * 0.35;
        this.ball.vy = isAerial ? -6.5 + heightFactor * 4 : -10.8 + heightFactor * 3;
        this.ball.spin = dir * 0.25;
        p.superCharge = Math.min(100, p.superCharge + 14);
        this.lastEvent = {
          type: 'KICK',
          side,
          x: this.ball.x,
          y: this.ball.y,
          ts: now,
        };
      }
    }
  }

  private inputFor(side: 'A' | 'B'): PlayerInputState {
    return side === 'A' ? this.inputA : this.inputB;
  }

  private updateBall(now: number) {
    // Apply gravity (Super Shot flies flatter)
    this.ball.vy += this.ball.isSuperShot ? BALL_GRAVITY * 0.55 : BALL_GRAVITY;
    this.ball.vx *= BALL_AIR_DRAG;
    this.ball.vy *= BALL_AIR_DRAG;

    // Clamp max speed
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    if (speed > MAX_BALL_SPEED) {
      const scale = MAX_BALL_SPEED / speed;
      this.ball.vx *= scale;
      this.ball.vy *= scale;
    }

    const subSteps = speed > 13 || this.ball.isSuperShot ? 2 : 1;
    const dtFraction = 1 / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.ball.x += this.ball.vx * dtFraction;
      this.ball.y += this.ball.vy * dtFraction;

      // Ceiling bounce
      if (this.ball.y - BALL_RADIUS < 16) {
        this.ball.y = 16 + BALL_RADIUS;
        this.ball.vy = Math.abs(this.ball.vy) * BALL_WALL_BOUNCE;
      }

      // Ground bounce
      if (this.ball.y >= BALL_GROUND_Y) {
        this.ball.y = BALL_GROUND_Y;
        if (Math.abs(this.ball.vy) > 1.6) {
          this.ball.vy = -Math.abs(this.ball.vy) * BALL_BOUNCE;
        } else {
          this.ball.vy = 0;
        }
        this.ball.vx *= Math.pow(BALL_GROUND_FRICTION, dtFraction);
        if (Math.abs(this.ball.vx) < 8) {
          this.ball.isSuperShot = false;
        }
      }

      // Upper side walls above goal crossbar (Y < GOAL_TOP_Y)
      if (this.ball.y < GOAL_TOP_Y) {
        if (this.ball.x - BALL_RADIUS < GOAL_LINE_LEFT) {
          this.ball.x = GOAL_LINE_LEFT + BALL_RADIUS;
          this.ball.vx = Math.abs(this.ball.vx) * BALL_WALL_BOUNCE;
          this.ball.isSuperShot = false;
        } else if (this.ball.x + BALL_RADIUS > GOAL_LINE_RIGHT) {
          this.ball.x = GOAL_LINE_RIGHT - BALL_RADIUS;
          this.ball.vx = -Math.abs(this.ball.vx) * BALL_WALL_BOUNCE;
          this.ball.isSuperShot = false;
        }
      } else {
        // Back of the net bounds (when inside goal mouth)
        if (this.ball.x - BALL_RADIUS < 12) {
          this.ball.x = 12 + BALL_RADIUS;
          this.ball.vx = Math.abs(this.ball.vx) * 0.4;
        } else if (this.ball.x + BALL_RADIUS > ARENA_W - 12) {
          this.ball.x = ARENA_W - 12 - BALL_RADIUS;
          this.ball.vx = -Math.abs(this.ball.vx) * 0.4;
        }
      }

      // Crossbar circular post collisions
      this.collideCrossbar(GOAL_LINE_LEFT, GOAL_TOP_Y, now);
      this.collideCrossbar(GOAL_LINE_RIGHT, GOAL_TOP_Y, now);

      // Collide ball with Player A and Player B heads/bodies
      this.collidePlayerBall('A', this.pA, now);
      this.collidePlayerBall('B', this.pB, now);
    }
  }

  private collideCrossbar(postX: number, postY: number, now: number) {
    const dx = this.ball.x - postX;
    const dy = this.ball.y - postY;
    const dist = Math.hypot(dx, dy);
    const minDist = BALL_RADIUS + CROSSBAR_RADIUS;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.ball.x = postX + nx * minDist;
      this.ball.y = postY + ny * minDist;

      const dot = this.ball.vx * nx + this.ball.vy * ny;
      if (dot < 0) {
        this.ball.vx = (this.ball.vx - 1.9 * dot * nx) * 0.88;
        this.ball.vy = (this.ball.vy - 1.9 * dot * ny) * 0.88;
      }
      this.ball.isSuperShot = false;
      this.lastEvent = {
        type: 'CROSSBAR',
        x: postX,
        y: postY,
        ts: now,
      };
    }
  }

  private collidePlayerBall(side: 'A' | 'B', p: HeadSoccerPlayerState, now: number) {
    // Model character using dual-circle hitbox:
    // 1. Head circle: centered at (p.x, p.y - 20) with radius 28 (covers forehead up to p.y - 48, right where head is drawn)
    // 2. Body circle: centered at (p.x, p.y + 8) with radius 26 (covers torso & lower body down to feet)
    const headX = p.x;
    const headY = p.y - 20;
    const headMinDist = 28 + BALL_RADIUS;
    const hdx = this.ball.x - headX;
    const hdy = this.ball.y - headY;
    const hDist = Math.hypot(hdx, hdy);

    const bodyX = p.x;
    const bodyY = p.y + 8;
    const bodyMinDist = 26 + BALL_RADIUS;
    const bdx = this.ball.x - bodyX;
    const bdy = this.ball.y - bodyY;
    const bDist = Math.hypot(bdx, bdy);

    const headPenetration = headMinDist - hDist;
    const bodyPenetration = bodyMinDist - bDist;

    if (headPenetration <= 0 && bodyPenetration <= 0) {
      return;
    }

    // Resolve against the circle with the greater overlap
    const isHead = headPenetration >= bodyPenetration;
    const targetCenterX = isHead ? headX : bodyX;
    const targetCenterY = isHead ? headY : bodyY;
    const minDist = isHead ? headMinDist : bodyMinDist;
    const dist = isHead ? hDist : bDist;
    const dx = isHead ? hdx : bdx;
    const dy = isHead ? hdy : bdy;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Separate ball from player
      this.ball.x = targetCenterX + nx * (minDist + 1);
      this.ball.y = targetCenterY + ny * (minDist + 1);

      const dir = side === 'A' ? 1 : -1;

      // If opponent's Super Shot hits defender, knock defender back slightly and defuse super
      if (this.ball.isSuperShot && this.ball.superOwner !== side) {
        p.x = Math.max(GOAL_LINE_LEFT, Math.min(GOAL_LINE_RIGHT, p.x - dir * 18));
        this.ball.isSuperShot = false;
        this.ball.superOwner = undefined;
        this.ball.vx *= 0.45;
        this.ball.vy = -6;
      }

      // If Super Shot is armed, auto-fire immediately on ball contact
      if (p.superActive) {
        this.tryKickBall(side, p);
        return;
      }

      // If player is actively swinging shoe (`kickTimer > 0`), trigger kick impulse
      if (p.kickTimer > 0) {
        this.tryKickBall(side, p);
        return;
      }

      // Header / Body rebound physics
      const relVx = this.ball.vx - p.vx;
      const relVy = this.ball.vy - p.vy;
      const dot = relVx * nx + relVy * ny;

      if (dot < 0) {
        const restitution = isHead ? 1.18 : 1.08;
        this.ball.vx -= (1 + restitution) * dot * nx;
        this.ball.vy -= (1 + restitution) * dot * ny;
      }

      // Add forward header pop if hitting with head (especially top/front of head)
      if (isHead && ny < 0.1) {
        this.ball.vx += dir * 4.6 + p.vx * 0.5;
        this.ball.vy = Math.min(this.ball.vy, -8.5 + p.vy * 0.35);
        this.lastEvent = {
          type: 'HEADER',
          side,
          x: this.ball.x,
          y: this.ball.y,
          ts: now,
        };
      }

      this.ball.lastTouch = side;
      p.superCharge = Math.min(100, p.superCharge + 10);
    }
  }

  private checkGoalScored(): 'A' | 'B' | null {
    // Ball must be below crossbar and fully past goal line
    if (this.ball.y > GOAL_TOP_Y + 6) {
      if (this.ball.x < GOAL_LINE_LEFT - 10) {
        // Ball entered Left Goal -> Player B scored!
        return 'B';
      }
      if (this.ball.x > GOAL_LINE_RIGHT + 10) {
        // Ball entered Right Goal -> Player A scored!
        return 'A';
      }
    }
    return null;
  }

  private onGoalScored(scorer: 'A' | 'B', now: number) {
    this.phase = 'GOAL_CELEBRATION';
    this.lastGoalBy = scorer;
    this.ball.isSuperShot = false;

    if (scorer === 'A') {
      this.playerA.score += 1;
      // Give defender B a comeback Super Charge boost (+30%)
      this.pB.superCharge = Math.min(100, this.pB.superCharge + 30);
    } else if (this.playerB) {
      this.playerB.score += 1;
      // Give defender A a comeback Super Charge boost (+30%)
      this.pA.superCharge = Math.min(100, this.pA.superCharge + 30);
    }

    const scoreA = this.playerA.score;
    const scoreB = this.playerB?.score || 0;

    this.lastEvent = {
      type: 'GOAL',
      side: scorer,
      x: this.ball.x,
      y: this.ball.y,
      ts: now,
    };

    const scorerName =
      scorer === 'A' ? this.playerA.username : this.playerB?.username || 'Player B';

    this.broadcast({
      type: 'HEADSOCCER_GOAL',
      scorer,
      scoreA,
      scoreB,
      message: `⚽ GOAL! ${scorerName} scores! (${scoreA} - ${scoreB})`,
      gameData: this.getGamePayload(),
    });
    this.broadcastRoomState();

    // First to 5 goals rule: immediate match victory!
    if (scoreA >= 5 || scoreB >= 5) {
      this.phase = 'FULL_TIME';
      this.timeRemainingMs = 0;
      const winnerWallet =
        scoreA >= 5 ? this.playerA.walletAddress : this.playerB?.walletAddress || '';

      this.broadcast({
        type: 'HEADSOCCER_FULLTIME',
        scoreA,
        scoreB,
        message: `🏆 REGOLA 5 GOAL! ${scorerName} raggiunge 5 goal e vince il duello! (${scoreA} - ${scoreB})`,
        gameData: this.getGamePayload(),
      });

      if (this.celebrationTimeout) clearTimeout(this.celebrationTimeout);
      this.celebrationTimeout = setTimeout(() => {
        this.cleanupGameTimers();
        this.settleMatch(winnerWallet);
      }, 1800);
      return;
    }

    // If Golden Goal Overtime, match ends immediately after celebration!
    if (this.isOvertime) {
      const winnerWallet =
        scorer === 'A' ? this.playerA.walletAddress : this.playerB?.walletAddress || '';
      this.celebrationTimeout = setTimeout(() => {
        this.cleanupGameTimers();
        this.settleMatch(winnerWallet);
      }, 1800);
      return;
    }

    // Otherwise reset for next kickoff after 2.0s celebration
    const concededSide: 'A' | 'B' = scorer === 'A' ? 'B' : 'A';
    this.celebrationTimeout = setTimeout(() => {
      if (this.state !== 'GAME_ACTIVE') return;
      if (this.timeRemainingMs <= 500) {
        this.onTimerExpired();
      } else {
        this.startKickoffCountdown(2, concededSide);
      }
    }, 2000);
  }

  private onTimerExpired() {
    const scoreA = this.playerA.score;
    const scoreB = this.playerB?.score || 0;

    if (scoreA !== scoreB) {
      this.phase = 'FULL_TIME';
      this.timeRemainingMs = 0;
      const winnerWallet =
        scoreA > scoreB ? this.playerA.walletAddress : this.playerB?.walletAddress || '';

      this.broadcast({
        type: 'HEADSOCCER_FULLTIME',
        scoreA,
        scoreB,
        message: `⏱️ FULL TIME! Final Score: ${scoreA} - ${scoreB}`,
        gameData: this.getGamePayload(),
      });

      if (this.celebrationTimeout) clearTimeout(this.celebrationTimeout);
      this.celebrationTimeout = setTimeout(() => {
        this.cleanupGameTimers();
        this.settleMatch(winnerWallet);
      }, 1500);
      return;
    }

    // Tied at 00:00 -> Enter Golden Goal Overtime!
    if (!this.isOvertime) {
      this.isOvertime = true;
      this.timeRemainingMs = GAMES_CONFIG.headsoccer.overtimeDurationSeconds * 1000;
      this.pA.superCharge = Math.min(100, this.pA.superCharge + 50);
      this.pB.superCharge = Math.min(100, this.pB.superCharge + 50);

      this.broadcast({
        type: 'HEADSOCCER_OVERTIME',
        message: '⚡ GOLDEN GOAL OVERTIME! Next goal wins the match!',
        gameData: this.getGamePayload(),
      });
      this.startKickoffCountdown(3);
    } else {
      // Overtime clock expired and still tied -> Sudden death boost (100% Super Charge for both!)
      this.timeRemainingMs = 15000;
      this.pA.superCharge = 100;
      this.pB.superCharge = 100;
    }
  }

  public handleGameAction(wallet: string, data: any): void {
    if (this.state !== 'GAME_ACTIVE') return;
    if (this.phase !== 'PLAYING') return;
    if (data.type !== 'HEADSOCCER_INPUT') return;

    const isA = wallet.toLowerCase() === this.playerA.walletAddress.toLowerCase();
    const isB =
      this.playerB && wallet.toLowerCase() === this.playerB.walletAddress.toLowerCase();
    if (!isA && !isB) return;

    const targetInput = isA ? this.inputA : this.inputB;

    if (typeof data.left === 'boolean') targetInput.left = data.left;
    if (typeof data.right === 'boolean') targetInput.right = data.right;
    if (data.jump === true) {
      if (targetInput.jumpCooldownTicks <= 0) {
        targetInput.jumpBufferTicks = 6;
      }
    }
    if (data.kick === true) targetInput.kick = true;
    if (data.super === true) {
      const p = isA ? this.pA : this.pB;
      if (p.superCharge >= 100 || p.superActive) {
        p.superActive = !p.superActive;
      }
    }
  }

  public cleanupGameTimers(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = undefined;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
    if (this.celebrationTimeout) {
      clearTimeout(this.celebrationTimeout);
      this.celebrationTimeout = undefined;
    }
  }

  public override resetForRematch(): void {
    this.cleanupGameTimers();
    this.phase = 'KICKOFF_COUNTDOWN';
    this.timeRemainingMs = GAMES_CONFIG.headsoccer.matchDurationSeconds * 1000;
    this.isOvertime = false;
    this.countdownSec = 3;
    this.lastGoalBy = undefined;
    this.lastEvent = undefined;
    this.pA = this.createInitialPlayer('A', 20);
    this.pB = this.createInitialPlayer('B', 20);
    this.ball = this.createInitialBall();
    this.resetInputs();
  }
}
