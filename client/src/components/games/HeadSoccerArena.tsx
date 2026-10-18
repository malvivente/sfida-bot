import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Loader2,
  Swords,
  Flame,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Zap,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import { HeadSoccerState } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';

interface HeadSoccerArenaProps {
  gameData?: HeadSoccerState;
  role: 'player' | 'spectator';
  onInput: (input: {
    left?: boolean;
    right?: boolean;
    jump?: boolean;
    kick?: boolean;
    super?: boolean;
  }) => void;
  playerAName: string;
  playerBName?: string;
  playerAReady?: boolean;
  playerBReady?: boolean;
  isReady?: boolean;
  onReady?: () => void;
  countdownSeconds?: number | null;
  roomState: string;
  wagerTon: string;
  isCreator: boolean;
  onCancelMatch?: () => void;
  isWinner?: boolean;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B';
  userBalanceGram?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  socketError?: string | null;
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
  onSubscribeTick?: (callback: (data: HeadSoccerState) => void) => () => void;
  forfeitCountdown?: number | null;
  disconnectedOpponentName?: string;
  isConnected?: boolean;
  onReconnect?: () => void;
}

const ARENA_W = 800;
const ARENA_H = 450;
const GROUND_Y = 390;

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface BallTrailPoint {
  x: number;
  y: number;
  isSuper: boolean;
  alpha: number;
}

interface SpriteBank {
  pitchBg?: HTMLImageElement;
  goalLeft?: HTMLImageElement;
  goalRight?: HTMLImageElement;
  playerAIdle?: HTMLImageElement;
  playerARun1?: HTMLImageElement;
  playerARun2?: HTMLImageElement;
  playerAJump?: HTMLImageElement;
  playerAKick?: HTMLImageElement;
  playerBIdle?: HTMLImageElement;
  playerBRun1?: HTMLImageElement;
  playerBRun2?: HTMLImageElement;
  playerBJump?: HTMLImageElement;
  playerBKick?: HTMLImageElement;
  ball?: HTMLImageElement;
  ballSuper?: HTMLImageElement;
}

const HEADSOCCER_SPRITE_PATHS = {
  pitchBg: '/assets/games/headsoccer/pitch_bg.webp',
  goalLeft: '/assets/games/headsoccer/goal_left.webp',
  goalRight: '/assets/games/headsoccer/goal_right.webp',
  playerAIdle: '/assets/games/headsoccer/player_a_idle.webp',
  playerARun1: '/assets/games/headsoccer/player_a_run1.webp',
  playerARun2: '/assets/games/headsoccer/player_a_run2.webp',
  playerAJump: '/assets/games/headsoccer/player_a_jump.webp',
  playerAKick: '/assets/games/headsoccer/player_a_kick.webp',
  playerBIdle: '/assets/games/headsoccer/player_b_idle.webp',
  playerBRun1: '/assets/games/headsoccer/player_b_run1.webp',
  playerBRun2: '/assets/games/headsoccer/player_b_run2.webp',
  playerBJump: '/assets/games/headsoccer/player_b_jump.webp',
  playerBKick: '/assets/games/headsoccer/player_b_kick.webp',
  ball: '/assets/games/headsoccer/ball.webp',
  ballSuper: '/assets/games/headsoccer/ball_super.webp',
};

const HEADSOCCER_SPRITE_CACHE: Record<string, HTMLImageElement> = {};

export function getOrLoadHeadSoccerSprite(src: string): HTMLImageElement {
  if (HEADSOCCER_SPRITE_CACHE[src]) {
    return HEADSOCCER_SPRITE_CACHE[src];
  }
  const img = new Image();
  img.src = src;
  if ('decode' in img) {
    img.decode().catch(() => {});
  }
  HEADSOCCER_SPRITE_CACHE[src] = img;
  return img;
}

// Immediate asynchronous pre-decoding on module load
if (typeof window !== 'undefined') {
  Object.values(HEADSOCCER_SPRITE_PATHS).forEach((src) => getOrLoadHeadSoccerSprite(src));
}

