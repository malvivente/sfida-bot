import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trophy, RotateCcw, Loader2, ArrowUpRight, ShieldCheck, Flame, Compass, Clock, ArrowDownLeft } from 'lucide-react';
import { GlassBridgeState, BridgeTileChoice } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';

interface GlassBridgeArenaProps {
  gameData?: GlassBridgeState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onStep: (choice: BridgeTileChoice) => void;
  onPass: () => void;
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
}

export const GlassBridgeArena: React.FC<GlassBridgeArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onStep,
  onPass,
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
  isRematchProposer = false,
  opponentConnected = true,
  userSide = 'A',
  userBalanceGram,
  onOpenDeposit,
  socketError,
}) => {
  const stepA = gameData?.currentStepA ?? 0;
  const stepB = gameData?.currentStepB ?? 0;
  const activeStep = gameData?.activeStep ?? 1;
  const currentTurn = gameData?.currentTurn ?? 'A';
  const livesA = gameData?.livesA ?? 2;
  const livesB = gameData?.livesB ?? 2;
  const passesRemainingA = gameData?.passesRemainingA ?? 1;
  const passesRemainingB = gameData?.passesRemainingB ?? 1;
  const revealedSteps = gameData?.revealedSteps ?? {};
  const lastOutcome = gameData?.lastOutcome;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const requiredBal = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= requiredBal;
  const missingForRematch = Math.max(0, requiredBal - currentBal).toFixed(2);
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;
  const myCurrentStep = currentTurn === 'A' ? stepA : stepB;
  const myPassesRemaining = userSide === 'A' ? passesRemainingA : passesRemainingB;
  const canPassLead = myCurrentStep > 0 && myPassesRemaining > 0;

  // Window of 5 steps around the activeStep
  const minStep = Math.max(1, activeStep - 2);
  const visibleSteps = Array.from({ length: 5 }, (_, idx) => minStep + idx);

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-cyber-green/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,102,0.15)] relative overflow-hidden min-h-[560px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-cyber-green/10 via-transparent to-black/95 pointer-events-none" />

      {/* Top Header: Players & Lives/Ready Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-1.5">
        {/* Player A */}
        <div className={`flex flex-col items-start flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          currentTurn === 'A' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1 w-full min-w-0">
            <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
          </div>
          <div className="flex items-center space-x-1 mt-0.5">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-3 h-3 ${
                  idx < livesA ? 'text-cyber-green fill-cyber-green filter drop-shadow-[0_0_5px_#00ff66]' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono mt-0.5 flex items-center space-x-1">
            {roomState === 'GAME_ACTIVE' ? (
              <>
                {currentTurn === 'A' ? <span className="text-cyber-cyan font-bold">🎯 STEP {stepA}</span> : <span className="text-slate-500">STEP {stepA}</span>}
                <span className="text-[8px] text-slate-500">({passesRemainingA > 0 ? '1 PASS' : '0 PASS'})</span>
              </>
            ) : (
              playerAReady ? <span className="text-cyber-green font-bold">✓ READY</span> : <span className="text-slate-400">WAITING</span>
            )}
          </span>
        </div>

        {/* Center Run Badge */}
        <div className="flex flex-col items-center shrink-0 px-1 text-center">
          <span className="text-[8px] text-cyber-green uppercase font-chakra font-bold tracking-widest flex items-center space-x-1">
            <Compass className="w-3 h-3 text-cyber-green inline shrink-0" />
            <span>ENDLESS BRIDGE</span>
          </span>
          <span className="text-xs font-mono font-black text-white">STEP #{activeStep}</span>
        </div>

        {/* Player B */}
        <div className={`flex flex-col items-end flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          currentTurn === 'B' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1 w-full min-w-0 justify-end">
            <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
          </div>
          <div className="flex items-center space-x-1 mt-0.5">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-3 h-3 ${
                  idx < livesB ? 'text-cyber-green fill-cyber-green filter drop-shadow-[0_0_5px_#00ff66]' : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono mt-0.5 flex items-center space-x-1">
            {roomState === 'GAME_ACTIVE' ? (
              <>
                <span className="text-[8px] text-slate-500">({passesRemainingB > 0 ? '1 PASS' : '0 PASS'})</span>
                {currentTurn === 'B' ? <span className="text-cyber-pink font-bold">🎯 STEP {stepB}</span> : <span className="text-slate-500">STEP {stepB}</span>}
              </>
            ) : (
              playerBReady ? <span className="text-cyber-green font-bold">✓ READY</span> : <span className="text-slate-400">WAITING</span>
            )}
          </span>
        </div>
      </div>

      {/* 3D Glass Bridge Tiles Walkway (Always Visible) */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-2 z-10">
        {roomState !== 'MATCH_SETTLED' ? (
          <div className="w-full max-w-xs flex flex-col-reverse space-y-reverse space-y-1.5">
            {visibleSteps.map((stepNum) => {
              const isCurrentTarget = roomState === 'GAME_ACTIVE' && stepNum === activeStep;
              const revealed = revealedSteps[stepNum];
              const hasPassed = roomState === 'GAME_ACTIVE' && stepNum < activeStep;

              return (
                <div
                  key={stepNum}
                  className={`w-full p-1.5 rounded-xl border transition-all flex items-center justify-between ${
                    isCurrentTarget
                      ? 'bg-cyber-green/10 border-cyber-green/80 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
                      : hasPassed
                      ? 'bg-black/40 border-cyber-border/40 opacity-70'
                      : 'bg-black/20 border-slate-800 opacity-50'
                  }`}
                >
                  {/* Step Label */}
                  <span className="text-[9px] font-mono font-bold text-slate-400 w-10 pl-1">
                    #{stepNum}
                  </span>

                  {/* Left Tile */}
                  <div
                    className={`flex-1 mx-1 py-1.5 rounded-lg border text-center font-chakra text-[11px] font-bold transition-all ${
                      revealed === 'LEFT'
                        ? 'bg-cyber-green/30 border-cyber-green text-cyber-green shadow-neon-green'
                        : revealed === 'RIGHT'
                        ? 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink line-through opacity-60'
                        : isCurrentTarget
                        ? 'bg-cyber-bg/80 border-slate-600 text-slate-300'
                        : 'bg-transparent border-slate-800 text-slate-600'
                    }`}
                  >
                    {revealed === 'LEFT' ? '✓ SAFE' : revealed === 'RIGHT' ? '✗ BROKE' : 'LEFT'}
                  </div>

                  {/* Right Tile */}
                  <div
                    className={`flex-1 mx-1 py-1.5 rounded-lg border text-center font-chakra text-[11px] font-bold transition-all ${
                      revealed === 'RIGHT'
                        ? 'bg-cyber-green/30 border-cyber-green text-cyber-green shadow-neon-green'
                        : revealed === 'LEFT'
                        ? 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink line-through opacity-60'
                        : isCurrentTarget
                        ? 'bg-cyber-bg/80 border-slate-600 text-slate-300'
                        : 'bg-transparent border-slate-800 text-slate-600'
                    }`}
                  >
                    {revealed === 'RIGHT' ? '✓ SAFE' : revealed === 'LEFT' ? '✗ BROKE' : 'RIGHT'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Outcome Feed Banner */}
        <AnimatePresence>
          {lastOutcome && roomState === 'GAME_ACTIVE' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`mt-3 max-w-xs p-2.5 rounded-2xl border text-xs font-chakra flex items-center space-x-2 ${
                lastOutcome.result === 'SHATTER'
                  ? 'bg-cyber-pink/20 border-cyber-pink text-white shadow-neon-pink'
                  : 'bg-cyber-green/20 border-cyber-green text-slate-200'
              }`}
            >
              {lastOutcome.result === 'SHATTER' ? (
                <Flame className="w-5 h-5 text-cyber-pink shrink-0 animate-bounce" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-cyber-green shrink-0" />
              )}
              <span className="text-left font-medium">{lastOutcome.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match Settled Modal */}
        {roomState === 'MATCH_SETTLED' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center p-5 bg-cyber-bg/95 border border-cyber-green rounded-3xl shadow-2xl max-w-xs w-full text-center mx-auto"
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

      {/* Bottom Controls: Lobby Ready or Step Actions */}
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
              <span className="text-xs font-chakra font-bold text-cyber-green">
                👁️ SPECTATOR VIEW • WAITING FOR DUELISTS TO READY UP
              </span>
            </div>
          )
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="w-full py-3 px-4 rounded-xl bg-black/60 border border-cyber-amber/60 text-center flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-cyber-amber" />
            <span className="text-xs font-chakra font-bold text-cyber-amber">
              PREPARING GLASS BRIDGE • BETTING ACTIVE ({countdownSeconds ?? 5}s)
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            isPlayerTurn ? (
              <div className="w-full flex flex-col space-y-2">
                <span className="text-[11px] font-orbitron font-bold text-cyber-green uppercase tracking-wider text-center animate-pulse">
                  ⚡ STEP #{activeStep} • TAKE THE LEAP OR PASS
                </span>

                <div className="flex space-x-2 w-full">
                  <button
                    onClick={() => onStep('LEFT')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-green text-cyber-green shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:bg-cyber-green/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>STEP LEFT</span>
                    <span className="text-[9px] text-cyber-green/80 font-chakra font-normal mt-0.5">
                      50% Safe / 50% Shatter
                    </span>
                  </button>

                  <button
                    onClick={() => onStep('RIGHT')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-cyan text-cyber-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:bg-cyber-cyan/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>STEP RIGHT</span>
                    <span className="text-[9px] text-cyber-cyan/80 font-chakra font-normal mt-0.5">
                      50% Safe / 50% Shatter
                    </span>
                  </button>
                </div>

                {/* Pass Lead to Opponent */}
                {myPassesRemaining > 0 ? (
                  <button
                    onClick={onPass}
                    disabled={!canPassLead}
                    className={`w-full py-2 rounded-xl text-xs font-chakra font-bold transition-all flex items-center justify-center space-x-1 ${
                      canPassLead
                        ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 active:scale-95'
                        : 'bg-black/40 border border-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-cyber-amber" />
                    <span>PASS LEAD TO OPPONENT (1 LEFT)</span>
                  </button>
                ) : (
                  <div className="w-full py-1.5 rounded-xl bg-black/40 border border-slate-900 text-slate-600 text-[10px] font-chakra text-center font-bold">
                    PASS EXHAUSTED (0 LEFT) • MUST JUMP
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyber-green" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} is preparing for Step #{activeStep}...
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-green">
                👁️ SPECTATOR VIEW • ENDLESS GLASS RUN • PLACE BETS BELOW
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
