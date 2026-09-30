import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Loader2, Sparkles, Layers, Clock, Flame, ArrowDownLeft, Swords } from 'lucide-react';
import { BlackjackState, Card } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useI18n } from '../../i18n/index.js';

interface BlackjackArenaProps {
  gameData?: BlackjackState;
  role: 'player' | 'spectator';
  isPlayerTurn: boolean;
  onHit: () => void;
  onStand: () => void;
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

const renderSuitIcon = (suit: string) => {
  switch (suit) {
    case '♥':
      return <span className="text-rose-500 font-black">♥</span>;
    case '♦':
      return <span className="text-rose-500 font-black">♦</span>;
    case '♣':
      return <span className="text-cyan-400 font-black">♣</span>;
    case '♠':
    default:
      return <span className="text-cyan-400 font-black">♠</span>;
  }
};

const CardView: React.FC<{ card: Card; index: number }> = ({ card, index }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <motion.div
      initial={{ scale: 0, y: -20, rotate: -5 }}
      animate={{ scale: 1, y: 0, rotate: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`w-14 h-20 sm:w-16 sm:h-24 bg-gradient-to-br from-slate-900 to-black border-2 rounded-xl p-1.5 flex flex-col justify-between shadow-lg select-none relative shrink-0 ${
        isRed ? 'border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
      }`}
    >
      <div className={`text-xs font-chakra font-black flex items-center justify-between ${isRed ? 'text-rose-400' : 'text-cyan-400'}`}>
        <span>{card.value}</span>
        <span className="text-xs">{card.suit}</span>
      </div>
      <div className="text-center text-xl my-auto leading-none">
        {renderSuitIcon(card.suit)}
      </div>
      <div className={`text-xs font-chakra font-black flex items-center justify-between rotate-180 ${isRed ? 'text-rose-400' : 'text-cyan-400'}`}>
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
  userBalanceGram,
  onOpenDeposit,
  socketError,
  isCreator = false,
  hasPlayerB = true,
  onJoinAsPlayer,
  onInviteChallenger,
}) => {
  const { t } = useI18n();
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

  const winnerPayoutTon = (parseFloat(wagerTon || '1') * 2.0).toFixed(2);
  const activeTurnName = currentTurn === 'A' ? playerAName : playerBName;
  const activeBustOdds = currentTurn === 'A' ? bustOddsA : bustOddsB;

  const currentBal = parseFloat(userBalanceGram || '0');
  const rematchWager = rematchOffer ? parseFloat(rematchOffer.newWagerTon || '0') : 0;
  const hasEnoughForRematch = currentBal >= rematchWager;
  const missingForRematch = (rematchWager - currentBal).toFixed(2);

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

  return (
    <div className="w-full flex flex-col items-center justify-between p-3.5 sm:p-4 bg-cyber-card/90 border border-cyber-cyan/40 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.15)] relative overflow-hidden min-h-[540px]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-cyber-cyan/10 via-transparent to-black/90 pointer-events-none" />

      {/* Top Header: Table Info & Shoe Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 pb-2.5 gap-1.5">
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] text-cyber-cyan uppercase font-chakra font-bold tracking-widest flex items-center space-x-1 truncate">
            <Sparkles className="w-3 h-3 text-cyber-cyan inline shrink-0" />
            <span>{t('blackjack.title')}</span>
          </span>
          <span className="text-[10px] font-chakra text-slate-400">{t('blackjack.shoe')}</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-black/60 border border-cyber-border px-2.5 py-1 rounded-xl shrink-0">
          <Layers className="w-3 h-3 text-cyber-cyan" />
          <span className="text-xs font-mono font-bold text-white">{deckRemaining} {t('blackjack.cards')}</span>
        </div>
      </div>

      {/* Duel Cards Table */}
      <div className="my-auto w-full flex flex-col space-y-3 py-2 z-10">
        {roomState === 'LOBBY' ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/50 border border-cyber-border text-center space-y-2">
            <Layers className="w-12 h-12 text-cyber-cyan/60 animate-pulse" />
            <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
              CYBER TABLE ARMED • 100% FACE-UP
            </h4>
            <p className="text-xs text-slate-300 font-chakra max-w-xs">
              All cards are dealt face-up from a shared common shoe. Click READY below to begin!
            </p>
          </div>
        ) : roomState === 'BETTING_WINDOW' ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-black/50 border border-cyber-amber/50 text-center space-y-2">
            <Clock className="w-10 h-10 text-cyber-amber animate-spin" />
            <span className="text-xs font-mono font-bold text-cyber-amber uppercase tracking-wider">
              PARI-MUTUEL BETTING OPEN
            </span>
            <span className="text-3xl font-mono font-black text-white">
              00:{countdownSeconds !== null && countdownSeconds !== undefined ? (countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds) : '30'}
            </span>
            <span className="text-[11px] text-slate-400 font-rajdhani">
              Cards will be dealt face-up once countdown reaches 00:00!
            </span>
          </div>
        ) : (
          <>
            {/* Player B (Top / Opponent) */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              currentTurn === 'B' && roomState === 'GAME_ACTIVE'
                ? 'bg-cyber-pink/15 border-cyber-pink shadow-neon-pink'
                : 'bg-black/50 border-cyber-border/80'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs font-chakra font-bold text-cyber-pink truncate">{playerBName}</span>
                  {standB && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600">
                      {t('blackjack.stand')}
                    </span>
                  )}
                  {bustB && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyber-pink/20 text-cyber-pink border border-cyber-pink animate-pulse">
                      {t('blackjack.bust')}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-xs font-chakra text-slate-400">{t('blackjack.score')}</span>
                  <span className={`text-base font-orbitron font-black ${
                    bustB ? 'text-cyber-pink line-through' : scoreB === 21 ? 'text-cyber-amber animate-pulse' : 'text-white'
                  }`}>
                    {scoreB}
                  </span>
                </div>
              </div>

              {/* Cards Row B */}
              <div className="flex items-center space-x-2 overflow-x-auto py-1 min-h-[75px]">
                {handB.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">{t('blackjack.dealingCards')}</span>
                ) : (
                  handB.map((c, i) => <CardView key={`${c.suit}-${c.value}-${i}`} card={c} index={i} />)
                )}
              </div>
            </div>

            {/* Dynamic Center Matchup Banner / Bust Odds */}
            {roomState === 'GAME_ACTIVE' && (
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-cyber-border/60 text-center">
                <div className="flex items-center space-x-2 text-xs font-chakra">
                  <span className="text-slate-400">{t('blackjack.activeTurn')}</span>
                  <span className="font-bold text-white uppercase">{activeTurnName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{t('blackjack.bustOdds')}</span>
                  <span className={`font-mono font-bold ${activeBustOdds >= 50 ? 'text-cyber-pink' : 'text-cyber-green'}`}>
                    {activeBustOdds}%
                  </span>
                </div>
                {lastAction && (
                  <span className="text-[11px] font-rajdhani text-cyber-cyan mt-0.5">
                    {lastAction.message}
                  </span>
                )}
              </div>
            )}

            {/* Player A (Bottom / Challenger) */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              currentTurn === 'A' && roomState === 'GAME_ACTIVE'
                ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-neon-cyan'
                : 'bg-black/50 border-cyber-border/80'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs font-chakra font-bold text-cyber-cyan truncate">{playerAName}</span>
                  {standA && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600">
                      {t('blackjack.stand')}
                    </span>
                  )}
                  {bustA && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyber-pink/20 text-cyber-pink border border-cyber-pink animate-pulse">
                      {t('blackjack.bust')}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-xs font-chakra text-slate-400">{t('blackjack.score')}</span>
                  <span className={`text-base font-orbitron font-black ${
                    bustA ? 'text-cyber-pink line-through' : scoreA === 21 ? 'text-cyber-amber animate-pulse' : 'text-white'
                  }`}>
                    {scoreA}
                  </span>
                </div>
              </div>

              {/* Cards Row A */}
              <div className="flex items-center space-x-2 overflow-x-auto py-1 min-h-[75px]">
                {handA.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">{t('blackjack.dealingCards')}</span>
                ) : (
                  handA.map((c, i) => <CardView key={`${c.suit}-${c.value}-${i}`} card={c} index={i} />)
                )}
              </div>
            </div>
          </>
        )}

        {/* Duel Result Comparison Banner while awaiting settled modal */}
        {roomState === 'MATCH_SETTLED' && outcomePhase !== 'settled' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/85 border border-cyber-cyan text-center shadow-xl max-w-xs mx-auto w-full animate-pulse"
          >
            <div className="text-xs font-orbitron font-black text-cyber-cyan">
              🃏 MANO CONCLUSA
            </div>
            <div className="text-sm font-chakra font-bold text-white mt-0.5">
              {isWinner ? '🎉 HAI VINTO IL PIATTO!' : '💀 MANO VINTA DALL\'AVVERSARIO'}
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5">
              {playerAName} ({scoreA}) vs {playerBName} ({scoreB})
            </div>
          </motion.div>
        )}

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
                    🏆 VITTORIA!
                  </h2>
                  <p className="text-xs font-chakra text-slate-200 mt-2">
                    Hai battuto il banco avversario a 21!
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
                    L'avversario ha avuto la mano migliore.
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

