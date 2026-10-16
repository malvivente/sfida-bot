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
  headA?: HTMLImageElement;
  headB?: HTMLImageElement;
  shoeA?: HTMLImageElement;
  shoeB?: HTMLImageElement;
  ball?: HTMLImageElement;
  ballSuper?: HTMLImageElement;
}

export const HeadSoccerArena: React.FC<HeadSoccerArenaProps> = ({
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
}) => {
  const { t } = useI18n();
  const { triggerImpact, triggerNotification } = useHaptics();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<SpriteBank>({});
  const particlesRef = useRef<VisualParticle[]>([]);
  const trailRef = useRef<BallTrailPoint[]>([]);
  const lastEventTsRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const floatingBannerRef = useRef<{ text: string; color: string; expiresAt: number } | null>(null);
  const lastJumpTsRef = useRef<number>(0);

  // Smooth client-side interpolation target & current state
  const renderStateRef = useRef({
    pAx: 175,
    pAy: 358,
    pAkick: 0,
    pBx: 625,
    pBy: 358,
    pBkick: 0,
    bx: 400,
    by: 165,
    bAngle: 0,
    isSuper: false,
  });
  const latestGameDataRef = useRef<HeadSoccerState | undefined>(gameData);

  // Direct socket tick subscription to update physics targets without React re-render overhead
  useEffect(() => {
    if (!onSubscribeTick) return;
    const unsub = onSubscribeTick((freshData) => {
      latestGameDataRef.current = freshData;
    });
    return unsub;
  }, [onSubscribeTick]);

  // Active button press visuals & immediate zero-latency refs
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [kickPressed, setKickPressed] = useState(false);
  const isLeftPressedRef = useRef(false);
  const isRightPressedRef = useRef(false);

  // D-Pad continuous slide / touch tracking refs
  const dpadContainerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const currentDirectionRef = useRef<'left' | 'right' | null>(null);

  // 2-Phase Settlement Popup state
  const [outcomePhase, setOutcomePhase] = useState<'idle' | 'splash' | 'settled'>('idle');

  useEffect(() => {
    if (roomState === 'MATCH_SETTLED') {
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

  // Preload custom SVG/PNG sprites from /assets/games/headsoccer/
  useEffect(() => {
    const loadImg = (src: string, onLoad: (img: HTMLImageElement) => void) => {
      const img = new Image();
      img.onload = () => onLoad(img);
      img.src = src;
    };

    loadImg('/assets/games/headsoccer/pitch_bg.svg', (img) => {
      spritesRef.current.pitchBg = img;
    });
    loadImg('/assets/games/headsoccer/goal_left.svg', (img) => {
      spritesRef.current.goalLeft = img;
    });
    loadImg('/assets/games/headsoccer/goal_right.svg', (img) => {
      spritesRef.current.goalRight = img;
    });
    loadImg('/assets/games/headsoccer/player_a_head.svg', (img) => {
      spritesRef.current.headA = img;
    });
    loadImg('/assets/games/headsoccer/player_b_head.svg', (img) => {
      spritesRef.current.headB = img;
    });
    loadImg('/assets/games/headsoccer/shoe_a.svg', (img) => {
      spritesRef.current.shoeA = img;
    });
    loadImg('/assets/games/headsoccer/shoe_b.svg', (img) => {
      spritesRef.current.shoeB = img;
    });
    loadImg('/assets/games/headsoccer/ball.svg', (img) => {
      spritesRef.current.ball = img;
    });
    loadImg('/assets/games/headsoccer/ball_super.svg', (img) => {
      spritesRef.current.ballSuper = img;
    });
  }, []);

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

  // Sync latest server tick & trigger visual particles / haptics (ZERO audio)
  useEffect(() => {
    latestGameDataRef.current = gameData;
    if (!gameData) return;

    const ev = gameData.lastEvent;
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
  }, [gameData, role, spawnBurst, t, triggerImpact, triggerNotification]);

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
              rs.pBy += (gd.playerB.y - rs.pBy) * yLerp;
            } else {
              rs.pBx += (gd.playerB.x - rs.pBx) * remoteLerp;
              rs.pBy += (gd.playerB.y - rs.pBy) * yLerp;
            }
            rs.pBkick = gd.playerB.kickTimer;

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

          // 1. Draw Stadium Pitch Background
          if (spritesRef.current.pitchBg) {
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
              // 1. Concentric pulsing fiery halo
              const pulse = 1 + 0.12 * Math.sin(animNow * 0.012);
              const gradR = 48 * pulse;
              const auraGrad = ctx.createRadialGradient(targetX, targetY, 8, targetX, targetY, gradR);
              auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)'); // incandescent yellow core
              auraGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.7)'); // flame orange
              auraGrad.addColorStop(0.75, 'rgba(239, 68, 68, 0.4)'); // fiery red
              auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

              ctx.beginPath();
              ctx.arc(targetX, targetY, gradR, 0, Math.PI * 2);
              ctx.fillStyle = auraGrad;
              ctx.fill();

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

          // Chibi Character Renderer (Matching official Head Soccer sticker art)
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

            const headImg = side === 'A' ? spritesRef.current.headA : spritesRef.current.headB;
            const shoeImg = side === 'A' ? spritesRef.current.shoeA : spritesRef.current.shoeB;
            const isFacingRight = side === 'A';

            // Walk cycle animation
            const walkPhase = animTime * 0.022;
            const walkBobX = isMoving ? Math.sin(walkPhase) * 6 : 0;
            const walkBobY = isMoving ? Math.abs(Math.cos(walkPhase)) * -4 : 0;
            const frontBobX = isMoving ? -Math.sin(walkPhase) * 6 : 0;
            const frontBobY = isMoving ? Math.abs(Math.sin(walkPhase)) * -4 : 0;

            // 2. Draw Back Foot (behind body)
            pCtx.save();
            const backFootX = isFacingRight ? x - 10 + walkBobX : x + 10 - walkBobX;
            const backFootY = y + 26 + walkBobY;
            pCtx.translate(backFootX, backFootY);
            pCtx.scale(0.88, 0.88);
            pCtx.globalAlpha = 0.85; // Slightly shaded for depth
            if (shoeImg) {
              pCtx.drawImage(shoeImg, -18, -12, 36, 24);
            } else {
              pCtx.fillStyle = isFacingRight ? '#0284C7' : '#DC2626';
              pCtx.beginPath();
              pCtx.ellipse(0, 0, 14, 8, isFacingRight ? 0.2 : -0.2, 0, Math.PI * 2);
              pCtx.fill();
            }
            pCtx.restore();

            // 3. Draw Chibi Head & Mini Bean Torso
            pCtx.save();
            if (headImg) {
              pCtx.drawImage(headImg, x - 37, y - 41, 74, 74);
            } else {
              // Vector Chibi fallback matching sticker art
              // Mini Bean Body
              const bodyGrad = pCtx.createLinearGradient(x - 12, y + 10, x + 12, y + 30);
              if (isFacingRight) {
                bodyGrad.addColorStop(0, '#0284C7');
                bodyGrad.addColorStop(1, '#1E3A8A');
              } else {
                bodyGrad.addColorStop(0, '#DC2626');
                bodyGrad.addColorStop(1, '#7F1D1D');
              }
              pCtx.fillStyle = bodyGrad;
              pCtx.strokeStyle = '#0F172A';
              pCtx.lineWidth = 3;
              pCtx.beginPath();
              pCtx.roundRect(x - 12, y + 12, 24, 18, 9);
              pCtx.fill();
              pCtx.stroke();

              // Big Round Head
              const headGrad = pCtx.createRadialGradient(x - 6, y - 10, 4, x, y - 4, 32);
              if (isFacingRight) {
                headGrad.addColorStop(0, '#38BDF8');
                headGrad.addColorStop(0.6, '#0284C7');
                headGrad.addColorStop(1, '#1D4ED8');
              } else {
                headGrad.addColorStop(0, '#F87171');
                headGrad.addColorStop(0.6, '#DC2626');
                headGrad.addColorStop(1, '#991B1B');
              }
              pCtx.fillStyle = headGrad;
              pCtx.beginPath();
              pCtx.arc(x, y - 6, 29, 0, Math.PI * 2);
              pCtx.fill();
              pCtx.stroke();

              // Specular glossy highlight
              pCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              pCtx.beginPath();
              pCtx.ellipse(x - 10, y - 18, 9, 4, -0.5, 0, Math.PI * 2);
              pCtx.fill();

              // Fierce slanted chibi ninja eyes
              pCtx.fillStyle = '#0F172A';
              if (isFacingRight) {
                pCtx.beginPath();
                pCtx.moveTo(x + 2, y - 10);
                pCtx.lineTo(x + 13, y - 7);
                pCtx.lineTo(x + 10, y + 2);
                pCtx.lineTo(x + 1, y - 1);
                pCtx.closePath();
                pCtx.fill();

                pCtx.beginPath();
                pCtx.moveTo(x + 16, y - 8);
                pCtx.lineTo(x + 24, y - 3);
                pCtx.lineTo(x + 20, y + 4);
                pCtx.lineTo(x + 14, y);
                pCtx.closePath();
                pCtx.fill();
              } else {
                pCtx.beginPath();
                pCtx.moveTo(x - 2, y - 10);
                pCtx.lineTo(x - 13, y - 7);
                pCtx.lineTo(x - 10, y + 2);
                pCtx.lineTo(x - 1, y - 1);
                pCtx.closePath();
                pCtx.fill();

                pCtx.beginPath();
                pCtx.moveTo(x - 16, y - 8);
                pCtx.lineTo(x - 24, y - 3);
                pCtx.lineTo(x - 20, y + 4);
                pCtx.lineTo(x - 14, y);
                pCtx.closePath();
                pCtx.fill();
              }
            }
            pCtx.restore();

            // 4. Draw Front Foot / Kicking Foot (in front of body)
            pCtx.save();
            const isKicking = kickTimer > 0;
            let frontFootX: number;
            let frontFootY: number;
            let frontRot = 0;

            if (isKicking) {
              const kickProgress = Math.min(1, kickTimer / 5);
              if (isFacingRight) {
                frontFootX = x + 16 + kickProgress * 14;
                frontFootY = y + 22 - kickProgress * 15;
                frontRot = -0.7 - kickProgress * 0.4;
              } else {
                frontFootX = x - 16 - kickProgress * 14;
                frontFootY = y + 22 - kickProgress * 15;
                frontRot = 0.7 + kickProgress * 0.4;
              }
            } else {
              frontFootX = isFacingRight ? x + 10 + frontBobX : x - 10 - frontBobX;
              frontFootY = y + 26 + frontBobY;
            }

            pCtx.translate(frontFootX, frontFootY);
            pCtx.rotate(frontRot);
            if (shoeImg) {
              pCtx.drawImage(shoeImg, -19, -12, 38, 24);
            } else {
              pCtx.fillStyle = isFacingRight ? '#38BDF8' : '#F87171';
              pCtx.strokeStyle = '#0F172A';
              pCtx.lineWidth = 2.5;
              pCtx.beginPath();
              pCtx.ellipse(0, 0, 16, 9, isFacingRight ? 0.15 : -0.15, 0, Math.PI * 2);
              pCtx.fill();
              pCtx.stroke();
            }

            // If kicking, draw dynamic motion swoosh arc
            if (isKicking) {
              pCtx.beginPath();
              if (isFacingRight) {
                pCtx.arc(-10, 8, 22, -1.3, 0.4);
              } else {
                pCtx.arc(10, 8, 22, Math.PI - 0.4, Math.PI + 1.3);
              }
              pCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
              pCtx.lineWidth = 3;
              pCtx.lineCap = 'round';
              pCtx.stroke();
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

          // 7. Draw Left & Right Goals in Foreground
          if (spritesRef.current.goalLeft) {
            ctx.drawImage(spritesRef.current.goalLeft, 0, 232, 74, 162);
          }
          if (spritesRef.current.goalRight) {
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
  }, [role, t, userSide]);

  // Input handlers
  const handleMoveLeft = useCallback(
    (active: boolean) => {
      if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
      isLeftPressedRef.current = active;
      setLeftPressed(active);
      onInput({ left: active });
      if (active) triggerImpact('light');
    },
    [onInput, role, roomState, triggerImpact]
  );

  const handleMoveRight = useCallback(
    (active: boolean) => {
      if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
      isRightPressedRef.current = active;
      setRightPressed(active);
      onInput({ right: active });
      if (active) triggerImpact('light');
    },
    [onInput, role, roomState, triggerImpact]
  );

  // Seamless Slide-to-Switch movement calculation
  const updateMovementFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
      const container = dpadContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const marginX = 35;
      const marginY = 45;
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
    [handleMoveLeft, handleMoveRight, role, roomState]
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
    if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
    const now = Date.now();
    if (now - lastJumpTsRef.current < 350) return; // Strict 350ms debounce against double-jumping
    lastJumpTsRef.current = now;
    setJumpPressed(true);
    onInput({ jump: true });
    triggerImpact('light');
    setTimeout(() => setJumpPressed(false), 140);
  }, [onInput, role, roomState, triggerImpact]);

  const handleKick = useCallback(() => {
    if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
    setKickPressed(true);
    onInput({ kick: true });
    triggerImpact('medium');
    setTimeout(() => setKickPressed(false), 150);
  }, [onInput, role, roomState, triggerImpact]);

  const handleSuper = useCallback(() => {
    if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
    // Toggles armed state for next kick
    onInput({ super: true });
    triggerImpact('heavy');
  }, [onInput, role, roomState, triggerImpact]);

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
    <div className="relative w-full min-h-[calc(100vh-140px)] sm:min-h-0 rounded-3xl overflow-hidden border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-3 sm:p-4 shadow-[0_0_40px_rgba(16,185,129,0.18)] flex flex-col justify-between select-none">
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

      {/* Horizontal Screen Bezel */}
      <div className="relative w-full rounded-2xl p-2 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
        {/* Top Bezel Status Strip (No "16:9 ARENA", clean side indicator pill) */}
        <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-mono tracking-wider uppercase">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                roomState === 'GAME_ACTIVE'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-orbitron font-black text-slate-300 tracking-widest">
              SFIDA BOY
            </span>
          </div>

          {role === 'spectator' ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-orbitron font-bold">
              {t('headsoccer.liveBroadcast')}
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full border text-[9px] font-orbitron font-bold flex items-center space-x-1 ${
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

        {/* 16:9 Canvas Viewport */}
        <div
          className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] pointer-events-none">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-none animate-in zoom-in-95 duration-200">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-none animate-in zoom-in-95 duration-200 p-4 text-center">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-center">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[2px] p-4 text-center">
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
      </div>

      {/* Classic Handheld Console Lower Deck — SHOWN TO PLAYERS DURING ACTIVE MATCH */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && (
        <div className="w-full mt-auto pt-3.5 pb-3 sm:pb-4 px-2 sm:px-4 rounded-3xl bg-gradient-to-b from-slate-800/95 via-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05),0_10px_25px_rgba(0,0,0,0.6)] flex flex-col space-y-2.5">
          {/* Top SUPER SHOT Trigger Bar */}
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 opacity-60">
              <div className="w-1.5 h-3.5 rounded-full bg-slate-600" />
              <div className="w-1.5 h-3.5 rounded-full bg-slate-600" />
              <div className="w-1.5 h-3.5 rounded-full bg-slate-600" />
              <span className="text-[9px] font-orbitron font-bold text-slate-400 tracking-widest ml-1">
                POCKET PAD
              </span>
            </div>

            {/* Dedicated Wide SUPER SHOT Button with Active Armed State */}
            <button
              type="button"
              disabled={!mySuperCanArm}
              onPointerDown={(e) => {
                e.preventDefault();
                if (mySuperCanArm) handleSuper();
              }}
              className={`px-3.5 py-1.5 rounded-xl border-2 flex items-center space-x-2 transition-all touch-none select-none ${
                mySuperActive
                  ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-white border-yellow-300 shadow-[0_0_28px_rgba(249,115,22,1)] animate-pulse ring-2 ring-yellow-400 active:scale-95'
                  : mySuperCharge >= 100
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-black border-yellow-200 shadow-[0_0_20px_rgba(249,115,22,0.85)] animate-pulse active:scale-95'
                  : 'bg-slate-900/90 text-slate-500 border-slate-700/80 cursor-not-allowed'
              }`}
            >
              <Flame
                className={`w-4 h-4 ${
                  mySuperActive
                    ? 'text-yellow-200 fill-yellow-200 animate-bounce'
                    : mySuperCharge >= 100
                    ? 'text-black fill-black'
                    : 'text-slate-600'
                }`}
              />
              <span className="text-[11px] font-orbitron font-black uppercase tracking-wider">
                {mySuperActive ? t('headsoccer.superArmed') : 'SUPER SHOT'}
              </span>
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
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

          {/* Main Console Controls Row: Left D-Pad Cradle & Right Action Buttons */}
          <div className="w-full flex items-center justify-between px-1">
            {/* Left Side: Recessed Console D-Pad (Left / Right with seamless Slide-to-Switch support) */}
            <div
              ref={dpadContainerRef}
              onPointerDown={handlePointerDownDpad}
              onPointerMove={handlePointerMoveDpad}
              onPointerUp={handlePointerUpDpad}
              onPointerCancel={handlePointerCancelDpad}
              className="p-1.5 rounded-2xl bg-black/60 border border-slate-700/80 shadow-inner flex items-center space-x-2.5 touch-none select-none cursor-pointer"
            >
              <div
                className={`w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all pointer-events-none select-none ${
                  leftPressed
                    ? 'bg-cyan-400 text-black border-white scale-95 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                    : 'bg-slate-800 text-slate-100 border-slate-600 shadow-[0_4px_0_#090d16]'
                }`}
              >
                <ArrowLeft className="w-7 h-7 stroke-[2.8]" />
                <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                  {t('headsoccer.btnLeft')}
                </span>
              </div>

              <div
                className={`w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all pointer-events-none select-none ${
                  rightPressed
                    ? 'bg-cyan-400 text-black border-white scale-95 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                    : 'bg-slate-800 text-slate-100 border-slate-600 shadow-[0_4px_0_#090d16]'
                }`}
              >
                <ArrowRight className="w-7 h-7 stroke-[2.8]" />
                <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                  {t('headsoccer.btnRight')}
                </span>
              </div>
            </div>

            {/* Right Side: Action Buttons KICK & JUMP (clean layout, no A/B letters, 100% inside card bounds) */}
            <div className="p-1.5 rounded-2xl bg-black/60 border border-slate-700/80 shadow-inner flex items-center space-x-2.5">
              {/* KICK Button */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleKick();
                }}
                className={`w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                  kickPressed
                    ? 'bg-emerald-400 text-black border-white scale-95 shadow-[0_0_25px_rgba(16,185,129,0.85)]'
                    : 'bg-gradient-to-b from-emerald-500 to-teal-700 text-white border-emerald-300 shadow-[0_4px_0_#064e3b] active:translate-y-1'
                }`}
              >
                <Zap className="w-6 h-6 stroke-[2.6]" />
                <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
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
                className={`w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                  jumpPressed
                    ? 'bg-indigo-400 text-black border-white scale-95 shadow-[0_0_25px_rgba(99,102,241,0.85)]'
                    : 'bg-gradient-to-b from-indigo-500 to-purple-700 text-white border-indigo-300 shadow-[0_4px_0_#312e81] active:translate-y-1'
                }`}
              >
                <ArrowUp className="w-6 h-6 stroke-[2.8]" />
                <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
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
