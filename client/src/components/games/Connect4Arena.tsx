import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  isPlayerTurn,
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

  const board: Connect4Cell[][] = gameData?.board ?? Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
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

  const handleColumnClick = (colIndex: number) => {
    if (!isMyTurn || roomState !== 'GAME_ACTIVE') return;
    if (board[0][colIndex] !== 0) return; // Column is full
    triggerImpact?.();
    onDrop(colIndex);
  };

  const isCellWinning = (r: number, c: number) => {
    if (!winningLine) return false;
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-3 sm:p-4 bg-cyber-card/90 border border-blue-500/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden min-h-[540px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-blue-950/20 via-black/40 to-black/90 pointer-events-none" />

      {/* Top Header: Players & Chip Indicators */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-2">
        {/* Player A (Cyan Chip) */}
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 w-full">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
            {userSide === 'A' && role === 'player' && (
              <span className="text-[9px] bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan px-1 rounded font-mono">TU</span>
            )}
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'A' ? (
                <span className="text-cyber-cyan font-bold animate-pulse">🎯 TURNO ATTIVO (10s)</span>
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

        {/* Center: Moves Counter */}
        <div className="flex flex-col items-center justify-center px-2">
          {roomState === 'GAME_ACTIVE' && (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-orbitron uppercase text-slate-400">MOSSE</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                {movesCount} / 42
              </span>
            </div>
          )}
        </div>

        {/* Player B (Pink Chip) */}
        <div className="flex flex-col items-end flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 justify-end w-full">
            {userSide === 'B' && role === 'player' && (
              <span className="text-[9px] bg-cyber-pink/20 border border-cyber-pink/40 text-cyber-pink px-1 rounded font-mono">TU</span>
            )}
            <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
            <div className="w-3.5 h-3.5 rounded-full bg-pink-500 border border-pink-200 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'B' ? (
                <span className="text-cyber-pink font-bold animate-pulse">🎯 TURNO ATTIVO (10s)</span>
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

      {/* Center 7x6 Connect 4 Grid */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10">
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center space-y-1">
            {/* Column Drop Buttons (Top Row) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full max-w-[280px] sm:max-w-[320px] px-2 mb-1">
              {Array.from({ length: COLS }).map((_, c) => {
                const isColFull = board[0][c] !== 0;
                const canDrop = isMyTurn && !isColFull;
                return (
                  <button
                    key={`drop-btn-${c}`}
                    disabled={!canDrop}
                    onClick={() => handleColumnClick(c)}
                    className={`h-7 rounded-lg flex items-center justify-center transition-all ${
                      canDrop
                        ? userSide === 'A'
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/40 hover:scale-110 active:scale-95 shadow-[0_0_10px_rgba(34,211,238,0.4)] cursor-pointer'
                          : 'bg-pink-500/20 border border-pink-400 text-pink-300 hover:bg-pink-500/40 hover:scale-110 active:scale-95 shadow-[0_0_10px_rgba(236,72,153,0.4)] cursor-pointer'
                        : 'opacity-20 cursor-not-allowed text-slate-600'
                    }`}
                  >
                    <ChevronDown className={`w-4 h-4 ${canDrop ? 'animate-bounce' : ''}`} />
                  </button>
                );
              })}
            </div>

            {/* Neon Blue Grid Frame */}
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-blue-900/80 via-blue-950/90 to-black/95 border-2 border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <div className="grid grid-rows-6 gap-1 sm:gap-1.5">
                {board.map((row, r) => (
                  <div key={`row-${r}`} className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {row.map((cell, c) => {
                      const isWinning = isCellWinning(r, c);
                      const isLast = lastMove?.row === r && lastMove?.col === c;

                      return (
                        <div
                          key={`cell-${r}-${c}`}
                          onClick={() => handleColumnClick(c)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                            cell === 0
                              ? 'bg-black/80 border border-blue-900/60 shadow-inner'
                              : cell === 1
                              ? 'bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-600 border border-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                              : 'bg-gradient-to-br from-pink-300 via-pink-500 to-rose-600 border border-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                          } ${isWinning ? 'ring-4 ring-amber-400 shadow-[0_0_20px_#f59e0b] scale-105 z-20 animate-pulse' : ''}`}
                        >
                          {/* Inner Ring detail */}
                          {cell !== 0 && (
                            <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center">
                              {isLast && !isWinning && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              )}
                              {isWinning && (
                                <span className="text-[10px]">⭐</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Turn instruction hint */}
            <div className="text-center pt-1">
              {isMyTurn ? (
                <span className="text-[11px] font-chakra text-cyan-300 animate-pulse font-bold">
                  Tocca una colonna per far cadere il tuo gettone! (10s)
                </span>
              ) : (
                <span className="text-[11px] font-chakra text-slate-400">
                  In attesa della mossa di {activeTurnName}...
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
              <span>PARI-MUTUEL BETTING WINDOW</span>
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
            </span>
            <span className="text-[10px] font-rajdhani text-slate-400">
              Entrambi i duellanti confermati. Griglia 7x6 pronta!
            </span>
          </div>
        )}

        {/* 2-Phase Settlement Popups */}
        {/* Phase 1: 3-Second Victory/Defeat Splash Modal */}
        {outcomePhase === 'splash' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div
              className={`flex flex-col items-center p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
                isDraw
                  ? 'bg-gradient-to-b from-blue-950/40 via-black/95 to-black border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.4)]'
                  : isWinner
                  ? 'bg-gradient-to-b from-cyber-green/20 via-black/95 to-black border-cyber-green shadow-[0_0_50px_rgba(0,255,102,0.4)]'
                  : role === 'player'
                  ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                  : 'bg-gradient-to-b from-cyan-950/40 via-black/95 to-black border-cyber-cyan shadow-[0_0_50px_rgba(0,240,255,0.3)]'
              }`}
            >
              {isDraw ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-3 text-3xl">
                    🤝
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-blue-400 tracking-wider uppercase animate-pulse">
                    PAREGGIO!
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    Griglia 7x6 piena senza 4 in fila. Puntate rimborsate!
                  </p>
                </>
              ) : isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-cyber-amber animate-bounce mb-3 filter drop-shadow-[0_0_15px_#ffb800]" />
                  <h2 className="text-2xl font-orbitron font-black text-cyber-green tracking-wider uppercase animate-pulse">
                    🏆 4 IN FILA! VITTORIA!
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    Hai allineato 4 gettoni e vinto la sfida!
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
                    L'avversario ha connesso 4 gettoni in fila.
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
              {isDraw ? (
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-2 text-2xl">
                  🤝
                </div>
              ) : isWinner ? (
                <Trophy className="w-12 h-12 text-cyber-amber mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-2xl">
                  💀
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isDraw ? '🤝 PAREGGIO' : isWinner ? '🏆 VITTORIA!' : role === 'player' ? '💀 DUELLO CONCLUSO' : '⚔️ DUELLO CONCLUSO'}
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

              {isDraw && (
                <div className="my-2 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40 w-full text-xs font-chakra text-blue-200">
                  100% delle puntate rimborsate sul saldo di gioco.
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
                    className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-blue-500 to-cyber-cyan text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
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

      {/* Bottom Controls: Ready or Status */}
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
                    : 'bg-blue-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95'
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
                  <div className="w-full py-2.5 px-3 bg-black/60 border border-cyber-cyan/30 rounded-xl text-center">
                    <span className="text-xs font-chakra font-bold text-cyber-cyan">
                      {t('arena.spectatorWaitingOpponent')}
                    </span>
                  </div>
                  {onJoinAsPlayer && (
                    <button
                      onClick={onJoinAsPlayer}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
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
              <div className="w-full py-2 px-3 rounded-xl bg-blue-500/20 border border-blue-500/50 text-center flex items-center justify-center space-x-2">
                <span className="text-xs font-orbitron font-bold text-blue-300 animate-pulse">
                  ⚡ TOCCA LE FRECCE O LA COLONNA PER GIOCARE IL GETTONE (10s)
                </span>
              </div>
            ) : (
              <div className="w-full py-2.5 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} sta studiando la mossa...
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-2.5 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-blue-400">
                👁️ VISTA SPETTATORE • ANALIZZA LA GRIGLIA E SCOMMETTI
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
