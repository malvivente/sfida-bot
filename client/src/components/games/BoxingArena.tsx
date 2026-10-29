import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Loader2,
  Swords,
  Flame,
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react';
import { BoxingState, BoxerState, BoxingHitEvent } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';

interface BoxingArenaProps {
  gameData?: BoxingState;
  role: 'player' | 'spectator';
  onInput?: (input: {
    left?: boolean;
    right?: boolean;
    block?: boolean;
    jab?: boolean;
    hook?: boolean;
    dodge?: boolean;
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
  winnerName?: string;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B';
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
  onSubscribeTick?: (callback: (data: BoxingState) => void) => () => void;
  forfeitCountdown?: number | null;
  disconnectedOpponentName?: string;
  isConnected?: boolean;
  onReconnect?: () => void;
}

const ARENA_W = 800;
const ARENA_H = 450;
const FLOOR_Y = 380;

interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  scale: number;
  alpha: number;
}

interface BoxingSprites {
  ringBg?: HTMLImageElement;
  boxerAIdle?: HTMLImageElement;
  boxerAJab?: HTMLImageElement;
  boxerAHook?: HTMLImageElement;
  boxerABlock?: HTMLImageElement;
  boxerAHurt?: HTMLImageElement;
  boxerBIdle?: HTMLImageElement;
  boxerBJab?: HTMLImageElement;
  boxerBHook?: HTMLImageElement;
  boxerBBlock?: HTMLImageElement;
  boxerBHurt?: HTMLImageElement;
}

const BOXING_SPRITE_PATHS = {
  ringBg: '/assets/games/boxing/ring_bg.webp',
  boxerAIdle: '/assets/games/boxing/boxer_a_idle.webp',
  boxerAJab: '/assets/games/boxing/boxer_a_jab.webp',
  boxerAHook: '/assets/games/boxing/boxer_a_hook.webp',
  boxerABlock: '/assets/games/boxing/boxer_a_block.webp',
  boxerAHurt: '/assets/games/boxing/boxer_a_hurt.webp',
  boxerBIdle: '/assets/games/boxing/boxer_b_idle.webp',
  boxerBJab: '/assets/games/boxing/boxer_b_jab.webp',
  boxerBHook: '/assets/games/boxing/boxer_b_hook.webp',
  boxerBBlock: '/assets/games/boxing/boxer_b_block.webp',
  boxerBHurt: '/assets/games/boxing/boxer_b_hurt.webp',
};

const BOXING_SPRITE_CACHE: Record<string, HTMLImageElement> = {};

function getOrLoadBoxingSprite(src: string): HTMLImageElement {
  if (BOXING_SPRITE_CACHE[src]) {
    return BOXING_SPRITE_CACHE[src];
  }
  const img = new Image();
  img.src = src;
  BOXING_SPRITE_CACHE[src] = img;
  return img;
}

export const BoxingArena: React.FC<BoxingArenaProps> = ({
  gameData,
  role,
  onInput,
  playerAName,
  playerBName = 'Avversario',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
  onReady,
  roomState,
  wagerTon,
  isWinner,
  winnerName,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  userSide = 'A',
  hasPlayerB = Boolean(playerBName && playerBName !== 'In attesa...'),
  onJoinAsPlayer,
  onInviteChallenger,
  onSubscribeTick,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<BoxingSprites>({
    ringBg: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.ringBg),
    boxerAIdle: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerAIdle),
    boxerAJab: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerAJab),
    boxerAHook: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerAHook),
    boxerABlock: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerABlock),
    boxerAHurt: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerAHurt),
    boxerBIdle: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerBIdle),
    boxerBJab: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerBJab),
    boxerBHook: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerBHook),
    boxerBBlock: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerBBlock),
    boxerBHurt: getOrLoadBoxingSprite(BOXING_SPRITE_PATHS.boxerBHurt),
  });

  const [localState, setLocalState] = useState<BoxingState | undefined>(gameData);
  const particlesRef = useRef<CombatParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);
  const lastProcessedHitId = useRef<string | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const isF2P = parseFloat(wagerTon || '0') === 0;
  const isSettled = roomState === 'MATCH_SETTLED' || roomState === 'SETTLED' || roomState === 'FORFEITED';
  const isLobby = roomState === 'LOBBY' || roomState === 'WAITING_FOR_DEPLOY';

  // Subscribe to high-frequency WebSocket ticks if available
  useEffect(() => {
    if (onSubscribeTick) {
      const unsub = onSubscribeTick((freshData) => {
        setLocalState(freshData);
      });
      return () => unsub();
    }
  }, [onSubscribeTick]);

  useEffect(() => {
    if (gameData) setLocalState(gameData);
  }, [gameData]);


  // Process hit events for particles and floating text
  useEffect(() => {
    const hit = localState?.lastHitEvent;
    if (!hit || hit.id === lastProcessedHitId.current) return;
    lastProcessedHitId.current = hit.id;

    const defender = hit.defender === 'A' ? localState?.boxerA : localState?.boxerB;
    const hitX = defender ? defender.x : 400;
    const hitY = FLOOR_Y - 90;

    // Trigger Screen Shake
    if (hit.type === 'UPPERCUT') {
      screenShakeRef.current = 14;
      triggerImpact('heavy');
    } else if (hit.isCrit || hit.type === 'HOOK') {
      screenShakeRef.current = 8;
      triggerImpact('heavy');
    } else {
      screenShakeRef.current = 4;
      triggerImpact('medium');
    }

    // Spawn Particles
    const count = hit.type === 'UPPERCUT' ? 26 : hit.isCrit ? 18 : 10;
    const pColor = hit.isBlocked ? '#60a5fa' : hit.isCrit ? '#fbbf24' : '#f43f5e';

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - (Math.PI / 2);
      const speed = 3 + Math.random() * 8;
      particlesRef.current.push({
        x: hitX + (Math.random() - 0.5) * 20,
        y: hitY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed * (hit.defender === 'A' ? -1 : 1),
        vy: -Math.abs(Math.sin(angle) * speed) - 2,
        size: 3 + Math.random() * 4,
        color: pColor,
        alpha: 1,
        decay: 0.03 + Math.random() * 0.03,
      });
    }

    // Spawn Floating Text
    let label = `-${hit.damage}`;
    let textColor = '#ffffff';

    if (hit.isBlocked) {
      label = `🛡️ BLOCKED -${hit.damage}`;
      textColor = '#93c5fd';
    } else if (hit.type === 'COUNTER') {
      label = `💥 COUNTER! -${hit.damage}`;
      textColor = '#fef08a';
    } else if (hit.type === 'UPPERCUT') {
      label = `⚡ SUPER K.O.! -${hit.damage}`;
      textColor = '#f59e0b';
    }

    floatingTextsRef.current.push({
      id: hit.id,
      text: label,
      x: hitX,
      y: hitY - 40,
      vy: -1.8,
      color: textColor,
      scale: hit.type === 'UPPERCUT' ? 1.4 : hit.isCrit ? 1.2 : 1.0,
      alpha: 1,
    });
  }, [localState?.lastHitEvent, triggerImpact]);

  // Input helpers for player
  const sendInput = useCallback(
    (inputPayload: {
      left?: boolean;
      right?: boolean;
      block?: boolean;
      jab?: boolean;
      hook?: boolean;
      dodge?: boolean;
      super?: boolean;
    }) => {
      if (role !== 'player' || !onInput) return;
      onInput(inputPayload);
    },
    [role, onInput]
  );

  // Keyboard controls for desktop pair testing
  useEffect(() => {
    if (role !== 'player') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysPressed.current[e.key.toLowerCase()] = true;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        sendInput({ left: true });
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        sendInput({ right: true });
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        sendInput({ block: true });
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        triggerImpact('light');
        sendInput({ dodge: true });
      } else if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'z') {
        sendInput({ jab: true });
      } else if (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'x') {
        sendInput({ hook: true });
      } else if (e.key === ' ' || e.key.toLowerCase() === 'c') {
        sendInput({ super: true });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        sendInput({ left: false });
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        sendInput({ right: false });
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        sendInput({ block: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [role, sendInput, triggerImpact]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, ARENA_W, ARENA_H);

      // Screen Shake application
      ctx.save();
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.7);
      }

      // 1. Draw Ring Background
      const bgImg = spritesRef.current.ringBg;
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, ARENA_W, ARENA_H);
      } else {
        // Fallback classic boxing arena
        const grad = ctx.createLinearGradient(0, 0, 0, ARENA_H);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.7, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ARENA_W, ARENA_H);

        // Ring canvas mat
        ctx.fillStyle = '#242f42';
        ctx.fillRect(70, FLOOR_Y - 45, 660, 115);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(70, FLOOR_Y - 45, 660, 115);

        // Ropes (Red top, White middle, Blue bottom)
        const ropeY = [190, 240, 290];
        ropeY.forEach((ry, idx) => {
          ctx.strokeStyle = idx === 0 ? '#ef4444' : idx === 1 ? '#f8fafc' : '#3b82f6';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(80, ry);
          ctx.lineTo(720, ry);
          ctx.stroke();
        });
      }

      // 2. Render Boxers
      const bA = localState?.boxerA || {
        side: 'A',
        name: playerAName,
        x: 260,
        hp: 100,
        stamina: 100,
        superMeter: 0,
        state: 'IDLE',
        stateTicks: 0,
        isGuarding: false,
        isDodging: false,
        consecutiveHits: 0,
        score: 0,
      };

      const bB = localState?.boxerB || {
        side: 'B',
        name: playerBName,
        x: 540,
        hp: 100,
        stamina: 100,
        superMeter: 0,
        state: 'IDLE',
        stateTicks: 0,
        isGuarding: false,
        isDodging: false,
        consecutiveHits: 0,
        score: 0,
      };

      drawBoxer(ctx, bA, true);
      drawBoxer(ctx, bB, false);

      // 3. Render Combat Particles
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.05);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. Render Floating Combat Text
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0.05);
      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.025;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${Math.round(18 * ft.scale)}px sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [localState, playerAName, playerBName]);

  // Mascot Boxer Sprite Renderer (Exact Head Soccer Art Style)
  const drawBoxer = (ctx: CanvasRenderingContext2D, b: BoxerState, facingRight: boolean) => {
    ctx.save();
    const isBlue = b.side === 'A';
    let x = b.x;
    let y = FLOOR_Y;
    const dir = facingRight ? 1 : -1;
    const isMe = role === 'player' && userSide === b.side;
    const primaryColor = isBlue ? '#38bdf8' : '#f87171';

    // 1. Handle Knocked Down (Rotated flat on the ring canvas with dizzy stars)
    if (b.state === 'KNOCKED_DOWN') {
      ctx.translate(x, FLOOR_Y - 14);
      ctx.rotate((dir * Math.PI) / 2);
      const hurtImg = isBlue ? spritesRef.current.boxerAHurt : spritesRef.current.boxerBHurt;
      const targetH = 135;
      if (hurtImg && hurtImg.complete && hurtImg.naturalWidth > 0) {
        const targetW = targetH * (hurtImg.naturalWidth / hurtImg.naturalHeight);
        ctx.drawImage(hurtImg, -targetW / 2, -targetH, targetW, targetH);
      }
      ctx.restore();

      // Dizzy stars floating above knocked down boxer
      const starsY = FLOOR_Y - 45;
      const now = Date.now() / 250;
      ctx.save();
      for (let s = 0; s < 3; s++) {
        const ang = now + (s * (Math.PI * 2)) / 3;
        const sx = x + Math.cos(ang) * 24;
        const sy = starsY + Math.sin(ang) * 8;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // 2. Ring Floor Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, FLOOR_Y, b.isDodging ? 46 : 38, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Select Appropriate Sprite Image
    let activeImg: HTMLImageElement | undefined;
    let targetH = 138;

    if (b.state === 'HURT') {
      activeImg = isBlue ? spritesRef.current.boxerAHurt : spritesRef.current.boxerBHurt;
      targetH = 138;
    } else if (b.isGuarding) {
      activeImg = isBlue ? spritesRef.current.boxerABlock : spritesRef.current.boxerBBlock;
      targetH = 132;
    } else if (b.state === 'JAB') {
      activeImg = isBlue ? spritesRef.current.boxerAJab : spritesRef.current.boxerBJab;
      targetH = 138;
    } else if (b.state === 'HOOK' || b.state === 'UPPERCUT') {
      activeImg = isBlue ? spritesRef.current.boxerAHook : spritesRef.current.boxerBHook;
      targetH = 138;
    } else {
      activeImg = isBlue ? spritesRef.current.boxerAIdle : spritesRef.current.boxerBIdle;
      targetH = 138;
    }

    // 4. State Y-offset modifiers (Dodge ducking or leaping uppercut)
    if (b.isDodging) {
      y += 24; // duck down into weave
    } else if (b.state === 'UPPERCUT') {
      y -= 22; // leaping uppercut
    }

    // 5. Draw Sprite Image
    if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
      const targetW = targetH * (activeImg.naturalWidth / activeImg.naturalHeight);
      let offsetX = -targetW / 2;
      // Precision hitbox center alignment for forward-extended punch sprites
      if (b.state === 'JAB') {
        offsetX = facingRight ? -targetW * 0.40 : -targetW * 0.60;
      } else if (b.state === 'HOOK') {
        offsetX = facingRight ? -targetW * 0.42 : -targetW * 0.58;
      }
      const offsetY = -targetH;

      ctx.drawImage(activeImg, x + offsetX, y + offsetY, targetW, targetH);
    } else {
      // High-quality canvas fallback in exact Head Soccer mascot style
      const headColor = isBlue ? '#38bdf8' : '#f87171';
      const bodyColor = isBlue ? '#0284c7' : '#dc2626';

      // Torso & shorts
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(x - 18, y - 55, 36, 45, 8);
      ctx.fill();
      ctx.stroke();

      // Big Round Mascot Head
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(x, y - 85, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x - 10, y - 98, 9, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Fierce Ninja Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (facingRight) {
        ctx.moveTo(x + 2, y - 88);
        ctx.lineTo(x + 16, y - 84);
        ctx.lineTo(x + 12, y - 76);
        ctx.lineTo(x, y - 80);
      } else {
        ctx.moveTo(x - 2, y - 88);
        ctx.lineTo(x - 16, y - 84);
        ctx.lineTo(x - 12, y - 76);
        ctx.lineTo(x, y - 80);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 6. "YOU" Marker above active player boxer head
    if (isMe) {
      const badgeY = y - targetH - 12;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - 18, badgeY - 12, 36, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      ctx.font = '900 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', x, badgeY);
    }

    ctx.restore();
  };

  const currentHpA = localState?.boxerA?.hp ?? 100;
  const currentHpB = localState?.boxerB?.hp ?? 100;
  const currentStamina = (userSide === 'A' ? localState?.boxerA?.stamina : localState?.boxerB?.stamina) ?? 100;
  const currentSuper = (userSide === 'A' ? localState?.boxerA?.superMeter : localState?.boxerB?.superMeter) ?? 0;
  const timeSec = Math.ceil((localState?.timeRemainingMs ?? 60000) / 1000);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col space-y-2 pb-6 select-none font-sans">
      {/* 1. MATCH RESOLUTION MODAL */}
      {isSettled && (
        <div className="p-5 rounded-3xl bg-gradient-to-b from-[#181a29] to-[#0d0f17] border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center space-y-2">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                isWinner
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-400/40'
              }`}
            >
              {isWinner ? <Trophy className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
            </div>
            <h2 className="text-xl font-heading font-black tracking-wider text-white uppercase">
              {isWinner ? (t('boxing.winTitle') || 'VITTORIA PER K.O.!') : (t('boxing.loseTitle') || 'SCONFITTA SUL RING')}
            </h2>
            <p className="text-xs text-slate-400 font-sans max-w-xs">
              {isWinner
                ? (t('boxing.winDesc') || 'Hai dominato il ring e sconfitto il tuo avversario!')
                : (t('boxing.loseDesc') || "L'avversario ha sferrato il pugno vincente.")}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-heading font-bold uppercase">
              {t('arena.prizePot') || 'MONTEPREMI:'}
            </span>
            <div className="flex items-center space-x-1.5 font-heading font-black text-amber-300">
              {isF2P ? (
                <span className="text-xs text-emerald-400">FREE TO PLAY</span>
              ) : (
                <>
                  <GramIcon className="w-4 h-4" />
                  <span className="text-sm">{(parseFloat(wagerTon || '0') * 2 * 0.95).toFixed(2)} GRAM</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {onRequestRematch && !rematchOffer && (
              <button
                type="button"
                onClick={onRequestRematch}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('boxing.rematch') || 'CHIEDI RIVINCITA'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReturnToLobby}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {t('boxing.returnLobby') || 'TORNA ALLA LOBBY'}
            </button>
          </div>
        </div>
      )}

      {/* 2. PRE-MATCH LOBBY VIEW */}
      {isLobby ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-heading font-black text-white uppercase tracking-wider">
                {t('boxing.title') || 'BOXE 1V1'}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 font-heading font-black text-[10px]">
              {isF2P ? '🎮 FREE TO PLAY' : `${wagerTon} GRAM`}
            </div>
          </div>

          {/* Duelists Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Boxer A */}
            <div
              className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2 transition-all ${
                playerAReady ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-[#141724] border-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center font-heading font-black text-lg text-cyan-300">
                  {playerAName ? playerAName.slice(0, 2).toUpperCase() : 'P1'}
                </div>
                {playerAReady && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-black rounded-full" />
                )}
              </div>
              <span className="text-xs font-heading font-black text-white truncate max-w-full">
                {playerAName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase ${
                  playerAReady
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {playerAReady ? (t('arena.ready') || 'PRONTO') : (t('arena.waiting') || 'IN ATTESA')}
              </span>
            </div>

            {/* Boxer B */}
            <div
              className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2 transition-all ${
                playerBReady ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-[#141724] border-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/30 border border-rose-400/40 flex items-center justify-center font-heading font-black text-lg text-rose-300">
                  {hasPlayerB && playerBName ? playerBName.slice(0, 2).toUpperCase() : '?'}
                </div>
                {playerBReady && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-black rounded-full" />
                )}
              </div>
              <span className="text-xs font-heading font-black text-white truncate max-w-full">
                {hasPlayerB ? playerBName : (t('arena.waitingOpponentShort') || 'In attesa sfidante...')}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase ${
                  playerBReady
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {playerBReady ? (t('arena.ready') || 'PRONTO') : hasPlayerB ? (t('arena.waiting') || 'IN ATTESA') : 'LIBERO'}
              </span>
            </div>
          </div>

          {/* Lobby Info Notice */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-center">
            <span className="text-xs text-slate-300 font-sans">
              {!hasPlayerB
                ? (t('boxing.waitingLobbyDesc') || 'Condividi il link per far salire uno sfidante sul ring.')
                : isReady
                ? (t('boxing.waitingOpponentDesc') || "Sei sul ring! In attesa che anche l'avversario indossi i guantoni...")
                : (t('boxing.readyDesc') || 'Clicca su SALI SUL RING per avviare il match di boxe!')}
            </span>
          </div>

          {/* Controls: Ready Button */}
          {role === 'player' ? (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerImpact('heavy');
                  onReady?.();
                }}
                disabled={isReady || !hasPlayerB}
                className={`w-full py-4 rounded-2xl font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg active:scale-95 ${
                  isReady
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 cursor-not-allowed shadow-inner'
                    : !hasPlayerB
                    ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 shadow-rose-500/30'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>{t('arena.readyWaiting') || "IN ATTESA DELL'AVVERSARIO..."}</span>
                  </>
                ) : !hasPlayerB ? (
                  <span>{t('arena.waitingForOpponentBtn') || 'IN ATTESA DI UNO SFIDANTE...'}</span>
                ) : (
                  <>
                    <Flame className="w-5 h-5 text-slate-950" />
                    <span>{t('boxing.readyBtn') || 'SALI SUL RING!'}</span>
                  </>
                )}
              </button>

              {onInviteChallenger && (
                <button
                  type="button"
                  onClick={onInviteChallenger}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('arena.inviteChallengerBtn') || 'INVITA SFIDANTI'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {onJoinAsPlayer && (
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('heavy');
                    onJoinAsPlayer();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  <span>{t('boxing.enterChallenger') || 'SALI SUL RING COME SFIDANTE'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 3. ACTIVE BOXING RING MATCH */
        <div className="space-y-2">
          {/* Top HUD: Health & Stamina Bars */}
          <div className="p-3 rounded-3xl bg-[#121522] border border-white/10 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              {/* Boxer A Info */}
              <div className="flex-1 text-left">
                <span className="text-xs font-heading font-black text-cyan-400 truncate block">
                  {playerAName}
                </span>
                <div className="w-full bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                    style={{ width: `${Math.max(0, currentHpA)}%` }}
                  />
                </div>
              </div>

              {/* Timer Center Clock */}
              <div className="px-4 flex flex-col items-center">
                <span className="text-[10px] font-heading font-bold text-slate-400 uppercase">
                  ROUND 1
                </span>
                <div className="flex items-center space-x-1 text-base font-mono font-black text-amber-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{timeSec}s</span>
                </div>
              </div>

              {/* Boxer B Info */}
              <div className="flex-1 text-right">
                <span className="text-xs font-heading font-black text-rose-400 truncate block">
                  {playerBName}
                </span>
                <div className="w-full bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-l from-rose-500 to-red-600 transition-all duration-150 ml-auto"
                    style={{ width: `${Math.max(0, currentHpB)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* My Boxer Stamina & Super Meter */}
            {role === 'player' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[10px]">
                {/* Stamina */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>{t('boxing.stamina') || 'STAMINA'}</span>
                    <span className="font-mono text-emerald-400">{Math.round(currentStamina)}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${Math.max(0, currentStamina)}%` }}
                    />
                  </div>
                </div>

                {/* Super Meter */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>{t('boxing.superMeter') || 'SUPER K.O.'}</span>
                    <span className="font-mono text-amber-400">{Math.round(currentSuper)}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        currentSuper >= 100
                          ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300 animate-pulse'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(0, currentSuper)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Ring Viewport */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              width={ARENA_W}
              height={ARENA_H}
              className="w-full h-auto block select-none"
            />

            {/* Pre-Match Countdown Overlay */}
            {localState?.phase === 'COUNTDOWN' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-6xl font-heading font-black text-amber-400 animate-ping">
                  {localState.countdownSec}
                </span>
                <span className="text-sm font-heading font-black text-white uppercase tracking-widest mt-3">
                  {t('boxing.getReady') || 'ROUND 1 · FIGHT!'}
                </span>
              </div>
            )}

            {/* Knockdown K.O. Banner Overlay */}
            {localState?.phase === 'KNOCKOUT' && (
              <div className="absolute inset-0 bg-red-950/70 flex flex-col items-center justify-center pointer-events-none animate-in zoom-in-95">
                <span className="text-5xl font-heading font-black text-rose-400 tracking-wider animate-bounce shadow-lg">
                  💥 K.O.!
                </span>
                <span className="text-xs font-heading font-bold text-white uppercase mt-1">
                  KNOCKOUT DECISIVO
                </span>
              </div>
            )}
          </div>

          {/* 4. MOBILE CONTROLS (Only visible to player) */}
          {role === 'player' && (
            <div className="grid grid-cols-2 gap-3 pt-1 select-none touch-none">
              {/* Left Controls: Movement & Defense */}
              <div className="p-2.5 rounded-3xl bg-[#141724] border border-white/10 space-y-2 select-none touch-none">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onTouchStart={(e) => { e.preventDefault(); sendInput({ left: true }); }}
                    onTouchEnd={(e) => { e.preventDefault(); sendInput({ left: false }); }}
                    onMouseDown={() => sendInput({ left: true })}
                    onMouseUp={() => sendInput({ left: false })}
                    className="py-3.5 rounded-2xl bg-white/5 active:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 font-heading font-black active:scale-95 transition-transform touch-none select-none"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onTouchStart={(e) => { e.preventDefault(); sendInput({ right: true }); }}
                    onTouchEnd={(e) => { e.preventDefault(); sendInput({ right: false }); }}
                    onMouseDown={() => sendInput({ right: true })}
                    onMouseUp={() => sendInput({ right: false })}
                    className="py-3.5 rounded-2xl bg-white/5 active:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 font-heading font-black active:scale-95 transition-transform touch-none select-none"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerImpact('light');
                      sendInput({ dodge: true });
                    }}
                    onClick={() => {
                      triggerImpact('light');
                      sendInput({ dodge: true });
                    }}
                    className="py-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-400/30 text-sky-300 font-heading font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95 touch-none select-none"
                  >
                    <span>💨 {t('boxing.dodge') || 'SCHIVA'}</span>
                  </button>

                  <button
                    type="button"
                    onTouchStart={(e) => { e.preventDefault(); sendInput({ block: true }); }}
                    onTouchEnd={(e) => { e.preventDefault(); sendInput({ block: false }); }}
                    onMouseDown={() => sendInput({ block: true })}
                    onMouseUp={() => sendInput({ block: false })}
                    className="py-3 rounded-2xl bg-blue-950/40 active:bg-blue-600/40 border border-blue-400/40 text-blue-200 font-heading font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95 touch-none select-none"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{t('boxing.guard') || 'GUARDIA'}</span>
                  </button>
                </div>
              </div>

              {/* Right Controls: Attack & Super Uppercut */}
              <div className="p-2.5 rounded-3xl bg-[#141724] border border-white/10 space-y-2 select-none touch-none">
                <div className="grid grid-cols-2 gap-2">
                  {/* JAB */}
                  <button
                    type="button"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerImpact('medium');
                      sendInput({ jab: true });
                    }}
                    onClick={() => {
                      triggerImpact('medium');
                      sendInput({ jab: true });
                    }}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform touch-none select-none"
                  >
                    🥊 JAB
                  </button>

                  {/* HOOK */}
                  <button
                    type="button"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      triggerImpact('heavy');
                      sendInput({ hook: true });
                    }}
                    onClick={() => {
                      triggerImpact('heavy');
                      sendInput({ hook: true });
                    }}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform touch-none select-none"
                  >
                    💥 GANCIO
                  </button>
                </div>

                {/* SUPER KO UPPERCUT */}
                <button
                  type="button"
                  disabled={currentSuper < 100}
                  onTouchStart={(e) => {
                    if (currentSuper < 100) return;
                    e.preventDefault();
                    triggerNotification('success');
                    sendInput({ super: true });
                  }}
                  onClick={() => {
                    if (currentSuper < 100) return;
                    triggerNotification('success');
                    sendInput({ super: true });
                  }}
                  className={`w-full py-3 rounded-2xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-95 touch-none select-none ${
                    currentSuper >= 100
                      ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-yellow-400 text-slate-950 shadow-amber-400/40 animate-pulse cursor-pointer'
                      : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{currentSuper >= 100 ? (t('boxing.superReady') || '⚡ SUPER K.O. READY!') : 'SUPER K.O. (0%)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
