import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair,
  Shield,
  RotateCcw,
  Clock,
  Trophy,
  Loader2,
  Flame,
  Swords,
  Zap,
  Volume2,
  Lock,
} from 'lucide-react';
import { CyberShotgunState, ShotgunItem, ShellType, ShotgunTarget } from '../../types/index.js';
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

const ITEM_DETAILS: Record<ShotgunItem, { name: string; icon: string; desc: string; color: string }> = {
  saw: {
    name: 'Sega',
    icon: '🪚',
    desc: 'Raddoppia il danno del prossimo colpo a 2 HP',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/60 text-amber-300',
  },
  ejector: {
    name: 'Ejector',
    icon: '🍺',
    desc: 'Espelle la cartuccia in canna mostrandola a tutti',
    color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/60 text-cyan-300',
  },
  handcuffs: {
    name: 'Manette',
    icon: '🔗',
    desc: "Fa saltare il prossimo turno all'avversario",
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/60 text-purple-300',
  },
  inverter: {
    name: 'Invertitore',
    icon: '🔄',
    desc: 'Inverte la polarità del colpo: Vera ↔ Salve',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/60 text-emerald-300',
  },
};

export const CyberShotgunArena: React.FC<CyberShotgunArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
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
  const opponentItems = userSide === 'A' ? itemsB : itemsA;
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;
  const isMyTurn = role === 'player' && currentTurn === userSide;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  // 2-Phase settlement popup: 3s splash screen then settled view
  const [outcomePhase, setOutcomePhase] = useState<'splash' | 'settled' | 'none'>('none');

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
    triggerImpact?.();
    onShoot(target);
  };

  const handleUseItemClick = (item: ShotgunItem) => {
    if (!isMyTurn) return;
    triggerImpact?.();
    onUseItem(item);
  };

  // Render HP Hearts/Bars
  const renderHpMeters = (hp: number, max: number, side: 'A' | 'B') => {
    const isPlayer = side === userSide && role === 'player';
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: max }).map((_, i) => {
          const isAlive = i < hp;
          return (
            <div
              key={i}
              className={`w-4 h-5 sm:w-5 sm:h-6 rounded-md border flex items-center justify-center transition-all duration-300 ${
                isAlive
                  ? side === 'A'
                    ? 'bg-cyber-cyan/30 border-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.5)] text-cyber-cyan'
                    : 'bg-cyber-pink/30 border-cyber-pink shadow-[0_0_10px_rgba(255,0,85,0.5)] text-cyber-pink'
                  : 'bg-black/60 border-slate-800 text-slate-700 opacity-40'
              }`}
            >
              <span className="text-[10px] font-bold">{isAlive ? '⚡' : '✖'}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-red-500/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden min-h-[540px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-red-950/20 via-black/40 to-black/90 pointer-events-none" />

      {/* Top Header: Players & HP Meters */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-2">
        {/* Player A */}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 w-full">
            <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
            {userSide === 'A' && role === 'player' && (
              <span className="text-[9px] bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan px-1 rounded font-mono">TU</span>
            )}
          </div>
          <div className="mt-1 flex items-center space-x-1.5">
            {renderHpMeters(hpA, maxHp, 'A')}
            <span className="text-[10px] font-mono font-bold text-cyber-cyan">{hpA}/{maxHp} HP</span>
          </div>
          {isHandcuffedA && (
            <span className="text-[8px] font-mono text-purple-400 bg-purple-950/60 border border-purple-500/40 px-1 py-0.5 rounded mt-1">
              🔗 AMMANETTATO
            </span>
          )}
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'A' ? (
                <span className="text-cyber-cyan font-bold animate-pulse">🎯 IN AZIONE</span>
              ) : (
                <span className="text-slate-500">ATTESA</span>
              )
            ) : playerAReady ? (
              <span className="text-cyber-green font-bold">✓ PRONTO</span>
            ) : (
              <span className="text-slate-400">IN ATTESA</span>
            )}
          </span>
        </div>

        {/* Center: Manche & Saw indicator */}
        <div className="flex flex-col items-center justify-center px-2">
          {roomState === 'GAME_ACTIVE' && (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-orbitron uppercase text-slate-400">ROUND {mancheNumber}</span>
              {isSawActive && (
                <span className="text-[9px] font-orbitron font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500 px-1.5 py-0.5 rounded-full animate-pulse mt-0.5 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                  🪚 2X DANNO
                </span>
              )}
            </div>
          )}
        </div>

        {/* Player B */}
        <div className="flex flex-col items-end flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 justify-end w-full">
            {userSide === 'B' && role === 'player' && (
              <span className="text-[9px] bg-cyber-pink/20 border border-cyber-pink/40 text-cyber-pink px-1 rounded font-mono">TU</span>
            )}
            <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
          </div>
          <div className="mt-1 flex items-center space-x-1.5">
            <span className="text-[10px] font-mono font-bold text-cyber-pink">{hpB}/{maxHp} HP</span>
            {renderHpMeters(hpB, maxHp, 'B')}
          </div>
          {isHandcuffedB && (
            <span className="text-[8px] font-mono text-purple-400 bg-purple-950/60 border border-purple-500/40 px-1 py-0.5 rounded mt-1">
              🔗 AMMANETTATO
            </span>
          )}
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'B' ? (
                <span className="text-cyber-pink font-bold animate-pulse">🎯 IN AZIONE</span>
              ) : (
                <span className="text-slate-500">ATTESA</span>
              )
            ) : playerBReady ? (
              <span className="text-cyber-green font-bold">✓ PRONTO</span>
            ) : (
              <span className="text-slate-400">IN ATTESA</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Cyber Shotgun & Ammo Counts */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10 text-center">
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center space-y-3 w-full">
            {/* Ammo Magazine Display */}
            <div className="flex items-center justify-center space-x-4 px-4 py-2 rounded-2xl bg-black/60 border border-slate-800 shadow-inner">
              {/* Live Shells */}
              <div className="flex items-center space-x-1.5">
                <div className="w-3.5 h-6 rounded-sm bg-gradient-to-t from-red-600 to-red-400 border border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.7)] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">🔥</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-chakra uppercase text-slate-400">Vere</span>
                  <span className="text-sm font-mono font-black text-red-400">{liveCount}</span>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-slate-800" />

              {/* Blank Shells */}
              <div className="flex items-center space-x-1.5">
                <div className="w-3.5 h-6 rounded-sm bg-gradient-to-t from-slate-500 to-slate-300 border border-slate-200 shadow-[0_0_8px_rgba(148,163,184,0.4)] flex items-center justify-center">
                  <span className="text-[8px] font-bold text-black">⚪</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-chakra uppercase text-slate-400">A Salve</span>
                  <span className="text-sm font-mono font-black text-slate-300">{blankCount}</span>
                </div>
              </div>

              <div className="h-6 w-[1px] bg-slate-800" />

              {/* Total Remaining */}
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-chakra uppercase text-slate-400">Nel Fucile</span>
                <span className="text-sm font-mono font-bold text-cyber-cyan">{totalShells}</span>
              </div>
            </div>

            {/* Central Shotgun 2D Representation */}
            <motion.div
              animate={lastAction?.type === 'SHOOT' ? { x: [-8, 8, -4, 4, 0], scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="relative w-56 sm:w-64 h-24 rounded-2xl bg-gradient-to-b from-slate-900/90 to-black/90 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] overflow-hidden"
            >
              {/* Shotgun Silhouette */}
              <svg viewBox="0 0 200 60" className="w-48 h-16 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                {/* Stock */}
                <path d="M 15 25 L 35 15 L 45 15 L 50 28 L 40 45 L 20 45 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                {/* Receiver */}
                <rect x="50" y="20" width="45" height="18" rx="2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
                {/* Ejection Port */}
                <rect x="68" y="23" width="16" height="6" rx="1" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1" />
                {/* Pump Handle */}
                <rect x="105" y="32" width="30" height="10" rx="2" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Barrel (Normal or Sawed-off) */}
                {isSawActive ? (
                  <path d="M 95 24 L 140 24 L 140 32 L 95 32 Z" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
                ) : (
                  <path d="M 95 24 L 185 24 L 185 32 L 95 32 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.8" />
                )}
                {/* Muzzle flash glow if BANG */}
                {lastAction?.result === 'BANG' && (
                  <circle cx="188" cy="28" r="8" fill="#ef4444" opacity="0.8" className="animate-ping" />
                )}
              </svg>

              {/* Status overlay */}
              {isSawActive && (
                <div className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500 text-[9px] font-mono text-amber-300">
                  CANNA MOZZATA
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

            {/* Tactical Items Inventory Shelf */}
            <div className="w-full flex flex-col items-center space-y-1 pt-1">
              <span className="text-[10px] font-orbitron uppercase tracking-wider text-slate-400">
                I TUOI OGGETTI TATTICI ({myItems.length}/4)
              </span>
              <div className="flex items-center justify-center space-x-2 flex-wrap gap-y-1">
                {myItems.length === 0 ? (
                  <span className="text-[10px] font-chakra text-slate-600 italic">Nessun oggetto nell'inventario</span>
                ) : (
                  myItems.map((item, idx) => {
                    const info = ITEM_DETAILS[item];
                    return (
                      <button
                        key={`${item}-${idx}`}
                        disabled={!isMyTurn}
                        onClick={() => handleUseItemClick(item)}
                        className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center space-x-1.5 transition-all ${
                          isMyTurn
                            ? `bg-gradient-to-r ${info.color} shadow-sm hover:scale-105 active:scale-95 cursor-pointer`
                            : 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed text-slate-400'
                        }`}
                      >
                        <span className="text-base">{info.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-chakra font-bold">{info.name}</span>
                          {isMyTurn && <span className="text-[8px] font-mono text-cyan-300">CLICCA PER USARE</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Betting Window State */}
        {roomState === 'BETTING_WINDOW' && (
          <div className="flex flex-col items-center space-y-1 py-4">
            <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider animate-pulse flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>PARI-MUTUEL BETTING WINDOW</span>
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
            </span>
            <span className="text-[10px] font-rajdhani text-slate-400">
              Entrambi i duellanti confermati. Caricamento cartucce in corso!
            </span>
          </div>
        )}

        {/* 2-Phase Settlement Popups */}
        {/* Phase 1: 3-Second Victory/Defeat Splash Modal */}
        {outcomePhase === 'splash' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
              className={`flex flex-col items-center p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
                isWinner
                  ? 'bg-gradient-to-b from-cyber-green/20 via-black/95 to-black border-cyber-green shadow-[0_0_50px_rgba(0,255,102,0.4)]'
                  : role === 'player'
                  ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                  : 'bg-gradient-to-b from-cyan-950/40 via-black/95 to-black border-cyber-cyan shadow-[0_0_50px_rgba(0,240,255,0.3)]'
              }`}
            >
              {isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-cyber-amber animate-bounce mb-3 filter drop-shadow-[0_0_15px_#ffb800]" />
                  <h2 className="text-2xl font-orbitron font-black text-cyber-green tracking-wider uppercase animate-pulse">
                    🏆 VITTORIA!
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    Sei sopravvissuto al Cyber Shotgun!
                  </p>
                </>
              ) : role === 'player' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 text-3xl animate-pulse">
                    💀
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                    💀 SCONFITTA!
                  </h2>
                  <p className="text-xs font-chakra text-slate-300 mt-2">
                    Punti vita azzerati dal Cyber Shotgun.
                  </p>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-cyber-cyan mb-3 animate-pulse" />
                  <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
                    ⚔️ DUELLO CONCLUSO
                  </h2>
                </>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Settled Modal with Prize row (Winner only) & Rematch */}
        {outcomePhase === 'settled' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex flex-col items-center p-5 bg-[#121520] border rounded-3xl shadow-2xl max-w-xs w-full text-center ${
                isWinner ? 'border-cyber-cyan' : 'border-cyber-border'
              }`}
            >
              {isWinner ? (
                <Trophy className="w-12 h-12 text-cyber-amber mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-2xl">
                  💀
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isWinner ? '🏆 VITTORIA!' : role === 'player' ? '💀 DUELLO CONCLUSO' : '⚔️ DUELLO CONCLUSO'}
              </h2>

              {/* Winner Prize row shown ONLY to the winner! */}
              {isWinner && (
                <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-cyber-border w-full flex justify-between items-center text-xs font-chakra">
                  <span className="text-slate-400">Winner Prize:</span>
                  <span className="font-bold text-cyber-cyan flex items-center space-x-1">
                    <span>+{winnerPayoutTon}</span>
                    <GramIcon className="w-3.5 h-3.5 text-cyber-cyan inline" />
                  </span>
                </div>
              )}

              {/* Rematch Offer Received */}
              {rematchOffer && isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-cyber-pink/20 border border-cyber-pink/60 flex flex-col space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyber-pink" />
                      <span>REMATCH OFFER SENT (2X)</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-cyber-pink">{rematchOffer.newWagerTon} TON</span>
                  </div>
                  <span className="text-[10px] font-chakra text-slate-300">In attesa dell'avversario...</span>
                </div>
              )}

              {rematchOffer && !isRematchProposer && (
                <div className="w-full p-2.5 rounded-xl bg-cyber-cyan/20 border border-cyber-cyan/60 flex flex-col space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron font-bold text-white">SFIDA REMATCH 2X RICEVUTA!</span>
                    <span className="text-xs font-mono font-bold text-cyber-cyan">{rematchOffer.newWagerTon} TON</span>
                  </div>
                  {!hasEnoughForRematch ? (
                    <button
                      onClick={() => onOpenDeposit && onOpenDeposit(missingForRematch)}
                      className="w-full py-1.5 rounded-lg bg-cyber-amber text-black text-xs font-bold font-orbitron"
                    >
                      DEPOSITA PER REMATCH
                    </button>
                  ) : (
                    <div className="flex space-x-2 pt-1">
                      <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">RIFIUTA</button>
                      <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-cyber-pink text-white text-xs font-bold font-orbitron shadow-neon-pink">ACCETTA 2X</button>
                    </div>
                  )}
                </div>
              )}

              {/* Rematch Button */}
              {!rematchOffer && onRequestRematch && role === 'player' && (
                !opponentConnected ? (
                  <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                    AVVERSARIO USCITO DALLA STANZA
                  </div>
                ) : (
                  <button
                    onClick={onRequestRematch}
                    className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-red-500 to-cyber-cyan text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>REMATCH (2X BET)</span>
                  </button>
                )
              )}

              {isWinner && (
                <div className="w-full py-2 px-3 rounded-xl bg-cyber-green/20 border border-cyber-green/60 flex items-center justify-center space-x-1.5 mb-2 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                  <span className="text-xs font-orbitron font-bold text-cyber-green">
                    ✅ PREMIO ACCREDITATO (+{winnerPayoutTon} GRAM)
                  </span>
                </div>
              )}

              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="w-full py-2 rounded-xl bg-cyber-border text-slate-300 text-xs font-chakra font-bold hover:text-white"
                >
                  TORNA ALLA LOBBY
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Controls: Actions or Lobby Ready */}
      <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
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
                    ? 'bg-black/60 border border-cyber-border text-slate-400 cursor-not-allowed shadow-inner'
                    : !hasPlayerB
                    ? 'bg-black/40 border border-cyber-border text-slate-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95'
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
                  <div className="w-full py-2.5 px-3 bg-black/60 border border-cyber-cyan/30 rounded-xl text-center">
                    <span className="text-xs font-chakra font-bold text-cyber-cyan">
                      {t('arena.spectatorWaitingOpponent')}
                    </span>
                  </div>
                  {onJoinAsPlayer && (
                    <button
                      onClick={onJoinAsPlayer}
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-cyan-500 text-white font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{t('arena.joinAsPlayer', { amount: wagerTon })}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
                  <span className="text-xs font-chakra font-bold text-cyber-pink">
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
                <span className="text-[11px] font-orbitron font-bold text-red-400 uppercase tracking-wider text-center animate-pulse">
                  ⚡ È IL TUO TURNO • SCEGLI L'AZIONE (15s)
                </span>
                <div className="flex space-x-2.5 w-full">
                  {/* Shoot Rival */}
                  <button
                    onClick={() => handleShootClick('opponent')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1">
                      <Crosshair className="w-4 h-4 text-white inline" />
                      <span>SPARA ALL'AVVERSARIO</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5 text-red-200">
                      {isSawActive ? '2 HP Danno se vera' : '1 HP Danno se vera'} · Passa turno
                    </span>
                  </button>

                  {/* Shoot Self */}
                  <button
                    onClick={() => handleShootClick('self')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-slate-900 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-950/40 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1">
                      <Shield className="w-4 h-4 text-cyan-400 inline" />
                      <span>SPARATI DA SOLO</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5 text-cyan-200">
                      Se a SALVE: guadagni TURNO EXTRA!
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} sta prendendo la mira... Trattieni il respiro!
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-red-400">
                👁️ VISTA SPETTATORE • CALCOLA LE PROBABILITÀ E SCOMMETTI
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
