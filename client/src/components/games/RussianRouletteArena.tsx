import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Crosshair, RotateCcw, Clock, Trophy, Loader2, Flame, ArrowDownLeft, Swords } from 'lucide-react';
import { RouletteState } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';

interface RussianRouletteArenaProps {
  gameData?: RouletteState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onShoot: (target: 'self' | 'opponent') => void;
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

export const RussianRouletteArena: React.FC<RussianRouletteArenaProps> = ({
  gameData,
  role,
  isPlayerTurn,
  onShoot,
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
  hasPlayerB = true,
  onJoinAsPlayer,
  onInviteChallenger,
}) => {
  const { t } = useI18n();
  const chambers = gameData?.chambersRemaining ?? 8;
  const totalChambers = gameData?.totalChambers ?? 8;
  const currentTurn = gameData?.currentTurn ?? 'A';
  const offensiveShotsA = gameData?.offensiveShotsA ?? 1;
  const offensiveShotsB = gameData?.offensiveShotsB ?? 1;
  const lethalOdds = gameData?.lethalOddsPercent ?? Math.round((1 / Math.max(1, chambers)) * 100);
  const lastOutcome = gameData?.lastOutcome;

  const myOffensiveShots = userSide === 'A' ? offensiveShotsA : offensiveShotsB;
  const isShootOpponentDisabled = myOffensiveShots <= 0;

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;

  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

  const [outcomePhase, setOutcomePhase] = React.useState<'splash' | 'settled' | 'none'>('none');

  React.useEffect(() => {
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

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-cyber-pink/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(255,0,85,0.15)] relative overflow-hidden min-h-[520px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-cyber-pink/10 via-transparent to-black/90 pointer-events-none" />

      {/* Top Header: Players & Offensive Shots / Ready Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-1.5">
        {/* Player A */}
        <div className={`flex flex-col items-start flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          currentTurn === 'A' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1 w-full min-w-0">
            <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
            {roomState === 'GAME_ACTIVE' && (
              <span className={`text-[8px] px-1 py-0.5 rounded font-mono border shrink-0 ${
                offensiveShotsA > 0
                  ? 'text-cyber-green bg-cyber-green/20 border-cyber-green/40'
                  : 'text-slate-500 bg-black/40 border-slate-800'
              }`}>
                {offensiveShotsA > 0 ? '🎯 1 SHOT' : '🎯 0 SHOTS'}
              </span>
            )}
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'A' ? <span className="text-cyber-cyan font-bold">{t('arena.activeTurn')}</span> : <span className="text-slate-500">{t('arena.waitingTurn')}</span>
            ) : (
              playerAReady ? <span className="text-cyber-green font-bold">{t('arena.readyBadge')}</span> : <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>

        {/* Center Revolver Status Badge */}
        <div className="flex flex-col items-center shrink-0 px-1 text-center">
          <span className="text-[8px] text-cyber-pink uppercase font-chakra font-bold tracking-widest">CYBER REVOLVER</span>
          <span className="text-xs font-mono font-black text-white">{chambers}/{totalChambers} CHAMBERS</span>
        </div>

        {/* Player B */}
        <div className={`flex flex-col items-end flex-1 min-w-0 p-2 rounded-xl border transition-all ${
          currentTurn === 'B' && roomState === 'GAME_ACTIVE'
            ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink'
            : 'bg-black/40 border-cyber-border'
        }`}>
          <div className="flex items-center space-x-1 w-full min-w-0 justify-end">
            {roomState === 'GAME_ACTIVE' && (
              <span className={`text-[8px] px-1 py-0.5 rounded font-mono border shrink-0 ${
                offensiveShotsB > 0
                  ? 'text-cyber-pink bg-cyber-pink/20 border-cyber-pink/40'
                  : 'text-slate-500 bg-black/40 border-slate-800'
              }`}>
                {offensiveShotsB > 0 ? '🎯 1 SHOT' : '🎯 0 SHOTS'}
              </span>
            )}
            <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
          </div>
          <span className="text-[9px] font-mono mt-0.5">
            {roomState === 'GAME_ACTIVE' ? (
              currentTurn === 'B' ? <span className="text-cyber-pink font-bold">{t('arena.activeTurn')}</span> : <span className="text-slate-500">{t('arena.waitingTurn')}</span>
            ) : (
              playerBReady ? <span className="text-cyber-green font-bold">{t('arena.readyBadge')}</span> : <span className="text-slate-400">{t('arena.waitingBadge')}</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Revolver Drum & Lethal Probability (Always Visible) */}
      <div className="my-auto w-full flex flex-col items-center justify-center py-3 z-10 text-center">
        <div className="flex flex-col items-center space-y-3">
          {/* Animated Revolver Cylinder */}
          <motion.div
            animate={{ rotate: [0, 360 * (8 - chambers)] }}
            transition={{ duration: 0.6, type: 'spring', damping: 15 }}
            className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-cyber-pink/80 bg-cyber-bg/90 shadow-[0_0_30px_rgba(255,0,85,0.3)] flex items-center justify-center"
          >
            {/* 8 Chamber Dots around circle */}
            {Array.from({ length: 8 }).map((_, idx) => {
              const angle = (idx * 360) / 8;
              const isLoaded = idx < chambers;
              return (
                <div
                  key={idx}
                  className={`absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full border transform -translate-x-1/2 -translate-y-1/2 transition-all ${
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-cyber-pink flex items-center justify-center text-cyber-pink">
              <Crosshair className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
          </motion.div>

          {/* Lethal Odds Meter / Status Feed */}
          {roomState === 'GAME_ACTIVE' ? (
            <div className="flex flex-col items-center space-y-0.5">
              <span className="text-[10px] font-chakra uppercase tracking-widest text-slate-300">
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
          ) : roomState === 'BETTING_WINDOW' ? (
            <div className="flex flex-col items-center space-y-0.5">
              <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider animate-pulse flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{t('arena.bettingWindowTitle')}</span>
              </span>
              <span className="text-2xl font-mono font-black text-white">
                00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '20'}
              </span>
              <span className="text-[10px] font-rajdhani text-slate-400">
                {t('arena.bettingWindowActiveDesc')}
              </span>
            </div>
          ) : roomState === 'MATCH_SETTLED' ? (
            /* Clear Outcome Banner so players can clearly digest the final shot */
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-3 rounded-2xl border text-center font-chakra shadow-xl max-w-xs w-full ${
                lastOutcome?.result === 'BANG'
                  ? 'bg-rose-950/85 border-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-pulse'
                  : 'bg-emerald-950/85 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              }`}
            >
              <div className="text-sm font-orbitron font-black text-rose-400 flex items-center justify-center space-x-1.5">
                <span>{lastOutcome?.result === 'BANG' ? '💥 BANG! FATAL SHOT' : '🎯 DUEL CONCLUDED'}</span>
              </div>
              <div className="text-xs text-slate-200 mt-1 font-medium">
                {lastOutcome?.message || 'Eliminazione confermata!'}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center space-y-0.5">
              <span className="text-xs font-orbitron font-bold text-cyber-cyan uppercase tracking-wider">
                8-CHAMBER REVOLVER ARMED
              </span>
              <span className="text-[11px] font-chakra text-slate-300">
                1 server-side randomized live bullet. Press READY below!
              </span>
            </div>
          )}
        </div>

        {/* Outcome Feed Banner */}
        <AnimatePresence>
          {lastOutcome && roomState === 'GAME_ACTIVE' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`mt-3 max-w-xs p-2.5 rounded-2xl border text-xs font-chakra flex items-center space-x-2 ${
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

        {/* Phase 1: 3-Second Victory or Defeat Overlay */}
        {outcomePhase === 'splash' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <div className={`flex flex-col items-center p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center border-2 ${
              isWinner
                ? 'bg-gradient-to-b from-cyber-green/20 via-black/95 to-black border-cyber-green shadow-[0_0_50px_rgba(0,255,102,0.4)]'
                : role === 'player'
                ? 'bg-gradient-to-b from-rose-950/40 via-black/95 to-black border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]'
                : 'bg-gradient-to-b from-cyan-950/40 via-black/95 to-black border-cyber-cyan shadow-[0_0_50px_rgba(0,240,255,0.3)]'
            }`}>
              {isWinner ? (
                <>
                  <Trophy className="w-16 h-16 text-cyber-amber animate-bounce mb-3 filter drop-shadow-[0_0_15px_#ffb800]" />
                  <h2 className="text-2xl font-orbitron font-black text-cyber-green tracking-wider uppercase animate-pulse">
                    {t('roulette.victoryTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    {t('roulette.victoryDesc')}
                  </p>
                </>
              ) : role === 'player' ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-3 text-rose-400 animate-pulse">
                    <Swords className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-orbitron font-black text-rose-500 tracking-wider uppercase">
                    {t('roulette.defeatTitle')}
                  </h2>
                  <p className="text-xs font-chakra text-slate-300 mt-2">
                    {t('roulette.defeatDesc')}
                  </p>
                </>
              ) : (
                <>
                  <Swords className="w-16 h-16 text-cyber-cyan mb-3 animate-pulse" />
                  <h2 className="text-xl font-orbitron font-black text-white tracking-wider uppercase">
                    {t('arena.duelConcluded')}
                  </h2>
                </>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: Match Settled Modal (After 3 Seconds) */}
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
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-rose-400">
                  <Swords className="w-6 h-6" />
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isWinner ? t('roulette.victoryTitle') : role === 'player' ? t('roulette.defeatTitle') : t('arena.duelConcluded')}
              </h2>

              {/* Winner Prize row shown ONLY to the winner! */}
              {isWinner && (
                <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-cyber-border w-full flex justify-between items-center text-xs font-chakra">
                  <span className="text-slate-400">{t('arena.winnerPrize')}</span>
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
                    <span>{t('arena.rematchOfferSent')}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-cyber-cyan">{rematchOffer.newWagerTon} GRAM</span>
                </div>
                <span className="text-[11px] text-slate-300 font-chakra">
                  {t('arena.waitingForOpponentRematch')}
                </span>
                {onDeclineRematch && (
                  <button
                    onClick={onDeclineRematch}
                    className="w-full py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-300 hover:text-white font-chakra"
                  >
                    {t('arena.decline')}
                  </button>
                )}
              </div>
            )}
            {rematchOffer && !isRematchProposer && (
              <div className="w-full p-2.5 rounded-xl bg-cyber-pink/25 border border-cyber-pink flex flex-col space-y-2 mb-2 animate-pulse">
                <span className="text-xs font-orbitron font-bold text-white">{t('arena.rematchChallengeReceived')}</span>
                <span className="text-[11px] text-slate-200 font-chakra">
                  {rematchOffer.proposerName}: {rematchOffer.newWagerTon} GRAM
                </span>
                {!hasEnoughForRematch ? (
                  <div className="flex flex-col space-y-1.5 pt-1">
                    <div className="p-2 rounded-lg bg-black/70 border border-cyber-pink/50 text-[10px] text-cyber-pink font-chakra flex items-center justify-between">
                      <span>Saldo: {currentBal.toFixed(2)} GRAM</span>
                      <span className="font-bold">Mancano: {missingForRematch} GRAM</span>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">{t('arena.decline')}</button>
                      <button
                        onClick={() => onOpenDeposit?.(missingForRematch)}
                        className="flex-1 py-1.5 rounded-lg bg-cyber-cyan text-cyber-bg text-xs font-bold font-orbitron flex items-center justify-center space-x-1 shadow-neon-cyan hover:brightness-110 active:scale-95"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>{t('arena.depositForRematch')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2 pt-1">
                    <button onClick={onDeclineRematch} className="flex-1 py-1.5 rounded-lg bg-black border border-slate-600 text-xs text-slate-300">{t('arena.decline')}</button>
                    <button onClick={onAcceptRematch} className="flex-1 py-1.5 rounded-lg bg-cyber-pink text-white text-xs font-bold font-orbitron shadow-neon-pink hover:brightness-110 active:scale-95">{t('arena.accept2x')}</button>
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
                  {t('arena.opponentLeft')}
                </div>
              ) : (
                <button
                  onClick={onRequestRematch}
                  className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-cyber-pink to-cyber-cyan text-white shadow-neon-pink hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-1.5 mb-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('arena.rematch2x')}</span>
                </button>
              )
            )}

            {isWinner && (
              <div className="w-full py-2.5 px-3 rounded-xl bg-cyber-green/20 border border-cyber-green/60 flex items-center justify-center space-x-1.5 mb-2 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                <span className="text-xs font-orbitron font-bold text-cyber-green">
                  {t('arena.prizeAutoCredited', { amount: winnerPayoutTon })}
                </span>
              </div>
            )}

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="w-full py-2 rounded-xl bg-cyber-border text-slate-300 text-xs font-chakra font-bold hover:text-white"
              >
                {t('arena.backToLobby')}
              </button>
            )}

          </motion.div>
        </div>
      )}
      </div>

      {/* Bottom Controls: Lobby Ready or Game Actions */}
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
                    : 'bg-cyber-cyan text-cyber-bg hover:brightness-110 shadow-neon-cyan active:scale-95'
                }`}
              >
                {isReady ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
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
                      className="w-full py-3 bg-gradient-to-r from-cyber-cyan to-blue-500 text-cyber-bg font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1.5"
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
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="w-full py-3 px-4 rounded-xl bg-black/60 border border-cyber-amber/60 text-center flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-cyber-amber" />
            <span className="text-xs font-chakra font-bold text-cyber-amber">
              PREPARING REVOLVER • BETTING WINDOW ACTIVE ({countdownSeconds ?? 30}s)
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            isPlayerTurn ? (
              <div className="w-full flex flex-col space-y-2">
                <span className="text-[11px] font-orbitron font-bold text-cyber-cyan uppercase tracking-wider text-center animate-pulse">
                  ⚡ YOUR TURN • PULL TRIGGER OR STRIKE OPPONENT
                </span>
                <div className="flex space-x-2.5 w-full">
                  <button
                    onClick={() => onShoot('self')}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-cyan text-cyber-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:bg-cyber-cyan/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span className="flex items-center space-x-1">
                      <Crosshair className="w-4 h-4 text-cyber-cyan inline" />
                      <span>SHOOT SELF</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5 text-cyber-cyan/80">
                      Survive blank to pass turn
                    </span>
                  </button>

                  <button
                    onClick={() => !isShootOpponentDisabled && onShoot('opponent')}
                    disabled={isShootOpponentDisabled}
                    className={`flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider transition-all flex flex-col items-center ${
                      isShootOpponentDisabled
                        ? 'bg-black/40 border border-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
                        : 'bg-cyber-pink text-white shadow-neon-pink hover:brightness-110 active:scale-95'
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      <Crosshair className="w-4 h-4 text-white inline" />
                      <span>SHOOT RIVAL</span>
                    </span>
                    <span className="text-[9px] font-chakra font-normal mt-0.5">
                      {isShootOpponentDisabled ? 'EXHAUSTED (0 LEFT)' : `${lethalOdds}% kill • 1 USE ONLY`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
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
          )
        ) : null}
      </div>
    </div>
  );
};
