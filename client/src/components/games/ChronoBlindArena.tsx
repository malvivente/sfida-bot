import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Eye, EyeOff, Trophy, RotateCcw, Loader2, Zap, ArrowDownLeft } from 'lucide-react';
import { ChronoBlindState } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';

interface ChronoBlindArenaProps {
  gameData?: ChronoBlindState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onStop: () => void;
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
  userSide?: 'A' | 'B';
  isRematchProposer?: boolean;
  opponentConnected?: boolean;
  userAddress?: string;
  userBalanceGram?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  socketError?: string | null;
}

export const ChronoBlindArena: React.FC<ChronoBlindArenaProps> = ({
  gameData,
  role,
  onStop,
  playerAName,
  playerBName = 'Opponent',
  playerAReady = false,
  playerBReady = false,
  isReady = false,
  onReady,
  countdownSeconds,
  roomState,
  wagerTon,
  isWinner,
  onClaimPayout,
  isClaimingPayout,
  payoutClaimed,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  userSide = 'A',
  isRematchProposer = false,
  opponentConnected = true,
  userBalanceGram,
  onOpenDeposit,
  socketError,
}) => {
  const currentRound = gameData?.currentRound ?? 1;
  const maxRounds = gameData?.maxRounds ?? 3;
  const scoreA = gameData?.scoreA ?? 0;
  const scoreB = gameData?.scoreB ?? 0;
  const targetDurationMs = gameData?.targetDurationMs ?? 6000;
  const blindThresholdMs = gameData?.blindThresholdMs ?? 3000;
  const startEpochMs = gameData?.startEpochMs ?? 0;
  const stoppedA = gameData?.stoppedA ?? false;
  const stoppedB = gameData?.stoppedB ?? false;
  const diffA = gameData?.diffMsA;
  const diffB = gameData?.diffMsB;
  const bustedA = gameData?.bustedA ?? false;
  const bustedB = gameData?.bustedB ?? false;
  const roundWinner = gameData?.roundWinner;
  const roundEndMessage = gameData?.roundEndMessage;

  const [syncedNow, setSyncedNow] = useState(Date.now());
  const clockOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (gameData?.serverTime) {
      clockOffsetRef.current = gameData.serverTime - Date.now();
    }
  }, [gameData?.serverTime]);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setSyncedNow(Date.now() + clockOffsetRef.current);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const hasStarted = startEpochMs > 0 && syncedNow >= startEpochMs;
  const countdownUntilStartMs = Math.max(0, startEpochMs - syncedNow);

  const elapsedMs = hasStarted ? syncedNow - startEpochMs : 0;
  const remainingMs = Math.max(0, targetDurationMs - elapsedMs);
  const isPastZero = hasStarted && elapsedMs > targetDurationMs;

  const isBlindZone = hasStarted && remainingMs <= blindThresholdMs;
  const userStopped = userSide === 'A' ? stoppedA : stoppedB;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const requiredBal = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= requiredBal;
  const missingForRematch = Math.max(0, requiredBal - currentBal).toFixed(2);

  // Time formatter
  const formatSeconds = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const msRemainder = Math.floor(ms % 1000);
    return `${s}.${msRemainder.toString().padStart(3, '0')}s`;
  };

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-cyber-amber/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(255,184,0,0.15)] relative overflow-hidden min-h-[560px]">
      {/* Background Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
        isBlindZone && role === 'player' && roomState === 'GAME_ACTIVE'
          ? 'bg-black/95'
          : 'bg-radial-gradient from-cyber-amber/10 via-transparent to-black/95'
      }`} />

      {/* Top Header: Round & Scores/Ready Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-1.5">
        {/* Player A */}
        <div className={`flex flex-col items-start flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          userSide === 'A' ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan' : 'bg-black/40 border-cyber-border'
        }`}>
          <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate w-full">{playerAName}</span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="text-xs font-orbitron font-black text-white">{scoreA} PTS</span>
            {stoppedA && roomState === 'GAME_ACTIVE' && (
              <span className={`text-[8px] font-mono px-1 rounded ${bustedA ? 'bg-cyber-pink/20 text-cyber-pink' : 'bg-cyber-green/20 text-cyber-green'}`}>
                {bustedA ? 'BUST' : `${diffA}ms`}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              stoppedA ? <span className="text-cyber-green">✓ STOPPED</span> : <span className="text-slate-400">TICKING</span>
            ) : (
              playerAReady ? <span className="text-cyber-green font-bold">✓ READY</span> : <span className="text-slate-400">WAITING</span>
            )}
          </span>
        </div>

        {/* Center Round Badge */}
        <div className="flex flex-col items-center shrink-0 px-1 text-center">
          <span className="text-[8px] text-cyber-amber uppercase font-chakra font-bold tracking-widest flex items-center space-x-1">
            <Clock className="w-3 h-3 text-cyber-amber inline shrink-0" />
            <span>CHRONO BLIND</span>
          </span>
          <span className="text-xs font-mono font-black text-white">ROUND {currentRound} / {maxRounds}</span>
        </div>

        {/* Player B */}
        <div className={`flex flex-col items-end flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          userSide === 'B' ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink' : 'bg-black/40 border-cyber-border'
        }`}>
          <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate w-full text-right">{playerBName}</span>
          <div className="flex items-center space-x-1 mt-0.5 justify-end">
            {stoppedB && roomState === 'GAME_ACTIVE' && (
              <span className={`text-[8px] font-mono px-1 rounded ${bustedB ? 'bg-cyber-pink/20 text-cyber-pink' : 'bg-cyber-green/20 text-cyber-green'}`}>
                {bustedB ? 'BUST' : `${diffB}ms`}
              </span>
            )}
            <span className="text-xs font-orbitron font-black text-white">{scoreB} PTS</span>
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              stoppedB ? <span className="text-cyber-green">✓ STOPPED</span> : <span className="text-slate-400">TICKING</span>
            ) : (
              playerBReady ? <span className="text-cyber-green font-bold">✓ READY</span> : <span className="text-slate-400">WAITING</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Countdown Display / Blind Zone Screen (Always Visible) */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-3 z-10 text-center">
        {roomState === 'LOBBY' ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/50 border border-cyber-border text-center space-y-2 max-w-xs">
            <Clock className="w-12 h-12 text-cyber-amber/70 animate-pulse" />
            <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
              CHRONO BLIND DUEL ARMED
            </h4>
            <p className="text-xs text-slate-300 font-chakra leading-relaxed">
              Target countdown 5.00s–8.00s. At 3.00s, screen blacks out for duelists while spectators watch live! Press READY below.
            </p>
          </div>
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/50 border border-cyber-amber/50 text-center space-y-2 max-w-xs">
            <Clock className="w-10 h-10 text-cyber-amber animate-spin" />
            <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider">
              PARI-MUTUEL BETTING OPEN
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '05'}
            </span>
            <span className="text-[11px] text-slate-400 font-rajdhani">
              Both duelists confirmed. Round 1 countdown starts at 00:00!
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
            {!hasStarted ? (
              /* Pre-round Countdown */
              <div className="flex flex-col items-center space-y-2">
                <span className="text-xs font-chakra text-slate-400 uppercase tracking-widest">GET READY IN</span>
                <span className="text-4xl font-orbitron font-black text-cyber-cyan animate-pulse">
                  {(countdownUntilStartMs / 1000).toFixed(1)}s
                </span>
                <span className="text-[11px] font-rajdhani text-slate-500">
                  Target timer: {(targetDurationMs / 1000).toFixed(2)}s
                </span>
              </div>
            ) : (
              /* Timer Running */
              <div className="flex flex-col items-center space-y-3 w-full">
                {/* Blind Zone / Ticker Container */}
                <div className={`w-full py-8 px-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden ${
                  isBlindZone && role === 'player'
                    ? 'bg-black border-cyber-pink/80 shadow-[0_0_30px_rgba(255,0,85,0.4)] animate-pulse'
                    : isBlindZone && role === 'spectator'
                    ? 'bg-cyber-bg/95 border-cyber-amber shadow-neon-amber'
                    : 'bg-cyber-bg/90 border-cyber-cyan/60 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                }`}>
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-1.5 mb-2">
                    {isBlindZone ? (
                      role === 'player' ? (
                        <div className="flex items-center space-x-1 text-cyber-pink text-xs font-chakra font-bold animate-bounce">
                          <EyeOff className="w-4 h-4 text-cyber-pink" />
                          <span>BLIND ZONE ACTIVE (BUZZER CECO)</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-cyber-amber text-xs font-chakra font-bold">
                          <Eye className="w-4 h-4 text-cyber-amber" />
                          <span>SPECTATOR VISION • PLAYERS ARE BLIND!</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center space-x-1 text-cyber-cyan text-xs font-chakra font-bold">
                        <Zap className="w-4 h-4 text-cyber-cyan" />
                        <span>COUNTDOWN TO 0.00s</span>
                      </div>
                    )}
                  </div>

                  {/* Millisecond Digits */}
                  {isBlindZone && role === 'player' ? (
                    <div className="flex flex-col items-center py-2">
                      <span className="text-4xl font-mono font-black text-cyber-pink tracking-widest animate-pulse">
                        ??.???s
                      </span>
                      <span className="text-[10px] font-rajdhani text-slate-400 mt-2">
                        Display hidden! Trust your internal clock!
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-4xl font-mono font-black tracking-wider ${
                        isPastZero ? 'text-cyber-pink' : isBlindZone ? 'text-cyber-amber' : 'text-white'
                      }`}>
                        {formatSeconds(remainingMs)}
                      </span>
                      {isPastZero && (
                        <span className="text-xs font-chakra font-bold text-cyber-pink mt-1 animate-pulse">
                          💥 OVERSHOT (BUST ZONE)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Spectator Tracking Info */}
                {role === 'spectator' && (
                  <div className="w-full flex items-center justify-between text-xs font-chakra p-2 bg-black/50 border border-cyber-border rounded-xl">
                    <span className={stoppedA ? 'text-cyber-green' : 'text-slate-400'}>
                      {playerAName}: {stoppedA ? `STOPPED (${diffA}ms)` : 'WAITING'}
                    </span>
                    <span className={stoppedB ? 'text-cyber-green' : 'text-slate-400'}>
                      {playerBName}: {stoppedB ? `STOPPED (${diffB}ms)` : 'WAITING'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Round End Message */}
            {roundEndMessage && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full p-2.5 rounded-xl bg-cyber-amber/15 border border-cyber-amber text-xs font-chakra text-white text-center"
              >
                {roundEndMessage}
              </motion.div>
            )}
          </div>
        ) : null}

        {/* Match Settled Modal */}
        {roomState === 'MATCH_SETTLED' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center p-5 bg-cyber-bg/95 border border-cyber-amber rounded-3xl shadow-2xl max-w-xs w-full text-center mx-auto"
          >
            <Trophy className="w-12 h-12 text-cyber-amber mb-2 animate-bounce" />
            <h2 className="text-lg font-orbitron font-black text-white">DUEL CONCLUDED</h2>
            <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-cyber-border w-full flex justify-between items-center text-xs font-chakra">
              <span className="text-slate-400">Winner Prize:</span>
              <span className="font-bold text-cyber-cyan flex items-center space-x-1">
                <span>{winnerPayoutTon}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan inline" />
              </span>
            </div>

            {/* Rematch Offer Received */}
            {rematchOffer && isRematchProposer && (
              <div className="w-full p-2.5 rounded-xl bg-cyber-pink/20 border border-cyber-pink/60 flex flex-col space-y-1.5 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyber-pink" />
                    <span>REMATCH OFFER SENT (2X)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-cyber-cyan">{rematchOffer.newWagerTon} GRAM</span>
                </div>
                <span className="text-[11px] text-slate-300 font-chakra">
                  Waiting for opponent to accept the 2X challenge...
                </span>
                {onDeclineRematch && (
                  <button
                    onClick={onDeclineRematch}
                    className="w-full py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-300 hover:text-white font-chakra"
                  >
                    WITHDRAW OFFER
                  </button>
                )}
              </div>
            )}
            {rematchOffer && !isRematchProposer && (
              <div className="w-full p-2.5 rounded-xl bg-cyber-pink/25 border border-cyber-pink flex flex-col space-y-2 mb-2 animate-pulse">
                <span className="text-xs font-orbitron font-bold text-white">🔥 2X REMATCH OFFER!</span>
                <span className="text-[11px] text-slate-200 font-chakra">
                  {rematchOffer.proposerName} challenges you to a 2X Rematch for {rematchOffer.newWagerTon} GRAM!
                </span>
                {!hasEnoughForRematch ? (
                  <div className="flex flex-col space-y-1.5 pt-1">
                    <div className="p-2 rounded-lg bg-black/70 border border-cyber-pink/50 text-[10px] text-cyber-pink font-chakra flex items-center justify-between">
                      <span>Saldo: {currentBal.toFixed(2)} GRAM</span>
                      <span className="font-bold">Mancano: {missingForRematch} GRAM</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">DECLINE</button>
                      <button
                        onClick={() => onOpenDeposit?.(missingForRematch)}
                        className="flex-1 py-1.5 rounded-lg bg-cyber-cyan text-cyber-bg text-xs font-bold font-orbitron flex items-center justify-center space-x-1 shadow-neon-cyan hover:brightness-110 active:scale-95"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>DEPOSITA ({missingForRematch})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2 pt-1">
                    <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">DECLINE</button>
                    <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-cyber-pink text-white text-xs font-bold font-orbitron shadow-neon-pink hover:brightness-110 active:scale-95">ACCEPT 2X</button>
                  </div>
                )}
                {socketError && (
                  <div className="p-1.5 rounded-lg bg-cyber-pink/20 border border-cyber-pink/60 text-[10px] text-cyber-pink font-chakra text-center">
                    {socketError}
                  </div>
                )}
              </div>
            )}

            {/* Rematch Button */}
            {!rematchOffer && onRequestRematch && role === 'player' && (
              !opponentConnected ? (
                <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center mb-2">
                  OPPONENT LEFT ROOM (REMATCH UNAVAILABLE)
                </div>
              ) : (
                <button
                  onClick={onRequestRematch}
                  className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-cyber-pink to-cyber-cyan text-white shadow-neon-pink hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>REMATCH (2X BET)</span>
                </button>
              )
            )}

            {isWinner && (
              <div className="w-full py-2.5 px-3 rounded-xl bg-cyber-green/20 border border-cyber-green/60 flex items-center justify-center space-x-1.5 mb-2 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                <span className="text-xs font-orbitron font-bold text-cyber-green">
                  ✅ PRIZE AUTO-CREDITED (+{winnerPayoutTon} GRAM)
                </span>
              </div>
            )}

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="w-full py-2 rounded-xl bg-cyber-border text-slate-300 text-xs font-chakra font-bold hover:text-white"
              >
                BACK TO LOBBY
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom Controls: Lobby Ready or Stop Action */}
      <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
        {roomState === 'LOBBY' ? (
          role === 'player' ? (
            <button
              onClick={onReady}
              disabled={isReady}
              className={`w-full py-3.5 rounded-2xl font-orbitron font-extrabold tracking-wider text-xs sm:text-sm uppercase transition-all duration-200 flex items-center justify-center space-x-2 ${
                isReady
                  ? 'bg-black/60 border border-cyber-border text-slate-400 cursor-not-allowed shadow-inner'
                  : 'bg-cyber-cyan text-cyber-bg hover:brightness-110 shadow-neon-cyan active:scale-95'
              }`}
            >
              {isReady ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
                  <span>READY • WAITING FOR OPPONENT</span>
                </>
              ) : (
                <span>⚔️ READY TO DUEL</span>
              )}
            </button>
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-amber">
                👁️ SPECTATOR VIEW • WAITING FOR DUELISTS TO READY UP
              </span>
            </div>
          )
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="w-full py-3 px-4 rounded-xl bg-black/60 border border-cyber-amber/60 text-center flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-cyber-amber" />
            <span className="text-xs font-chakra font-bold text-cyber-amber">
              PREPARING CHRONO TIMER • BETTING ACTIVE ({countdownSeconds ?? 5}s)
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            userStopped ? (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-black/60 border border-cyber-green text-center flex flex-col items-center">
                <span className="text-xs font-chakra font-bold text-cyber-green">
                  ✓ TIMER STOPPED!
                </span>
                <span className="text-[11px] font-mono text-slate-300 mt-0.5">
                  Awaiting opponent stop & round score...
                </span>
              </div>
            ) : hasStarted ? (
              <button
                onClick={onStop}
                disabled={!isBlindZone}
                className={`w-full py-4 rounded-2xl font-orbitron font-black text-sm uppercase tracking-wider flex flex-col items-center transition-all ${
                  isBlindZone
                    ? 'bg-cyber-pink text-white shadow-neon-pink hover:brightness-110 active:scale-95 animate-pulse'
                    : 'bg-black/60 border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed shadow-inner'
                }`}
              >
                <span>{isBlindZone ? '🛑 STOP CHRONO NOW!' : '👁️ TIME VISIBLE • PREPARE FOR BLIND ZONE'}</span>
                <span className={`text-[10px] font-chakra font-normal mt-0.5 ${isBlindZone ? 'text-white/80' : 'text-slate-500'}`}>
                  {isBlindZone ? 'Hit stop closest to 0.00s without exceeding!' : 'Button unlocks when screen blacks out'}
                </span>
              </button>
            ) : (
              <div className="w-full py-3 bg-black/40 border border-cyber-border rounded-xl text-center">
                <span className="text-xs font-chakra text-slate-400">
                  Countdown starting in a moment...
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-amber">
                👁️ SPECTATOR VIEW • TIMER VISIBLE FOR STREAMERS • PLACE BETS BELOW
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
