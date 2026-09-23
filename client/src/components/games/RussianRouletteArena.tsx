import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Crosshair, AlertTriangle, RotateCcw, Clock, Trophy, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { RouletteState } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';

interface RussianRouletteArenaProps {
  gameData?: RouletteState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onShoot: (target: 'self' | 'opponent') => void;
  playerAName: string;
  playerBName?: string;
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
}

export const RussianRouletteArena: React.FC<RussianRouletteArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onShoot,
  playerAName,
  playerBName = 'Opponent',
  roomState,
  wagerTon,
  isCreator,
  onCancelMatch,
  isWinner,
  onClaimPayout,
  isClaimingPayout,
  payoutClaimed,
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
}) => {
  const chambers = gameData?.chambersRemaining ?? 8;
  const totalChambers = gameData?.totalChambers ?? 8;
  const currentTurn = gameData?.currentTurn ?? 'A';
  const shieldA = gameData?.shieldA ?? false;
  const shieldB = gameData?.shieldB ?? false;
  const lethalOdds = gameData?.lethalOddsPercent ?? Math.round((1 / chambers) * 100);
  const lastOutcome = gameData?.lastOutcome;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 1.92).toFixed(2);
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;

  return (
    <div className="w-full flex flex-col items-center justify-between p-4 bg-cyber-card/90 border border-cyber-pink/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(255,0,85,0.15)] relative overflow-hidden min-h-[520px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-cyber-pink/10 via-transparent to-black/90 pointer-events-none" />

      {/* Top Header: Players & Shield Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-3">
        {/* Player A */}
        <div className={`flex flex-col items-start max-w-[45%] p-2 rounded-xl border transition-all ${
          currentTurn === 'A' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1.5 w-full">
            <span className="text-xs font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
            {shieldA && (
              <span className="flex items-center space-x-0.5 text-[10px] text-cyber-green bg-cyber-green/20 px-1.5 py-0.5 rounded-full font-mono border border-cyber-green/40 animate-pulse">
                <Shield className="w-3 h-3" />
                <span>SHIELD</span>
              </span>
            )}
          </div>
          <span className="text-[10px] font-rajdhani text-slate-400 mt-0.5">
            {currentTurn === 'A' && roomState === 'GAME_ACTIVE' ? '🎯 ACTIVE TURN' : 'WAITING'}
          </span>
        </div>

        {/* VS / Drum Status Badge */}
        <div className="flex flex-col items-center shrink-0 px-2">
          <span className="text-[10px] text-cyber-pink uppercase font-chakra font-bold tracking-widest">CYBER REVOLVER</span>
          <span className="text-xs font-mono font-black text-white">{chambers}/{totalChambers} CHAMBERS</span>
        </div>

        {/* Player B */}
        <div className={`flex flex-col items-end max-w-[45%] p-2 rounded-xl border transition-all ${
          currentTurn === 'B' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1.5 w-full justify-end">
            {shieldB && (
              <span className="flex items-center space-x-0.5 text-[10px] text-cyber-green bg-cyber-green/20 px-1.5 py-0.5 rounded-full font-mono border border-cyber-green/40 animate-pulse">
                <Shield className="w-3 h-3" />
                <span>SHIELD</span>
              </span>
            )}
            <span className="text-xs font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
          </div>
          <span className="text-[10px] font-rajdhani text-slate-400 mt-0.5">
            {currentTurn === 'B' && roomState === 'GAME_ACTIVE' ? '🎯 ACTIVE TURN' : 'WAITING'}
          </span>
        </div>
      </div>

      {/* Center Drum & Lethal Probability */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-4 z-10 text-center">
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center space-y-3">
            {/* Animated Revolver Cylinder */}
            <motion.div
              animate={{ rotate: [0, 360 * (8 - chambers)] }}
              transition={{ duration: 0.6, type: 'spring', damping: 15 }}
              className="relative w-36 h-36 rounded-full border-4 border-cyber-pink/80 bg-cyber-bg/90 shadow-[0_0_30px_rgba(255,0,85,0.3)] flex items-center justify-center"
            >
              {/* 8 Chamber Dots around circle */}
              {Array.from({ length: 8 }).map((_, idx) => {
                const angle = (idx * 360) / 8;
                const isLoaded = idx < chambers;
                return (
                  <div
                    key={idx}
                    className={`absolute w-5 h-5 rounded-full border transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                      isLoaded
                        ? 'bg-cyber-pink/30 border-cyber-pink shadow-neon-pink'
                        : 'bg-black/80 border-slate-700 opacity-40'
                    }`}
                    style={{
                      top: `${50 - 38 * Math.cos((angle * Math.PI) / 180)}%`,
                      left: `${50 + 38 * Math.sin((angle * Math.PI) / 180)}%`,
                    }}
                  />
                );
              })}

              {/* Center Crosshair */}
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-cyber-pink flex items-center justify-center text-cyber-pink">
                <Crosshair className="w-6 h-6 animate-pulse" />
              </div>
            </motion.div>

            {/* Lethal Odds Meter */}
            <div className="flex flex-col items-center space-y-1">
              <span className="text-xs font-chakra uppercase tracking-widest text-slate-300">
                FATAL PROBABILITY
              </span>
              <span className={`text-2xl font-mono font-black ${
                lethalOdds >= 50 ? 'text-cyber-pink animate-pulse' : lethalOdds >= 25 ? 'text-cyber-amber' : 'text-cyber-cyan'
              }`}>
                {lethalOdds}%
              </span>
              <span className="text-[11px] font-rajdhani text-slate-400">
                1 Live Bullet in {chambers} remaining chambers
              </span>
            </div>
          </div>
        )}

        {/* Outcome Feed Banner */}
        <AnimatePresence>
          {lastOutcome && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`mt-3 max-w-xs p-3 rounded-2xl border text-xs font-chakra flex items-center space-x-2 ${
                lastOutcome.result === 'BANG'
                  ? 'bg-cyber-pink/20 border-cyber-pink text-white shadow-neon-pink'
                  : 'bg-cyber-cyan/15 border-cyber-cyan text-slate-200'
              }`}
            >
              {lastOutcome.result === 'BANG' ? (
                <ShieldAlert className="w-5 h-5 text-cyber-pink shrink-0 animate-bounce" />
              ) : (
                <Shield className="w-5 h-5 text-cyber-cyan shrink-0" />
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
            className="flex flex-col items-center p-5 bg-cyber-bg/95 border border-cyber-cyan rounded-3xl shadow-2xl max-w-xs w-full text-center"
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
            {rematchOffer && (
              <div className="w-full p-2.5 rounded-xl bg-cyber-pink/25 border border-cyber-pink flex flex-col space-y-2 mb-2 animate-pulse">
                <span className="text-xs font-orbitron font-bold text-white">🔥 2X REMATCH OFFER!</span>
                <span className="text-[11px] text-slate-200 font-chakra">
                  {rematchOffer.proposerName} challenges you to a 2X Rematch for {rematchOffer.newWagerTon} TON!
                </span>
                <div className="flex space-x-2 pt-1">
                  <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">DECLINE</button>
                  <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-cyber-pink text-white text-xs font-bold font-orbitron">ACCEPT 2X</button>
                </div>
              </div>
            )}

            {/* Rematch Button */}
            {!rematchOffer && onRequestRematch && role === 'player' && (
              <button
                onClick={onRequestRematch}
                className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-cyber-pink to-cyber-cyan text-white shadow-neon-pink hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REMATCH (2X BET)</span>
              </button>
            )}

            {isWinner && onClaimPayout && !payoutClaimed && (
              <button
                onClick={onClaimPayout}
                disabled={isClaimingPayout}
                className="w-full py-3 rounded-xl font-orbitron font-bold text-xs uppercase bg-cyber-amber text-cyber-bg shadow-neon-amber hover:brightness-110 active:scale-95 transition-all mb-2"
              >
                {isClaimingPayout ? 'WITHDRAWING...' : `CLAIM PRIZE (${winnerPayoutTon} TON)`}
              </button>
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

      {/* Bottom Controls: Actions on Player Turn */}
      {roomState === 'GAME_ACTIVE' && (
        <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
          {role === 'player' ? (
            isPlayerTurn ? (
              <div className="w-full flex flex-col space-y-2">
                <span className="text-[11px] font-orbitron font-bold text-cyber-cyan uppercase tracking-wider text-center animate-pulse">
                  ⚡ YOUR TURN • CHOOSE YOUR TARGET
                </span>
                <div className="flex space-x-2.5 w-full">
                  <button
                    onClick={() => onShoot('self')}
                    className="flex-1 py-3.5 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-cyan text-cyber-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:bg-cyber-cyan/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1">
                      <Shield className="w-4 h-4 text-cyber-green inline" />
                      <span>SHOOT SELF</span>
                    </span>
                    <span className="text-[9px] text-cyber-green font-chakra font-normal mt-0.5">
                      Survive to gain +1 SHIELD
                    </span>
                  </button>

                  <button
                    onClick={() => onShoot('opponent')}
                    className="flex-1 py-3.5 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-pink text-white shadow-neon-pink hover:brightness-110 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1">
                      <Crosshair className="w-4 h-4 text-white inline" />
                      <span>SHOOT RIVAL</span>
                    </span>
                    <span className="text-[9px] text-white/80 font-chakra font-normal mt-0.5">
                      {lethalOdds}% chance to eliminate
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-4 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyber-pink" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} is aiming... Hold your breath!
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-pink">
                👁️ SPECTATOR VIEW • PLACE BETS ON DUELIST BELOW
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cancel Match Option if stuck or in pre-game */}
      {isCreator && onCancelMatch && roomState !== 'MATCH_SETTLED' && (
        <button
          onClick={onCancelMatch}
          className="mt-2 text-[10px] font-orbitron text-cyber-pink hover:underline flex items-center space-x-1"
        >
          <Trash2 className="w-3 h-3 text-cyber-pink" />
          <span>CANCEL DUEL & REFUND</span>
        </button>
      )}
    </div>
  );
};
