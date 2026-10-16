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

  // Active button press visuals
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [kickPressed, setKickPressed] = useState(false);

  // 2-Phase Settlement Popup state
  const [outcomePhase, setOutcomePhase] = useState<'idle' | 'splash' | 'settled'>('idle');

  useEffect(() => {
    if (roomState === 'MATCH_SETTLED') {
      setOutcomePhase('splash');
      const timer = setTimeout(() => {
        setOutcomePhase('settled');
      }, 1700);
      return () => clearTimeout(timer);
    } else {
      setOutcomePhase('idle');
    }
  }, [roomState]);

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

  // 60FPS Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gd = latestGameDataRef.current;
          const rs = renderStateRef.current;

          if (gd) {
            // Interpolate positions smoothly (lerp factor 0.45 at 60fps for snappy 30Hz sync)
            const lerp = 0.48;
            rs.pAx += (gd.playerA.x - rs.pAx) * lerp;
            rs.pAy += (gd.playerA.y - rs.pAy) * lerp;
            rs.pAkick = gd.playerA.kickTimer;

            rs.pBx += (gd.playerB.x - rs.pBx) * lerp;
            rs.pBy += (gd.playerB.y - rs.pBy) * lerp;
            rs.pBkick = gd.playerB.kickTimer;

            // If ball teleported back to center on kickoff, snap immediately
            if (Math.hypot(gd.ball.x - rs.bx, gd.ball.y - rs.by) > 180) {
              rs.bx = gd.ball.x;
              rs.by = gd.ball.y;
              trailRef.current = [];
            } else {
              rs.bx += (gd.ball.x - rs.bx) * lerp;
              rs.by += (gd.ball.y - rs.by) * lerp;
            }
            rs.bAngle += gd.ball.vx * 0.04;
            rs.isSuper = gd.ball.isSuperShot;

            // Add ball trail point
            if (Math.hypot(gd.ball.vx, gd.ball.vy) > 5.5 || gd.ball.isSuperShot) {
              trailRef.current.push({
                x: rs.bx,
                y: rs.by,
                isSuper: gd.ball.isSuperShot,
                alpha: gd.ball.isSuperShot ? 0.75 : 0.4,
              });
              if (trailRef.current.length > 12) {
                trailRef.current.shift();
              }
            }
          }

          ctx.save();

          // Apply screen shake if active
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

          // 3. Draw Ball Trail
          for (let i = 0; i < trailRef.current.length; i++) {
            const pt = trailRef.current[i];
            pt.alpha *= 0.86;
            if (pt.alpha > 0.03) {
              ctx.beginPath();
              const r = 8 + (i / trailRef.current.length) * 10;
              ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
              ctx.fillStyle = pt.isSuper
                ? `rgba(249, 115, 22, ${pt.alpha})`
                : `rgba(56, 189, 248, ${pt.alpha * 0.7})`;
              ctx.fill();
            }
          }
          trailRef.current = trailRef.current.filter((pt) => pt.alpha > 0.03);

          // 4. Draw Player A (Left, Cyan)
          const pASuperReady = (gd?.playerA.superCharge ?? 0) >= 100 || gd?.playerA.superActive;
          if (pASuperReady) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(rs.pAx, rs.pAy, 42, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
            ctx.fill();
            ctx.restore();
          }

          // Player A Shoe
          ctx.save();
          const shoeAX = rs.pAx + (rs.pAkick > 0 ? 22 : 8);
          const shoeAY = rs.pAy + 26 - (rs.pAkick > 0 ? 8 : 0);
          ctx.translate(shoeAX, shoeAY);
          if (rs.pAkick > 0) ctx.rotate(-0.55);
          if (spritesRef.current.shoeA) {
            ctx.drawImage(spritesRef.current.shoeA, -22, -14, 44, 28);
          }
          ctx.restore();

          // Player A Head
          if (spritesRef.current.headA) {
            ctx.drawImage(spritesRef.current.headA, rs.pAx - 36, rs.pAy - 38, 72, 72);
          } else {
            ctx.fillStyle = '#22D3EE';
            ctx.beginPath();
            ctx.arc(rs.pAx, rs.pAy, 32, 0, Math.PI * 2);
            ctx.fill();
          }

          // 5. Draw Player B (Right, Orange)
          const pBSuperReady = (gd?.playerB.superCharge ?? 0) >= 100 || gd?.playerB.superActive;
          if (pBSuperReady) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(rs.pBx, rs.pBy, 42, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 146, 60, 0.22)';
            ctx.fill();
            ctx.restore();
          }

          // Player B Shoe
          ctx.save();
          const shoeBX = rs.pBx - (rs.pBkick > 0 ? 22 : 8);
          const shoeBY = rs.pBy + 26 - (rs.pBkick > 0 ? 8 : 0);
          ctx.translate(shoeBX, shoeBY);
          if (rs.pBkick > 0) ctx.rotate(0.55);
          if (spritesRef.current.shoeB) {
            ctx.drawImage(spritesRef.current.shoeB, -22, -14, 44, 28);
          }
          ctx.restore();

          // Player B Head
          if (spritesRef.current.headB) {
            ctx.drawImage(spritesRef.current.headB, rs.pBx - 36, rs.pBy - 38, 72, 72);
          } else {
            ctx.fillStyle = '#FB923C';
            ctx.beginPath();
            ctx.arc(rs.pBx, rs.pBy, 32, 0, Math.PI * 2);
            ctx.fill();
          }

          // "YOU" Floating Marker above active player's character
          if (role === 'player') {
            const myX = userSide === 'A' ? rs.pAx : rs.pBx;
            const myY = (userSide === 'A' ? rs.pAy : rs.pBy) - 48;
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

          // 7. Draw Left & Right Goals in Foreground (so ball goes inside net!)
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
            ctx.fillStyle = fb.color;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 10;
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
      setLeftPressed(active);
      onInput({ left: active });
      if (active) triggerImpact('light');
    },
    [onInput, role, roomState, triggerImpact]
  );

  const handleMoveRight = useCallback(
    (active: boolean) => {
      if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
      setRightPressed(active);
      onInput({ right: active });
      if (active) triggerImpact('light');
    },
    [onInput, role, roomState, triggerImpact]
  );

  const handleJump = useCallback(() => {
    if (role !== 'player' || roomState !== 'GAME_ACTIVE') return;
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
    onInput({ super: true, kick: true });
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
  const mySuperReady = mySuperCharge >= 100 || (userSide === 'A' ? gameData?.playerA.superActive : gameData?.playerB.superActive);

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-2.5 sm:p-3.5 shadow-[0_0_40px_rgba(16,185,129,0.18)] flex flex-col justify-between select-none">
      {/* Top Handheld Console Header / Stadium Scoreboard */}
      <div className="w-full z-10 flex flex-col space-y-1.5 mb-2">
        <div className="flex items-center justify-between bg-black/75 border border-white/15 rounded-2xl px-3 py-2 shadow-inner">
          {/* Player A (Left - Cyan) */}
          <div className="flex flex-col items-start min-w-[92px] max-w-[115px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-[11px] font-orbitron font-bold text-cyan-200 truncate">
                {playerAName}
              </span>
            </div>
            {/* Super Charge Bar A */}
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
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">
              {superChargeA >= 100 ? `🔥 ${t('headsoccer.superReady')}` : `⚡ ${superChargeA}%`}
            </span>
          </div>

          {/* Center Score & Timer */}
          <div className="flex flex-col items-center px-2">
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
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
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
          <div className="flex flex-col items-end min-w-[92px] max-w-[115px]">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-orbitron font-bold text-orange-200 truncate">
                {hasPlayerB ? playerBName : t('arena.waitingOpponentShort')}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasPlayerB ? 'bg-orange-400 shadow-[0_0_8px_#fb923c]' : 'bg-slate-600 animate-ping'
                }`}
              />
            </div>
            {/* Super Charge Bar B */}
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
            <span className="text-[9px] font-mono text-slate-400 mt-0.5">
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

      {/* Horizontal 16:9 Cyber Game Boy Screen Bezel */}
      <div className="relative w-full rounded-2xl p-2 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
        {/* Top Bezel Status Strip */}
        <div className="flex items-center justify-between px-2 pb-1.5 text-[9px] font-mono tracking-widest uppercase text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                roomState === 'GAME_ACTIVE'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-bold text-slate-300">SFIDA BOY • 16:9 ARENA</span>
          </div>
          <span>{role === 'spectator' ? t('headsoccer.liveBroadcast') : `P${userSide === 'A' ? '1' : '2'} (${userSide === 'A' ? t('headsoccer.leftSide') : t('headsoccer.rightSide')})`}</span>
        </div>

        {/* 16:9 Canvas Viewport */}
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
          <canvas
            ref={canvasRef}
            width={ARENA_W}
            height={ARENA_H}
            className="w-full h-full object-contain block"
          />

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
              <div className="flex items-center space-x-4 mt-3 text-xs font-orbitron">
                <span className={playerAReady ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {playerAName}: {playerAReady ? 'READY ✓' : '...'}
                </span>
                <span className="text-slate-600">VS</span>
                <span className={playerBReady ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {hasPlayerB ? `${playerBName}: ${playerBReady ? 'READY ✓' : '...'}` : t('arena.waitingOpponentShort')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cyber Retro Game Boy Control Deck — SHOWN ONLY TO PLAYERS DURING ACTIVE MATCH */}
      {role === 'player' && roomState === 'GAME_ACTIVE' && (
        <div className="w-full mt-3 pt-2.5 pb-1 px-2 rounded-2xl bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-black border border-slate-700/80 shadow-inner flex items-center justify-between">
          {/* Left Side: Tactile D-Pad (Left / Right) */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleMoveLeft(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleMoveLeft(false);
              }}
              onPointerLeave={() => {
                if (leftPressed) handleMoveLeft(false);
              }}
              onPointerCancel={() => {
                if (leftPressed) handleMoveLeft(false);
              }}
              className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                leftPressed
                  ? 'bg-cyan-500 text-black border-cyan-200 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.7)]'
                  : 'bg-slate-900/95 text-slate-200 border-slate-600 shadow-[0_5px_0_#0f172a] active:translate-y-1'
              }`}
            >
              <ArrowLeft className="w-7 h-7 stroke-[2.8]" />
              <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                {t('headsoccer.btnLeft')}
              </span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleMoveRight(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleMoveRight(false);
              }}
              onPointerLeave={() => {
                if (rightPressed) handleMoveRight(false);
              }}
              onPointerCancel={() => {
                if (rightPressed) handleMoveRight(false);
              }}
              className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                rightPressed
                  ? 'bg-cyan-500 text-black border-cyan-200 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.7)]'
                  : 'bg-slate-900/95 text-slate-200 border-slate-600 shadow-[0_5px_0_#0f172a] active:translate-y-1'
              }`}
            >
              <ArrowRight className="w-7 h-7 stroke-[2.8]" />
              <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                {t('headsoccer.btnRight')}
              </span>
            </button>
          </div>

          {/* Center Console Grill Details */}
          <div className="hidden xs:flex flex-col items-center space-y-1 opacity-40 px-1">
            <div className="w-6 h-1 rounded-full bg-slate-500" />
            <div className="w-6 h-1 rounded-full bg-slate-500" />
            <div className="w-6 h-1 rounded-full bg-slate-500" />
          </div>

          {/* Right Side: Action Buttons (SUPER, KICK, JUMP) */}
          <div className="flex items-center space-x-2">
            {/* SUPER SHOT Button (lights up when 100% charged) */}
            <button
              type="button"
              disabled={!mySuperReady}
              onPointerDown={(e) => {
                e.preventDefault();
                if (mySuperReady) handleSuper();
              }}
              className={`w-12 h-16 sm:w-14 sm:h-[70px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                mySuperReady
                  ? 'bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 text-black border-yellow-200 shadow-[0_0_24px_rgba(249,115,22,0.85)] animate-pulse active:scale-90'
                  : 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Flame className={`w-5 h-5 ${mySuperReady ? 'text-black fill-black' : 'text-slate-600'}`} />
              <span className="text-[8px] font-orbitron font-black uppercase tracking-tighter mt-0.5">
                SUPER
              </span>
              <span className="text-[8px] font-mono font-bold">
                {mySuperReady ? 'MAX' : `${mySuperCharge}%`}
              </span>
            </button>

            {/* KICK Button (B) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleKick();
              }}
              className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                kickPressed
                  ? 'bg-emerald-400 text-black border-white scale-95 shadow-[0_0_25px_rgba(16,185,129,0.85)]'
                  : 'bg-gradient-to-b from-emerald-500 to-teal-700 text-white border-emerald-300 shadow-[0_5px_0_#064e3b] active:translate-y-1'
              }`}
            >
              <Zap className="w-6 h-6 stroke-[2.6]" />
              <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                {t('headsoccer.btnKick')}
              </span>
            </button>

            {/* JUMP Button (A) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleJump();
              }}
              className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full border-2 flex flex-col items-center justify-center transition-all touch-none select-none ${
                jumpPressed
                  ? 'bg-indigo-400 text-black border-white scale-95 shadow-[0_0_25px_rgba(99,102,241,0.85)]'
                  : 'bg-gradient-to-b from-indigo-500 to-purple-700 text-white border-indigo-300 shadow-[0_5px_0_#312e81] active:translate-y-1'
              }`}
            >
              <ArrowUp className="w-6 h-6 stroke-[2.8]" />
              <span className="text-[9px] font-orbitron font-black tracking-wider mt-0.5">
                {t('headsoccer.btnJump')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Spectator Notice Strip during Active Match (No Game Boy buttons!) */}
      {role === 'spectator' && roomState === 'GAME_ACTIVE' && (
        <div className="w-full mt-2 py-2 px-3 bg-black/60 border border-emerald-500/30 rounded-xl text-center">
          <span className="text-xs font-chakra font-bold text-emerald-400">
            {t('headsoccer.spectatorNotice')}
          </span>
        </div>
      )}

      {/* 2-Phase Settlement Overlays */}
      {outcomePhase === 'splash' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className={`flex flex-col items-center p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
              isWinner
                ? 'bg-gradient-to-b from-emerald-950/40 via-black/95 to-black border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]'
                : role === 'player'
                ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-b from-cyan-950/40 via-black/95 to-black border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mb-3 text-3xl">
              ⚽
            </div>
            <h2 className="text-2xl font-orbitron font-black tracking-wider text-white uppercase">
              {t('headsoccer.fullTime')}
            </h2>
            <p className="text-2xl font-orbitron font-black text-emerald-400 mt-2">
              {scoreA} - {scoreB}
            </p>
          </div>
        </div>
      )}

      {outcomePhase === 'settled' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex flex-col items-center p-5 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
              isWinner
                ? 'bg-gradient-to-b from-emerald-950/50 via-black/95 to-black border-emerald-500/80'
                : role === 'player'
                ? 'bg-gradient-to-b from-rose-950/50 via-black/95 to-black border-rose-500/80'
                : 'bg-gradient-to-b from-slate-900 via-black/95 to-black border-cyan-500/60'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border ${
                isWinner
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              <Trophy className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-orbitron font-black uppercase text-white mb-1">
              {role === 'player'
                ? isWinner
                  ? t('arena.victory')
                  : t('arena.defeat')
                : t('arena.matchConcluded')}
            </h3>

            <p className="text-sm font-orbitron font-bold text-emerald-400 mb-3">
              {playerAName} {scoreA} - {scoreB} {playerBName}
            </p>

            {isWinner && role === 'player' && (
              <div className="flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 rounded-xl mb-3">
                <span className="text-sm font-orbitron font-black text-emerald-300">
                  +{winnerPayoutTon}
                </span>
                <GramIcon className="w-4 h-4" />
              </div>
            )}

            {/* Rematch Incoming Offer */}
            {rematchOffer && !isRematchProposer && role === 'player' && (
              <div className="w-full p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-400/60 mb-2.5 flex flex-col space-y-2">
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
                className="w-full py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-chakra font-bold hover:text-white"
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
