import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CyberShotgunState } from '../../types/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';

// Static assets generated specifically for Cyber Shotgun
import shotgunLongImg from '../../assets/shotgun/shotgun_long.png';
import shotgunShortImg from '../../assets/shotgun/shotgun_short.png';
import barrelSeveredImg from '../../assets/shotgun/barrel_severed.png';
import pumpSlideImg from '../../assets/shotgun/pump_slide.png';
import cartridgeImg from '../../assets/shotgun/cartridge.png';
import laserSawImg from '../../assets/shotgun/laser_saw.png';
import muzzleFlashImg from '../../assets/shotgun/muzzle_flash.png';

export interface CyberShotgunWeaponProps {
  isSawActive: boolean;
  lastAction?: CyberShotgunState['lastAction'];
  className?: string;
}

// Spark particle interface for saw cutting and shot effects
interface SparkParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

export const CyberShotgunWeapon: React.FC<CyberShotgunWeaponProps> = ({
  isSawActive,
  lastAction,
  className = '',
}) => {
  const { triggerImpact } = useHaptics();

  // Weapon barrel state: 'long' or 'short'
  const [barrelState, setBarrelState] = useState<'long' | 'short'>(isSawActive ? 'short' : 'long');

  // Animation triggers
  const [isSawCutting, setIsSawCutting] = useState(false);
  const [isSeveredBarrelFalling, setIsSeveredBarrelFalling] = useState(false);
  const [isRecoilActive, setIsRecoilActive] = useState(false);
  const [isMuzzleFlashActive, setIsMuzzleFlashActive] = useState(false);
  const [isEjectingCartridge, setIsEjectingCartridge] = useState(false);
  const [ejectedShellType, setEjectedShellType] = useState<'LIVE' | 'BLANK'>('LIVE');
  const [isPumpRacking, setIsPumpRacking] = useState(false);
  const [isInvertingPolarity, setIsInvertingPolarity] = useState(false);
  const [isPolarityReversed, setIsPolarityReversed] = useState(false);

  // Dynamic sparks for saw cutting
  const [sparks, setSparks] = useState<SparkParticle[]>([]);

  // Track previous saw state and lastAction ID to avoid redundant triggers
  const prevSawActiveRef = useRef<boolean>(isSawActive);
  const lastActionIdRef = useRef<string>('');
  const isSawCuttingRef = useRef<boolean>(false);

  // Synchronize barrel state if prop changes directly (e.g. initial load or rematch reset)
  useEffect(() => {
    // If an active saw cut animation is in progress, let it finish naturally
    if (isSawCuttingRef.current) return;

    if (isSawActive && barrelState === 'long') {
      // If saw was just activated from false -> true, play full saw cutting animation
      if (!prevSawActiveRef.current) {
        triggerSawCutAnimation();
      } else {
        // Already active on mount / re-render
        setBarrelState('short');
      }
    } else if (!isSawActive && barrelState === 'short') {
      setBarrelState('long');
      setIsSeveredBarrelFalling(false);
      setIsPolarityReversed(false);
    }
    prevSawActiveRef.current = isSawActive;
  }, [isSawActive]);

  // Handle Action-driven animations from server
  useEffect(() => {
    if (!lastAction) return;

    const actionKey = `${lastAction.player}-${lastAction.type}-${lastAction.result}-${lastAction.message}`;
    if (lastActionIdRef.current === actionKey) {
      return;
    }
    lastActionIdRef.current = actionKey;

    // --- ANIMATION 1: SAW CUT ---
    if (lastAction.result === 'SAWED') {
      triggerSawCutAnimation();
    }
    // --- ANIMATION 2: EMPTY EJECTION (Ejector Item) ---
    else if (lastAction.result === 'EJECTED') {
      const shellType = lastAction.ejectedShell || 'LIVE';
      triggerEjectionAnimation(shellType);
    }
    // --- ANIMATION 3: SHOT + RECOIL + MUZZLE FLASH + EJECTION ---
    else if (lastAction.type === 'SHOOT') {
      if (lastAction.result === 'BANG') {
        triggerShotAnimation(true);
      } else {
        // Blank shot: subtle recoil click and blank shell ejection
        triggerBlankShotAnimation();
      }
    }
    // --- ANIMATION 4: INVERT POLARITY ---
    else if (lastAction.result === 'CONVERTED') {
      triggerPolarityInversionAnimation();
    }
  }, [lastAction]);

  // ==========================================
  // ANIMATION 1: SAW CUT (Taglio Canna)
  // Well-timed, dramatic sequence (~1.8 seconds)
  // ==========================================
  const triggerSawCutAnimation = () => {
    if (isSawCuttingRef.current) return;
    isSawCuttingRef.current = true;
    setIsSawCutting(true);
    setBarrelState('long');
    setIsSeveredBarrelFalling(false);
    triggerImpact?.('medium');

    // Continuous shower of orange & cyan sparks
    const newSparks: SparkParticle[] = Array.from({ length: 24 }).map((_, i) => ({
      id: Date.now() + i,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.35) * 95,
      vy: Math.random() * 70 + 25,
      color: Math.random() > 0.4 ? '#f59e0b' : '#22d3ee',
      size: Math.random() * 3.5 + 2,
    }));
    setSparks(newSparks);

    // At 1100ms: laser blade finishes slicing through barrel
    setTimeout(() => {
      // Instant switch to shotgun_short
      setBarrelState('short');
      // Drop severed barrel piece with tumbling physics
      setIsSeveredBarrelFalling(true);
      setSparks([]);
      triggerImpact?.('heavy');
    }, 1100);

    // Blade retracts and sequence wraps up at 1800ms
    setTimeout(() => {
      setIsSawCutting(false);
      isSawCuttingRef.current = false;
    }, 1800);
  };

  // ==========================================
  // ANIMATION 2: EMPTY EJECTION (Espulsione a vuoto)
  // ==========================================
  const triggerEjectionAnimation = (shellType: 'LIVE' | 'BLANK' = 'LIVE') => {
    setEjectedShellType(shellType);
    // 1. Pump racks backward along X axis
    setIsPumpRacking(true);
    triggerImpact?.('medium');

    // 2. Chamber opens and cartridge launches at peak rack
    setTimeout(() => {
      setIsEjectingCartridge(true);
    }, 150);

    // 3. Pump slides forward
    setTimeout(() => {
      setIsPumpRacking(false);
    }, 450);

    // 4. Cartridge completes parabolic flight
    setTimeout(() => {
      setIsEjectingCartridge(false);
    }, 950);
  };

  // ==========================================
  // ANIMATION 3: SHOT + RECOIL + MUZZLE FLASH
  // Explosive plasma burst with ample visible room
  // ==========================================
  const triggerShotAnimation = (isLive: boolean) => {
    // 1. Violent recoil kick along X axis
    setIsRecoilActive(true);
    // 2. Muzzle flash burst (prominent, high-energy plasma)
    setIsMuzzleFlashActive(true);
    triggerImpact?.('heavy');

    // Muzzle flash visible for 380ms
    setTimeout(() => {
      setIsMuzzleFlashActive(false);
    }, 380);

    // Recoil settles
    setTimeout(() => {
      setIsRecoilActive(false);
    }, 450);

    // 3. Rack pump and eject spent cartridge after recoil peak
    setTimeout(() => {
      triggerEjectionAnimation(isLive ? 'LIVE' : 'BLANK');
    }, 240);
  };

  // Subtle blank shot
  const triggerBlankShotAnimation = () => {
    setIsRecoilActive(true);
    triggerImpact?.('light');
    setTimeout(() => {
      setIsRecoilActive(false);
    }, 220);

    setTimeout(() => {
      triggerEjectionAnimation('BLANK');
    }, 150);
  };

  // ==========================================
  // ANIMATION 4: INVERT POLARITY (Inversione Polarità)
  // ==========================================
  const triggerPolarityInversionAnimation = () => {
    setIsInvertingPolarity(true);
    setIsPolarityReversed((prev) => !prev);
    triggerImpact?.('light');

    setTimeout(() => {
      triggerImpact?.('medium');
    }, 450);

    setTimeout(() => {
      setIsInvertingPolarity(false);
    }, 1800);
  };

  // Coordinates based on 1300 x 406 weapon geometry:
  // Cut line: 1068px / 1300px = 82.15%
  // Long barrel muzzle tip: 99.46% X, 31.53% Y
  // Short barrel muzzle tip: 82.15% X, 31.53% Y
  // Ejection port: 43.0% X, 38.0% Y
  // Pump slide: left 61.15%, top 36.95%, width 20.31%, height 25.62%
  const isShortBarrel = barrelState === 'short';
  const muzzleTipX = isShortBarrel ? '82.15%' : '99.46%';
  const muzzleTipY = '31.53%';

  return (
    <div className="flex flex-col items-center w-full max-w-[340px]">
      <div
        className={`relative w-full h-32 rounded-2xl bg-gradient-to-b from-slate-900/95 via-[#10131e]/95 to-black/95 border border-red-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.25)] overflow-hidden select-none ${className}`}
      >
        {/* High-Tech Cyber Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]" />

        {/* Ambient Chamber Shockwave Glow (Explosive plasma flash on firing) */}
        <motion.div
          animate={{
            opacity: isMuzzleFlashActive ? 0.95 : isInvertingPolarity ? [0.2, 0.7, 0.3, 0.8, 0.4] : 0.15,
            background: isMuzzleFlashActive
              ? 'radial-gradient(ellipse at 80% 50%, rgba(239,68,68,0.85) 0%, rgba(249,115,22,0.5) 45%, transparent 80%)'
              : isInvertingPolarity
              ? 'radial-gradient(ellipse at center, rgba(236,72,153,0.5) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, transparent 70%)',
          }}
          transition={{ duration: isMuzzleFlashActive ? 0.08 : 0.25 }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* WEAPON FRAME CONTAINER
            Width is 265px and slightly left-aligned (-translate-x-3)
            This leaves over 85px of visible clearance on the right for the full muzzle flash! */}
        <motion.div
          animate={{
            x: isRecoilActive ? [-28, -26, 8, -3, 0] : isSawCutting ? [0, -2, 2, -1, 1, 0] : 0,
            rotate: isRecoilActive ? [-2.4, 0.6, 0] : 0,
            filter: isInvertingPolarity
              ? [
                  'hue-rotate(0deg) brightness(1.2)',
                  'hue-rotate(140deg) brightness(1.8)',
                  'hue-rotate(280deg) brightness(2)',
                  'hue-rotate(270deg) brightness(1.4)',
                  'hue-rotate(270deg) brightness(1.2)',
                ]
              : isPolarityReversed
              ? 'hue-rotate(270deg)'
              : 'hue-rotate(0deg)',
            opacity: isInvertingPolarity ? [1, 0.5, 1, 0.35, 1, 0.7, 1] : 1,
          }}
          transition={{
            x: isRecoilActive ? { duration: 0.42, ease: 'easeOut' } : isSawCutting ? { duration: 0.15, repeat: 7 } : { duration: 0.2 },
            rotate: { duration: 0.42, ease: 'easeOut' },
            filter: { duration: isInvertingPolarity ? 1.8 : 0.3 },
            opacity: { duration: isInvertingPolarity ? 1.8 : 0.2 },
          }}
          className="relative w-[265px] h-[83px] flex items-center justify-center -translate-x-3.5"
        >
          {/* BASE WEAPON SPRITE: shotgun_long or shotgun_short (with bare magazine tube underneath pump) */}
          <motion.img
            key={barrelState}
            src={isShortBarrel ? shotgunShortImg : shotgunLongImg}
            alt="Cyber Shotgun"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_15px_rgba(239,68,68,0.45)]"
          />

          {/* PUMP SLIDE (Layered over the bare magazine tube)
              At x: 0 (idle) it completely covers the tube.
              When racking, it slides back to x: -18px, exposing the bare tube behind it without any duplicate pump! */}
          <motion.img
            src={pumpSlideImg}
            alt="Pump Slide"
            draggable={false}
            animate={{
              x: isPumpRacking ? [-18, -18, 0] : 0,
            }}
            transition={{
              duration: 0.42,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: '61.15%',
              top: '36.95%',
              width: '20.31%',
              height: '25.62%',
            }}
            className="object-contain pointer-events-none drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]"
          />

          {/* MOLTEN EDGE GLOW ON SHORT BARREL CUT LINE */}
          {isShortBarrel && (
            <div
              style={{
                position: 'absolute',
                left: '82.15%',
                top: '17.24%',
                height: '45.32%',
                width: '3.5px',
              }}
              className="rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-red-500 shadow-[0_0_12px_#f59e0b] animate-pulse pointer-events-none z-10"
            />
          )}

          {/* ANIMATION 1: SEVERED BARREL PIECE FALLING WITH GRAVITY */}
          <AnimatePresence>
            {isSeveredBarrelFalling && (
              <motion.img
                key="severed-barrel"
                src={barrelSeveredImg}
                alt="Severed Barrel"
                draggable={false}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  x: [0, 8, 22, 38],
                  y: [0, 24, 75, 140],
                  rotate: [0, 20, 65, 125],
                  opacity: [1, 1, 0.85, 0],
                }}
                transition={{
                  duration: 0.85,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  position: 'absolute',
                  left: '82.15%',
                  top: '17.24%',
                  width: '17.54%',
                  height: '45.32%',
                }}
                className="object-contain pointer-events-none z-20"
              />
            )}
          </AnimatePresence>

          {/* ANIMATION 1: LASER SAW CUTTING (Dramatic vertical drop & continuous 1440° spin) */}
          <AnimatePresence>
            {isSawCutting && (
              <motion.div
                key="laser-saw"
                initial={{ y: -65, opacity: 0 }}
                animate={{
                  y: [-65, -20, 10, 48],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1.1,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  left: '82.15%',
                  top: '31.5%',
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-30 pointer-events-none flex items-center justify-center"
              >
                <motion.img
                  src={laserSawImg}
                  alt="Laser Saw Blade"
                  animate={{ rotate: 1440 }}
                  transition={{ duration: 1.1, ease: 'linear' }}
                  className="w-18 h-18 drop-shadow-[0_0_16px_rgba(34,211,238,0.95)]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ANIMATION 1: SAW CUTTING SPARKS PARTICLES */}
          {sparks.map((spark) => (
            <motion.div
              key={spark.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: spark.vx,
                y: spark.vy,
                opacity: 0,
                scale: 0.2,
              }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '82.15%',
                top: '31.5%',
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                backgroundColor: spark.color,
                boxShadow: `0 0 8px ${spark.color}`,
                borderRadius: '9999px',
              }}
              className="z-40 pointer-events-none"
            />
          ))}

          {/* ANIMATION 3: MUZZLE FLASH VFX
              Anchored with transform: translate(0, -50%) so left edge touches muzzle tip and expands rightwards */}
          <AnimatePresence>
            {isMuzzleFlashActive && (
              <motion.div
                key="muzzle-flash"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{
                  scale: [0.3, 1.35, 1.05, 0],
                  opacity: [0, 1, 0.9, 0],
                  filter: ['brightness(2.4)', 'brightness(1.7)', 'brightness(1)'],
                }}
                transition={{ duration: 0.36, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: muzzleTipX,
                  top: muzzleTipY,
                  transform: 'translate(0, -50%)',
                }}
                className="z-30 pointer-events-none flex items-center"
              >
                <img
                  src={muzzleFlashImg}
                  alt="Muzzle Flash"
                  className="w-28 h-18 object-contain drop-shadow-[0_0_25px_rgba(239,68,68,0.95)]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ANIMATION 2 & 3: EJECTING CARTRIDGE (Parabolic arc with full rotation) */}
          <AnimatePresence>
            {isEjectingCartridge && (
              <motion.div
                key="ejected-cartridge"
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.8 }}
                animate={{
                  x: [0, -18, -36, -52],
                  y: [0, -45, -30, 32],
                  rotate: [0, -180, -360, -540],
                  scale: [0.8, 1.15, 0.95, 0.75],
                  opacity: [1, 1, 0.9, 0],
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: 'absolute',
                  left: '43.0%',
                  top: '38.0%',
                }}
                className="z-30 pointer-events-none flex items-center justify-center"
              >
                <img
                  src={cartridgeImg}
                  alt="Cartridge Shell"
                  className={`w-3.5 h-8 object-contain ${
                    ejectedShellType === 'LIVE'
                      ? 'drop-shadow-[0_0_12px_rgba(239,68,68,0.95)]'
                      : 'drop-shadow-[0_0_10px_rgba(148,163,184,0.7)]'
                  }`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sawed-Off Visual Badge Overlay */}
        {isShortBarrel && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-[9px] font-orbitron font-black text-amber-300 flex items-center space-x-1 shadow-[0_0_10px_rgba(245,158,11,0.5)] z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>SAWED-OFF (2X DMG)</span>
          </div>
        )}

        {/* Polarity Inverted Badge */}
        {isPolarityReversed && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400 text-[9px] font-orbitron font-black text-pink-300 flex items-center space-x-1 shadow-[0_0_10px_rgba(236,72,153,0.5)] z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span>POLARITY REVERSED</span>
          </div>
        )}
      </div>
    </div>
  );
};