        {/* Phase 2: Match Settled Modal (After 3 Seconds) */}
        {outcomePhase === 'settled' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex flex-col items-center p-5 bg-[#121520] border rounded-3xl shadow-2xl max-w-xs w-full text-center mx-auto ${
                isWinner ? 'border-cyber-cyan' : 'border-cyber-border'
              }`}
            >
              {isWinner ? (
                <Trophy className="w-12 h-12 text-cyber-amber mb-2 animate-bounce" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center mb-2 text-2xl">
                  💀
                </div>
              )}
              <h2 className="text-lg font-orbitron font-black text-white">
                {isWinner ? '🏆 VITTORIA!' : role === 'player' ? '💀 DUELLO CONCLUSO' : '⚔️ DUELLO CONCLUSO'}
              </h2>

              {/* Winner Prize row shown ONLY to the winner! */}
              {isWinner && (
                <div className="my-2 p-2.5 rounded-xl bg-black/60 border border-cyber-border w-full flex justify-between items-center text-xs font-chakra">
                  <span className="text-slate-400">{t('arena.winnerPrize')}:</span>
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
                  <span className="text-xs font-orbitron font-bold text-white">🔥 {t('arena.rematch2x')}</span>
                  <span className="text-[11px] text-slate-200 font-chakra">
                    {t('arena.rematchChallengeReceived', { name: rematchOffer.proposerName, amount: rematchOffer.newWagerTon })}
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
                          <span>{t('arena.depositForRematch', { amount: missingForRematch })}</span>
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
                    ✅ {t('arena.prizeAutoCredited', { amount: winnerPayoutTon })}
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

      {/* Bottom Controls: Lobby Ready or Blackjack Actions */}
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
                  <span className="text-xs font-chakra font-bold text-cyber-cyan">
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
              {t('blackjack.bettingWindow')} ({countdownSeconds ?? 30}s)
            </span>
          </div>
        ) : roomState === 'GAME_ACTIVE' ? (
          role === 'player' ? (
            isPlayerTurn ? (
              <div className="w-full flex flex-col space-y-2">
                <span className="text-[11px] font-orbitron font-bold text-cyber-cyan uppercase tracking-wider text-center animate-pulse">
                  {t('blackjack.yourTurn')}
                </span>
                <div className="flex space-x-2.5 w-full">
                  <button
                    onClick={onHit}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-cyan text-cyber-bg shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>{t('blackjack.hitBtn')}</span>
                    <span className="text-[9px] text-cyber-bg/80 font-chakra font-normal mt-0.5">
                      {t('blackjack.bustRisk')} {activeBustOdds}%
                    </span>
                  </button>

                  <button
                    onClick={onStand}
                    className="flex-1 py-3 px-2 rounded-2xl font-orbitron font-extrabold text-xs uppercase tracking-wider bg-cyber-bg border-2 border-cyber-pink text-cyber-pink shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:bg-cyber-pink/15 active:scale-95 transition-all flex flex-col items-center"
                  >
                    <span>{t('blackjack.standBtn')}</span>
                    <span className="text-[9px] text-cyber-pink font-chakra font-normal mt-0.5">
                      {t('blackjack.lockScore')} {currentTurn === 'A' ? scoreA : scoreB}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-black/50 border border-cyber-border text-center flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyber-cyan" />
                <span className="text-xs font-chakra font-bold text-slate-300">
                  {activeTurnName} {t('blackjack.waitingDecide')}
                </span>
              </div>
            )
          ) : (
            <div className="w-full py-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-center">
              <span className="text-xs font-chakra font-bold text-cyber-cyan">
                {t('blackjack.spectatorView')}
              </span>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};
