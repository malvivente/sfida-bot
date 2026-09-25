import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, AlertTriangle, Trophy, Clock, WifiOff, Trash2, ArrowLeft, Loader2, CheckCircle2, RotateCcw, ArrowDownLeft } from 'lucide-react';
import { RoomState } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';

interface QuickdrawCanvasProps {
  roomState: RoomState;
  currentRound: number;
  scoreA: number;
  scoreB: number;
  lastSignal: string | null;
  feedMessage: string;
  lastReactionTimeMs: number | null;
  countdownSeconds: number | null;
  forfeitCountdown: number | null;
  roundWinner: string | null;
  matchWinner: string | null;
  matchWinnerName?: string | null;
  playerAName?: string;
  playerBName?: string | null;
  role: 'player' | 'spectator';
  isReady: boolean;
  onReady: () => void;
  onTap: () => void;
  isCreator?: boolean;
  onCancelMatch?: () => void;
  wagerTon?: string;
  isWinner?: boolean;
  onClaimPayout?: () => Promise<void>;
  isClaimingPayout?: boolean;
  payoutClaimed?: boolean;
  onReturnToLobby?: () => void;
  rematchOffer?: { proposerWallet: string; proposerName: string; newWagerTon: string } | null;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userBalanceGram?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  socketError?: string | null;
}