const HeadSoccerArenaComponent: React.FC<HeadSoccerArenaProps> = ({
  gameData,
  role,
  onInput,
  playerAName,
  playerBName = 'Opponent',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
  onReady,
  countdownSeconds,
  roomState,
  wagerTon,
  isCreator = false,
  isWinner,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userSide = 'A',
  userBalanceGram,
  onOpenDeposit,
  socketError,
  hasPlayerB = true,
  onJoinAsPlayer,
  onInviteChallenger,
  onSubscribeTick,
  forfeitCountdown,
  disconnectedOpponentName,
  isConnected = true,
  onReconnect,
}) => {
  const { t } = useI18n();
  const { triggerImpact, triggerNotification } = useHaptics();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<SpriteBank>({
    pitchBg: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.pitchBg),
    goalLeft: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.goalLeft),
    goalRight: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.goalRight),
    playerAIdle: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerAIdle),
    playerARun1: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerARun1),
    playerARun2: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerARun2),
    playerAJump: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerAJump),
    playerAKick: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerAKick),
    playerBIdle: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerBIdle),
    playerBRun1: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerBRun1),
    playerBRun2: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerBRun2),
    playerBJump: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerBJump),
    playerBKick: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.playerBKick),
    ball: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.ball),
    ballSuper: getOrLoadHeadSoccerSprite(HEADSOCCER_SPRITE_PATHS.ballSuper),
  });

  // Pre-rasterized offscreen canvas caches to avoid repeating expensive SVG vector rasterization on every 60fps frame
  const pitchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const goalLeftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const goalRightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const superHaloCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasWarmedUpRef = useRef(false);

  const particlesRef = useRef<VisualParticle[]>([]);
  const trailRef = useRef<BallTrailPoint[]>([]);
  const lastEventTsRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const floatingBannerRef = useRef<{ text: string; color: string; expiresAt: number } | null>(null);
  const lastJumpTsRef = useRef<number>(0);

  // Smooth client-side interpolation target & current state
  const renderStateRef = useRef({
    pAx: gameData?.playerA?.x ?? 175,
    pAy: gameData?.playerA?.y ?? 358,
    pAkick: 0,
    pBx: gameData?.playerB?.x ?? 625,
    pBy: gameData?.playerB?.y ?? 358,
    pBkick: 0,
    bx: gameData?.ball?.x ?? 400,
    by: gameData?.ball?.y ?? 165,
    bAngle: 0,
    isSuper: false,
  });
  const latestGameDataRef = useRef<HeadSoccerState | undefined>(gameData);

  const spawnBurst = useCallback((x: number, y: number, color: string, count = 14, speedScale = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = (2.5 + Math.random() * 5.5) * speedScale;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.2,
        radius: 3 + Math.random() * 4,
        color,
        alpha: 1,
        decay: 0.035 + Math.random() * 0.025,
      });
    }
  }, []);

  useEffect(() => {
    if (gameData) latestGameDataRef.current = gameData;
  }, [gameData]);

  // Direct socket tick subscription: updates physics targets & triggers sfx/particles with ZERO React re-render overhead
  useEffect(() => {
    if (!onSubscribeTick) return;
    const unsub = onSubscribeTick((freshData) => {
      latestGameDataRef.current = freshData;

      const ev = freshData.lastEvent;
      if (ev && ev.ts !== lastEventTsRef.current) {
        lastEventTsRef.current = ev.ts;

        if (ev.type === 'KICK') {
          spawnBurst(ev.x, ev.y, ev.side === 'A' ? '#22D3EE' : '#FB923C', 10, 0.9);
        } else if (ev.type === 'HEADER') {
          spawnBurst(ev.x, ev.y, '#FACC15', 12, 0.95);
        } else if (ev.type === 'SUPER_SHOT') {
          spawnBurst(ev.x, ev.y, '#F97316', 24, 1.5);
          screenShakeRef.current = 10;
          floatingBannerRef.current = {
            text: t('headsoccer.superShotBanner'),
            color: '#FB923C',
            expiresAt: Date.now() + 1100,
          };
          if (role === 'player') triggerImpact('heavy');
        } else if (ev.type === 'CROSSBAR') {
          spawnBurst(ev.x, ev.y, '#E2E8F0', 18, 1.2);
          screenShakeRef.current = 8;
          floatingBannerRef.current = {
            text: t('headsoccer.crossbarBanner'),
            color: '#38BDF8',
            expiresAt: Date.now() + 950,
          };
          if (role === 'player') triggerImpact('medium');
        } else if (ev.type === 'GOAL') {
          spawnBurst(ev.x, ev.y, '#10B981', 32, 1.7);
          spawnBurst(ARENA_W / 2, ARENA_H / 2, '#FACC15', 28, 1.6);
          screenShakeRef.current = 16;
          if (role === 'player') triggerNotification('success');
        }
      }
    });
    return unsub;
  }, [onSubscribeTick, role, spawnBurst, t, triggerImpact, triggerNotification]);

  // Active button press visuals & immediate zero-latency refs
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [kickPressed, setKickPressed] = useState(false);
  const isLeftPressedRef = useRef(false);
  const isRightPressedRef = useRef(false);
  const localJumpVyRef = useRef(0);

  // D-Pad continuous slide / touch tracking refs
  const dpadContainerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const currentDirectionRef = useRef<'left' | 'right' | null>(null);

  // 2-Phase Settlement Popup state
  const [outcomePhase, setOutcomePhase] = useState<'idle' | 'splash' | 'settled'>('idle');

  useEffect(() => {
    if (roomState === 'MATCH_SETTLED' || roomState === 'FORFEITED') {
      setOutcomePhase('splash');
      const timer = setTimeout(() => {
        setOutcomePhase('settled');
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setOutcomePhase('idle');
    }
  }, [roomState]);

  // Ensure movement inputs are released if phase changes away from PLAYING
  useEffect(() => {
    if (roomState !== 'GAME_ACTIVE' || (gameData?.phase && gameData.phase !== 'PLAYING')) {
      activePointerIdRef.current = null;
      currentDirectionRef.current = null;
      if (leftPressed || isLeftPressedRef.current) {
        isLeftPressedRef.current = false;
        setLeftPressed(false);
        onInput({ left: false });
      }
      if (rightPressed || isRightPressedRef.current) {
        isRightPressedRef.current = false;
        setRightPressed(false);
        onInput({ right: false });
      }
    }
  }, [gameData?.phase, leftPressed, onInput, rightPressed, roomState]);

  // Ensure all sprites are fully decoded into memory without main-thread jank
  useEffect(() => {
    Object.entries(HEADSOCCER_SPRITE_PATHS).forEach(([key, src]) => {
      const img = getOrLoadHeadSoccerSprite(src);
      (spritesRef.current as any)[key] = img;
    });
  }, []);

  // Pre-rasterize SVG assets to offscreen bitmap canvases once
  const getOrRenderPitchCanvas = useCallback((): HTMLCanvasElement | null => {
    if (pitchCanvasRef.current) return pitchCanvasRef.current;
    const bgImg = spritesRef.current.pitchBg;
    if (!bgImg || !bgImg.complete || bgImg.naturalWidth === 0) return null;

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = ARENA_W;
      offCanvas.height = ARENA_H;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return null;

      offCtx.drawImage(bgImg, 0, 0, ARENA_W, ARENA_H);
      pitchCanvasRef.current = offCanvas;
      return offCanvas;
    } catch {
      return null;
    }
  }, []);

  const getOrRenderGoalCanvas = useCallback((side: 'left' | 'right'): HTMLCanvasElement | null => {
    const targetRef = side === 'left' ? goalLeftCanvasRef : goalRightCanvasRef;
    if (targetRef.current) return targetRef.current;

    const img = side === 'left' ? spritesRef.current.goalLeft : spritesRef.current.goalRight;
    if (!img || !img.complete || img.naturalWidth === 0) return null;

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 74;
      offCanvas.height = 162;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return null;

      offCtx.drawImage(img, 0, 0, 74, 162);
      targetRef.current = offCanvas;
      return offCanvas;
    } catch {
      return null;
    }
  }, []);

  const getSuperHaloCanvas = useCallback((): HTMLCanvasElement | null => {
    if (superHaloCanvasRef.current) return superHaloCanvasRef.current;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const hCtx = canvas.getContext('2d');
      if (!hCtx) return null;

      const grad = hCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.88)');
      grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.65)');
      grad.addColorStop(0.75, 'rgba(239, 68, 68, 0.35)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      hCtx.fillStyle = grad;
      hCtx.fillRect(0, 0, 128, 128);

      superHaloCanvasRef.current = canvas;
      return canvas;
    } catch {
      return null;
    }
  }, []);

  // GPU Pipeline & Texture Warm-up: runs during 3-second kickoff countdown to ensure zero-stutter when match starts
  const warmUpGpuPipeline = useCallback((ctx: CanvasRenderingContext2D) => {
    if (hasWarmedUpRef.current) return;
    hasWarmedUpRef.current = true;
    try {
      getOrRenderPitchCanvas();
      getOrRenderGoalCanvas('left');
      getOrRenderGoalCanvas('right');
      getSuperHaloCanvas();

      ctx.save();
      ctx.globalAlpha = 0.001;
      const sprites = spritesRef.current;
      Object.values(sprites).forEach((img) => {
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -200, -200, 40, 40);
        }
      });
      ctx.restore();
    } catch {}
  }, [getOrRenderGoalCanvas, getOrRenderPitchCanvas, getSuperHaloCanvas]);

  // 60FPS / 120FPS Delta-Time Normalized Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();
    let lastPAx = renderStateRef.current.pAx;
    let lastPBx = renderStateRef.current.pBx;

    const renderFrame = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const now = timestamp || performance.now();
          let dtMs = now - lastTs;
          lastTs = now;
          if (dtMs > 66) dtMs = 66; // Clamp to avoid huge teleport jumps if tab paused or frame dropped
          if (dtMs < 2) dtMs = 2;
          const dtSec = dtMs / 1000;
          const dtScale = dtMs / 33.333; // 1.0 at 30Hz server tick

          const gd = latestGameDataRef.current;
          const rs = renderStateRef.current;

          if (gd) {
            const isLocalPlayer = role === 'player' && roomState === 'GAME_ACTIVE' && gd.phase === 'PLAYING';
            const isUserA = userSide === 'A';
            const isUserB = userSide === 'B';

            // Frame-rate independent client prediction & reconciliation
            const moveSpeed = 222; // px per second (~7.4px per 33ms)
            const localLerp = 1 - Math.exp(-12 * dtSec);
            const remoteLerp = 1 - Math.exp(-22 * dtSec);
            const yLerp = 1 - Math.exp(-28 * dtSec);

            // Local client prediction for Player A
            if (isLocalPlayer && isUserA) {
              const dir = (isRightPressedRef.current ? 1 : 0) - (isLeftPressedRef.current ? 1 : 0);
              rs.pAx += dir * moveSpeed * dtSec;
              if (rs.pAx < 113) rs.pAx = 113;
              if (rs.pAx > 687) rs.pAx = 687;
              rs.pAx += (gd.playerA.x - rs.pAx) * localLerp;

              // Immediate zero-latency local jump simulation
              if (localJumpVyRef.current !== 0 || rs.pAy < 358) {
                rs.pAy += localJumpVyRef.current * dtScale;
                localJumpVyRef.current += 0.82 * dtScale;
                if (rs.pAy >= 358) {
                  rs.pAy = 358;
                  localJumpVyRef.current = 0;
                }
              }
              rs.pAy += (gd.playerA.y - rs.pAy) * yLerp;
            } else {
              rs.pAx += (gd.playerA.x - rs.pAx) * remoteLerp;
              rs.pAy += (gd.playerA.y - rs.pAy) * yLerp;
            }
            rs.pAkick = gd.playerA.kickTimer;

            // Local client prediction for Player B
            if (isLocalPlayer && isUserB) {
              const dir = (isRightPressedRef.current ? 1 : 0) - (isLeftPressedRef.current ? 1 : 0);
              rs.pBx += dir * moveSpeed * dtSec;
              if (rs.pBx < 113) rs.pBx = 113;
              if (rs.pBx > 687) rs.pBx = 687;
              rs.pBx += (gd.playerB.x - rs.pBx) * localLerp;

              // Immediate zero-latency local jump simulation
              if (localJumpVyRef.current !== 0 || rs.pBy < 358) {
                rs.pBy += localJumpVyRef.current * dtScale;
                localJumpVyRef.current += 0.82 * dtScale;
                if (rs.pBy >= 358) {
                  rs.pBy = 358;
                  localJumpVyRef.current = 0;
                }
              }
              rs.pBy += (gd.playerB.y - rs.pBy) * yLerp;
            } else {
              rs.pBx += (gd.playerB.x - rs.pBx) * remoteLerp;
              rs.pBy += (gd.playerB.y - rs.pBy) * yLerp;
            }
            rs.pBkick = gd.playerB.kickTimer;

            if (gd.phase === 'PLAYING') {
              if (Math.hypot(gd.ball.x - rs.bx, gd.ball.y - rs.by) > 180) {
                rs.bx = gd.ball.x;
                rs.by = gd.ball.y;
                trailRef.current = [];
              } else {
                // Smooth velocity extrapolation to eliminate 30Hz network micro-stutter
                rs.bx += gd.ball.vx * dtScale;
                rs.by += gd.ball.vy * dtScale;
                const ballLerp = 1 - Math.exp(-20 * dtSec);
                rs.bx += (gd.ball.x - rs.bx) * ballLerp;
                rs.by += (gd.ball.y - rs.by) * ballLerp;
              }
            } else {
              // During kickoff countdown or goal celebration, snap smoothly to server spawn coordinates without jitter
              rs.pAx = gd.playerA.x;
              rs.pAy = gd.playerA.y;
              rs.pBx = gd.playerB.x;
              rs.pBy = gd.playerB.y;
              rs.bx = gd.ball.x;
              rs.by = gd.ball.y;
              localJumpVyRef.current = 0;
              trailRef.current = [];
            }
            rs.bAngle += gd.ball.vx * 0.04 * dtScale;
            rs.isSuper = gd.ball.isSuperShot;

            if (Math.hypot(gd.ball.vx, gd.ball.vy) > 5.5 || gd.ball.isSuperShot) {
              trailRef.current.push({
                x: rs.bx,
                y: rs.by,
                isSuper: gd.ball.isSuperShot,
                alpha: gd.ball.isSuperShot ? 0.75 : 0.4,
              });
              if (trailRef.current.length > 8) {
                trailRef.current.shift();
              }
            }
          }

          // Calculate instantaneous movement speed to trigger walk cycle
          const pASpeed = Math.abs(rs.pAx - lastPAx) / Math.max(0.001, dtSec);
          const pBSpeed = Math.abs(rs.pBx - lastPBx) / Math.max(0.001, dtSec);
          lastPAx = rs.pAx;
          lastPBx = rs.pBx;
          const isMovingA = pASpeed > 15 || (userSide === 'A' && (isLeftPressedRef.current || isRightPressedRef.current));
          const isMovingB = pBSpeed > 15 || (userSide === 'B' && (isLeftPressedRef.current || isRightPressedRef.current));

          ctx.save();

          if (screenShakeRef.current > 0.3) {
            const dx = (Math.random() - 0.5) * screenShakeRef.current;
            const dy = (Math.random() - 0.5) * screenShakeRef.current;
            ctx.translate(dx, dy);
            screenShakeRef.current *= 0.85;
          } else {
            screenShakeRef.current = 0;
          }

          // Warm up GPU pipelines and offscreen canvases on early frame
          if (!hasWarmedUpRef.current) {
            warmUpGpuPipeline(ctx);
          }

          // 1. Draw Stadium Pitch Background (via offscreen bitmap blit for silky 60fps)
          const pitchCv = getOrRenderPitchCanvas();
          if (pitchCv) {
            ctx.drawImage(pitchCv, 0, 0);
          } else if (spritesRef.current.pitchBg) {
            ctx.drawImage(spritesRef.current.pitchBg, 0, 0, ARENA_W, ARENA_H);
          } else {
            ctx.fillStyle = '#0B1120';
            ctx.fillRect(0, 0, ARENA_W, ARENA_H);
            ctx.fillStyle = '#065F46';
            ctx.fillRect(0, GROUND_Y, ARENA_W, ARENA_H - GROUND_Y);
          }

          // 2. Ground shadows under players and ball
          const drawShadow = (x: number, objY: number, baseW: number) => {
            const heightRatio = Math.max(0.25, 1 - Math.max(0, GROUND_Y - objY) / 280);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.42 * heightRatio})`;
            ctx.beginPath();
            ctx.ellipse(x, GROUND_Y + 4, baseW * heightRatio, 7 * heightRatio, 0, 0, Math.PI * 2);
            ctx.fill();
          };
          drawShadow(rs.pAx, rs.pAy + 30, 30);
          drawShadow(rs.pBx, rs.pBy + 30, 30);
          drawShadow(rs.bx, rs.by + 18, 20);

          // 3. Draw Ball Trail (in-place pool update)
          for (let i = trailRef.current.length - 1; i >= 0; i--) {
            const pt = trailRef.current[i];
            pt.alpha *= Math.pow(0.84, dtScale);
            if (pt.alpha <= 0.04) {
              trailRef.current.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            const r = 7 + (i / 8) * 8;
            ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            ctx.fillStyle = pt.isSuper
              ? `rgba(249, 115, 22, ${pt.alpha})`
              : `rgba(56, 189, 248, ${pt.alpha * 0.7})`;
            ctx.fill();
          }

          // Super Shot Visual Aura Renderer (Fiery / Electric Super Saiyan Aura)
          const drawSuperAura = (
            targetX: number,
            targetY: number,
            side: 'A' | 'B',
            isArmed: boolean,
            isCharged: boolean
          ) => {
            if (!isArmed && !isCharged) return;
            const animNow = Date.now();
            ctx.save();

            if (isArmed) {
              // 1. Concentric pulsing fiery halo (using cached offscreen texture, 0 per-frame allocation)
              const pulse = 1 + 0.12 * Math.sin(animNow * 0.012);
              const halo = getSuperHaloCanvas();
              const size = 112 * pulse;
              if (halo) {
                ctx.drawImage(halo, targetX - size / 2, targetY - size / 2, size, size);
              }

              // 2. Rising flame sparks
              for (let i = 0; i < 8; i++) {
                const angle = animNow * 0.0035 + (i * Math.PI * 2) / 8;
                const orbitR = 30 + Math.sin(animNow * 0.008 + i) * 6;
                const progress = ((animNow * 0.045 + i * 16) % 40) / 40;
                const fx = targetX + Math.cos(angle) * orbitR;
                const fy = targetY + Math.sin(angle) * orbitR * 0.65 - progress * 32;
                const alpha = Math.max(0, 0.9 - progress);

                ctx.beginPath();
                ctx.arc(fx, fy, 4 * (1 - progress * 0.6) + 1.5, 0, Math.PI * 2);
                ctx.fillStyle =
                  i % 2 === 0
                    ? `rgba(253, 224, 71, ${alpha})`
                    : `rgba(249, 115, 22, ${alpha})`;
                ctx.fill();
              }

              // 3. Crackling electric arcs around player perimeter (crisp layered stroke, 0 blur overhead)
              const segments = 8;
              ctx.beginPath();
              for (let s = 0; s <= segments; s++) {
                const a = (s * Math.PI * 2) / segments + animNow * 0.002;
                const jitter = Math.sin(animNow * 0.03 + s * 3) * 6;
                const jx = targetX + Math.cos(a) * (36 + jitter);
                const jy = targetY + Math.sin(a) * (36 + jitter);
                if (s === 0) ctx.moveTo(jx, jy);
                else ctx.lineTo(jx, jy);
              }
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
              ctx.lineWidth = 3.8;
              ctx.stroke();

              ctx.strokeStyle = '#FDE047';
              ctx.lineWidth = 1.8;
              ctx.stroke();

              // 4. Floating "SUPER ARMED" banner over player head
              const badgeW = 78;
              const badgeH = 15;
              const badgeY = targetY - 62;
              ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
              ctx.strokeStyle = '#FDE047';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(targetX - badgeW / 2, badgeY, badgeW, badgeH, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#FFFFFF';
              ctx.font = '900 8.5px Orbitron, monospace';
              ctx.textAlign = 'center';
              ctx.fillText('🔥 SUPER ARMED', targetX, badgeY + 11);
            } else if (isCharged) {
              // Subtle pulsing charge aura indicating ready to arm
              const pulse = 1 + 0.08 * Math.sin(animNow * 0.008);
              ctx.beginPath();
              ctx.arc(targetX, targetY, 42 * pulse, 0, Math.PI * 2);
              ctx.fillStyle = side === 'A' ? 'rgba(34, 211, 238, 0.28)' : 'rgba(251, 146, 60, 0.28)';
              ctx.fill();
            }

            ctx.restore();
          };

          // Chibi Character Renderer (Using Official Mascot Sticker PNGs)
          const drawChibiPlayer = (
            pCtx: CanvasRenderingContext2D,
            side: 'A' | 'B',
            x: number,
            y: number,
            kickTimer: number,
            isMoving: boolean,
            isSuperActive: boolean,
            isSuperCharged: boolean,
            animTime: number
          ) => {
            // 1. Super Aura
            drawSuperAura(x, y, side, isSuperActive, isSuperCharged);

            const isFacingRight = side === 'A';
            const idleImg = side === 'A' ? spritesRef.current.playerAIdle : spritesRef.current.playerBIdle;
            const run1Img = side === 'A' ? spritesRef.current.playerARun1 : spritesRef.current.playerBRun1;
            const run2Img = side === 'A' ? spritesRef.current.playerARun2 : spritesRef.current.playerBRun2;
            const jumpImg = side === 'A' ? spritesRef.current.playerAJump : spritesRef.current.playerBJump;
            const kickImg = side === 'A' ? spritesRef.current.playerAKick : spritesRef.current.playerBKick;

            const isKicking = kickTimer > 0;
            const isJumping = y < GROUND_Y - 36;
            const stepIdx = Math.floor((animTime / 110) % 2);

            let activeImg: HTMLImageElement | undefined;
            let targetH = 84;

            if (isKicking) {
              activeImg = kickImg;
              targetH = 86;
            } else if (isJumping) {
              activeImg = jumpImg || idleImg;
              targetH = 76;
            } else if (isMoving) {
              activeImg = (stepIdx === 0 ? run1Img : run2Img) || idleImg;
              targetH = 78;
            } else {
              activeImg = idleImg;
              targetH = 84;
            }

            pCtx.save();
            // Bottom of feet lands around y + 32 (ground is 390, resting y is 358)
            const feetBottomY = y + 32;
            pCtx.translate(x, feetBottomY);
            if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
              const targetW = targetH * (activeImg.naturalWidth / activeImg.naturalHeight);

              // Center the sprite horizontally over player x
              // For kick pose, slightly offset so the torso center aligns with x
              let offsetX = -targetW / 2;
              if (isKicking) {
                offsetX = isFacingRight ? -targetW * 0.40 : -targetW * 0.60;
              }
              const offsetY = -targetH;

              pCtx.drawImage(activeImg, offsetX, offsetY, targetW, targetH);

              // Dynamic Kick Action Swoosh when kicking
              if (isKicking) {
                pCtx.save();
                pCtx.beginPath();
                if (isFacingRight) {
                  pCtx.arc(targetW * 0.25, -targetH * 0.38, 26, -1.2, 0.4);
                } else {
                  pCtx.arc(-targetW * 0.25, -targetH * 0.38, 26, Math.PI - 0.4, Math.PI + 1.2);
                }
                pCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                pCtx.lineWidth = 3.5;
                pCtx.lineCap = 'round';
                pCtx.stroke();
                pCtx.restore();
              }
            } else {
              // High-quality canvas fallback matching mascot style
              const bodyColor = isFacingRight ? '#0284C7' : '#DC2626';
              const headColor = isFacingRight ? '#38BDF8' : '#F87171';

              // Torso & Legs
              pCtx.fillStyle = bodyColor;
              pCtx.strokeStyle = '#0F172A';
              pCtx.lineWidth = 3.5;
              pCtx.beginPath();
              pCtx.roundRect(-14, -40, 28, 38, 12);
              pCtx.fill();
              pCtx.stroke();

              // Big Head
              pCtx.fillStyle = headColor;
              pCtx.beginPath();
              pCtx.arc(0, -56, 28, 0, Math.PI * 2);
              pCtx.fill();
              pCtx.stroke();

              // Specular Shine
              pCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              pCtx.beginPath();
              pCtx.ellipse(-8, -68, 8, 4, -0.4, 0, Math.PI * 2);
              pCtx.fill();

              // Slanted Fierce Eyes
              pCtx.fillStyle = '#0F172A';
              pCtx.beginPath();
              if (isFacingRight) {
                pCtx.moveTo(2, -58);
                pCtx.lineTo(14, -54);
                pCtx.lineTo(10, -46);
                pCtx.lineTo(0, -50);
              } else {
                pCtx.moveTo(-2, -58);
                pCtx.lineTo(-14, -54);
                pCtx.lineTo(-10, -46);
                pCtx.lineTo(0, -50);
              }
              pCtx.closePath();
              pCtx.fill();
            }

            pCtx.restore();
          };

          // 4. Draw Player A (Left, Cyan)
          const pASuperCharged = (gd?.playerA.superCharge ?? 0) >= 100;
          const pASuperActive = Boolean(gd?.playerA.superActive);
          drawChibiPlayer(ctx, 'A', rs.pAx, rs.pAy, rs.pAkick, isMovingA, pASuperActive, pASuperCharged, now);

          // 5. Draw Player B (Right, Orange)
          const pBSuperCharged = (gd?.playerB.superCharge ?? 0) >= 100;
          const pBSuperActive = Boolean(gd?.playerB.superActive);
          drawChibiPlayer(ctx, 'B', rs.pBx, rs.pBy, rs.pBkick, isMovingB, pBSuperActive, pBSuperCharged, now);

          // "YOU" Floating Marker above active player's character
          if (role === 'player') {
            const isMyPlayerArmed = userSide === 'A' ? pASuperActive : pBSuperActive;
            const myX = userSide === 'A' ? rs.pAx : rs.pBx;
            const myY = (userSide === 'A' ? rs.pAy : rs.pBy) - (isMyPlayerArmed ? 82 : 48);
            const badgeColor = userSide === 'A' ? '#22D3EE' : '#FB923C';

            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = badgeColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(myX - 20, myY - 14, 40, 16, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = badgeColor;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(t('headsoccer.youTag'), myX, myY - 3);
            ctx.restore();
          }

          // 6. Draw Soccer Ball
          ctx.save();
          ctx.translate(rs.bx, rs.by);
          ctx.rotate(rs.bAngle);
          if (rs.isSuper && spritesRef.current.ballSuper) {
            ctx.drawImage(spritesRef.current.ballSuper, -28, -28, 56, 56);
          } else if (spritesRef.current.ball) {
            ctx.drawImage(spritesRef.current.ball, -22, -22, 44, 44);
          } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 7. Draw Left & Right Goals in Foreground (via offscreen bitmap blits)
          const glCv = getOrRenderGoalCanvas('left');
          if (glCv) {
            ctx.drawImage(glCv, 0, 232);
          } else if (spritesRef.current.goalLeft) {
            ctx.drawImage(spritesRef.current.goalLeft, 0, 232, 74, 162);
          }

          const grCv = getOrRenderGoalCanvas('right');
          if (grCv) {
            ctx.drawImage(grCv, ARENA_W - 74, 232);
          } else if (spritesRef.current.goalRight) {
            ctx.drawImage(spritesRef.current.goalRight, ARENA_W - 74, 232, 74, 162);
          }

          // 8. Draw Visual Particles
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const pt = particlesRef.current[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.15;
            pt.alpha -= pt.decay;
            if (pt.alpha <= 0) {
              particlesRef.current.splice(i, 1);
              continue;
            }
            ctx.save();
            ctx.globalAlpha = pt.alpha;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 9. Draw Floating Action Banner (SUPER SHOT / CROSSBAR)
          const fb = floatingBannerRef.current;
          if (fb && Date.now() < fb.expiresAt) {
            ctx.save();
            ctx.font = '900 24px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(fb.text, ARENA_W / 2, 85);
            ctx.fillStyle = fb.color;
            ctx.fillText(fb.text, ARENA_W / 2, 85);
            ctx.restore();
          }

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [getOrRenderGoalCanvas, getOrRenderPitchCanvas, getSuperHaloCanvas, role, t, userSide, warmUpGpuPipeline]);

  // Input handlers
  const handleMoveLeft = useCallback(
    (active: boolean) => {
      const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
      if (active && (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING')) return;
      if (!active && (role !== 'player' || roomState !== 'GAME_ACTIVE')) return;
      isLeftPressedRef.current = active;
      setLeftPressed(active);
      onInput({ left: active });
      if (active) triggerImpact('light');
    },
    [gameData?.phase, onInput, role, roomState, triggerImpact]
  );

  const handleMoveRight = useCallback(
    (active: boolean) => {
      const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
      if (active && (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING')) return;
      if (!active && (role !== 'player' || roomState !== 'GAME_ACTIVE')) return;
      isRightPressedRef.current = active;
      setRightPressed(active);
      onInput({ right: active });
      if (active) triggerImpact('light');
    },
    [gameData?.phase, onInput, role, roomState, triggerImpact]
  );

  // Seamless Slide-to-Switch movement calculation
  const updateMovementFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
      if (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING') return;
      const container = dpadContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const marginX = 45;
      const marginY = 55;
      const inBounds =
        clientX >= rect.left - marginX &&
        clientX <= rect.right + marginX &&
        clientY >= rect.top - marginY &&
        clientY <= rect.bottom + marginY;

      if (!inBounds) {
        if (currentDirectionRef.current !== null) {
          currentDirectionRef.current = null;
          handleMoveLeft(false);
          handleMoveRight(false);
        }
        return;
      }

      const midX = rect.left + rect.width / 2;
      const targetDir: 'left' | 'right' = clientX < midX ? 'left' : 'right';

      if (targetDir !== currentDirectionRef.current) {
        currentDirectionRef.current = targetDir;
        if (targetDir === 'left') {
          handleMoveRight(false);
          handleMoveLeft(true);
        } else {
          handleMoveLeft(false);
          handleMoveRight(true);
        }
      }
    },
    [gameData?.phase, handleMoveLeft, handleMoveRight, role, roomState]
  );

  const handlePointerDownDpad = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      activePointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      updateMovementFromPointer(e.clientX, e.clientY);
    },
    [updateMovementFromPointer]
  );

  const handlePointerMoveDpad = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current === e.pointerId) {
        e.preventDefault();
        updateMovementFromPointer(e.clientX, e.clientY);
      }
    },
    [updateMovementFromPointer]
  );

  const handlePointerUpDpad = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current === e.pointerId) {
        e.preventDefault();
        activePointerIdRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        currentDirectionRef.current = null;
        handleMoveLeft(false);
        handleMoveRight(false);
      }
    },
    [handleMoveLeft, handleMoveRight]
  );

  const handlePointerCancelDpad = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current === e.pointerId) {
        activePointerIdRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        currentDirectionRef.current = null;
        handleMoveLeft(false);
        handleMoveRight(false);
      }
    },
    [handleMoveLeft, handleMoveRight]
  );

  const handleJump = useCallback(() => {
    const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
    if (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING') return;
    const now = Date.now();
    if (now - lastJumpTsRef.current < 350) return; // Strict 350ms debounce against double-jumping
    lastJumpTsRef.current = now;
    setJumpPressed(true);

    // Immediate zero-latency jump impulse
    const rs = renderStateRef.current;
    const currentY = userSide === 'A' ? rs.pAy : rs.pBy;
    if (currentY >= 354) {
      localJumpVyRef.current = -14.4;
    }

    onInput({ jump: true });
    triggerImpact('light');
    setTimeout(() => setJumpPressed(false), 140);
  }, [gameData?.phase, onInput, role, roomState, triggerImpact, userSide]);

  const handleKick = useCallback(() => {
    const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
    if (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING') return;
    setKickPressed(true);
    onInput({ kick: true });
    triggerImpact('medium');
    setTimeout(() => setKickPressed(false), 150);
  }, [gameData?.phase, onInput, role, roomState, triggerImpact]);

  const handleSuper = useCallback(() => {
    const currentPhase = latestGameDataRef.current?.phase || gameData?.phase;
    if (role !== 'player' || roomState !== 'GAME_ACTIVE' || currentPhase !== 'PLAYING') return;
    // Toggles armed state for next kick
    onInput({ super: true });
    triggerImpact('heavy');
  }, [gameData?.phase, onInput, role, roomState, triggerImpact]);

  // Desktop Keyboard support for players
  useEffect(() => {
    if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleMoveLeft(true);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleMoveRight(true);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        handleJump();
      } else if (e.key === ' ' || e.key === 'j' || e.key === 'J' || e.key === 'Enter') {
        handleKick();
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'Shift') {
        handleSuper();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleMoveLeft(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleMoveRight(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleJump, handleKick, handleMoveLeft, handleMoveRight, handleSuper, role, roomState]);

  const scoreA = gameData?.scoreA ?? 0;
  const scoreB = gameData?.scoreB ?? 0;
  const timeRemainingSec = Math.ceil((gameData?.timeRemainingMs ?? 60000) / 1000);
  const minutes = Math.floor(timeRemainingSec / 60);
  const seconds = timeRemainingSec % 60;
  const formattedClock = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  const superChargeA = Math.round(gameData?.playerA.superCharge ?? 0);
  const superChargeB = Math.round(gameData?.playerB.superCharge ?? 0);
  const mySuperCharge = userSide === 'A' ? superChargeA : superChargeB;
  const mySuperActive = Boolean(
    userSide === 'A' ? gameData?.playerA.superActive : gameData?.playerB.superActive
  );
  const mySuperCanArm = mySuperCharge >= 100 || mySuperActive;
  const mySuperReady = mySuperCanArm;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  const displayPlayerBName = hasPlayerB ? playerBName : t('arena.waitingOpponentShort');

  return (
    <div className="relative w-full max-w-lg mx-auto rounded-3xl overflow-hidden border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-black px-2 pt-3 pb-8 sm:p-4 shadow-[0_0_40px_rgba(16,185,129,0.18)] flex flex-col gap-2.5 sm:gap-3 select-none">
      {/* Top Stadium LED Scoreboard (3-column grid so long names never overlap scores) */}
      <div className="w-full z-10 mb-2.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-black/80 border border-white/15 rounded-2xl px-3 py-2.5 shadow-inner">
          {/* Player A (Left - Cyan) */}
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center space-x-1.5 w-full min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] shrink-0" />
              <span className="text-[11px] font-orbitron font-bold text-cyan-200 truncate block">
                {playerAName}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1 border border-cyan-500/30">
              <div
                className={`h-full transition-all duration-150 ${
                  superChargeA >= 100
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-300 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                }`}
                style={{ width: `${Math.min(100, superChargeA)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
              {superChargeA >= 100 ? `🔥 ${t('headsoccer.superReady')}` : `⚡ ${superChargeA}%`}
            </span>
          </div>

          {/* Center Score & Timer */}
          <div className="flex flex-col items-center px-1 shrink-0">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl sm:text-3xl font-orbitron font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                {scoreA}
              </span>
              <div className="flex flex-col items-center">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono font-black text-xs border ${
                    gameData?.isOvertime
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                      : timeRemainingSec <= 10 && roomState === 'GAME_ACTIVE'
                      ? 'bg-rose-500/25 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {gameData?.isOvertime ? `⚡ ${formattedClock}` : formattedClock}
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-orbitron font-black text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">
                {scoreB}
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
              {gameData?.isOvertime ? t('headsoccer.goldenGoal') : `${wagerTon} GRAM`}
            </span>
          </div>

          {/* Player B (Right - Orange) */}
          <div className="flex flex-col items-end min-w-0">
            <div className="flex items-center justify-end space-x-1.5 w-full min-w-0">
              <span className="text-[11px] font-orbitron font-bold text-orange-200 truncate block text-right">
                {displayPlayerBName}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  hasPlayerB ? 'bg-orange-400 shadow-[0_0_8px_#fb923c]' : 'bg-slate-600 animate-ping'
                }`}
              />
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1 border border-orange-500/30">
              <div
                className={`h-full transition-all duration-150 ${
                  superChargeB >= 100
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-300 animate-pulse'
                    : 'bg-gradient-to-r from-orange-500 to-amber-400'
                }`}
                style={{ width: `${Math.min(100, superChargeB)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
              {superChargeB >= 100 ? `🔥 ${t('headsoccer.superReady')}` : `⚡ ${superChargeB}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Socket Error Banner */}
      {socketError && (
        <div className="w-full mb-2 py-1.5 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-chakra text-center">
          {socketError}
        </div>
      )}

      {/* Top Mode / Side Indicator Strip */}
      <div className="w-full flex items-center justify-between px-1 text-[10px] font-mono tracking-wider uppercase">
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              roomState === 'GAME_ACTIVE'
                ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-heading font-black text-slate-300 tracking-wider text-[11px]">
            HEAD SOCCER 1v1
          </span>
        </div>

        {role === 'spectator' ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-heading font-bold">
            {t('headsoccer.liveBroadcast')}
          </span>
        ) : (
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-heading font-bold flex items-center space-x-1.5 ${
              userSide === 'A'
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-orange-500/15 border-orange-400/40 text-orange-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                userSide === 'A' ? 'bg-cyan-400' : 'bg-orange-400'
              }`}
            />
            <span>
              {t('headsoccer.youTag')}:{' '}
              {userSide === 'A' ? t('headsoccer.leftSide') : t('headsoccer.rightSide')}
            </span>
          </span>
        )}
      </div>

      {/* Main Game Screen (Maximum Width, Clean Modern Border, No Bulky Frame) */}
      <div
        className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-emerald-500/50 bg-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.22)]"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      >
          <canvas
            ref={canvasRef}
            width={ARENA_W}
            height={ARENA_H}
            className="w-full h-full object-contain block"
            style={{ transform: 'translateZ(0)' }}
          />

          {/* Final 5 Seconds Big Pulse Warning on Pitch */}
          {roomState === 'GAME_ACTIVE' &&
            gameData?.phase === 'PLAYING' &&
            timeRemainingSec > 0 &&
            timeRemainingSec <= 5 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                <span className="px-3 py-0.5 rounded-full bg-rose-600/80 border border-rose-300 text-white font-orbitron font-black text-sm shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-ping">
                  {timeRemainingSec}s
                </span>
              </div>
            )}

          {/* Kickoff Countdown Overlay */}
          {roomState === 'GAME_ACTIVE' && gameData?.phase === 'KICKOFF_COUNTDOWN' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none">
              <span className="text-xs font-orbitron font-bold uppercase tracking-widest text-emerald-300 mb-1">
                {gameData.isOvertime ? t('headsoccer.goldenGoal') : t('headsoccer.getReady')}
              </span>
              <span className="text-5xl sm:text-6xl font-orbitron font-black text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.9)] animate-bounce">
                {gameData.countdownSec > 0 ? gameData.countdownSec : 'GO!'}
              </span>
            </div>
          )}

          {/* GOAL Celebration Overlay */}
          {roomState === 'GAME_ACTIVE' && gameData?.phase === 'GOAL_CELEBRATION' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 pointer-events-none animate-in zoom-in-95 duration-200">
              <span className="text-4xl sm:text-5xl font-orbitron font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
                GOOOAL!! ⚽
              </span>
              <span className="text-xs sm:text-sm font-orbitron font-bold text-white mt-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                {gameData.lastGoalBy === 'A' ? playerAName : playerBName} ({scoreA} - {scoreB})
              </span>
            </div>
          )}

          {/* FULL TIME (Time Expired) Overlay inside Screen */}
          {roomState === 'GAME_ACTIVE' && gameData?.phase === 'FULL_TIME' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 pointer-events-none animate-in zoom-in-95 duration-200 p-4 text-center">
              <div className="px-3.5 py-1.5 rounded-full bg-amber-500/25 border-2 border-amber-400 text-amber-300 text-xs sm:text-sm font-orbitron font-black uppercase tracking-widest mb-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse flex items-center space-x-1.5">
                <span>⏱️</span>
                <span>{t('headsoccer.finalWhistle')}</span>
              </div>
              <span className="text-3xl sm:text-5xl font-orbitron font-black text-white drop-shadow-[0_0_25px_rgba(16,185,129,0.9)]">
                {scoreA} - {scoreB}
              </span>
              <span className="text-xs font-chakra text-emerald-300 mt-2 flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                <span>{t('headsoccer.settlingMatch')}</span>
              </span>
            </div>
          )}

          {/* Betting Window Overlay inside Screen */}
          {roomState === 'BETTING_WINDOW' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
              <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider animate-pulse flex items-center space-x-1 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('arena.bettingWindowTitle')}</span>
              </span>
              <span className="text-4xl font-mono font-black text-white">
                00:
                {countdownSeconds !== null && countdownSeconds !== undefined
                  ? countdownSeconds < 10
                    ? `0${countdownSeconds}`
                    : countdownSeconds
                  : '20'}
              </span>
              <span className="text-[11px] font-rajdhani text-slate-300 mt-1">
                {t('arena.bettingWindowActiveDesc')}
              </span>
            </div>
          )}

          {/* Lobby Overlay inside Screen */}
          {roomState === 'LOBBY' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-4 text-center">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-orbitron font-bold uppercase tracking-widest mb-2">
                ⚽ HEAD SOCCER 1V1 • 60S
              </div>
              <p className="text-xs sm:text-sm font-chakra text-slate-200 max-w-xs">
                {t('headsoccer.lobbySubtitle')}
              </p>
              <div className="flex items-center space-x-3 mt-3 text-xs font-orbitron max-w-full px-2">
                <span className={`truncate max-w-[120px] ${playerAReady ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {playerAName}: {playerAReady ? 'READY ✓' : '...'}
                </span>
                <span className="text-slate-600 shrink-0">VS</span>
                <span className={`truncate max-w-[120px] ${playerBReady ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {hasPlayerB ? `${playerBName}: ${playerBReady ? 'READY ✓' : '...'}` : t('arena.waitingOpponentShort')}
                </span>
              </div>
            </div>
          )}
        </div>

      {/* Detached On-Screen Game Controls — SHOWN TO PLAYERS DURING ACTIVE MATCH */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && (
        <div className="w-full mt-4 sm:mt-5 flex flex-col space-y-3.5 sm:space-y-4">
          {/* Centered SUPER SHOT Trigger Button */}
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              disabled={!mySuperCanArm}
              onPointerDown={(e) => {
                e.preventDefault();
                if (mySuperCanArm) handleSuper();
              }}
              className={`px-6 py-2.5 sm:py-3 rounded-2xl border-2 flex items-center space-x-3 transition-all touch-none select-none shadow-md ${
                mySuperActive
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-white border-yellow-300 shadow-[0_0_28px_rgba(249,115,22,1)] animate-pulse ring-2 ring-yellow-400 active:scale-95'
                  : mySuperCharge >= 100
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-black border-yellow-200 shadow-[0_0_22px_rgba(249,115,22,0.85)] animate-pulse active:scale-95'
                  : 'bg-slate-900/90 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Flame
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  mySuperActive
                    ? 'text-yellow-200 fill-yellow-200 animate-bounce'
                    : mySuperCharge >= 100
                    ? 'text-black fill-black'
                    : 'text-slate-600'
                }`}
              />
              <span className="text-xs sm:text-sm font-orbitron font-black uppercase tracking-wider">
                {mySuperActive ? t('headsoccer.superArmed') : 'SUPER SHOT'}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-mono font-black px-2 py-0.5 rounded-lg ${
                  mySuperActive
                    ? 'bg-black/40 text-yellow-300'
                    : mySuperCharge >= 100
                    ? 'bg-black/20 text-black'
                    : 'bg-black/50 text-slate-400'
                }`}
              >
                {mySuperActive
                  ? 'ON'
                  : mySuperCharge >= 100
                  ? t('headsoccer.superReady')
                  : `${mySuperCharge}%`}
              </span>
            </button>
          </div>

          {/* Main Controls Row: Detached Left Movement D-Pad & Detached Right Action Buttons */}
          <div className="w-full flex items-center justify-between px-1 sm:px-2 pt-0.5 sm:pt-1">
            {/* Left Side: Movement D-Pad (Left / Right with seamless Slide-to-Switch support) */}
            <div
              ref={dpadContainerRef}
              onPointerDown={handlePointerDownDpad}
              onPointerMove={handlePointerMoveDpad}
              onPointerUp={handlePointerUpDpad}
              onPointerCancel={handlePointerCancelDpad}
              className="p-1 rounded-2xl bg-black/40 border border-white/10 shadow-lg flex items-center space-x-3 sm:space-x-4 touch-none select-none cursor-pointer"
            >
              <div
                className={`w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] min-[400px]:w-[76px] min-[400px]:h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all pointer-events-none select-none ${
                  leftPressed
                    ? 'bg-cyan-400 text-black border-white scale-95 shadow-[0_0_24px_rgba(34,211,238,0.9)]'
                    : 'bg-slate-800/90 text-slate-100 border-slate-600/80 shadow-[0_4px_0_#090d16]'
                }`}
              >
                <ArrowLeft className="w-8 h-8 stroke-[3]" />
                <span className="text-[10px] sm:text-[11px] font-orbitron font-black tracking-wider mt-1">
                  {t('headsoccer.btnLeft')}
                </span>
              </div>

              <div
                className={`w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] min-[400px]:w-[76px] min-[400px]:h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all pointer-events-none select-none ${
                  rightPressed
                    ? 'bg-cyan-400 text-black border-white scale-95 shadow-[0_0_24px_rgba(34,211,238,0.9)]'
                    : 'bg-slate-800/90 text-slate-100 border-slate-600/80 shadow-[0_4px_0_#090d16]'
                }`}
              >
                <ArrowRight className="w-8 h-8 stroke-[3]" />
                <span className="text-[10px] sm:text-[11px] font-orbitron font-black tracking-wider mt-1">
                  {t('headsoccer.btnRight')}
                </span>
              </div>
            </div>

            {/* Right Side: Action Buttons KICK & JUMP (Detached, Spaced Out) */}
            <div className="p-1 rounded-2xl bg-black/40 border border-white/10 shadow-lg flex items-center space-x-3 sm:space-x-4">
              {/* KICK Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleKick();
                }}
                className={`w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] min-[400px]:w-[76px] min-[400px]:h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                  kickPressed
                    ? 'bg-emerald-400 text-black border-white scale-95 shadow-[0_0_26px_rgba(16,185,129,0.9)]'
                    : 'bg-gradient-to-b from-emerald-500 to-teal-700 text-white border-emerald-300 shadow-[0_4px_0_#064e3b] active:translate-y-1'
                }`}
              >
                <Zap className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.8]" />
                <span className="text-[10px] sm:text-[11px] font-orbitron font-black tracking-wider mt-1">
                  {t('headsoccer.btnKick')}
                </span>
              </button>

              {/* JUMP Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleJump();
                }}
                className={`w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] min-[400px]:w-[76px] min-[400px]:h-[76px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                  jumpPressed
                    ? 'bg-indigo-400 text-black border-white scale-95 shadow-[0_0_26px_rgba(99,102,241,0.9)]'
                    : 'bg-gradient-to-b from-indigo-500 to-purple-700 text-white border-indigo-300 shadow-[0_4px_0_#312e81] active:translate-y-1'
                }`}
              >
                <ArrowUp className="w-8 h-8 stroke-[3]" />
                <span className="text-[10px] sm:text-[11px] font-orbitron font-black tracking-wider mt-1">
                  {t('headsoccer.btnJump')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spectator Notice Strip during Active Match (No Game Boy buttons!) */}
      {role === 'spectator' && roomState === 'GAME_ACTIVE' && (
        <div className="w-full mt-2.5 py-2 px-3 bg-black/60 border border-emerald-500/30 rounded-xl text-center">
          <span className="text-xs font-chakra font-bold text-emerald-400">
            {t('headsoccer.spectatorNotice')}
          </span>
        </div>
      )}

      {/* Full-Card Settlement Views (Fixed overlay directly over game screen and device viewport) */}
      {outcomePhase === 'splash' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm py-8 px-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-emerald-500/60 flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(16,185,129,0.35)]">
            {isWinner ? (
              <>
                <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3 filter drop-shadow-[0_0_15px_#f59e0b]" />
                <h2 className="text-2xl font-orbitron font-black text-emerald-400 tracking-wider uppercase animate-pulse">
                  {t('headsoccer.victoryTitle')}
                </h2>
                <p className="text-xs font-chakra text-slate-200 mt-1.5">
                  {t('headsoccer.victoryDesc')}
                </p>
              </>
            ) : role === 'player' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 text-rose-400 animate-pulse">
                  <Swords className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                  {t('headsoccer.defeatTitle')}
                </h2>
                <p className="text-xs font-chakra text-slate-300 mt-1.5">
                  {t('headsoccer.defeatDesc')}
                </p>
              </>
            ) : (
              <>
                <Swords className="w-14 h-14 text-cyan-400 mb-3 animate-pulse" />
                <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
                  {t('arena.duelConcluded')}
                </h2>
              </>
            )}
            <div className="mt-4 px-5 py-2 rounded-2xl bg-white/5 border border-white/10 text-xl font-orbitron font-black text-white tracking-widest shadow-inner">
              {playerAName} {scoreA} - {scoreB} {playerBName}
            </div>
          </div>
        </div>
      )}

      {outcomePhase === 'settled' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm p-5 bg-[#121520] border-2 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center ${
              isWinner ? 'border-emerald-400/80' : 'border-white/15'
            }`}
          >
            {isWinner ? (
              <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-rose-400">
                <Swords className="w-6 h-6" />
              </div>
            )}

            <h2 className="text-xl font-orbitron font-black text-white uppercase">
              {role === 'player'
                ? isWinner
                  ? t('headsoccer.victoryTitle')
                  : t('headsoccer.defeatTitle')
                : t('arena.duelConcluded')}
            </h2>

            <p className="text-sm font-orbitron font-bold text-emerald-400 mt-1 mb-3">
              {playerAName} {scoreA} - {scoreB} {playerBName}
            </p>

            {isWinner && role === 'player' && (
              <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-white/10 w-full flex justify-between items-center text-xs font-chakra">
                <span className="text-slate-400">{t('arena.winnerPrize')}</span>
                <span className="font-bold text-emerald-300 flex items-center space-x-1">
                  <span>+{winnerPayoutTon}</span>
                  <GramIcon className="w-3.5 h-3.5 text-emerald-400 inline" />
                </span>
              </div>
            )}

            {/* Rematch Offer Sent by Me */}
            {rematchOffer && isRematchProposer && role === 'player' && (
              <div className="w-full p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/60 flex flex-col space-y-1.5 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>{t('arena.rematchOfferSent')}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {rematchOffer.newWagerTon} GRAM
                  </span>
                </div>
                <span className="text-[10px] font-chakra text-slate-300">
                  {t('arena.waitingForOpponentRematch')}
                </span>
              </div>
            )}

            {/* Rematch Offer Received */}
            {rematchOffer && !isRematchProposer && role === 'player' && (
              <div className="w-full p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-400/60 mb-2.5 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-orbitron font-bold text-white">
                    {t('arena.rematchChallengeReceived')}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {rematchOffer.newWagerTon} GRAM
                  </span>
                </div>
                {!hasEnoughForRematch ? (
                  <button
                    onClick={() => onOpenDeposit && onOpenDeposit(missingForRematch)}
                    className="w-full py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold font-orbitron"
                  >
                    {t('arena.depositForRematch')}
                  </button>
                ) : (
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={onDeclineRematch}
                      className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300"
                    >
                      {t('arena.decline')}
                    </button>
                    <button
                      onClick={onAcceptRematch}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold font-orbitron shadow-md"
                    >
                      {t('arena.accept2x')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rematch Request Button */}
            {!rematchOffer && onRequestRematch && role === 'player' && (
              !opponentConnected ? (
                <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                  {t('arena.opponentLeft')}
                </div>
              ) : (
                <button
                  onClick={onRequestRematch}
                  className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('arena.rematch2x')}</span>
                </button>
              )
            )}

            {isWinner && (
              <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center space-x-1.5 mb-2">
                <span className="text-xs font-orbitron font-bold text-emerald-400">
                  {t('arena.prizeAutoCredited', { amount: winnerPayoutTon })}
                </span>
              </div>
            )}

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="w-full py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-chakra font-bold hover:text-white"
              >
                {t('arena.backToLobby')}
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* In-Game Disconnect & Forfeit Countdown Popup */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && !opponentConnected && typeof forfeitCountdown === 'number' && forfeitCountdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/70 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mb-3 animate-pulse">
              <WifiOff className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-orbitron font-black text-amber-400 tracking-wider uppercase mb-1">
              {t('arena.opponentDisconnectedTitle')}
            </h3>
            <p className="text-xs font-chakra text-slate-300 max-w-xs mb-3">
              <span className="font-bold text-white">{disconnectedOpponentName || playerBName || 'Avversario'}</span> {t('arena.opponentDisconnectedDesc')}
            </p>
            <div className="w-full py-3 px-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col items-center justify-center mb-3">
              <span className="text-[10px] font-orbitron font-bold text-amber-300 uppercase tracking-widest mb-0.5">
                {t('arena.forfeitCountdownNotice')}
              </span>
              <span className="text-4xl font-mono font-black text-white tracking-widest animate-pulse">
                00:{forfeitCountdown < 10 ? `0${forfeitCountdown}` : forfeitCountdown}
              </span>
            </div>
            <p className="text-[11px] font-chakra text-slate-400 leading-tight">
              {t('arena.forfeitRuleInfo')}
            </p>
          </div>
        </div>
      )}

      {/* Centered Reconnecting Modal if Local Player Network Drops */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-slate-900 via-amber-950/50 to-slate-950 border-2 border-amber-400/70 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
              <WifiOff className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-base font-orbitron font-black text-amber-300 uppercase tracking-wider mb-1">
              {t('arena.reconnectingTitle')}
            </h3>
            <p className="text-xs font-chakra text-slate-300 max-w-xs mb-4">
              {t('arena.reconnectingDesc')}
            </p>
            <div className="w-full flex items-center justify-center py-2 mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-orbitron font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4 text-slate-950" />
                <span>{t('arena.reconnectNow')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lobby Controls when in LOBBY state */}
      {roomState === 'LOBBY' && (
        <div className="w-full z-10 pt-2.5 mt-2 border-t border-white/10 flex flex-col items-center">
          {role === 'player' ? (
            <div className="w-full flex flex-col space-y-2">
              {isCreator && !hasPlayerB && onInviteChallenger && (
                <button
                  onClick={onInviteChallenger}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-orbitron font-extrabold rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-emerald-200" />
                  <span>{t('arena.inviteChallengerBtn')}</span>
                </button>
              )}
              <button
                onClick={onReady}
                disabled={isReady || !hasPlayerB}
                className={`w-full py-3.5 rounded-2xl font-orbitron font-extrabold tracking-wider text-xs sm:text-sm uppercase transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isReady
                    ? 'bg-black/60 border border-white/10 text-slate-400 cursor-not-allowed shadow-inner'
                    : !hasPlayerB
                    ? 'bg-black/40 border border-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>{t('arena.readyWaiting')}</span>
                  </>
                ) : !hasPlayerB ? (
                  <span>{t('arena.waitingForOpponentBtn')}</span>
                ) : (
                  <span>{t('arena.readyToDuel')}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {!hasPlayerB ? (
                <div className="w-full flex flex-col space-y-2">
                  <div className="w-full py-2.5 px-3 bg-black/60 border border-emerald-400/30 rounded-xl text-center">
                    <span className="text-xs font-chakra font-bold text-emerald-300">
                      {t('arena.spectatorWaitingOpponent')}
                    </span>
                  </div>
                  {onJoinAsPlayer && (
                    <button
                      onClick={onJoinAsPlayer}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{t('arena.joinAsPlayer', { amount: wagerTon })}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full py-3 bg-black/60 border border-white/10 rounded-xl text-center">
                  <span className="text-xs font-chakra font-bold text-emerald-400">
                    {t('arena.spectatorWaitingReady')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const HeadSoccerArena = React.memo(HeadSoccerArenaComponent);
