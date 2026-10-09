import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Sparkles,
  Lock,
  Handshake,
  Skull,
  Swords,
  Flame,
  Clock,
  RotateCcw,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { SplitStealState, SplitStealChoice } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { TrustJackpotWheel } from './TrustJackpotWheel.js';

interface SplitStealArenaProps {
  matchId?: number | string | null;
  gameData?: SplitStealState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onChoice: (choice: SplitStealChoice) => void;
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
  rematchDeclined?: boolean;
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

export const SplitStealArena: React.FC<SplitStealArenaProps> = ({
  matchId,
  gameData,
  role,
  onChoice,
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
  onReturnToLobby,
  rematchOffer,
  rematchDeclined = false,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userSide = 'A',
  hasPlayerB = true,
  onJoinAsPlayer,
  onInviteChallenger,
  isWinner,
}) => {
  const { t } = useI18n();
  const { triggerImpact } = useHaptics();
  const [localChoice, setLocalChoice] = useState<SplitStealChoice | null>(null);

  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);
  const [wheelCanSpin, setWheelCanSpin] = useState<boolean>(false);

  const phase = gameData?.phase ?? 'COUNTDOWN';
  const currentRound = gameData?.currentRound ?? 1;
  const maxRounds = gameData?.maxRounds ?? 3;
  const roundProbabilities = gameData?.roundProbabilities;
  const roundHistory = gameData?.roundHistory ?? [];
  const secondsLeft = countdownSeconds !== null && countdownSeconds !== undefined
    ? countdownSeconds
    : (gameData?.secondsLeft ?? 15);
  const choicesRevealed = gameData?.choicesRevealed ?? false;
  const choiceA = gameData?.choiceA;
  const choiceB = gameData?.choiceB;
  const hasChosenA = gameData?.hasChosenA ?? false;
  const hasChosenB = gameData?.hasChosenB ?? false;
  const outcome = gameData?.outcome;
  const isUserStealWinner = role === 'player'
    ? (isWinner !== undefined ? isWinner : ((outcome === 'P1_STEAL' && userSide === 'A') || (outcome === 'P2_STEAL' && userSide === 'B')))
    : false;
  const isUserStealLoser = role === 'player' && ((outcome === 'P1_STEAL' || outcome === 'P2_STEAL') && !isUserStealWinner);
  const stealWinnerName = outcome === 'P1_STEAL' ? playerAName : playerBName;
  const [liveJackpotFallback, setLiveJackpotFallback] = useState<number | null>(null);

