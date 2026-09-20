import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, AlertTriangle, Trophy, Clock, WifiOff, Trash2 } from 'lucide-react';
import { RoomState } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

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
  role: 'player' | 'spectator';
  isReady: boolean;
  onReady: () => void;
  onTap: () => void;
  isCreator?: boolean;
  onCancelMatch?: () => void;
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
  role,
  isReady,
  onReady,
  onTap,
  isCreator,
  onCancelMatch,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();

  const handleTap = () => {
    if (roomState === 'WAITING_FOR_SIGNAL' || roomState === 'ROUND_START') {
      triggerNotification('error');
    } else if (roomState === 'SIGNAL_FIRED') {
      triggerImpact('heavy');
    } else {
      triggerImpact('light');
    }
    onTap();
  };

  const isFireSignal = lastSignal === 'FIRE!';
  const isDecoyHold = lastSignal === 'HOLD!';
  const isMisfire = lastSignal === 'MISFIRE!';

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center justify-between p-4 bg-cyber-card border border-cyber-border rounded-2xl shadow-2xl overflow-hidden min-h-[460px]">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Top Header: Scoreboard & Round Tracker */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-3">
        {/* Player A Score */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-cyber-cyan uppercase font-chakra font-bold tracking-wider">Player A</span>
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
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-cyber-muted uppercase font-chakra tracking-widest">Cyber Duel</span>
          <span className="text-sm font-orbitron font-bold tracking-widest text-slate-200">
            ROUND {currentRound} / 3
          </span>
        </div>

        {/* Player B Score */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-cyber-pink uppercase font-chakra font-bold tracking-wider">Player B</span>
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

      {/* Center Arena: Signals, Alerts & Decoys */}
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
              00:{countdownSeconds !== null ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
            </span>
          </motion.div>
        )}

        {/* Decoy HOLD Signal */}
        {isDecoyHold && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className="flex flex-col items-center justify-center"
          >
            <AlertTriangle className="w-12 h-12 text-cyber-amber mb-2" />
            <span className="text-4xl font-orbitron font-extrabold text-cyber-amber neon-text-amber tracking-widest">
              HOLD!
            </span>
            <span className="text-xs text-cyber-amber/80 font-chakra mt-1">
              TRABOCCHETTO • NON PREMERE!
            </span>
          </motion.div>
        )}

        {/* Real FIRE Signal */}
        {isFireSignal && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 0.2 }}
            className="flex flex-col items-center justify-center"
          >
            <Zap className="w-16 h-16 text-cyber-cyan mb-2" />
            <span className="text-5xl font-orbitron font-black text-cyber-cyan neon-text-cyan tracking-wider">
              FUOCO!
            </span>
            <span className="text-xs text-white font-chakra font-bold mt-1 uppercase tracking-widest animate-pulse">
              PREMI PIÙ VELOCE CHE PUOI!
            </span>
          </motion.div>
        )}

        {/* Misfire Warning */}
        {isMisfire && (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: [-10, 10, -10, 10, 0] }}
            className="flex flex-col items-center"
          >
            <ShieldAlert className="w-14 h-14 text-cyber-pink mb-2" />
            <span className="text-3xl font-orbitron font-extrabold text-cyber-pink neon-text-pink">
              FALSA PARTENZA!
            </span>
            <span className="text-xs text-slate-300 font-chakra mt-1">
              Premuto troppo presto. Round perso!
            </span>
          </motion.div>
        )}

        {/* Waiting in round */}
        {roomState === 'WAITING_FOR_SIGNAL' && !isDecoyHold && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-2 border-cyber-cyan/40 border-t-cyber-cyan rounded-full animate-spin mb-3" />
            <span className="text-sm font-orbitron font-bold text-cyber-cyan tracking-widest uppercase">
              ATTENDI IL VIA...
            </span>
            <span className="text-xs text-slate-400 mt-1 font-rajdhani">Grilletto casuale armato</span>
          </div>
        )}

        {/* Round Winner & Reaction Time Readout */}
        {roomState === 'ROUND_END' && !isMisfire && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <Trophy className="w-10 h-10 text-cyber-amber mb-2" />
            <span className="text-lg font-orbitron font-bold text-slate-100">{roundWinner || 'Round Concluso'}</span>
            {lastReactionTimeMs !== null && (
              <div className="mt-2 bg-cyber-bg/80 border border-cyber-cyan/40 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-chakra">Tempo di Reazione:</span>
                <span className="text-sm font-chakra font-bold text-cyber-cyan">
                  {lastReactionTimeMs}ms
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Match Settled */}
        {roomState === 'MATCH_SETTLED' && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center"
          >
            <Trophy className="w-16 h-16 text-cyber-amber mb-3 animate-bounce" />
            <span className="text-2xl font-orbitron font-extrabold text-cyber-cyan neon-text-cyan">
              VITTORIA!
            </span>
            <span className="text-sm font-chakra text-slate-200 mt-2 max-w-xs break-all">
              Vincitore: <span className="font-orbitron font-bold text-cyber-cyan">{matchWinnerName || (matchWinner && !matchWinner.startsWith('spectator_') && !matchWinner.startsWith('player_') ? `${matchWinner.slice(0, 6)}...${matchWinner.slice(-4)}` : (matchWinnerName || 'Giocatore'))}</span>
            </span>
          </motion.div>
        )}

        {/* Feed Message */}
        <p className="text-xs text-slate-400 font-rajdhani mt-4 max-w-xs">{feedMessage}</p>
      </div>

      {/* Bottom Controls: Big Mobile Quickdraw Trigger Button */}
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
                {isReady ? 'PRONTO • IN ATTESA AVVERSARIO' : '⚔️ PRONTO AL DUELLO'}
              </button>

              {isCreator && onCancelMatch && (
                <button
                  onClick={onCancelMatch}
                  className="w-full py-2.5 rounded-xl font-orbitron font-bold tracking-wider text-xs uppercase bg-cyber-pink/15 hover:bg-cyber-pink/25 border border-cyber-pink/40 text-cyber-pink transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ANNULLA SFIDA E RIMBORSA</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onPointerDown={handleTap}
              disabled={roomState === 'MATCH_SETTLED' || roomState === 'FORFEITED'}
              className={`w-full h-24 rounded-2xl font-orbitron font-extrabold text-xl uppercase tracking-widest flex items-center justify-center space-x-3 transition-all duration-75 active:scale-95 select-none ${
                isFireSignal
                  ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan animate-pulse'
                  : isDecoyHold
                  ? 'bg-cyber-amber text-cyber-bg shadow-neon-amber'
                  : 'bg-cyber-border/80 text-slate-200 border border-cyber-cyan/30 hover:border-cyber-cyan'
              }`}
            >
              <Zap className="w-7 h-7" />
              <span>{isFireSignal ? 'FUOCO ORA!' : 'PREMI QUI'}</span>
            </button>
          )
        ) : (
          <div className="w-full py-3 bg-cyber-bg/50 border border-cyber-border rounded-xl text-center">
            <span className="text-xs font-chakra font-bold text-cyber-cyan">
              👁️ MODALITÀ SPETTATORE ATTIVA • PIAZZA LE SCOMMESSE IN BASSO
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
