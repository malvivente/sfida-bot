import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  Loader2,
  Swords,
  ChevronDown,
} from 'lucide-react';
import { Connect4State, Connect4Cell } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';
import { useHaptics } from '../../hooks/useHaptics.js';

interface Connect4ArenaProps {
  gameData?: Connect4State;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onDrop: (column: number) => void;
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

const ROWS = 6;
const COLS = 7;

export const Connect4Arena: React.FC<Connect4ArenaProps> = ({
  gameData,
  role,
  onDrop,
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

  const serverBoard: Connect4Cell[][] = gameData?.board ?? Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const currentTurn = gameData?.currentTurn ?? 'A';
  const movesCount = gameData?.movesCount ?? 0;
  const lastMove = gameData?.lastMove;
  const winningLine = gameData?.winningLine;
  const isDraw = gameData?.isDraw ?? false;

  const isMyTurn = role === 'player' && currentTurn === userSide;
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  // Column hover preview & Optimistic drop tracking
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [optimisticDrop, setOptimisticDrop] = useState<{ col: number; row: number; chip: Connect4Cell } | null>(null);

  // Clear optimistic drop once server board confirms the move
  useEffect(() => {
    if (optimisticDrop) {
      if (serverBoard[optimisticDrop.row]?.[optimisticDrop.col] !== 0) {
        setOptimisticDrop(null);
      }
    }
  }, [serverBoard, optimisticDrop]);

  // Combined board with optimistic preview
  const displayBoard = serverBoard.map((row, r) =>
    row.map((cell, c) => {
      if (optimisticDrop && optimisticDrop.row === r && optimisticDrop.col === c) {
        return optimisticDrop.chip;
      }
      return cell;
    })
  );

  // 2-Phase settlement popup
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

  // Helper to find lowest open row for a column
  const getLowestOpenRow = (col: number) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (serverBoard[r][col] === 0) return r;
    }
    return -1;
  };

  const handleColumnClick = (colIndex: number) => {
    if (!isMyTurn || roomState !== 'GAME_ACTIVE') return;
    const targetRow = getLowestOpenRow(colIndex);
    if (targetRow === -1) return; // Column is full

    triggerImpact?.('medium');

    // Immediate instant optimistic drop feedback (zero delay)
    setOptimisticDrop({
      col: colIndex,
      row: targetRow,
      chip: userSide === 'A' ? 1 : 2,
    });

    onDrop(colIndex);
  };