  React.useEffect(() => {
    if (gameData?.jackpotGram !== undefined) return;
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    const url = serverUrl ? `${serverUrl}/api/jackpot` : `/api/jackpot`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data?.trustJackpotGram) {
          setLiveJackpotFallback(parseFloat(data.trustJackpotGram));
        }
      })
      .catch(() => {});
  }, [gameData?.jackpotGram]);

  const jackpotGram = gameData?.jackpotGram ?? (liveJackpotFallback ?? 5.0);
  const jackpotStatus = gameData?.jackpotStatus ?? (jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING');
  const bonusPerPlayerGram = gameData?.bonusPerPlayerGram;

  const isLobby = roomState === 'LOBBY';
  const isBetting = roomState === 'BETTING_WINDOW';
  const isSettled = roomState === 'MATCH_SETTLED';
  const isCombatActive = roomState === 'GAME_ACTIVE';

  const matchStorageKey = matchId ? `split_wheel_done_${matchId}` : null;
  const [wheelCompleted, setWheelCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (matchStorageKey && sessionStorage.getItem(matchStorageKey) === 'true') {
      return true;
    }
    return false;
  });

  React.useEffect(() => {
    if (matchStorageKey && sessionStorage.getItem(matchStorageKey) === 'true') {
      setWheelCompleted(true);
    }
  }, [matchStorageKey]);

  // Outcomes that involve a wheel spin: PEACE or Winner of STEAL
  const hasWheelOutcome = outcome === 'PEACE' || isUserStealWinner;

  // Manage Outcome Modal and delayed wheel spin
  React.useEffect(() => {
    if (roomState === 'MATCH_SETTLED' || roomState === 'FORFEITED') {
      // If the wheel has already completed or outcome has no wheel:
      // Show the permanent settled conclusion modal directly!
      if (wheelCompleted || !hasWheelOutcome) {
        setShowOutcomeModal(true);
        setWheelCanSpin(false);
        return;
      }

      // First time with wheel live: brief intro modal, then start wheel
      setShowOutcomeModal(true);
      setWheelCanSpin(false);
      const timer = setTimeout(() => {
        setShowOutcomeModal(false);
        setWheelCanSpin(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowOutcomeModal(false);
      setWheelCanSpin(false);
    }
  }, [roomState, wheelCompleted, hasWheelOutcome]);

  const dismissIntroOutcomeModal = () => {
    setShowOutcomeModal(false);
    setWheelCanSpin(true);
  };

  const handleWheelFinish = () => {
    setWheelCompleted(true);
    setWheelCanSpin(false);
    if (matchStorageKey) {
      try {
        sessionStorage.setItem(matchStorageKey, 'true');
      } catch {}
    }
    setShowOutcomeModal(true);
  };



  // Reset choice on new round / lobby / betting window
  React.useEffect(() => {
    setLocalChoice(null);
  }, [currentRound, isLobby, isBetting]);

  const myChoice = userSide === 'A' ? choiceA : choiceB;
  const myHasChosen = userSide === 'A' ? hasChosenA : hasChosenB;
  const hasMyChoiceLocked = localChoice !== null || myHasChosen || (choicesRevealed && Boolean(myChoice));

  const handlePickChoice = (c: SplitStealChoice) => {
    if (hasMyChoiceLocked || !isCombatActive || phase !== 'COUNTDOWN') return;
    triggerImpact('heavy');
    setLocalChoice(c);
    onChoice(c);
  };

  const isJackpotActive = jackpotStatus === 'ACTIVE' || jackpotGram >= 5.0;

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-purple-500/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden min-h-[520px] font-rajdhani">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-900/15 via-transparent to-black/90 pointer-events-none" />

      {/* Top Banner: Trust Jackpot Counter */}
      <div className="w-full z-10 bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/15 border border-amber-400/50 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-lg gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0 relative">
            <Trophy className="w-4 h-4 text-amber-300" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-orbitron font-extrabold tracking-wider text-amber-300 uppercase whitespace-nowrap">
              {t('split.trustJackpot')}
            </div>
            <div className="text-xs sm:text-sm font-chakra font-bold text-white flex items-center space-x-1">
              <span>{jackpotGram.toFixed(2)} GRAM</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 pl-2">
          <span
            className={`text-[8.5px] sm:text-[9px] font-orbitron font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block ${
              isJackpotActive
                ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_8px_rgba(0,255,102,0.3)] animate-pulse'
                : 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber'
            }`}
          >
            {isJackpotActive ? t('split.jackpotActive') : t('split.jackpotCharging')}
          </span>
          <p className="text-[8px] font-chakra text-slate-400 mt-0.5 whitespace-nowrap">
            {isJackpotActive ? t('split.bonusUnlockedDesc') : t('split.refundOnlyDesc')}
          </p>
        </div>
      </div>

      {/* Duelists Header Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-1.5 mt-2">
        {/* Player A */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 bg-cyber-bg/50 p-2 rounded-xl border border-cyber-cyan/30">
          <div className="w-7 h-7 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center text-xs font-orbitron font-bold text-cyber-cyan shrink-0">
            P1
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-chakra font-bold text-cyber-cyan truncate" title={playerAName}>
              {playerAName}
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate">
              {isLobby ? (
                playerAReady ? (
                  <span className="text-cyber-green font-bold">
                    {t('arena.readyBadge')}
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold">{t('arena.notReadyBadge')}</span>
                )
              ) : isCombatActive && !choicesRevealed ? (
                hasChosenA ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <Lock className="w-2.5 h-2.5 text-cyber-green shrink-0" />
                    <span>{t('split.secretLocked')}</span>
                  </span>
                ) : (
                  <span className="text-cyber-amber animate-pulse font-bold">{t('split.thinking')}</span>
                )
              ) : choicesRevealed ? (
                <span className={`font-bold ${choiceA === 'SPLIT' ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                  {choiceA}
                </span>
              ) : (
                <span>--</span>
              )}
            </div>
          </div>
        </div>

        {/* VS / Wager Middle Badge */}
        <div className="px-1 text-center shrink-0">
          <div className="text-[9px] font-orbitron font-bold text-purple-400">VS</div>
          <div className="flex items-center justify-center space-x-0.5 text-[11px] font-chakra font-bold text-white mt-0.5">
            <span>{wagerTon}</span>
            <GramIcon className="w-3 h-3 text-cyber-cyan" />
          </div>
        </div>

        {/* Player B */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 bg-cyber-bg/50 p-2 rounded-xl border border-cyber-pink/30 text-right justify-end">
          <div className="min-w-0 flex-1 text-right">
            <div className="text-xs font-chakra font-bold text-cyber-pink truncate" title={playerBName}>
              {playerBName}
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate text-right">
              {isLobby ? (
                playerBReady ? (
                  <span className="text-cyber-green font-bold inline-flex truncate max-w-full">
                    <span className="truncate">{t('arena.readyBadge')}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold truncate">{t('arena.notReadyBadge')}</span>
                )
              ) : isCombatActive && !choicesRevealed ? (
                hasChosenB ? (
                  <span className="text-cyber-green font-bold inline-flex items-center space-x-0.5 truncate max-w-full">
                    <Lock className="w-2.5 h-2.5 text-cyber-green shrink-0" />
                    <span className="truncate">{t('split.secretLocked')}</span>
                  </span>
                ) : (
                  <span className="text-cyber-amber animate-pulse font-bold truncate">{t('split.thinking')}</span>
                )
              ) : choicesRevealed ? (
                <span className={`font-bold ${choiceB === 'SPLIT' ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                  {choiceB}
                </span>
              ) : (
                <span>--</span>
              )}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-cyber-pink/20 border border-cyber-pink flex items-center justify-center text-xs font-orbitron font-bold text-cyber-pink shrink-0">
            P2
          </div>
        </div>
      </div>

      {/* 3-Round Escalation Stepper */}
      {(isCombatActive || choicesRevealed) && !isLobby && (
        <div className="w-full z-10 my-2 px-0.5">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[1, 2, 3].map((r) => {
              const isCurrent = currentRound === r && !isSettled;
              const isPast = currentRound > r;
              const roundLabel = r === 1 ? t('split.stagePact') : r === 2 ? t('split.stageTemptation') : t('split.stageClimax');
              const dropProb = r === 1 ? '20%' : r === 2 ? '40%' : '70%';
              const stealPct = r === 1 ? '10%' : r === 2 ? '25%' : '40%';
              const peacePct = r === 1 ? '15%' : r === 2 ? '30%' : '50%';

              return (
                <div
                  key={r}
                  className={`relative p-2 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-purple-900/50 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-1 ring-purple-400/80'
                      : isPast
                      ? 'bg-cyber-green/10 border-cyber-green/40 opacity-90'
                      : 'bg-black/30 border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] font-orbitron font-extrabold">
                    <span className={isCurrent ? 'text-purple-300' : isPast ? 'text-cyber-green' : 'text-slate-400'}>
                      R{r} {isPast && '✓'}
                    </span>
                    <span className={`text-[7.5px] sm:text-[8px] font-mono ${isCurrent ? 'text-amber-300 font-extrabold animate-pulse' : 'text-slate-400'}`}>
                      Drop {dropProb}
                    </span>
                  </div>
                  <div className={`text-[10px] sm:text-[11px] font-chakra font-extrabold mt-0.5 truncate ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                    {roundLabel}
                  </div>
                  <div className="text-[7.5px] sm:text-[8.5px] font-chakra text-slate-400 flex items-center justify-center space-x-1 mt-0.5">
                    <span className="text-cyber-pink font-bold">🗡️+{stealPct}</span>
                    <span>•</span>
                    <span className="text-cyber-green font-bold">🤝+{peacePct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Center Gameplay Stage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-3 relative z-10">
        {/* State: LOBBY */}
        {isLobby && (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Handshake className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-orbitron font-bold text-white tracking-wider">
                {t('split.lobbyTitle')}
              </h3>
              <p className="text-xs font-chakra text-slate-300 max-w-xs mx-auto mt-1">
                {!hasPlayerB
                  ? t('split.lobbyWaitingDesc')
                  : t('split.lobbyReadyDesc')}
              </p>
            </div>
          </div>
        )}

        {/* State: BETTING WINDOW */}
        {isBetting && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-orbitron font-bold text-amber-300 uppercase tracking-wider">
                {t('split.bettingWindow')}
              </h3>
              <div className="text-2xl font-mono font-black text-white mt-1">
                00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '30'}
              </div>
              <p className="text-xs font-chakra text-slate-300 max-w-xs mx-auto mt-1">
                {t('split.bettingWindowDesc')}
              </p>
            </div>
          </div>
        )}

        {/* State: ROUND TRANSITION (Cooperation in Round 1 or 2) */}
        {isCombatActive && phase === 'ROUND_TRANSITION' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-gradient-to-b from-purple-900/60 via-purple-950/80 to-black/90 border-2 border-purple-400/80 rounded-2xl p-5 text-center shadow-[0_0_40px_rgba(168,85,247,0.4)] space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyber-green/20 border-2 border-cyber-green flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,102,0.4)] animate-bounce">
              <Handshake className="w-8 h-8 text-cyber-green" />
            </div>
            <div>
              <span className="text-[10px] font-orbitron font-extrabold px-2.5 py-0.5 rounded-full bg-cyber-green/20 text-cyber-green border border-cyber-green/50 uppercase tracking-widest">
                {t('split.roundPassed', { round: currentRound })}
              </span>
              <h3 className="text-lg font-orbitron font-black text-white tracking-wider mt-1.5">
                {t('split.roundAdvanceTitle')}
              </h3>
              <p className="text-xs font-chakra text-slate-200 mt-1">
                {t('split.roundAdvanceDesc', { nextRound: currentRound + 1 })}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] font-chakra text-purple-300">
              {t('split.nextRoundBanner', { steal: currentRound === 1 ? 25 : 40, drop: currentRound === 1 ? 40 : 70 })}
            </div>
          </motion.div>
        )}

        {/* State: GAME ACTIVE / COUNTDOWN */}
        {isCombatActive && phase === 'COUNTDOWN' && !choicesRevealed && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 py-2">
            {/* Countdown Badge */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.35)]">
                  <span className="text-3xl font-orbitron font-black text-white animate-pulse">
                    {secondsLeft < 10 ? `0${Math.max(0, secondsLeft)}` : Math.max(0, secondsLeft)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-chakra text-purple-300 font-bold tracking-widest uppercase mt-2">
                ROUND {currentRound} / {maxRounds} • {t('split.secondsLeft')}
              </span>
            </div>

            {/* Duelist Interaction Area */}
            {role === 'player' ? (
              hasMyChoiceLocked ? (
                <div className="bg-purple-950/40 border border-purple-500/50 rounded-2xl p-4 text-center max-w-sm w-full space-y-2">
                  <Lock className="w-6 h-6 text-purple-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
                    {t('split.choiceLocked')}
                  </h4>
                  <p className="text-xs font-chakra text-slate-300">
                    {t('split.choiceLockedDesc', { choice: localChoice || myChoice || '...' })}
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-center text-xs font-chakra text-slate-300 mb-2">
                    {t('split.pickPrompt')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* SPLIT BUTTON */}
                    <button
                      type="button"
                      onClick={() => handlePickChoice('SPLIT')}
                      className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-cyber-cyan/20 to-cyber-cyan/5 border-2 border-cyber-cyan text-left shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:brightness-110 active:scale-95 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-cyber-cyan/20 flex items-center justify-center">
                          <Handshake className="w-5 h-5 text-cyber-cyan" />
                        </div>
                        <span className="text-[8.5px] sm:text-[9px] font-orbitron font-extrabold text-cyber-cyan bg-cyber-cyan/15 px-2 py-0.5 rounded-full border border-cyber-cyan/40 shrink-0 whitespace-nowrap">
                          {currentRound < 3 ? t('split.advanceToRound', { round: currentRound + 1 }) : t('split.jackpot50')}
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">{t('split.btnSplit')}</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        {currentRound < 3
                          ? t('split.cooperateDesc', { round: currentRound + 1 })
                          : t('split.finalPactDesc')}
                      </p>
                    </button>

                    {/* STEAL BUTTON */}
                    <button
                      type="button"
                      onClick={() => handlePickChoice('STEAL')}
                      className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-cyber-pink/20 to-cyber-pink/5 border-2 border-cyber-pink text-left shadow-[0_0_20px_rgba(255,0,85,0.25)] hover:brightness-110 active:scale-95 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-cyber-pink/20 flex items-center justify-center">
                          <Swords className="w-5 h-5 text-cyber-pink" />
                        </div>
                        <span className="text-[9px] font-orbitron font-extrabold text-cyber-pink bg-cyber-pink/15 px-2 py-0.5 rounded-full border border-cyber-pink/40">
                          {t('split.stealBadge', { pct: currentRound === 1 ? '10%' : currentRound === 2 ? '25%' : '40%' })}
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">{t('split.btnSteal')}</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        {t('split.stealDesc', {
                          pot: (parseFloat(wagerTon) * 2).toFixed(2),
                          bounty: currentRound === 1 ? '10%' : currentRound === 2 ? '25%' : '40%',
                        })}
                      </p>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-cyber-bg/60 border border-cyber-border rounded-2xl p-4 text-center max-w-sm w-full space-y-2">
                <Flame className="w-6 h-6 text-purple-400 mx-auto animate-pulse" />
                <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  {t('split.spectatorWatching')}
                </h4>
                <p className="text-xs font-chakra text-slate-300">
                  {t('split.spectatorWatchingDesc')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* State: REVEAL / SHOWDOWN / SETTLED */}
        {choicesRevealed && !isLobby && !isBetting && (
          <div className="w-full flex flex-col items-center justify-center space-y-2 py-1 animate-in fade-in zoom-in-95 duration-300">
            {/* Outcome Big Banner / Wheel */}
            {outcome === 'PEACE' && (
              !wheelCompleted ? (
                <div className="w-full flex flex-col items-center">
                  <TrustJackpotWheel
                    autoSpin={wheelCanSpin}
                    onFinish={handleWheelFinish}
                    isWon={Boolean(bonusPerPlayerGram && bonusPerPlayerGram > 0)}
                    bonusPerPlayerGram={bonusPerPlayerGram}
                    wagerGram={wagerTon}
                    probabilityPercent={roundProbabilities?.probabilityPercent ?? 70}
                    bonusPercent={roundProbabilities?.peaceBonusPercent ?? 20}
                  />
                </div>
              ) : null
            )}

            {(outcome === 'P1_STEAL' || outcome === 'P2_STEAL') && (
              isUserStealLoser ? (
                <div className="w-full max-w-sm bg-gradient-to-r from-rose-950/40 via-red-900/30 to-rose-950/40 border border-rose-500/70 rounded-2xl p-3 text-center shadow-[0_0_20px_rgba(244,63,94,0.2)] space-y-1">
                  <div className="flex items-center justify-center space-x-1.5 text-rose-300 font-orbitron font-black text-sm">
                    <span className="text-base">🗡️</span>
                    <span>{t('split.betrayedTitle')}</span>
                  </div>
                  <p className="text-[11px] font-chakra text-slate-200">
                    {t('split.betrayedDesc', { winner: stealWinnerName })}
                  </p>
                  <div className="inline-block px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 font-heading font-black text-[11px]">
                    {t('split.betrayedLoss', { amount: wagerTon })}
                  </div>
                </div>
              ) : (
                !wheelCompleted ? (
                  <div className="w-full flex flex-col items-center">
                    <TrustJackpotWheel
                      autoSpin={wheelCanSpin}
                      mode="steal"
                      onFinish={handleWheelFinish}
                      isWon={Boolean(bonusPerPlayerGram && bonusPerPlayerGram > 0)}
                      bonusPerPlayerGram={bonusPerPlayerGram}
                      wagerGram={wagerTon}
                      probabilityPercent={roundProbabilities?.probabilityPercent ?? (currentRound === 1 ? 20 : currentRound === 2 ? 40 : 70)}
                      bonusPercent={roundProbabilities?.stealBonusPercent ?? (currentRound === 1 ? 10 : currentRound === 2 ? 25 : 40)}
                    />
                  </div>
                ) : null
              )
            )}

            {outcome === 'DOUBLE_STEAL' && (
              <div className="w-full max-w-sm bg-gradient-to-r from-red-500/20 via-amber-900/20 to-red-500/20 border border-red-500/70 rounded-2xl p-3 text-center shadow-[0_0_20px_rgba(239,68,68,0.2)] space-y-1">
                <div className="flex items-center justify-center space-x-1.5 text-red-300 font-orbitron font-black text-sm">
                  <Skull className="w-4 h-4 text-red-400 inline" />
                  <span>{t('split.outcomeDoubleSteal')}</span>
                </div>
                <p className="text-[11px] font-chakra text-slate-200">
                  {t('split.outcomeDoubleStealDesc')}
                </p>
                <div className="text-[10px] font-chakra text-amber-300">
                  {t('split.outcomeDoubleStealPot')}
                </div>
              </div>
            )}

            {/* Revealed Choices Comparison (Compact) */}
            <div className="flex items-center space-x-1.5 text-[9px] font-orbitron font-extrabold text-purple-300 bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase tracking-wider">
              <span>{t('split.finalOutcomeRound', { current: currentRound, max: maxRounds })}</span>
            </div>

            <div className="flex items-center justify-center space-x-2 w-full max-w-xs text-xs pt-0.5">
              <div
                className={`flex-1 py-1.5 px-2 rounded-xl border text-center ${
                  choiceA === 'SPLIT'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-pink/15 border-cyber-pink text-white'
                }`}
              >
                <span className="text-[9px] font-mono text-slate-400 uppercase block truncate">{playerAName}</span>
                <span className="text-sm font-orbitron font-black block mt-0.5">{choiceA}</span>
              </div>

              <span className="text-[10px] font-orbitron font-black text-purple-400 uppercase">VS</span>

              <div
                className={`flex-1 py-1.5 px-2 rounded-xl border text-center ${
                  choiceB === 'SPLIT'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-pink/15 border-cyber-pink text-white'
                }`}
              >
                <span className="text-[9px] font-mono text-slate-400 uppercase block truncate">{playerBName}</span>
                <span className="text-sm font-orbitron font-black block mt-0.5">{choiceB}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls: Lobby Ready or Rematch/Return */}
      <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
        {isLobby ? (
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
                onClick={() => {
                  triggerImpact('medium');
                  onReady?.();
                }}
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
                      onClick={() => {
                        triggerImpact('medium');
                        onJoinAsPlayer();
                      }}
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
        ) : isBetting ? (
          <div className="w-full py-3 px-4 rounded-xl bg-black/60 border border-cyber-amber/60 text-center flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 animate-spin text-cyber-amber" />
            <span className="text-xs font-chakra font-bold text-cyber-amber">
              {t('split.bettingWindow')} ({countdownSeconds ?? 30}s)
            </span>
          </div>
        ) : isSettled ? (
          <div className="w-full space-y-2">
            {/* Rematch Offer Received */}
            {rematchOffer && !isRematchProposer && (
              <div className="bg-purple-950/40 border border-purple-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs font-chakra">
                <span className="text-white">
                  {t('split.rematchOffer', { name: rematchOffer.proposerName, amount: rematchOffer.newWagerTon })}
                </span>
                <div className="flex space-x-1.5">
                  <button
                    onClick={onAcceptRematch}
                    className="px-3 py-1 bg-cyber-green text-cyber-bg font-orbitron font-bold text-[10px] rounded-lg"
                  >
                    {t('rematch.accept')}
                  </button>
                  <button
                    onClick={onDeclineRematch}
                    className="px-2 py-1 bg-black/40 text-slate-400 font-chakra text-[10px] rounded-lg"
                  >
                    {t('rematch.decline')}
                  </button>
                </div>
              </div>
            )}

            {/* Rematch Offer Sent - Waiting for Opponent */}
            {rematchOffer && isRematchProposer && (
              <div className="bg-purple-900/30 border border-purple-500/50 p-2.5 rounded-xl flex items-center space-x-3 text-xs font-chakra text-purple-200">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-orbitron font-bold text-purple-300">
                    {t('split.rematchOfferSent')}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {t('split.rematchWaitingOpponent')}
                  </div>
                </div>
              </div>
            )}

            {/* Rematch Declined Notification */}
            {rematchDeclined && (
              <div className="bg-red-950/40 border border-red-500/60 p-2.5 rounded-xl flex items-center space-x-2 text-xs font-chakra text-red-200">
                <X className="w-4 h-4 text-red-400 shrink-0" />
                <span>{t('split.rematchDeclinedNotice')}</span>
              </div>
            )}

            <div className="flex space-x-2 w-full">
              {role === 'player' && opponentConnected && onRequestRematch && !rematchOffer && (
                <button
                  onClick={() => {
                    triggerImpact('medium');
                    onRequestRematch();
                  }}
                  disabled={isRematchProposer}
                  className="flex-1 py-3 px-3 bg-purple-600/30 border border-purple-500/60 hover:bg-purple-600/50 text-white font-orbitron font-bold text-[11px] sm:text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 text-center"
                >
                  <RotateCcw className="w-4 h-4 shrink-0 text-purple-300" />
                  <span className="leading-tight text-center">
                    {isRematchProposer ? t('split.rematchRequested') : t('split.rematchRequest')}
                  </span>
                </button>
              )}

              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="flex-1 py-3 px-3 bg-cyber-bg border border-cyber-border text-slate-300 hover:text-white font-chakra font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center text-center"
                >
                  <span className="leading-tight text-center">{t('split.returnToArena')}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Victory / Defeat Outcome Modal Overlay */}
      <AnimatePresence>
        {showOutcomeModal && (
          <div
            onClick={!wheelCompleted && hasWheelOutcome ? dismissIntroOutcomeModal : undefined}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`flex flex-col items-center p-4 sm:p-5 bg-[#121520] border rounded-3xl shadow-2xl max-w-xs w-full text-center ${
                outcome === 'PEACE'
                  ? 'border-cyber-cyan shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                  : isUserStealWinner
                  ? 'border-cyber-green shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                  : isUserStealLoser
                  ? 'border-cyber-pink shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                  : 'border-white/10'
              }`}
            >
              {outcome === 'PEACE' ? (
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyber-cyan flex items-center justify-center mb-2 text-cyber-cyan shadow-lg">
                  <Handshake className="w-8 h-8 animate-pulse" />
                </div>
              ) : isUserStealWinner ? (
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-2 text-amber-400 shadow-lg animate-bounce">
                  <Trophy className="w-8 h-8" />
                </div>
              ) : isUserStealLoser || outcome === 'DOUBLE_STEAL' ? (
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-rose-400 shadow-lg">
                  <Skull className="w-8 h-8" />
                </div>
              ) : (
                <Trophy className="w-12 h-12 text-amber-400 mb-2" />
              )}

              <h2 className="text-base sm:text-lg font-orbitron font-black text-white uppercase tracking-wider">
                {outcome === 'PEACE'
                  ? t('split.outcomePeace')
                  : isUserStealWinner
                  ? t('split.outcomeSteal')
                  : isUserStealLoser
                  ? t('split.betrayedTitle')
                  : outcome === 'DOUBLE_STEAL'
                  ? t('split.outcomeDoubleSteal')
                  : t('arena.duelConcluded')}
              </h2>

              <p className="text-xs font-chakra text-slate-300 mt-1">
                {outcome === 'PEACE'
                  ? t('split.outcomePeaceDesc')
                  : isUserStealWinner
                  ? t('split.youCollectPot')
                  : isUserStealLoser
                  ? t('split.betrayedLoss', { amount: wagerTon })
                  : outcome === 'DOUBLE_STEAL'
                  ? t('split.outcomeDoubleStealDesc')
                  : (outcome === 'P1_STEAL' || outcome === 'P2_STEAL')
                  ? t('split.outcomeStealPot', { winner: stealWinnerName })
                  : ''}
              </p>

              {/* Live match Intro popup before Wheel spin */}
              {!wheelCompleted && hasWheelOutcome ? (
                <button
                  onClick={dismissIntroOutcomeModal}
                  className="mt-3 w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95"
                >
                  {t('split.spinWheel')}
                </button>
              ) : (
                /* Permanent Settled Conclusion Modal (like Connect4 / CyberShotgun) */
                <div className="w-full mt-2.5 space-y-2">
                  {/* Prize breakdown */}
                  {outcome === 'PEACE' && (
                    <div className="space-y-1.5 w-full">
                      <div className="p-2 rounded-xl bg-black/60 border border-cyber-cyan/30 w-full flex justify-between items-center text-xs font-chakra">
                        <span className="text-slate-400">{t('split.outcomePeaceRefund', { amount: wagerTon })}</span>
                        <span className="font-bold text-cyber-cyan flex items-center space-x-1">
                          <span>+{wagerTon}</span>
                          <GramIcon className="w-3 h-3 text-cyan-400 inline" />
                        </span>
                      </div>
                      {bonusPerPlayerGram && bonusPerPlayerGram > 0 ? (
                        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 w-full flex justify-between items-center text-xs font-chakra">
                          <span className="text-amber-300 font-bold">{t('split.trustJackpot')}</span>
                          <span className="font-bold text-amber-300 flex items-center space-x-1">
                            <span>+{bonusPerPlayerGram.toFixed(2)}</span>
                            <GramIcon className="w-3 h-3 text-amber-400 inline" />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {isUserStealWinner && (
                    <div className="space-y-1.5 w-full">
                      <div className="p-2 rounded-xl bg-black/60 border border-cyber-green/30 w-full flex justify-between items-center text-xs font-chakra">
                        <span className="text-slate-400">{t('arena.winnerPrize')}</span>
                        <span className="font-bold text-cyber-green flex items-center space-x-1">
                          <span>+{Number(wagerTon) * 2}</span>
                          <GramIcon className="w-3 h-3 text-green-400 inline" />
                        </span>
                      </div>
                      {bonusPerPlayerGram && bonusPerPlayerGram > 0 ? (
                        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 w-full flex justify-between items-center text-xs font-chakra">
                          <span className="text-amber-300 font-bold">{t('split.trustJackpot')}</span>
                          <span className="font-bold text-amber-300 flex items-center space-x-1">
                            <span>+{bonusPerPlayerGram.toFixed(2)}</span>
                            <GramIcon className="w-3 h-3 text-amber-400 inline" />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {outcome === 'DOUBLE_STEAL' && (
                    <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-[11px] font-chakra text-amber-300">
                      {t('split.outcomeDoubleStealPot')}
                    </div>
                  )}

                  {/* Rematch Section */}
                  {rematchOffer && isRematchProposer && (
                    <div className="w-full p-2.5 rounded-xl bg-purple-900/30 border border-purple-500/50 flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-orbitron font-bold text-white flex items-center space-x-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          <span>{t('split.rematchOfferSent')}</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-purple-300">{rematchOffer.newWagerTon} GRAM</span>
                      </div>
                      <span className="text-[10px] font-chakra text-slate-300 text-left">
                        {t('split.rematchWaitingOpponent')}
                      </span>
                    </div>
                  )}

                  {rematchOffer && !isRematchProposer && (
                    <div className="w-full p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/60 flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-orbitron font-bold text-white">{t('rematch.offerTitle')}</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">{rematchOffer.newWagerTon} GRAM</span>
                      </div>
                      <p className="text-[10px] font-chakra text-slate-300 text-left">
                        {t('split.rematchOffer', { name: rematchOffer.proposerName, amount: rematchOffer.newWagerTon })}
                      </p>
                      <div className="flex space-x-2 pt-1">
                        <button
                          onClick={onDeclineRematch}
                          className="flex-1 py-1.5 rounded-lg bg-black/60 border border-slate-600 text-xs text-slate-300 hover:text-white"
                        >
                          {t('rematch.decline')}
                        </button>
                        <button
                          onClick={onAcceptRematch}
                          className="flex-1 py-1.5 rounded-lg bg-cyber-green text-cyber-bg text-xs font-bold font-orbitron shadow-md"
                        >
                          {t('rematch.accept')}
                        </button>
                      </div>
                    </div>
                  )}

                  {rematchDeclined && (
                    <div className="w-full p-2 rounded-xl bg-red-950/40 border border-red-500/60 flex items-center space-x-2 text-xs font-chakra text-red-200">
                      <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{t('split.rematchDeclinedNotice')}</span>
                    </div>
                  )}

                  {!rematchOffer && role === 'player' && (
                    !opponentConnected ? (
                      <div className="w-full py-2.5 rounded-xl bg-black/40 border border-slate-800 text-slate-500 text-xs font-chakra font-bold text-center">
                        {t('arena.opponentLeft')}
                      </div>
                    ) : (
                      onRequestRematch && (
                        <button
                          onClick={() => {
                            triggerImpact('medium');
                            onRequestRematch();
                          }}
                          disabled={isRematchProposer}
                          className="w-full py-2.5 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                        >
                          <RotateCcw className="w-4 h-4 shrink-0 text-purple-300" />
                          <span>{isRematchProposer ? t('split.rematchRequested') : t('split.rematchRequest')}</span>
                        </button>
                      )
                    )
                  )}

                  {onReturnToLobby && (
                    <button
                      onClick={onReturnToLobby}
                      className="w-full py-2 rounded-xl bg-white/10 text-slate-300 hover:text-white text-xs font-chakra font-bold transition-all flex items-center justify-center"
                    >
                      {t('split.returnToArena')}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
