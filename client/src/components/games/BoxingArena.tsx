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
  const ringBgRef = useRef<HTMLImageElement | null>(null);

  const [localState, setLocalState] = useState<BoxingState | undefined>(gameData);
  const particlesRef = useRef<CombatParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);
  const lastProcessedHitId = useRef<string | null>(null);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const isF2P = parseFloat(wagerTon || '0') === 0;
  const isSettled = roomState === 'MATCH_SETTLED' || roomState === 'SETTLED' || roomState === 'FORFEITED';
  const isLobby = roomState === 'LOBBY' || (!gameData?.boxerA && !isSettled);

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

  // Load Ring Background
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/boxing/ring_bg.png';
    img.onload = () => {
      ringBgRef.current = img;
    };
  }, []);

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
      if (ringBgRef.current && ringBgRef.current.complete) {
        ctx.drawImage(ringBgRef.current, 0, 0, ARENA_W, ARENA_H);
      } else {
        // Fallback procedural cyberpunk boxing ring
        const grad = ctx.createLinearGradient(0, 0, 0, ARENA_H);
        grad.addColorStop(0, '#0a0c16');
        grad.addColorStop(0.6, '#11162b');
        grad.addColorStop(1, '#080a14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ARENA_W, ARENA_H);

        // Ring floor
        ctx.fillStyle = '#1e243d';
        ctx.fillRect(100, FLOOR_Y - 20, 600, 70);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, FLOOR_Y - 20, 600, 70);

        // Ropes
        const ropeY = [230, 280, 330];
        ropeY.forEach((ry, idx) => {
          ctx.strokeStyle = idx === 0 ? '#ef4444' : idx === 1 ? '#e2e8f0' : '#3b82f6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(110, ry);
          ctx.lineTo(690, ry);
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

  // Procedural Cyber Boxer Sprite Drawer
  const drawBoxer = (ctx: CanvasRenderingContext2D, b: BoxerState, facingRight: boolean) => {
    ctx.save();
    const x = b.x;
    let y = FLOOR_Y - 10;
    const dir = facingRight ? 1 : -1;
    const isBlue = b.side === 'A';
    const primaryColor = isBlue ? '#06b6d4' : '#f43f5e';
    const secondaryColor = isBlue ? '#3b82f6' : '#e11d48';

    // State Modifiers
    if (b.isDodging) {
      y += 35; // duck down
    } else if (b.state === 'UPPERCUT') {
      y -= 25; // launch leap
    } else if (b.state === 'KNOCKED_DOWN') {
      // Draw knocked down horizontal body
      ctx.translate(x, FLOOR_Y);
      ctx.rotate((dir * Math.PI) / 2);
      ctx.fillStyle = primaryColor;
      ctx.fillRect(-15, -40, 30, 80);
      ctx.restore();
      return;
    }

    // Shadow on canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, FLOOR_Y, b.isDodging ? 38 : 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Motion Recoil on Hurt
    const hurtRecoil = b.state === 'HURT' ? -dir * 10 : 0;

    // Legs / Shorts
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 16 + hurtRecoil, y - 55, 32, 28);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x - 16 + hurtRecoil, y - 55, 32, 5); // waistband

    // Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 14 + hurtRecoil, y - 28, 12, 28);
    ctx.fillRect(x + 2 + hurtRecoil, y - 28, 12, 28);

    // Torso with muscular/cyber gradient
    ctx.fillStyle = isBlue ? '#1e3a5f' : '#4c1d24';
    ctx.fillRect(x - 18 + hurtRecoil, y - 105, 36, 52);

    // Glowing cyber neon line on chest
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + hurtRecoil, y - 100);
    ctx.lineTo(x + hurtRecoil, y - 65);
    ctx.stroke();

    // Head / Face
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(x + hurtRecoil, y - 120, 16, 0, Math.PI * 2);
    ctx.fill();

    // Cyber Visor / Headgear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 15 + hurtRecoil, y - 134, 30, 14);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x - 12 + hurtRecoil, y - 126, 24, 6);

    // Arms & Gloves based on Action State
    const gloveRadius = 14;

    if (b.isGuarding) {
      // High Guard Shield Pose
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(x + dir * 18, y - 110, gloveRadius, 0, Math.PI * 2);
      ctx.arc(x + dir * 12, y - 85, gloveRadius, 0, Math.PI * 2);
      ctx.fill();

      // Energy Guard Hologram
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + dir * 26, y - 95, 32, -Math.PI / 2, Math.PI / 2, !facingRight);
      ctx.stroke();
    } else if (b.state === 'JAB') {
      // Lead Jab Extended Straight
      const punchExt = 55;
      ctx.fillStyle = secondaryColor;
      // Rear glove guard
      ctx.beginPath();
      ctx.arc(x - dir * 10, y - 95, gloveRadius, 0, Math.PI * 2);
      ctx.fill();
      // Extended glove
      ctx.beginPath();
      ctx.arc(x + dir * punchExt, y - 115, gloveRadius + 2, 0, Math.PI * 2);
      ctx.fill();

      // Speed slash
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 115);
      ctx.lineTo(x + dir * (punchExt - 10), y - 115);
      ctx.stroke();
    } else if (b.state === 'HOOK') {
      // Heavy Curved Hook
      const hookExt = 46;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x + dir * hookExt, y - 88, gloveRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Hook arc trail
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y - 88, hookExt, -Math.PI / 4, Math.PI / 4, !facingRight);
      ctx.stroke();
    } else if (b.state === 'UPPERCUT') {
      // Super Uppercut Skyward Thrust
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x + dir * 30, y - 150, gloveRadius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Glowing aura
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      // Default Idle Stance
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(x + dir * 16, y - 90, gloveRadius, 0, Math.PI * 2);
      ctx.arc(x - dir * 8, y - 85, gloveRadius, 0, Math.PI * 2);
      ctx.fill();
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
                {t('boxing.title') || 'CYBER BOXING CLASH'}
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
            <div className="grid grid-cols-2 gap-3 pt-1 select-none">
              {/* Left Controls: Movement & Defense */}
              <div className="p-2.5 rounded-3xl bg-[#141724] border border-white/10 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onTouchStart={() => sendInput({ left: true })}
                    onTouchEnd={() => sendInput({ left: false })}
                    onMouseDown={() => sendInput({ left: true })}
                    onMouseUp={() => sendInput({ left: false })}
                    className="py-3.5 rounded-2xl bg-white/5 active:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 font-heading font-black active:scale-95 transition-transform"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onTouchStart={() => sendInput({ right: true })}
                    onTouchEnd={() => sendInput({ right: false })}
                    onMouseDown={() => sendInput({ right: true })}
                    onMouseUp={() => sendInput({ right: false })}
                    className="py-3.5 rounded-2xl bg-white/5 active:bg-white/20 border border-white/10 flex items-center justify-center text-slate-300 font-heading font-black active:scale-95 transition-transform"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('light');
                      sendInput({ dodge: true });
                    }}
                    className="py-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-400/30 text-sky-300 font-heading font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95"
                  >
                    <span>💨 {t('boxing.dodge') || 'SCHIVA'}</span>
                  </button>

                  <button
                    type="button"
                    onTouchStart={() => sendInput({ block: true })}
                    onTouchEnd={() => sendInput({ block: false })}
                    onMouseDown={() => sendInput({ block: true })}
                    onMouseUp={() => sendInput({ block: false })}
                    className="py-3 rounded-2xl bg-blue-950/40 active:bg-blue-600/40 border border-blue-400/40 text-blue-200 font-heading font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{t('boxing.guard') || 'GUARDIA'}</span>
                  </button>
                </div>
              </div>

              {/* Right Controls: Attack & Super Uppercut */}
              <div className="p-2.5 rounded-3xl bg-[#141724] border border-white/10 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* JAB */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('medium');
                      sendInput({ jab: true });
                    }}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
                  >
                    🥊 JAB
                  </button>

                  {/* HOOK */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('heavy');
                      sendInput({ hook: true });
                    }}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
                  >
                    💥 GANCIO
                  </button>
                </div>

                {/* SUPER KO UPPERCUT */}
                <button
                  type="button"
                  disabled={currentSuper < 100}
                  onClick={() => {
                    triggerNotification('success');
                    sendInput({ super: true });
                  }}
                  className={`w-full py-3 rounded-2xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-95 ${
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
