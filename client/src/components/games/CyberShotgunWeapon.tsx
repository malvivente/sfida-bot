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

  // Track previous saw and lastAction to avoid redundant triggers
  const prevSawActiveRef = useRef<boolean>(isSawActive);
  const lastActionIdRef = useRef<string>('');

  // Synchronize barrel state if prop changes directly (e.g. initial load or rematch reset)
  useEffect(() => {
    if (isSawActive && barrelState === 'long' && !isSawCutting) {
      setBarrelState('short');
    } else if (!isSawActive && barrelState === 'short') {
      setBarrelState('long');
      setIsSeveredBarrelFalling(false);
      setIsPolarityReversed(false);
    }
  }, [isSawActive]);

  // Handle Action-driven animations
  useEffect(() => {
    if (!lastAction) return;

    // Create unique key for action to ensure single trigger
    const actionKey = `${lastAction.player}-${lastAction.type}-${lastAction.result}-${lastAction.message}`;
    if (lastActionIdRef.current === actionKey) {
      return;
    }
    lastActionIdRef.current = actionKey;

    // --- ANIMATION 1: SAW CUT ---
    if (lastAction.result === 'SAWED' || (!prevSawActiveRef.current && isSawActive)) {
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

    prevSawActiveRef.current = isSawActive;
  }, [lastAction, isSawActive]);

  // ==========================================
  // ANIMATION 1: SAW CUT (Taglio Canna)
  // ==========================================
  const triggerSawCutAnimation = () => {
    setIsSawCutting(true);
    setBarrelState('long');
    setIsSeveredBarrelFalling(false);
    triggerImpact?.('light');

    // Generate cluster of dynamic spark particles
    const newSparks: SparkParticle[] = Array.from({ length: 18 }).map((_, i) => ({
      id: Date.now() + i,
      x: 0,
      y: 0,
      vx: (Math.random() - 0.35) * 85,
      vy: Math.random() * 65 + 20,
      color: Math.random() > 0.4 ? '#f59e0b' : '#22d3ee',
      size: Math.random() * 3 + 2,
    }));
    setSparks(newSparks);

    // Slicing duration: at 650ms, blade completes cut
    setTimeout(() => {
      // Switch instantly to shotgun_short
      setBarrelState('short');
      // Drop severed barrel piece
      setIsSeveredBarrelFalling(true);
      setSparks([]);
      triggerImpact?.('heavy');
    }, 650);

    // Complete saw animation
    setTimeout(() => {
      setIsSawCutting(false);
    }, 1100);
  };

  // ==========================================
  // ANIMATION 2: EMPTY EJECTION (Espulsione a vuoto)
  // ==========================================
  const triggerEjectionAnimation = (shellType: 'LIVE' | 'BLANK' = 'LIVE') => {
    setEjectedShellType(shellType);
    // 1. Pump racks backward
    setIsPumpRacking(true);
    triggerImpact?.('medium');

    // 2. Chamber opens and cartridge launches at peak rack
    setTimeout(() => {
      setIsEjectingCartridge(true);
    }, 120);

    // 3. Pump slides forward
    setTimeout(() => {
      setIsPumpRacking(false);
    }, 420);

    // 4. Cartridge completes trajectory
    setTimeout(() => {
      setIsEjectingCartridge(false);
    }, 900);
  };

  // ==========================================
  // ANIMATION 3: SHOT + RECOIL + MUZZLE FLASH
  // ==========================================
  const triggerShotAnimation = (isLive: boolean) => {
    // 1. Violent recoil kick along X axis
    setIsRecoilActive(true);
    // 2. Muzzle flash burst
    setIsMuzzleFlashActive(true);
    triggerImpact?.('heavy');

    // Muzzle flash ends quickly
    setTimeout(() => {
      setIsMuzzleFlashActive(false);
    }, 220);

    // Recoil settles
    setTimeout(() => {
      setIsRecoilActive(false);
    }, 380);

    // 3. Subito dopo (160ms): rack pump and eject spent cartridge
    setTimeout(() => {
      triggerEjectionAnimation(isLive ? 'LIVE' : 'BLANK');
    }, 180);
  };

  // Subtle blank shot
  const triggerBlankShotAnimation = () => {
    setIsRecoilActive(true);
    triggerImpact?.('light');
    setTimeout(() => {
      setIsRecoilActive(false);
    }, 200);

    setTimeout(() => {
      triggerEjectionAnimation('BLANK');
    }, 120);
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
    }, 400);

    setTimeout(() => {
      setIsInvertingPolarity(false);
    }, 1800);
  };

  // Coordinate constants based on 1307 x 413 weapon geometry
  // Cut line: 1041px / 1307px = 79.65%
  // Long barrel muzzle tip: 99.2% X, 32.4% Y
  // Short barrel muzzle tip: 79.9% X, 32.4% Y
  // Ejection port: 46.0% X, 39.0% Y
  // Pump slide: left 60.9%, top 40.4%, width 19.3%, height 23.0%
  const isShortBarrel = barrelState === 'short';
  const muzzleTipX = isShortBarrel ? '79.9%' : '99.2%';
  const muzzleTipY = '32.4%';

  return (
    <div className="flex flex-col items-center w-full max-w-[340px]">
      <div
        className={`relative w-full h-32 rounded-2xl bg-gradient-to-b from-slate-900/95 via-[#10131e]/95 to-black/95 border border-red-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.25)] overflow-hidden select-none ${className}`}
      >
        {/* High-Tech Cyber Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]" />

        {/* Gun Chamber Ambient Glow (Reacts to shots & inversions) */}
        <motion.div
          animate={{
            opacity: isMuzzleFlashActive ? 0.85 : isInvertingPolarity ? [0.2, 0.7, 0.3, 0.8, 0.4] : 0.15,
            background: isInvertingPolarity
              ? 'radial-gradient(ellipse at center, rgba(236,72,153,0.4) 0%, transparent 70%)'
              : isMuzzleFlashActive
              ? 'radial-gradient(ellipse at right, rgba(239,68,68,0.7) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, transparent 70%)',
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* WEAPON FRAME CONTAINER (Holds main gun, pump, flash, sparks) */}
        <motion.div
          animate={{
            x: isRecoilActive ? [-26, 6, -3, 0] : isSawCutting ? [0, -2, 2, -1, 1, 0] : 0,
            rotate: isRecoilActive ? [-1.8, 0.4, 0] : 0,
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
            x: isRecoilActive ? { duration: 0.38, ease: 'easeOut' } : isSawCutting ? { duration: 0.15, repeat: 4 } : { duration: 0.2 },
            rotate: { duration: 0.38, ease: 'easeOut' },
            filter: { duration: isInvertingPolarity ? 1.8 : 0.3 },
            opacity: { duration: isInvertingPolarity ? 1.8 : 0.2 },
          }}
          className="relative w-[310px] h-[98px] flex items-center justify-center"
        >
          {/* BASE WEAPON SPRITE: shotgun_long or shotgun_short */}
          <motion.img
            key={barrelState}
            src={isShortBarrel ? shotgunShortImg : shotgunLongImg}
            alt="Cyber Shotgun"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_15px_rgba(239,68,68,0.45)]"
          />

          {/* PUMP SLIDE (Layered over pump grip for racking animation) */}
          <motion.img
            src={pumpSlideImg}
            alt="Pump Slide"
            draggable={false}
            animate={{
              x: isPumpRacking ? [-16, -16, 0] : 0,
            }}
            transition={{
              duration: 0.38,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: '60.9%',
              top: '40.4%',
              width: '19.3%',
              height: '23.0%',
            }}
            className="object-contain pointer-events-none drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
          />

          {/* MOLTEN EDGE GLOW ON SHORT BARREL CUT LINE */}
          {isShortBarrel && (
            <div
              style={{
                position: 'absolute',
                left: '79.65%',
                top: '25%',
                height: '26%',
                width: '3px',
              }}
              className="rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-red-500 shadow-[0_0_10px_#f59e0b] animate-pulse pointer-events-none"
            />
          )}

          {/* ANIMATION 1: SEVERED BARREL PIECE FALLING */}
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
                  duration: 0.75,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  position: 'absolute',
                  left: '79.65%',
                  top: '17.0%',
                  width: '19.66%',
                  height: '44.3%',
                }}
                className="object-contain pointer-events-none z-20"
              />
            )}
          </AnimatePresence>

          {/* ANIMATION 1: LASER SAW CUTTING */}
          <AnimatePresence>
            {isSawCutting && (
              <motion.div
                key="laser-saw"
                initial={{ y: -55, opacity: 0 }}
                animate={{
                  y: [-55, -15, 20, 50],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 0.7,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  left: '79.65%',
                  top: '32%',
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-30 pointer-events-none flex items-center justify-center"
              >
                <motion.img
                  src={laserSawImg}
                  alt="Laser Saw Blade"
                  animate={{ rotate: 1080 }}
                  transition={{ duration: 0.7, ease: 'linear' }}
                  className="w-16 h-16 drop-shadow-[0_0_14px_rgba(34,211,238,0.95)]"
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
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '79.65%',
                top: '32.4%',
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                backgroundColor: spark.color,
                boxShadow: `0 0 8px ${spark.color}`,
                borderRadius: '9999px',
              }}
              className="z-40 pointer-events-none"
            />
          ))}

          {/* ANIMATION 3: MUZZLE FLASH VFX */}
          <AnimatePresence>
            {isMuzzleFlashActive && (
              <motion.div
                key="muzzle-flash"
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{
                  scale: [0.2, 1.25, 0.9, 0],
                  opacity: [0, 1, 0.85, 0],
                  filter: ['brightness(2.2)', 'brightness(1.5)', 'brightness(1)'],
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: muzzleTipX,
                  top: muzzleTipY,
                  transform: 'translate(-5%, -50%)',
                }}
                className="z-30 pointer-events-none flex items-center"
              >
                <img
                  src={muzzleFlashImg}
                  alt="Muzzle Flash"
                  className="w-28 h-16 object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ANIMATION 2 & 3: EJECTING CARTRIDGE */}
          <AnimatePresence>
            {isEjectingCartridge && (
              <motion.div
                key="ejected-cartridge"
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.8 }}
                animate={{
                  x: [0, -16, -34, -48],
                  y: [0, -42, -28, 30],
                  rotate: [0, -180, -360, -540],
                  scale: [0.8, 1.1, 0.95, 0.75],
                  opacity: [1, 1, 0.9, 0],
                }}
                transition={{
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: 'absolute',
                  left: '46.0%',
                  top: '36.0%',
                }}
                className="z-30 pointer-events-none flex items-center justify-center"
              >
                <img
                  src={cartridgeImg}
                  alt="Cartridge Shell"
                  className={`w-3.5 h-8 object-contain ${
                    ejectedShellType === 'LIVE'
                      ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]'
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

      {/* DEV TEST CONTROLS (Only visible in development mode for live previewing animations) */}
      {import.meta.env.DEV && (
        <div className="flex items-center space-x-1.5 mt-1.5 opacity-60 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={triggerSawCutAnimation}
            className="px-2 py-0.5 text-[8px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition-colors"
          >
            1. Saw Cut
          </button>
          <button
            type="button"
            onClick={() => triggerEjectionAnimation('LIVE')}
            className="px-2 py-0.5 text-[8px] font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/30 transition-colors"
          >
            2. Rack
          </button>
          <button
            type="button"
            onClick={() => triggerShotAnimation(true)}
            className="px-2 py-0.5 text-[8px] font-mono font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded border border-red-500/30 transition-colors"
          >
            3. Fire
          </button>
          <button
            type="button"
            onClick={triggerPolarityInversionAnimation}
            className="px-2 py-0.5 text-[8px] font-mono font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded border border-pink-500/30 transition-colors"
          >
            4. Invert
          </button>
        </div>
      )}
    </div>
  );
};