  const isCellWinning = (r: number, c: number) => {
    if (!winningLine) return false;
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-3 sm:p-4 bg-[#0c101c] border border-blue-500/40 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] relative overflow-hidden min-h-[550px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.12),transparent_70%)] pointer-events-none" />

      {/* Top Header: Players with Clear Turn Highlighting */}
      <div className="w-full z-10 grid grid-cols-2 gap-2.5 pb-2 border-b border-white/10">
        {/* Player A Card (Cyan) */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            currentTurn === 'A' && roomState === 'GAME_ACTIVE'
              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] scale-[1.02]'
              : 'bg-black/40 border-white/10 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-1.5 min-w-0">
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0" />
              <span className="text-xs font-chakra font-black text-cyan-300 truncate">{playerAName}</span>
            </div>
            {userSide === 'A' && role === 'player' && (
              <span className="text-[8px] bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                {t('arena.you')}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono mt-1">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'A' ? (
                <span className="text-cyan-300 font-black animate-pulse">{t('arena.activeTurn')} (10s)</span>
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

        {/* Player B Card (Pink) */}
        <div
          className={`flex flex-col p-2.5 rounded-2xl border transition-all duration-300 ${
            currentTurn === 'B' && roomState === 'GAME_ACTIVE'
              ? 'bg-rose-950/40 border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-[1.02]'
              : 'bg-black/40 border-white/10 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-1.5 min-w-0">
              <div className="w-3.5 h-3.5 rounded-full bg-pink-500 border border-pink-200 shadow-[0_0_8px_rgba(236,72,153,0.8)] shrink-0" />
              <span className="text-xs font-chakra font-black text-pink-300 truncate">{playerBName}</span>
            </div>
            {userSide === 'B' && role === 'player' && (
              <span className="text-[8px] bg-pink-500/20 border border-pink-400/50 text-pink-300 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                {t('arena.you')}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono mt-1 text-right">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'B' ? (
                <span className="text-pink-300 font-black animate-pulse">{t('arena.activeTurn')} (10s)</span>
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

      {/* Main Connect 4 Interactive Grid Area */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10">
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center space-y-2 w-full max-w-[340px]">
            {/* Luminous Active Turn Header Banner */}
            <div
              className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between text-xs font-heading font-black tracking-wider uppercase transition-all duration-300 ${
                isMyTurn
                  ? userSide === 'A'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-pulse'
                    : 'bg-pink-500/20 border-pink-400 text-pink-200 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-black/50 border-white/10 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-cyan-300 animate-ping' : 'bg-slate-600'}`} />
                <span>
                  {isMyTurn ? t('connect4.tapColumnPrompt') : t('connect4.rivalThinking', { name: activeTurnName })}
                </span>
              </div>
              <span className="font-mono text-xs text-white">
                {t('connect4.moves')}: {movesCount}/42
              </span>
            </div>

            {/* Vertical Column Board with Full-Height Clickable Zones */}
            <div
              className={`p-2.5 rounded-2xl bg-gradient-to-b from-blue-950/90 via-slate-950/90 to-black/95 border-2 shadow-[0_0_35px_rgba(59,130,246,0.3)] transition-all ${
                isMyTurn
                  ? userSide === 'A'
                    ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                    : 'border-pink-400/80 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                  : 'border-blue-500/40'
              }`}
            >
              {/* 7 Columns Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: COLS }).map((_, c) => {
                  const lowestOpenRow = getLowestOpenRow(c);
                  const isColFull = lowestOpenRow === -1;
                  const canDrop = isMyTurn && !isColFull;
                  const isHovered = hoveredCol === c && canDrop;

                  return (
                    <div
                      key={`col-${c}`}
                      onClick={() => handleColumnClick(c)}
                      onMouseEnter={() => setHoveredCol(c)}
                      onMouseLeave={() => setHoveredCol(null)}
                      onTouchStart={() => setHoveredCol(c)}
                      className={`flex flex-col items-center cursor-pointer transition-all rounded-xl p-0.5 select-none ${
                        canDrop ? 'hover:bg-white/[0.06] active:scale-[0.98]' : isColFull ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* Top Drop Indicator Arrow & Ghost Chip */}
                      <div className="h-6 w-full flex items-center justify-center mb-1">
                        {canDrop ? (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isHovered
                                ? userSide === 'A'
                                  ? 'bg-cyan-400 text-black shadow-[0_0_10px_#22d3ee] scale-110'
                                  : 'bg-pink-500 text-white shadow-[0_0_10px_#ec4899] scale-110'
                                : 'text-slate-500 hover:text-white'
                            }`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        )}
                      </div>

                      {/* 6 Cells from top (0) to bottom (5) */}
                      <div className="flex flex-col space-y-1.5">
                        {Array.from({ length: ROWS }).map((_, r) => {
                          const cell = displayBoard[r][c];
                          const isWinning = isCellWinning(r, c);
                          const isLast = lastMove?.row === r && lastMove?.col === c;
                          const isGhostTarget = isHovered && lowestOpenRow === r;

                          return (
                            <div
                              key={`cell-${r}-${c}`}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all relative ${
                                cell === 0
                                  ? isGhostTarget
                                    ? userSide === 'A'
                                      ? 'bg-cyan-950/60 border-2 border-dashed border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)] animate-pulse'
                                      : 'bg-pink-950/60 border-2 border-dashed border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.5)] animate-pulse'
                                    : 'bg-black/90 border border-blue-900/60 shadow-inner'
                                  : cell === 1
                                  ? 'bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 border border-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.8)]'
                                  : 'bg-gradient-to-br from-pink-300 via-pink-500 to-rose-600 border border-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.8)]'
                              } ${isWinning ? 'ring-4 ring-amber-400 shadow-[0_0_25px_#f59e0b] scale-110 z-20 animate-pulse' : ''}`}
                            >
                              {/* Inner Token Ring Texture */}
                              {cell !== 0 && (
                                <motion.div
                                  initial={optimisticDrop?.row === r && optimisticDrop?.col === c ? { y: -100, opacity: 0 } : false}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                  className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center"
                                >
                                  {isLast && !isWinning && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  )}
                                  {isWinning && (
                                    <span className="text-[10px]">⭐</span>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subtitle helper */}
            <div className="text-center pt-0.5">
              {isMyTurn ? (
                <span className="text-[11px] font-chakra text-cyan-300 font-bold animate-pulse">
                  {t('connect4.tapColumnSub')}
                </span>
              ) : (
                <span className="text-[11px] font-chakra text-slate-400">
                  {t('connect4.rivalThinking', { name: activeTurnName })}
                </span>
              )}
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
                isDraw
                  ? 'bg-gradient-to-b from-blue-950/40 via-black/95 to-black border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.4)]'
                  : isWinner
                  ? 'bg-gradient-to-b from-emerald-950/40 via-black/95 to-black border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]'
                  : role === 'player'
                  ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                  : 'bg-gradient-to-b from-cyan-950/40 via-black/95 to-black border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]'
              }`}
            >
              {isDraw ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-3 text-3xl">
                    🤝
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-blue-400 tracking-wider uppercase animate-pulse">
                    {t('connect4.drawTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    {t('connect4.drawDesc')}
                  </p>
                </>
              ) : isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3 filter drop-shadow-[0_0_15px_#f59e0b]" />
                  <h2 className="text-2xl font-orbitron font-black text-emerald-400 tracking-wider uppercase animate-pulse">
                    {t('connect4.victoryTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    {t('connect4.victoryDesc')}
                  </p>
                </>
              ) : role === 'player' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 text-rose-400 animate-pulse">
                    <Swords className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                    {t('connect4.defeatTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-300 mt-2">
                    {t('connect4.defeatDesc')}
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
              {isDraw ? (
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-2 text-2xl">
                  🤝
                </div>
              ) : isWinner ? (
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-rose-400">
                  <Swords className="w-6 h-6" />
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isDraw ? t('connect4.drawTitle') : isWinner ? t('connect4.victoryTitle') : role === 'player' ? t('connect4.defeatTitle') : t('arena.duelConcluded')}
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

              {isDraw && (
                <div className="my-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 w-full text-xs font-chakra text-blue-200">
                  {t('connect4.drawRefundNotice')}
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
                      <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold font-orbitron shadow-md">{t('arena.accept2x')}</button>
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
                    className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
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

      {/* Bottom Controls: Ready or Status */}
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
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
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
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
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
              <div className="w-full py-2 px-3 rounded-xl bg-blue-500/20 border border-blue-500/50 text-center flex items-center justify-center space-x-2">
                <span className="text-xs font-orbitron font-bold text-blue-300 animate-pulse">
                  {t('connect4.tapColumnPrompt')} (10s)
                </span>
              </div>
            ) : (
              <div className="w-full py-2.5 rounded-xl bg-black/50 border border-white/10 text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {t('connect4.rivalThinking', { name: activeTurnName })}
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-2.5 bg-black/60 border border-white/10 rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-blue-400">
                {t('connect4.spectatorNotice')}
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