export const QuickdrawCanvas: React.FC<QuickdrawCanvasProps> = ({
  roomState,
  currentRound,
  scoreA,
  scoreB,
  lastSignal,
  feedMessage,
  lastReactionTimeMs,
  countdownSeconds,
  forfeitCountdown,
  roundWinner,
  matchWinner,
  matchWinnerName,
  playerAName = 'Player A',
  playerBName = 'Player B',
  role,
  isReady,
  onReady,
  onTap,
  isCreator,
  onCancelMatch,
  wagerTon = '1.00',
  isWinner = false,
  onClaimPayout,
  isClaimingPayout = false,
  payoutClaimed = false,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userBalanceGram,
  onOpenDeposit,
  socketError,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const isHoldingPrematurely = useRef(false);

  // Reset premature hold flag whenever round state transitions
  useEffect(() => {
    if (
      roomState === 'ROUND_START' ||
      roomState === 'WAITING_FOR_SIGNAL' ||
      roomState === 'ROUND_END' ||
      roomState === 'LOBBY'
    ) {
      isHoldingPrematurely.current = false;
    }
  }, [roomState]);

  // Anti-Hold exploit tap handler:
  // Must touch down strictly AFTER 'SIGNAL_FIRED'. Holding down through signals is flagged and rejected.
  const handlePointerDown = () => {
    if (roomState !== 'SIGNAL_FIRED') {
      isHoldingPrematurely.current = true;
      if (roomState === 'WAITING_FOR_SIGNAL' || roomState === 'ROUND_START') {
        triggerNotification('error');
      }
      onTap(); // Triggers server-side misfire penalty
      return;
    }

    if (isHoldingPrematurely.current) {
      // Finger was already held down from before signal; ignore until finger is lifted
      return;
    }

    triggerImpact('heavy');
    onTap();
  };

  const handlePointerUp = () => {
    isHoldingPrematurely.current = false;
  };

  const isRoundEnd = roomState === 'ROUND_END';
  const isFireSignal = lastSignal === 'FIRE!' && roomState === 'SIGNAL_FIRED';
  const isDecoyWait = (lastSignal === 'WAIT!' || lastSignal === 'HOLD!') && (roomState === 'WAITING_FOR_SIGNAL' || roomState === 'ROUND_START');
  const isMisfire = (lastSignal === 'MISFIRE!' || feedMessage.toLowerCase().includes('false start') || feedMessage.toLowerCase().includes('misfire')) && (isRoundEnd || roomState === 'FORFEITED');

  const wagerNum = parseFloat(wagerTon) || 1.0;
  const winnerPayoutTon = (wagerNum * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const requiredBal = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= requiredBal;
  const missingForRematch = Math.max(0, requiredBal - currentBal).toFixed(2);

  const winnerDisplayName =
    matchWinnerName && matchWinnerName !== 'Giocatore' && matchWinnerName !== 'Opponent' && matchWinnerName !== 'Player'
      ? matchWinnerName
      : matchWinner && !matchWinner.startsWith('player_') && !matchWinner.startsWith('spectator_')
      ? `${matchWinner.slice(0, 6)}...${matchWinner.slice(-4)}`
      : matchWinnerName || 'Arena Champion';

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center justify-between p-4 bg-cyber-card border border-cyber-border rounded-2xl shadow-2xl overflow-hidden min-h-[460px]">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Top Header: Scoreboard & Round Tracker */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-3">
        {/* Player A Score & Name */}
        <div className="flex flex-col items-start max-w-[38%]">
          <span className="text-xs text-cyber-cyan font-chakra font-bold tracking-wider truncate w-full" title={playerAName}>
            {playerAName}
          </span>
          <div className="flex items-center space-x-1 mt-1">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  scoreA > idx
                    ? 'bg-cyber-cyan shadow-[0_0_10px_#00f0ff]'
                    : 'bg-cyber-border/40 border border-cyber-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Round Badge */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-[10px] text-cyber-muted uppercase font-chakra tracking-widest">Cyber Duel</span>
          <span className="text-sm font-orbitron font-bold tracking-widest text-slate-200">
            {roomState === 'MATCH_SETTLED' ? 'FINAL' : `ROUND ${currentRound} / 3`}
          </span>
        </div>

        {/* Player B Score & Name */}
        <div className="flex flex-col items-end max-w-[38%]">
          <span className="text-xs text-cyber-pink font-chakra font-bold tracking-wider truncate w-full text-right" title={playerBName || 'Player B'}>
            {playerBName || 'Player B'}
          </span>
          <div className="flex items-center space-x-1 mt-1">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  scoreB > idx
                    ? 'bg-cyber-pink shadow-[0_0_10px_#ff0055]'
                    : 'bg-cyber-border/40 border border-cyber-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Center Arena: Signals, Alerts & Decoys (Only if match not settled) */}
      {roomState !== 'MATCH_SETTLED' && (
        <div className="my-auto w-full flex flex-col items-center justify-center py-6 z-10 text-center">
          {/* Forfeit Countdown Alert */}
          <AnimatePresence>
            {forfeitCountdown !== null && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="mb-4 bg-cyber-pink/20 border border-cyber-pink/50 rounded-xl px-4 py-2 flex items-center space-x-2 text-cyber-pink animate-pulse"
              >
                <WifiOff className="w-5 h-5" />
                <span className="text-xs font-mono font-bold">
                  OPPONENT DISCONNECTED: FORFEIT IN 00:0{forfeitCountdown}s
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Betting Countdown Alert */}
          {roomState === 'BETTING_WINDOW' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <Clock className="w-10 h-10 text-cyber-amber mb-2 animate-bounce" />
              <span className="text-xs text-cyber-amber font-mono uppercase tracking-widest">
                PARI-MUTUEL BETTING OPEN
              </span>
              <span className="text-3xl font-mono font-extrabold text-white mt-1">
                00:{countdownSeconds !== null ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '05'}
              </span>

              {isCreator && onCancelMatch && (
                <button
                  onClick={onCancelMatch}
                  className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold text-cyber-pink bg-cyber-pink/15 hover:bg-cyber-pink/25 border border-cyber-pink/40 transition-all active:scale-95 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CANCEL & REFUND</span>
                </button>
              )}
            </motion.div>
          )}

          {/* Decoy WAIT Signal */}
          {!isRoundEnd && isDecoyWait && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <AlertTriangle className="w-12 h-12 text-cyber-amber mb-2" />
              <span className="text-4xl font-orbitron font-extrabold text-cyber-amber neon-text-amber tracking-widest">
                WAIT!
              </span>
              <span className="text-xs text-cyber-amber/90 font-chakra font-bold mt-1">
                TRAP • DO NOT TAP!
              </span>
            </motion.div>
          )}

          {/* Real FIRE Signal */}
          {!isRoundEnd && isFireSignal && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="flex flex-col items-center justify-center"
            >
              <Zap className="w-16 h-16 text-cyber-cyan mb-2" />
              <span className="text-5xl font-orbitron font-black text-cyber-cyan neon-text-cyan tracking-wider">
                FIRE!
              </span>
              <span className="text-xs text-white font-chakra font-bold mt-1 uppercase tracking-widest animate-pulse">
                TAP AS FAST AS YOU CAN!
              </span>
            </motion.div>
          )}

          {/* Waiting in round */}
          {!isRoundEnd && roomState === 'WAITING_FOR_SIGNAL' && !isDecoyWait && (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-cyber-cyan/40 border-t-cyber-cyan rounded-full animate-spin mb-3" />
              <span className="text-sm font-orbitron font-bold text-cyber-cyan tracking-widest uppercase">
                WAIT FOR THE SIGNAL...
              </span>
              <span className="text-xs text-slate-400 mt-1 font-rajdhani">Random trigger armed</span>
            </div>
          )}

          {/* Dedicated Round Result Overlay Banner */}
          {isRoundEnd && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs mx-auto p-4 rounded-2xl bg-cyber-bg/95 border border-cyber-cyan/40 shadow-[0_0_25px_rgba(0,240,255,0.15)] flex flex-col items-center text-center"
            >
              {isMisfire ? (
                <>
                  <ShieldAlert className="w-10 h-10 text-cyber-pink mb-1.5 animate-pulse" />
                  <span className="text-sm font-orbitron font-extrabold text-cyber-pink uppercase tracking-wider">
                    FALSE START!
                  </span>
                  <span className="text-xs text-slate-300 font-chakra mt-1">
                    {feedMessage || 'Trigger pressed before signal.'}
                  </span>
                </>
              ) : (
                <>
                  <Trophy className="w-9 h-9 text-cyber-amber mb-1.5 animate-bounce" />
                  <span className="text-[11px] font-chakra uppercase tracking-widest text-slate-400">
                    ROUND {currentRound} AWARDED
                  </span>
                  <span className="text-base font-orbitron font-black text-white mt-0.5">
                    {roundWinner || 'Round Finished'}
                  </span>
                  {lastReactionTimeMs !== null && (
                    <div className="mt-2.5 bg-cyber-card border border-cyber-cyan/30 px-3 py-1 rounded-xl flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400 font-chakra">Reaction:</span>
                      <span className="text-xs font-chakra font-black text-cyber-cyan">
                        {lastReactionTimeMs} ms
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Intermission status */}
              <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-slate-400 font-rajdhani">
                <Loader2 className="w-3 h-3 animate-spin text-cyber-cyan" />
                <span>Next round starting shortly...</span>
              </div>
            </motion.div>
          )}

          {/* Feed Message */}
          {!isRoundEnd && (
            <p className="text-xs text-slate-400 font-rajdhani mt-4 max-w-xs">{feedMessage}</p>
          )}
        </div>
      )}

      {/* Cyberpunk Victory Overlay Modal */}
      <AnimatePresence>
        {roomState === 'MATCH_SETTLED' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-md text-center"
          >
            {/* Glowing Neon Trophy */}
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-cyber-amber/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-18 h-18 rounded-2xl bg-cyber-card border border-cyber-amber/60 flex items-center justify-center shadow-[0_0_25px_rgba(255,180,0,0.4)] p-3">
                <Trophy className="w-10 h-10 text-cyber-amber animate-bounce" />
              </div>
            </div>

            {/* Victory Titles */}
            <h3 className="text-2xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-white to-cyber-cyan tracking-wider">
              {isWinner ? '🎉 EPIC VICTORY!' : '🏆 DUEL CONCLUDED'}
            </h3>

            <p className="text-sm text-slate-300 font-chakra mt-1.5">
              Arena Champion:{' '}
              <strong className="font-orbitron text-cyber-cyan text-base font-bold">
                {winnerDisplayName}
              </strong>
            </p>

            {/* Pot Breakdown Box */}
            <div className="my-3 px-4 py-2.5 rounded-xl bg-cyber-bg/90 border border-cyber-cyan/40 flex items-center justify-between w-full max-w-xs shadow-inner">
              <span className="text-xs text-slate-400 font-chakra">Winner Prize:</span>
              <span className="text-base font-chakra font-black text-cyber-cyan flex items-center space-x-1.5">
                <span>{winnerPayoutTon}</span>
                <GramIcon className="w-4 h-4 text-cyber-cyan inline" />
              </span>
            </div>

            {/* Rematch Offer Received Modal / Banner */}
            {rematchOffer && isRematchProposer && (
              <div className="w-full max-w-xs p-3 rounded-2xl bg-cyber-pink/20 border border-cyber-pink/60 flex flex-col space-y-1.5 mb-3 shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-orbitron font-extrabold text-white flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyber-pink" />
                    <span>REMATCH OFFER SENT (2X)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-cyber-cyan">{rematchOffer.newWagerTon} GRAM</span>
                </div>
                <span className="text-xs text-slate-300 font-chakra text-center">
                  Waiting for opponent to accept the 2X challenge...
                </span>
                {onDeclineRematch && (
                  <button
                    onClick={onDeclineRematch}
                    className="w-full py-1.5 rounded-xl bg-black/60 border border-slate-600 text-xs font-chakra font-bold text-slate-300 hover:text-white"
                  >
                    WITHDRAW OFFER
                  </button>
                )}
              </div>
            )}
            {rematchOffer && !isRematchProposer && (
              <div className="w-full max-w-xs p-3 rounded-2xl bg-cyber-pink/25 border border-cyber-pink/70 flex flex-col items-center space-y-2 mb-3 shadow-[0_0_25px_rgba(255,0,85,0.4)] animate-pulse">
                <span className="text-xs font-orbitron font-extrabold text-white">
                  🔥 REMATCH CHALLENGE!
                </span>
                <span className="text-xs text-slate-200 font-chakra text-center">
                  <strong>{rematchOffer.proposerName}</strong> challenged you to a 2X Rematch for{' '}
                  <strong className="text-cyber-cyan">{rematchOffer.newWagerTon} GRAM</strong>!
                </span>
                {!hasEnoughForRematch ? (
                  <div className="flex flex-col space-y-1.5 w-full pt-1">
                    <div className="p-2 rounded-lg bg-black/70 border border-cyber-pink/50 text-[10px] text-cyber-pink font-chakra flex items-center justify-between">
                      <span>Saldo: {currentBal.toFixed(2)} GRAM</span>
                      <span className="font-bold">Mancano: {missingForRematch} GRAM</span>
                    </div>
                    <div className="flex space-x-2 w-full">
                      <button
                        onClick={onDeclineRematch}
                        className="flex-1 py-2 rounded-xl bg-cyber-bg/80 border border-cyber-border text-xs font-chakra font-bold text-slate-300 hover:text-white"
                      >
                        DECLINE
                      </button>
                      <button
                        onClick={() => onOpenDeposit?.(missingForRematch)}
                        className="flex-1 py-2 rounded-xl bg-cyber-cyan text-cyber-bg text-xs font-orbitron font-bold flex items-center justify-center space-x-1 shadow-neon-cyan hover:brightness-110 active:scale-95"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>DEPOSITA ({missingForRematch})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2 w-full pt-1">
                    <button
                      onClick={onDeclineRematch}
                      className="flex-1 py-2 rounded-xl bg-cyber-bg/80 border border-cyber-border text-xs font-chakra font-bold text-slate-300 hover:text-white"
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={onAcceptRematch}
                      className="flex-1 py-2 rounded-xl bg-cyber-pink text-white text-xs font-orbitron font-bold hover:brightness-110 shadow-neon-pink active:scale-95"
                    >
                      ACCEPT 2X
                    </button>
                  </div>
                )}
                {socketError && (
                  <div className="p-1.5 rounded-lg bg-cyber-pink/20 border border-cyber-pink/60 text-[10px] text-cyber-pink font-chakra text-center w-full">
                    {socketError}
                  </div>
                )}
              </div>
            )}

            {/* Rematch Button for Both Players (if no incoming offer currently pending) */}
            {!rematchOffer && onRequestRematch && role === 'player' && (
              !opponentConnected ? (
                <div className="w-full max-w-xs py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                  OPPONENT LEFT ROOM (REMATCH UNAVAILABLE)
                </div>
              ) : (
                <button
                  onClick={onRequestRematch}
                  className="w-full max-w-xs py-3 rounded-xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-cyber-pink via-purple-600 to-cyber-cyan text-white shadow-[0_0_20px_rgba(255,0,85,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2 mb-2"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span>REMATCH (2X BET)</span>
                </button>
              )
            )}

            {/* Winner Actions: Claim Button or Status */}
            {isWinner ? (
              <div className="w-full max-w-xs py-3 rounded-xl bg-cyber-green/15 border border-cyber-green/50 text-cyber-green font-orbitron font-bold text-xs flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,255,102,0.2)] mb-1">
                <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                <span>PRIZE AUTO-CREDITED (+{winnerPayoutTon} GRAM)</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-rajdhani max-w-xs mb-1">
                Duel concluded. Prize settled on-chain by smart contract.
              </p>
            )}

            {/* Return to Lobby Button */}
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="w-full max-w-xs py-2.5 rounded-xl bg-cyber-border/80 hover:bg-cyber-border text-slate-300 hover:text-white font-chakra font-bold text-xs uppercase transition-all active:scale-95 flex items-center justify-center space-x-1.5 mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO LOBBY</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls: Lobby Ready Button or Quickdraw Tap Button */}
      {roomState !== 'MATCH_SETTLED' && (
        <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
          {role === 'player' ? (
            roomState === 'LOBBY' ? (
              <div className="w-full flex flex-col space-y-2">
                <button
                  onClick={onReady}
                  disabled={isReady}
                  className={`w-full py-4 rounded-xl font-orbitron font-bold tracking-wider text-base uppercase transition-all duration-200 ${
                    isReady
                      ? 'bg-cyber-border text-cyber-muted cursor-not-allowed'
                      : 'bg-cyber-cyan text-cyber-bg hover:brightness-110 shadow-neon-cyan active:scale-95'
                  }`}
                >
                  {isReady ? 'READY • WAITING FOR OPPONENT' : '⚔️ READY TO DUEL'}
                </button>

                {isCreator && onCancelMatch && (
                  <button
                    onClick={onCancelMatch}
                    className="w-full py-2.5 rounded-xl font-orbitron font-bold tracking-wider text-xs uppercase bg-cyber-pink/15 hover:bg-cyber-pink/25 border border-cyber-pink/40 text-cyber-pink transition-all active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>CANCEL DUEL & REFUND</span>
                  </button>
                )}
              </div>
            ) : roomState === 'BETTING_WINDOW' ? (
              <div className="w-full flex flex-col space-y-2">
                <button
                  disabled
                  className="w-full h-20 rounded-2xl font-orbitron font-bold text-xs uppercase tracking-widest bg-cyber-bg/70 border border-cyber-amber/50 text-cyber-amber flex items-center justify-center space-x-2 select-none shadow-inner"
                >
                  <Clock className="w-4 h-4 animate-spin text-cyber-amber" />
                  <span>PREPARING ARENA • ROUND 1 STARTING SOON</span>
                </button>

                {isCreator && onCancelMatch && (
                  <button
                    onClick={onCancelMatch}
                    className="w-full py-2.5 rounded-xl font-orbitron font-bold tracking-wider text-xs uppercase bg-cyber-pink/15 hover:bg-cyber-pink/25 border border-cyber-pink/40 text-cyber-pink transition-all active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>CANCEL DUEL & REFUND</span>
                  </button>
                )}
              </div>
            ) : isRoundEnd ? (
              <button
                disabled
                className="w-full h-24 rounded-2xl font-orbitron font-bold text-xs uppercase tracking-widest bg-cyber-bg/70 border border-cyber-border/80 text-slate-400 flex items-center justify-center space-x-2 cursor-not-allowed opacity-90 select-none shadow-inner"
              >
                <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
                <span>WAITING FOR NEXT ROUND...</span>
              </button>
            ) : (
              <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                disabled={roomState === 'FORFEITED'}
                className={`w-full h-24 rounded-2xl font-orbitron font-extrabold text-xl uppercase tracking-widest flex items-center justify-center space-x-3 transition-all duration-75 active:scale-95 select-none ${
                  isFireSignal
                    ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan animate-pulse'
                    : isDecoyWait
                    ? 'bg-cyber-amber text-cyber-bg shadow-neon-amber'
                    : 'bg-cyber-border/80 text-slate-200 border border-cyber-cyan/30 hover:border-cyber-cyan'
                }`}
              >
                <Zap className="w-7 h-7" />
                <span>{isFireSignal ? 'FIRE NOW!' : 'TAP HERE'}</span>
              </button>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/50 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-cyan">
                👁️ SPECTATOR MODE ACTIVE • PLACE BETS BELOW
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
