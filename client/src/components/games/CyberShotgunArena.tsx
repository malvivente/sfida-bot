import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crosshair,
  Shield,
  RotateCcw,
  Clock,
  Trophy,
  Loader2,
  Swords,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react';
import { CyberShotgunState, ShotgunItem, ShotgunTarget } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';

interface CyberShotgunArenaProps {
  gameData?: CyberShotgunState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onShoot: (target: ShotgunTarget) => void;
  onUseItem: (item: ShotgunItem) => void;
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
  onClaimPayout?: () => void;
  isClaimingPayout?: boolean;
  payoutClaimed?: boolean;
  onReturnToLobby?: () => void;
  rematchOffer?: any;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userSide?: 'A' | 'B';
  userAddress?: string;
  userBalanceGram?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  socketError?: string | null;
  hasPlayerB?: boolean;
  onJoinAsPlayer?: () => void;
  onInviteChallenger?: () => void;
}

// Crisp Vector SVGs for Tactical Items (No Emojis!)
const ItemIcon: React.FC<{ item: ShotgunItem; className?: string }> = ({ item, className = 'w-4 h-4' }) => {
  switch (item) {
    case 'saw':
      // Tactical Serrated Saw Blade
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2 L14 5 L12 8 L10 5 Z" fill="currentColor" />
          <path d="M22 12 L19 14 L16 12 L19 10 Z" fill="currentColor" />
          <path d="M12 22 L10 19 L12 16 L14 19 Z" fill="currentColor" />
          <path d="M2 12 L5 10 L8 12 L5 14 Z" fill="currentColor" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'ejector':
      // Shotgun Slide Rack & Shell Eject
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="9" width="11" height="6" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity="0.2" />
          <path d="M14 12 h7 M18 9 l3 3 l-3 3" stroke="currentColor" strokeWidth="2" />
          <circle cx="7" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'handcuffs':
      // Cyber Energy Restraints / Handcuffs
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="7" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
          <circle cx="17" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.15" />
          <path d="M7 9.5 V6 a2 2 0 0 1 2 -2 h6 a2 2 0 0 1 2 2 v3.5" stroke="currentColor" strokeWidth="2" />
          <line x1="11.5" y1="14" x2="12.5" y2="14" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    case 'inverter':
      // Quantum Polarity Inverter
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M20 11 A8 8 0 0 0 6.3 5.3 L3 8 M3 3 v5 h5" stroke="currentColor" strokeWidth="2" />
          <path d="M4 13 a8 8 0 0 0 13.7 5.7 l3.3 -2.7 M21 21 v-5 h-5" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
};

// Shotgun Shell Cartridge SVG (Live vs Blank)
const ShellIcon: React.FC<{ type: 'LIVE' | 'BLANK'; className?: string }> = ({ type, className = 'w-4 h-7' }) => {
  if (type === 'LIVE') {
    return (
      <svg viewBox="0 0 20 36" fill="none" className={className}>
        {/* Brass Cap */}
        <rect x="2" y="27" width="16" height="7" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <rect x="6" y="34" width="8" height="2" rx="0.5" fill="#b45309" />
        {/* Primer */}
        <circle cx="10" cy="30.5" r="2.5" fill="#ef4444" />
        {/* Red Hull */}
        <rect x="3" y="4" width="14" height="23" rx="2" fill="#ef4444" stroke="#dc2626" strokeWidth="1.2" />
        {/* Ribbing */}
        <line x1="4" y1="10" x2="16" y2="10" stroke="#b91c1c" strokeWidth="1" />
        <line x1="4" y1="16" x2="16" y2="16" stroke="#b91c1c" strokeWidth="1" />
        <line x1="4" y1="22" x2="16" y2="22" stroke="#b91c1c" strokeWidth="1" />
        {/* Crimp top */}
        <path d="M3 6 L10 2 L17 6 Z" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" />
      </svg>
    );
  }

  // Blank Shell: Metal gunmetal casing
  return (
    <svg viewBox="0 0 20 36" fill="none" className={className}>
      {/* Dull Silver Cap */}
      <rect x="2" y="27" width="16" height="7" rx="1.5" fill="#64748b" stroke="#475569" strokeWidth="1" />
      <rect x="6" y="34" width="8" height="2" rx="0.5" fill="#334155" />
      {/* Grey Hull */}
      <rect x="3" y="4" width="14" height="23" rx="2" fill="#334155" stroke="#475569" strokeWidth="1.2" />
      {/* Ribbing */}
      <line x1="4" y1="10" x2="16" y2="10" stroke="#1e293b" strokeWidth="1" />
      <line x1="4" y1="16" x2="16" y2="16" stroke="#1e293b" strokeWidth="1" />
      <line x1="4" y1="22" x2="16" y2="22" stroke="#1e293b" strokeWidth="1" />
      {/* Crimp top */}
      <path d="M3 6 L10 2 L17 6 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
    </svg>
  );
};

export const CyberShotgunArena: React.FC<CyberShotgunArenaProps> = ({
  gameData,
  role,
  onShoot,
  onUseItem,
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
  const { triggerImpact } = useHaptics();

  const hpA = gameData?.hpA ?? 3;
  const hpB = gameData?.hpB ?? 3;
  const maxHp = gameData?.maxHp ?? 3;
  const currentTurn = gameData?.currentTurn ?? 'A';
  const liveCount = gameData?.liveCount ?? 0;
  const blankCount = gameData?.blankCount ?? 0;
  const totalShells = gameData?.totalShellsRemaining ?? (liveCount + blankCount);
  const isSawActive = gameData?.isSawActive ?? false;
  const isHandcuffedA = gameData?.isHandcuffedA ?? false;
  const isHandcuffedB = gameData?.isHandcuffedB ?? false;
  const itemsA = gameData?.itemsA ?? [];
  const itemsB = gameData?.itemsB ?? [];
  const lastAction = gameData?.lastAction;
  const mancheNumber = gameData?.mancheNumber ?? 1;

  const myItems = userSide === 'A' ? itemsA : itemsB;
  const isMyTurn = role === 'player' && currentTurn === userSide;
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;
  const isOpponentHandcuffed = userSide === 'A' ? isHandcuffedB : isHandcuffedA;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  const [outcomePhase, setOutcomePhase] = useState<'splash' | 'settled' | 'none'>('none');
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (roomState === 'MATCH_SETTLED' || roomState === 'FORFEITED') {
      setOutcomePhase('splash');
      const timer = setTimeout(() => {
        setOutcomePhase('settled');
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setOutcomePhase('none');
    }
  }, [roomState]);

  const handleShootClick = (target: ShotgunTarget) => {
    if (!isMyTurn) return;
    triggerImpact?.('heavy');
    onShoot(target);
  };

  const handleUseItemClick = (item: ShotgunItem) => {
    if (!isMyTurn) return;
    if (item === 'saw' && isSawActive) return;
    if (item === 'handcuffs' && isOpponentHandcuffed) return;
    triggerImpact?.('medium');
    onUseItem(item);
  };

  // Render High-Tech Cyber Battery Lightning HP Cells
  const renderHpCells = (hp: number, max: number, side: 'A' | 'B') => {
    return (
      <div className="flex items-center space-x-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const isAlive = i < hp;
          const isA = side === 'A';
          return (
            <div
              key={i}
              className={`w-6 h-7 rounded-lg border flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                isAlive
                  ? isA
                    ? 'bg-gradient-to-t from-cyan-950/80 to-cyan-800/80 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)] text-cyan-300'
                    : 'bg-gradient-to-t from-rose-950/80 to-pink-800/80 border-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] text-pink-300'
                  : 'bg-black/80 border-slate-800 text-slate-700 opacity-40'
              }`}
            >
              {isAlive ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 drop-shadow-[0_0_4px_currentColor]">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 opacity-40">
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-3 sm:p-4 bg-[#0d0f17] border border-red-500/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden min-h-[550px]">
      {/* Background Cybernetic Grid & Atmospheric Flare */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.12),transparent_70%)] pointer-events-none" />

      {/* Top Header: Duelists with Luminous Turn Highlighting */}
      <div className="w-full z-10 grid grid-cols-2 gap-2.5 pb-2 border-b border-white/10">
        {/* Player A Card */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            currentTurn === 'A' && roomState === 'GAME_ACTIVE'
              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] scale-[1.02]'
              : 'bg-black/40 border-white/10 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-chakra font-black text-cyan-300 truncate">{playerAName}</span>
            {userSide === 'A' && role === 'player' && (
              <span className="text-[8px] bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">
                {t('arena.you')}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            {renderHpCells(hpA, maxHp, 'A')}
            <span className="text-[10px] font-mono font-black text-cyan-300">{hpA}/{maxHp} HP</span>
          </div>
          {isHandcuffedA && (
            <span className="text-[8px] font-mono text-purple-300 bg-purple-950/80 border border-purple-500/50 px-1.5 py-0.5 rounded mt-1 text-center">
              {t('arena.handcuffed')}
            </span>
          )}
          <span className="text-[9px] font-mono mt-1">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'A' ? (
                <span className="text-cyan-300 font-black animate-pulse">{t('arena.activeTurn')}</span>
              ) : (
                <span className="text-slate-500">{t('arena.waitingTurn')}</span>
              )
            ) : playerAReady ? (
              <span className="text-emerald-400 font-bold">{t('arena.readyBadge')}</span>
            ) : (
              <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>

        {/* Player B Card */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            currentTurn === 'B' && roomState === 'GAME_ACTIVE'
              ? 'bg-rose-950/40 border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-[1.02]'
              : 'bg-black/40 border-white/10 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-chakra font-black text-pink-300 truncate">{playerBName}</span>
            {userSide === 'B' && role === 'player' && (
              <span className="text-[8px] bg-pink-500/20 border border-pink-400/50 text-pink-300 px-1 py-0.2 rounded font-mono font-bold">
                {t('arena.you')}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            {renderHpCells(hpB, maxHp, 'B')}
            <span className="text-[10px] font-mono font-black text-pink-300">{hpB}/{maxHp} HP</span>
          </div>
          {isHandcuffedB && (
            <span className="text-[8px] font-mono text-purple-300 bg-purple-950/80 border border-purple-500/50 px-1.5 py-0.5 rounded mt-1 text-center">
              {t('arena.handcuffed')}
            </span>
          )}
          <span className="text-[9px] font-mono mt-1 text-right">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'B' ? (
                <span className="text-pink-300 font-black animate-pulse">{t('arena.activeTurn')}</span>
              ) : (
                <span className="text-slate-500">{t('arena.waitingTurn')}</span>
              )
            ) : playerBReady ? (
              <span className="text-emerald-400 font-bold">{t('arena.readyBadge')}</span>
            ) : (
              <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Tactical Combat Area */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10 text-center">
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center space-y-2.5 w-full">
            {/* Luminous Active Turn Header Banner */}
            <div
              className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between text-xs font-heading font-black tracking-wider uppercase transition-all duration-300 ${
                isMyTurn
                  ? 'bg-gradient-to-r from-red-600/30 via-red-500/20 to-red-600/30 border-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-black/50 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-red-400 animate-ping' : 'bg-slate-600'}`} />
                <span>
                  {isMyTurn ? t('shotgun.yourTurnPrompt') : `${t('arena.activeTurn')}: ${activeTurnName}`}
                </span>
              </div>
              <span className="font-mono text-xs text-red-300">
                {t('arena.round')} {mancheNumber}
              </span>
            </div>

            {/* Public Magazine Ammo Counts (No Emojis!) */}
            <div className="flex items-center justify-center space-x-5 px-4 py-2 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
              {/* Live Shells */}
              <div className="flex items-center space-x-2">
                <ShellIcon type="LIVE" className="w-4 h-6" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-chakra uppercase text-slate-400 font-bold">{t('shotgun.liveShells')}</span>
                  <span className="text-sm font-mono font-black text-red-400">{liveCount}</span>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              {/* Blank Shells */}
              <div className="flex items-center space-x-2">
                <ShellIcon type="BLANK" className="w-4 h-6" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-chakra uppercase text-slate-400 font-bold">{t('shotgun.blankShells')}</span>
                  <span className="text-sm font-mono font-black text-slate-300">{blankCount}</span>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              {/* In Chamber Remaining */}
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-chakra uppercase text-slate-400 font-bold">{t('shotgun.inChamber')}</span>
                <span className="text-sm font-mono font-bold text-cyan-300">{totalShells}</span>
              </div>
            </div>

            {/* Central Badass Cyber Shotgun SVG Graphic */}
            <motion.div
              animate={lastAction?.type === 'SHOOT' ? { x: [-14, 10, -6, 2, 0], scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-full max-w-[340px] h-28 rounded-2xl bg-gradient-to-b from-slate-900/90 via-[#10131e]/90 to-black/95 border border-red-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.2)] overflow-hidden"
            >
              {/* Neon Grid Ambient Lines in Shotgun Chamber */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]" />

              {/* Badass Cyber Shotgun Silhouette with Mechanical Details */}
              <svg viewBox="0 0 320 90" className="w-[300px] h-[82px] drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <defs>
                  <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="50%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <linearGradient id="gripGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#090d16" />
                  </linearGradient>
                  <linearGradient id="sawGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>

                {/* Stock & Recoil Pad */}
                <path d="M 12 36 L 42 22 L 72 22 L 80 40 L 64 68 L 32 68 L 18 56 Z" fill="url(#metalGrad)" stroke="#64748b" strokeWidth="1.8" />
                <rect x="8" y="34" width="6" height="24" rx="2" fill="#090d16" stroke="#475569" strokeWidth="1" />
                <line x1="28" y1="36" x2="56" y2="36" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Trigger & Trigger Guard */}
                <path d="M 80 50 C 80 64 96 64 96 50 Z" fill="none" stroke="#64748b" strokeWidth="1.8" />
                <path d="M 88 50 Q 86 58 90 60" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                {/* Main Heavy Receiver */}
                <rect x="76" y="28" width="74" height="26" rx="3" fill="url(#metalGrad)" stroke="#94a3b8" strokeWidth="2" />
                {/* Cyber LED Status Bar on Receiver */}
                <rect x="84" y="32" width="22" height="4" rx="1" fill="#ef4444" className="animate-pulse" />
                <rect x="110" y="32" width="6" height="4" rx="1" fill="#22d3ee" />
                {/* Ejection Port with Brass Cartridge visible */}
                <rect x="100" y="38" width="28" height="11" rx="2" fill="#090d16" stroke="#e2e8f0" strokeWidth="1.5" />
                <rect x="104" y="41" width="16" height="6" rx="1" fill="#f59e0b" />

                {/* Top Picatinny Rail */}
                <rect x="72" y="24" width="80" height="4" rx="1" fill="#334155" stroke="#64748b" strokeWidth="1" />
                {/* Red Dot Holographic Sight */}
                <rect x="114" y="16" width="24" height="8" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
                <circle cx="126" cy="20" r="1.5" fill="#ef4444" className="animate-ping" />

                {/* Magazine Tube Underneath */}
                <rect x="150" y="42" width="110" height="10" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

                {/* Tactical Ribbed Pump Slider */}
                <rect x="162" y="44" width="46" height="15" rx="3" fill="url(#gripGrad)" stroke="#94a3b8" strokeWidth="2" />
                <line x1="172" y1="46" x2="172" y2="57" stroke="#64748b" strokeWidth="1.8" />
                <line x1="182" y1="46" x2="182" y2="57" stroke="#64748b" strokeWidth="1.8" />
                <line x1="192" y1="46" x2="192" y2="57" stroke="#64748b" strokeWidth="1.8" />
                <line x1="200" y1="46" x2="200" y2="57" stroke="#64748b" strokeWidth="1.8" />

                {/* Main Barrel (Normal vs Sawed-Off) */}
                {isSawActive ? (
                  <>
                    {/* Chopped-off Barrel */}
                    <rect x="150" y="30" width="70" height="12" rx="1" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.8" />
                    {/* Red-Hot Sheared Cut Edge */}
                    <line x1="220" y1="28" x2="220" y2="54" stroke="url(#sawGlow)" strokeWidth="4" strokeLinecap="round" className="animate-pulse" />
                    {/* Sparks */}
                    <circle cx="224" cy="32" r="2" fill="#f59e0b" className="animate-ping" />
                    <circle cx="226" cy="48" r="1.5" fill="#ef4444" className="animate-ping" />
                  </>
                ) : (
                  <>
                    {/* Full Length Tactical Barrel */}
                    <rect x="150" y="30" width="138" height="12" rx="1" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.8" />
                    {/* Heat Vent Slots */}
                    <circle cx="220" cy="36" r="2" fill="#334155" />
                    <circle cx="236" cy="36" r="2" fill="#334155" />
                    <circle cx="252" cy="36" r="2" fill="#334155" />
                    <circle cx="268" cy="36" r="2" fill="#334155" />
                    {/* Tactical Muzzle Brake Choke */}
                    <rect x="288" y="28" width="16" height="16" rx="2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.8" />
                    <line x1="294" y1="29" x2="294" y2="43" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="299" y1="29" x2="299" y2="43" stroke="#ef4444" strokeWidth="1.5" />
                  </>
                )}

                {/* Muzzle Flash if Bang */}
                {lastAction?.result === 'BANG' && (
                  <circle cx={isSawActive ? 222 : 306} cy="36" r="14" fill="#ef4444" opacity="0.8" className="animate-ping" />
                )}
              </svg>

              {/* Sawed-Off Visual Badge Overlay */}
              {isSawActive && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-[9px] font-orbitron font-black text-amber-300 flex items-center space-x-1 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                  <ItemIcon item="saw" className="w-3 h-3 text-amber-300" />
                  <span>{t('shotgun.sawedOffDmg')}</span>
                </div>
              )}
            </motion.div>

            {/* Last Action Announcement Banner */}
            {lastAction && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-full max-w-sm px-3 py-1.5 rounded-xl border text-[11px] font-chakra leading-snug shadow-md ${
                  lastAction.result === 'BANG'
                    ? 'bg-red-950/40 border-red-500/60 text-red-200'
                    : lastAction.result === 'BLANK'
                    ? 'bg-slate-900/60 border-slate-600 text-slate-300'
                    : 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                }`}
              >
                {lastAction.message}
              </motion.div>
            )}

            {/* Tactical Items Inventory Header with Info button */}
            <div className="w-full flex flex-col items-center space-y-1 pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-orbitron uppercase tracking-wider text-slate-400">
                  {t('shotgun.tacticalItems')} ({myItems.length}/4)
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="p-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                  title={t('shotgun.boostGuideTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-center space-x-2 flex-wrap gap-y-1.5">
                {myItems.length === 0 ? (
                  <span className="text-[10px] font-chakra text-slate-600 italic">{t('shotgun.emptyInventory')}</span>
                ) : (
                  myItems.map((item, idx) => {
                    const itemName = t(`shotgun.item${item.charAt(0).toUpperCase() + item.slice(1)}` as any);
                    const itemShort = t(`shotgun.item${item.charAt(0).toUpperCase() + item.slice(1)}Short` as any);
                    const isSawDisabled = item === 'saw' && isSawActive;
                    const isCuffsDisabled = item === 'handcuffs' && isOpponentHandcuffed;
                    const canUse = isMyTurn && !isSawDisabled && !isCuffsDisabled;

                    return (
                      <button
                        key={`${item}-${idx}`}
                        disabled={!canUse}
                        onClick={() => handleUseItemClick(item)}
                        className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                          canUse
                            ? 'bg-gradient-to-r from-red-950/60 to-slate-900 border-red-500/60 text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer'
                            : 'bg-black/40 border-white/10 opacity-50 cursor-not-allowed text-slate-400'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-white/10 text-red-400 shrink-0">
                          <ItemIcon item={item} className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <span className="text-[11px] font-chakra font-bold">{itemName}</span>
                            {isSawDisabled && (
                              <span className="text-[8px] font-mono bg-red-500/20 text-red-300 px-1 py-0.2 rounded border border-red-500/40">
                                {t('shotgun.sawAlreadyActive')}
                              </span>
                            )}
                            {isCuffsDisabled && (
                              <span className="text-[8px] font-mono bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/40">
                                {t('shotgun.opponentAlreadyHandcuffed')}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-chakra text-slate-400 leading-tight">{itemShort}</span>
                          {canUse && (
                            <span className="text-[8px] font-mono text-cyan-300 font-bold mt-0.5">{t('shotgun.clickToUse')}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tactical Boost Guide Modal */}
        {showGuideModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex flex-col p-4 rounded-3xl bg-[#121520] border border-cyan-500/40 shadow-2xl max-w-sm w-full text-slate-200 max-h-[90%] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                      {t('shotgun.boostGuideTitle')}
                    </h3>
                    <p className="text-[10px] font-chakra text-slate-400">
                      {t('shotgun.boostGuideSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 rounded-xl bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs font-chakra">
                {/* Saw */}
                <div className="p-2.5 rounded-2xl bg-black/50 border border-red-500/30 flex space-x-2.5">
                  <div className="p-2 rounded-xl bg-red-500/20 text-red-400 self-start shrink-0">
                    <ItemIcon item="saw" className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <span className="font-orbitron font-bold text-red-300 text-[11px]">
                      {t('shotgun.guideSawTitle')}
                    </span>
                    <span className="text-[10px] text-slate-300 leading-snug">
                      {t('shotgun.guideSawDesc')}
                    </span>
                  </div>
                </div>

                {/* Ejector */}
                <div className="p-2.5 rounded-2xl bg-black/50 border border-amber-500/30 flex space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 self-start shrink-0">
                    <ItemIcon item="ejector" className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <span className="font-orbitron font-bold text-amber-300 text-[11px]">
                      {t('shotgun.guideEjectorTitle')}
                    </span>
                    <span className="text-[10px] text-slate-300 leading-snug">
                      {t('shotgun.guideEjectorDesc')}
                    </span>
                  </div>
                </div>

                {/* Handcuffs */}
                <div className="p-2.5 rounded-2xl bg-black/50 border border-purple-500/30 flex space-x-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 self-start shrink-0">
                    <ItemIcon item="handcuffs" className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <span className="font-orbitron font-bold text-purple-300 text-[11px]">
                      {t('shotgun.guideHandcuffsTitle')}
                    </span>
                    <span className="text-[10px] text-slate-300 leading-snug">
                      {t('shotgun.guideHandcuffsDesc')}
                    </span>
                  </div>
                </div>

                {/* Inverter */}
                <div className="p-2.5 rounded-2xl bg-black/50 border border-cyan-500/30 flex space-x-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 self-start shrink-0">
                    <ItemIcon item="inverter" className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <span className="font-orbitron font-bold text-cyan-300 text-[11px]">
                      {t('shotgun.guideInverterTitle')}
                    </span>
                    <span className="text-[10px] text-slate-300 leading-snug">
                      {t('shotgun.guideInverterDesc')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="mt-3 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron font-black text-xs uppercase tracking-wider transition-all"
              >
                {t('shotgun.guideGotIt')}
              </button>
            </div>
          </div>
        )}

        {/* Betting Window State */}
        {roomState === 'BETTING_WINDOW' && (
          <div className="flex flex-col items-center space-y-1 py-4">
            <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider animate-pulse flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('arena.bettingWindowTitle')}</span>
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
            </span>
            <span className="text-[10px] font-rajdhani text-slate-400">
              {t('arena.bettingWindowActiveDesc')}
            </span>
          </div>
        )}

        {/* 2-Phase Settlement Popups */}
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
              {isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3 filter drop-shadow-[0_0_15px_#f59e0b]" />
                  <h2 className="text-2xl font-orbitron font-black text-emerald-400 tracking-wider uppercase animate-pulse">
                    {t('shotgun.victoryTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    {t('shotgun.victoryDesc')}
                  </p>
                </>
              ) : role === 'player' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 text-rose-400 animate-pulse">
                    <Crosshair className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                    {t('shotgun.defeatTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-300 mt-2">
                    {t('shotgun.defeatDesc')}
                  </p>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-cyan-400 mb-3 animate-pulse" />
                  <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
                    {t('arena.duelConcluded')}
                  </h2>
                </>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Settled Modal with Prize row & Rematch */}
        {outcomePhase === 'settled' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex flex-col items-center p-5 bg-[#121520] border rounded-3xl shadow-2xl max-w-xs w-full text-center ${
                isWinner ? 'border-cyan-400' : 'border-white/10'
              }`}
            >
              {isWinner ? (
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-rose-400">
                  <Crosshair className="w-6 h-6" />
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isWinner ? t('shotgun.victoryTitle') : role === 'player' ? t('shotgun.defeatTitle') : t('arena.duelConcluded')}
              </h2>

              {/* Winner Prize row shown ONLY to the winner! */}
              {isWinner && (
                <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-white/10 w-full flex justify-between items-center text-xs font-chakra">
                  <span className="text-slate-400">{t('arena.winnerPrize')}</span>
                  <span className="font-bold text-cyan-300 flex items-center space-x-1">
                    <span>+{winnerPayoutTon}</span>
                    <GramIcon className="w-3.5 h-3.5 text-cyan-400 inline" />
                  </span>
                </div>
              )}

              {/* Rematch Offer Received */}
              {rematchOffer && isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-red-500/20 border border-red-500/60 flex flex-col space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                      <span>{t('arena.rematchOfferSent')}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-red-400">{rematchOffer.newWagerTon} TON</span>
                  </div>
                  <span className="text-[10px] font-chakra text-slate-300">{t('arena.waitingForOpponentRematch')}</span>
                </div>
              )}

              {rematchOffer && !isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/60 flex flex-col space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-white">{t('arena.rematchChallengeReceived')}</span>
                    <span className="text-xs font-mono font-bold text-cyan-300">{rematchOffer.newWagerTon} TON</span>
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
                      <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">{t('arena.decline')}</button>
                      <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold font-orbitron shadow-md">{t('arena.accept2x')}</button>
                    </div>
                  )}
                </div>
              )}

              {/* Rematch Button */}
              {!rematchOffer && onRequestRematch && role === 'player' && (
                !opponentConnected ? (
                  <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                    {t('arena.opponentLeft')}
                  </div>
                ) : (
                  <button
                    onClick={onRequestRematch}
                    className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-red-600 to-cyan-600 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('arena.rematch2x')}</span>
                  </button>
                )
              )}

              {isWinner && (
                <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center space-x-1.5 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
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
      </div>

      {/* Bottom Controls: Action Buttons or Lobby Ready */}
      <div className="w-full z-10 pt-2.5 border-t border-white/10 flex flex-col items-center">
        {roomState === 'LOBBY' ? (
          role === 'player' ? (
            <div className="w-full flex flex-col space-y-2">
              {isCreator && !hasPlayerB && onInviteChallenger && (
                <button
                  onClick={onInviteChallenger}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron font-extrabold rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Swords className="w-4 h-4 text-cyan-300" />
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
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
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
                  <div className="w-full py-2.5 px-3 bg-black/60 border border-cyan-400/30 rounded-xl text-center">
                    <span className="text-xs font-chakra font-bold text-cyan-300">
                      {t('arena.spectatorWaitingOpponent')}
                    </span>
                  </div>
                  {onJoinAsPlayer && (
                    <button
                      onClick={onJoinAsPlayer}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-cyan-600 text-white font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{t('arena.joinAsPlayer', { amount: wagerTon })}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full py-3 bg-black/60 border border-white/10 rounded-xl text-center">
                  <span className="text-xs font-chakra font-bold text-pink-400">
                    {t('arena.spectatorWaitingReady')}
                  </span>
                </div>
              )}
            </div>
          )
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            isMyTurn ? (
              <div className="w-full flex flex-col space-y-2">
                <div className="flex space-x-2.5 w-full">
                  {/* Shoot Rival */}
                  <button
                    onClick={() => handleShootClick('opponent')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Crosshair className="w-4 h-4 text-white inline" />
                      <span>{t('shotgun.shootRival')}</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5 text-red-200">
                      {t('shotgun.shootRivalDesc')}
                    </span>
                  </button>

                  {/* Shoot Self */}
                  <button
                    onClick={() => handleShootClick('self')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-[#101422] border-2 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-950/40 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Shield className="w-4 h-4 text-cyan-400 inline" />
                      <span>{t('shotgun.shootSelf')}</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5 text-cyan-200">
                      {t('shotgun.shootSelfDesc')}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-black/50 border border-white/10 text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {t('shotgun.rivalAiming', { name: activeTurnName })}
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-black/60 border border-white/10 rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-red-400">
                {t('shotgun.spectatorNotice')}
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
