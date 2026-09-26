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
} from 'lucide-react';
import { SplitStealState, SplitStealChoice } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';

interface SplitStealArenaProps {
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
}

export const SplitStealArena: React.FC<SplitStealArenaProps> = ({
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
  onReturnToLobby,
  rematchOffer,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  isRematchProposer = false,
  opponentConnected = true,
  userSide = 'A',
  hasPlayerB = true,
  onJoinAsPlayer,
}) => {
  const { t } = useI18n();
  const { triggerImpact } = useHaptics();
  const [localChoice, setLocalChoice] = useState<SplitStealChoice | null>(null);

  const phase = gameData?.phase ?? 'COUNTDOWN';
  const secondsLeft = countdownSeconds !== null && countdownSeconds !== undefined
    ? countdownSeconds
    : (gameData?.secondsLeft ?? 10);
  const choicesRevealed = gameData?.choicesRevealed ?? false;
  const choiceA = gameData?.choiceA;
  const choiceB = gameData?.choiceB;
  const hasChosenA = gameData?.hasChosenA ?? false;
  const hasChosenB = gameData?.hasChosenB ?? false;
  const outcome = gameData?.outcome;
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

  // Reset choice on new round / lobby / betting window
  React.useEffect(() => {
    if (isLobby || isBetting) {
      setLocalChoice(null);
    }
  }, [isLobby, isBetting]);

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
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                    <span>{t('arena.readyBadge')}</span>
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
          <div className="min-w-0 flex-1">
            <div className="text-xs font-chakra font-bold text-cyber-pink truncate" title={playerBName}>
              {playerBName}
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate flex items-center justify-end">
              {isLobby ? (
                playerBReady ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                    <span>{t('arena.readyBadge')}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold">{t('arena.notReadyBadge')}</span>
                )
              ) : isCombatActive && !choicesRevealed ? (
                hasChosenB ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <Lock className="w-2.5 h-2.5 text-cyber-green shrink-0" />
                    <span>{t('split.secretLocked')}</span>
                  </span>
                ) : (
                  <span className="text-cyber-amber animate-pulse font-bold">{t('split.thinking')}</span>
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

        {/* State: GAME ACTIVE / COUNTDOWN */}
        {isCombatActive && !choicesRevealed && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 py-2">
            {/* Countdown Badge */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.35)]">
                  <span className="text-3xl font-orbitron font-black text-white animate-pulse">
                    0{Math.max(0, secondsLeft)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-chakra text-purple-300 font-bold tracking-widest uppercase mt-2">
                {t('split.secondsLeft')}
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
                        <span className="text-[9px] font-orbitron font-extrabold text-cyber-cyan bg-cyber-cyan/15 px-2 py-0.5 rounded-full border border-cyber-cyan/40">
                          {t('split.btnSplitTag')}
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">{t('split.btnSplit')}</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        {t('split.btnSplitDesc')}
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
                          {t('split.btnStealTag')}
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">{t('split.btnSteal')}</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        {t('split.btnStealDesc')}
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
        {choicesRevealed && (
          <div className="w-full flex flex-col items-center justify-center space-y-3 py-2 animate-in fade-in zoom-in-95 duration-300">
            {/* Outcome Big Banner */}
            {outcome === 'PEACE' && (
              <div className="w-full bg-gradient-to-r from-cyber-green/20 via-cyber-green/10 to-cyber-green/20 border-2 border-cyber-green rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(0,255,102,0.25)] space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-cyber-green/20 border border-cyber-green flex items-center justify-center mx-auto">
                  <Handshake className="w-7 h-7 text-cyber-green" />
                </div>
                <h3 className="text-base font-orbitron font-black text-white tracking-wider">
                  {t('split.outcomePeace')}
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  {t('split.outcomePeaceDesc')}
                </p>
                <div className="text-xs font-chakra font-bold text-cyber-green pt-1">
                  {t('split.outcomePeaceRefund', { amount: wagerTon })}
                  {bonusPerPlayerGram && bonusPerPlayerGram > 0 && (
                    <span className="block text-amber-300 text-sm font-orbitron mt-0.5">
                      {t('split.outcomePeaceBonus', { amount: bonusPerPlayerGram.toFixed(2) })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {(outcome === 'P1_STEAL' || outcome === 'P2_STEAL') && (
              <div className="w-full bg-gradient-to-r from-cyber-pink/20 via-purple-900/20 to-cyber-pink/20 border-2 border-cyber-pink rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(255,0,85,0.25)] space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-cyber-pink/20 border border-cyber-pink flex items-center justify-center mx-auto">
                  <Swords className="w-7 h-7 text-cyber-pink" />
                </div>
                <h3 className="text-base font-orbitron font-black text-white tracking-wider">
                  {t('split.outcomeSteal')}
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  {t('split.outcomeStealDesc', { winner: outcome === 'P1_STEAL' ? playerAName : playerBName })}
                </p>
                <div className="text-xs font-chakra font-bold text-cyber-pink pt-1">
                  {t('split.outcomeStealPot', { winner: outcome === 'P1_STEAL' ? playerAName : playerBName })}
                </div>
              </div>
            )}

            {outcome === 'DOUBLE_STEAL' && (
              <div className="w-full bg-gradient-to-r from-red-500/20 via-amber-900/20 to-red-500/20 border-2 border-red-500 rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(239,68,68,0.25)] space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto">
                  <Skull className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-base font-orbitron font-black text-white tracking-wider">
                  {t('split.outcomeDoubleSteal')}
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  {t('split.outcomeDoubleStealDesc')}
                </p>
                <div className="text-xs font-chakra text-amber-300 pt-1">
                  {t('split.outcomeDoubleStealPot')}
                </div>
              </div>
            )}

            {/* Revealed Choices Comparison */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-2">
              <div
                className={`p-3 rounded-2xl border text-center ${
                  choiceA === 'SPLIT'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-pink/15 border-cyber-pink text-white'
                }`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase block truncate">{playerAName}</span>
                <span className="text-lg font-orbitron font-black block mt-0.5">{choiceA}</span>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center ${
                  choiceB === 'SPLIT'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-pink/15 border-cyber-pink text-white'
                }`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase block truncate">{playerBName}</span>
                <span className="text-lg font-orbitron font-black block mt-0.5">{choiceB}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls: Lobby Ready or Rematch/Return */}
      <div className="w-full z-10 pt-3 border-t border-cyber-border/60 flex flex-col items-center">
        {isLobby ? (
          role === 'player' ? (
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
    </div>
  );
};
