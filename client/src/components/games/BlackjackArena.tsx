import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Loader2, Trash2, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { BlackjackState, Card } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';

interface BlackjackArenaProps {
  gameData?: BlackjackState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onHit: () => void;
  onStand: () => void;
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

const renderSuitIcon = (suit: string) => {
  switch (suit) {
    case '♥':
      return <span className="text-red-500">♥</span>;
    case '♦':
      return <span className="text-red-400">♦</span>;
    case '♣':
      return <span className="text-cyber-cyan">♣</span>;
    case '♠':
    default:
      return <span className="text-slate-200">♠</span>;
  }
};

const CardView: React.FC<{ card: Card; index: number }> = ({ card, index }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <motion.div
      initial={{ scale: 0, y: -20, rotate: -5 }}
      animate={{ scale: 1, y: 0, rotate: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`w-12 h-18 sm:w-14 sm:h-20 bg-gradient-to-br from-slate-900 to-black border-2 rounded-xl p-1.5 flex flex-col justify-between shadow-lg select-none relative ${
        isRed ? 'border-cyber-pink/70 shadow-[0_0_12px_rgba(255,0,85,0.25)]' : 'border-cyber-cyan/70 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
      }`}
    >
      <div className={`text-xs font-chakra font-black flex items-center justify-between ${isRed ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
        <span>{card.value}</span>
        <span className="text-xs">{card.suit}</span>
      </div>
      <div className="text-center text-lg my-auto leading-none">
        {renderSuitIcon(card.suit)}
      </div>
      <div className={`text-xs font-chakra font-black flex items-center justify-between rotate-180 ${isRed ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
        <span>{card.value}</span>
        <span className="text-xs">{card.suit}</span>
      </div>
    </motion.div>
  );
};

export const BlackjackArena: React.FC<BlackjackArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onHit,
  onStand,
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
  const deckRemaining = gameData?.deckRemaining ?? 48;
  const handA = gameData?.handA ?? [];
  const handB = gameData?.handB ?? [];
  const scoreA = gameData?.scoreA ?? 0;
  const scoreB = gameData?.scoreB ?? 0;
  const currentTurn = gameData?.currentTurn ?? 'A';
  const standA = gameData?.standA ?? false;
  const standB = gameData?.standB ?? false;
  const bustA = gameData?.bustA ?? false;
  const bustB = gameData?.bustB ?? false;
  const bustOddsA = gameData?.bustOddsPercentA ?? 0;
  const bustOddsB = gameData?.bustOddsPercentB ?? 0;
  const lastAction = gameData?.lastAction;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 1.92).toFixed(2);
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;
  const activeBustOdds = currentTurn === 'A' ? bustOddsA : bustOddsB;

  return (
    <div className="w-full flex flex-col items-center justify-between p-4 bg-cyber-card/90 border border-cyber-cyan/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.15)] relative overflow-hidden min-h-[540px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-cyber-cyan/10 via-transparent to-black/90 pointer-events-none" />

      {/* Top Header: Table Info & Shoe Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-3">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-cyber-cyan uppercase font-chakra font-bold tracking-widest flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyber-cyan inline" />
            <span>FACE-UP BLACKJACK</span>
          </span>
          <span className="text-xs font-chakra text-slate-400">Common 52-Card Shoe</span>
        </div>

        <div className="flex items-center space-x-2 bg-black/60 border border-cyber-border px-3 py-1 rounded-xl">
          <Layers className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="text-xs font-mono font-bold text-white">{deckRemaining} Cards Left</span>
        </div>
      </div>

      {/* Duel Cards Table */}
      <div className="my-auto w-full flex flex-col space-y-4 py-3 z-10">
        {/* Player B (Top / Opponent) */}
        <div className={`p-3 rounded-2xl border transition-all ${
          currentTurn === 'B' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink'
            : 'bg-black/50 border-cyber-border/80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-chakra font-bold text-cyber-pink">{playerBName}</span>
              {standB && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600">
                  LOCKED / STAND
                </span>
              )}
              {bustB && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyber-pink/20 text-cyber-pink border border-cyber-pink animate-pulse">
                  💥 BUST!
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-chakra text-slate-400">Score:</span>
              <span className={`text-base font-orbitron font-black ${
                bustB ? 'text-cyber-pink line-through' : scoreB === 21 ? 'text-cyber-amber animate-pulse' : 'text-white'
              }`}>
                {scoreB}
              </span>
            </div>
          </div>

          {/* Cards Row B */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1 min-h-[80px]">
            {handB.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Dealing face-up cards...</span>
            ) : (
              handB.map((c, i) => <CardView key={`${c.suit}-${c.value}-${i}`} card={c} index={i} />)
            )}
          </div>
        </div>

        {/* Dynamic Center Matchup Banner / Bust Odds */}
        {roomState === 'GAME_ACTIVE' && (
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-cyber-border/60 text-center">
            <div className="flex items-center space-x-2 text-xs font-chakra">
              <span className="text-slate-400">Active Turn:</span>
              <span className="font-bold text-white uppercase">{activeTurnName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Bust Odds:</span>
              <span className={`font-mono font-bold ${activeBustOdds >= 50 ? 'text-cyber-pink' : 'text-cyber-green'}`}>
                {activeBustOdds}%
              </span>
            </div>
            {lastAction && (
              <span className="text-[11px] font-rajdhani text-cyber-cyan mt-1">
                {lastAction.message}
              </span>
            )}
          </div>
        )}

        {/* Player A (Bottom / Challenger) */}
        <div className={`p-3 rounded-2xl border transition-all ${
          currentTurn === 'A' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan'
            : 'bg-black/50 border-cyber-border/80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-chakra font-bold text-cyber-cyan">{playerAName}</span>
              {standA && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600">
                  LOCKED / STAND
                </span>
              )}
              {bustA && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyber-pink/20 text-cyber-pink border border-cyber-pink animate-pulse">
                  💥 BUST!
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-chakra text-slate-400">Score:</span>
              <span className={`text-base font-orbitron font-black ${
                bustA ? 'text-cyber-pink line-through' : scoreA === 21 ? 'text-cyber-amber animate-pulse' : 'text-white'
              }`}>
                {scoreA}
              </span>
            </div>
          </div>

          {/* Cards Row A */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1 min-h-[80px]">
            {handA.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Dealing face-up cards...</span>
            ) : (
              handA.map((c, i) => <CardView key={`${c.suit}-${c.value}-${i}`} card={c} index={i} />)
            )}
          </div>
        </div>

        {/* Match Settled Modal */}
        {roomState === 'MATCH_SETTLED' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center p-5 bg-cyber-bg/95 border border-cyber-cyan rounded-3xl shadow-2xl max-w-xs w-full text-center mx-auto"
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
                  ⚡ YOUR TURN • HIT OR STAND?
                </span>
                <div className="flex space-x-2.5 w-full">
                  <button
                    onClick={onHit}
                    className="flex-1 py-3.5 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-cyan text-cyber-bg shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>HIT (+1 CARD)</span>
                    <span className="text-[9px] text-cyber-bg/80 font-chakra font-normal mt-0.5">
                      Bust Risk: {activeBustOdds}%
                    </span>
                  </button>

                  <button
                    onClick={onStand}
                    className="flex-1 py-3.5 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-pink text-cyber-pink shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:bg-cyber-pink/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>STAND (HOLD)</span>
                    <span className="text-[9px] text-cyber-pink font-chakra font-normal mt-0.5">
                      Lock your {currentTurn === 'A' ? scoreA : scoreB} score
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-4 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} is deciding to Hit or Stand...
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-cyan">
                👁️ SPECTATOR VIEW • 100% FACE-UP TABLE • PLACE BETS BELOW
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cancel Match Option if pre-game */}
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
