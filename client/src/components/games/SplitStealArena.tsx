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
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { SplitStealState, SplitStealChoice } from '../../types/index.js';
import { GramIcon } from '../GramIcon.js';
import { useHaptics } from '../../hooks/useHaptics.js';

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
  roomState,
  wagerTon,
  isCreator,
  onCancelMatch,
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
  const { triggerImpact, triggerSelection } = useHaptics();
  const [localChoice, setLocalChoice] = useState<SplitStealChoice | null>(null);

  const phase = gameData?.phase ?? 'COUNTDOWN';
  const secondsLeft = gameData?.secondsLeft ?? 5;
  const choicesRevealed = gameData?.choicesRevealed ?? false;
  const choiceA = gameData?.choiceA;
  const choiceB = gameData?.choiceB;
  const hasChosenA = gameData?.hasChosenA ?? false;
  const hasChosenB = gameData?.hasChosenB ?? false;
  const outcome = gameData?.outcome;
  const jackpotGram = gameData?.jackpotGram ?? 5.0;
  const jackpotStatus = gameData?.jackpotStatus ?? (jackpotGram >= 5.0 ? 'ACTIVE' : 'CHARGING');
  const bonusAwardedGram = gameData?.bonusAwardedGram;
  const bonusPerPlayerGram = gameData?.bonusPerPlayerGram;

  const isLobby = roomState === 'LOBBY';
  const isBetting = roomState === 'BETTING_WINDOW';
  const isSettled = roomState === 'MATCH_SETTLED';
  const isCombatActive = roomState === 'GAME_ACTIVE';

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
      <div className="w-full z-10 bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/15 border border-amber-400/40 rounded-2xl p-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-orbitron font-extrabold tracking-wider text-amber-300 uppercase">
                JACKPOT DELLA FIDUCIA
              </span>
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </div>
            <div className="text-xs font-chakra font-bold text-white flex items-center space-x-1">
              <span>{jackpotGram.toFixed(2)} GRAM</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`text-[9px] font-orbitron font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block ${
              isJackpotActive
                ? 'bg-cyber-green/20 border-cyber-green text-cyber-green shadow-[0_0_8px_rgba(0,255,102,0.3)] animate-pulse'
                : 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber'
            }`}
          >
            {isJackpotActive ? 'ATTIVO (20% BONUS)' : 'IN CARICA (< 5 GRAM)'}
          </span>
          <p className="text-[8px] font-chakra text-slate-400 mt-0.5">
            {isJackpotActive ? 'Bonus sbloccato se entrambi Split' : 'Solo rimborso se entrambi Split'}
          </p>
        </div>
      </div>

      {/* Duelists Header Status */}
      <div className="w-full z-10 flex items-center justify-between border-b border-cyber-border/60 py-2 gap-1.5 mt-2">
        {/* Player A */}
        <div className="flex-1 flex items-center space-x-2 bg-cyber-bg/40 p-2 rounded-xl border border-cyber-cyan/30">
          <div className="w-7 h-7 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center text-xs font-orbitron font-bold text-cyber-cyan">
            P1
          </div>
          <div className="truncate">
            <div className="text-xs font-chakra font-bold text-white truncate">{playerAName}</div>
            <div className="text-[9px] font-mono text-slate-400 flex items-center space-x-1">
              {isLobby ? (
                playerAReady ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>READY</span>
                  </span>
                ) : (
                  <span className="text-slate-500">NOT READY</span>
                )
              ) : isCombatActive && !choicesRevealed ? (
                hasChosenA ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <Lock className="w-2.5 h-2.5 text-cyber-green" />
                    <span>SCELTA BLOCCATA</span>
                  </span>
                ) : (
                  <span className="text-cyber-amber animate-pulse font-bold">STA PENSANDO...</span>
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
        <div className="px-2 text-center shrink-0">
          <div className="text-[10px] font-orbitron font-bold text-purple-400">VS</div>
          <div className="flex items-center space-x-0.5 text-[11px] font-chakra font-bold text-white mt-0.5">
            <span>{wagerTon}</span>
            <GramIcon className="w-3 h-3 text-cyber-cyan" />
          </div>
        </div>

        {/* Player B */}
        <div className="flex-1 flex items-center space-x-2 justify-end bg-cyber-bg/40 p-2 rounded-xl border border-cyber-pink/30 text-right">
          <div className="truncate">
            <div className="text-xs font-chakra font-bold text-white truncate">{playerBName}</div>
            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-end space-x-1">
              {isLobby ? (
                playerBReady ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>READY</span>
                  </span>
                ) : (
                  <span className="text-slate-500">NOT READY</span>
                )
              ) : isCombatActive && !choicesRevealed ? (
                hasChosenB ? (
                  <span className="text-cyber-green font-bold flex items-center space-x-0.5">
                    <Lock className="w-2.5 h-2.5 text-cyber-green" />
                    <span>SCELTA BLOCCATA</span>
                  </span>
                ) : (
                  <span className="text-cyber-amber animate-pulse font-bold">STA PENSANDO...</span>
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
          <div className="w-7 h-7 rounded-lg bg-cyber-pink/20 border border-cyber-pink flex items-center justify-center text-xs font-orbitron font-bold text-cyber-pink">
            P2
          </div>
        </div>
      </div>

      {/* Main Center Gameplay Stage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-3 relative z-10">
        {/* State: LOBBY */}
        {isLobby && (
          <div className="text-center space-y-3 py-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Handshake className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-orbitron font-bold text-white">LOBBY SPLIT OR STEAL</h3>
              <p className="text-xs font-chakra text-slate-300 max-w-xs mx-auto mt-1">
                {!hasPlayerB
                  ? 'In attesa che un secondo duellante si unisca alla stanza...'
                  : 'Entrambi i duellanti devono confermare READY per avviare la finestra scommesse (30s) e il duello.'}
              </p>
            </div>

            {/* Join as Player 2 button */}
            {!hasPlayerB && role === 'spectator' && onJoinAsPlayer && (
              <button
                onClick={() => {
                  triggerImpact('medium');
                  onJoinAsPlayer();
                }}
                className="px-6 py-3 bg-cyber-cyan text-cyber-bg font-orbitron font-bold text-xs uppercase tracking-wider rounded-xl shadow-neon-cyan active:scale-95 transition-all"
              >
                UNISCITI COME GIOCATORE ({wagerTon} GRAM)
              </button>
            )}

            {/* Ready Toggle for duelists */}
            {role === 'player' && hasPlayerB && onReady && (
              <button
                onClick={() => {
                  triggerImpact('medium');
                  onReady();
                }}
                disabled={isReady}
                className={`px-8 py-3.5 font-orbitron font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-xl ${
                  isReady
                    ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/50 cursor-default'
                    : 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan hover:brightness-110 active:scale-95'
                }`}
              >
                {isReady ? '✓ SEI PRONTO' : 'SONO PRONTO (READY)'}
              </button>
            )}

            {/* Creator Cancel button */}
            {isCreator && onCancelMatch && (
              <div className="pt-2">
                <button
                  onClick={onCancelMatch}
                  className="text-xs font-chakra text-slate-400 hover:text-cyber-pink transition-colors underline"
                >
                  Annulla stanza e rimborsa puntata
                </button>
              </div>
            )}
          </div>
        )}

        {/* State: BETTING WINDOW */}
        {isBetting && (
          <div className="text-center space-y-3 py-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-orbitron font-bold text-amber-300 uppercase tracking-wider">
                FINESTRA SCOMMESSE APERTA
              </h3>
              <p className="text-xs font-chakra text-slate-300 max-w-xs mx-auto mt-1">
                Gli spettatori stanno piazzando le scommesse 1-X-2. Il duello inizierà al termine del countdown!
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
                SECONDI RIMASTI
              </span>
            </div>

            {/* Duelist Interaction Area */}
            {role === 'player' ? (
              hasMyChoiceLocked ? (
                <div className="bg-purple-950/40 border border-purple-500/50 rounded-2xl p-4 text-center max-w-sm w-full space-y-2">
                  <Lock className="w-6 h-6 text-purple-400 mx-auto animate-bounce" />
                  <h4 className="text-sm font-orbitron font-bold text-white uppercase tracking-wider">
                    DECISIONE REGISTRATA
                  </h4>
                  <p className="text-xs font-chakra text-slate-300">
                    Hai scelto in segreto: <strong className="text-purple-300">{localChoice || myChoice || 'IN ATTESA'}</strong>.
                  </p>
                  <p className="text-[10px] font-chakra text-slate-400">
                    Le scelte saranno svelate simultaneamente allo scadere del tempo!
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-center text-xs font-chakra text-slate-300 mb-2">
                    Tocca per fare la tua scelta in segreto:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* SPLIT BUTTON */}
                    <button
                      type="button"
                      onClick={() => handlePickChoice('SPLIT')}
                      className="p-4 rounded-2xl bg-gradient-to-b from-cyber-cyan/20 to-cyber-cyan/5 border-2 border-cyber-cyan text-left shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:brightness-110 active:scale-95 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-cyber-cyan/20 flex items-center justify-center">
                          <Handshake className="w-5 h-5 text-cyber-cyan" />
                        </div>
                        <span className="text-[9px] font-orbitron font-extrabold text-cyber-cyan bg-cyber-cyan/15 px-2 py-0.5 rounded-full border border-cyber-cyan/40">
                          COOPERA
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">SPLIT</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        Se entrambi fate Split, vi rimborsate la puntata + 20% Jackpot della Fiducia!
                      </p>
                    </button>

                    {/* STEAL BUTTON */}
                    <button
                      type="button"
                      onClick={() => handlePickChoice('STEAL')}
                      className="p-4 rounded-2xl bg-gradient-to-b from-cyber-pink/20 to-cyber-pink/5 border-2 border-cyber-pink text-left shadow-[0_0_20px_rgba(255,0,85,0.25)] hover:brightness-110 active:scale-95 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-cyber-pink/20 flex items-center justify-center">
                          <Swords className="w-5 h-5 text-cyber-pink" />
                        </div>
                        <span className="text-[9px] font-orbitron font-extrabold text-cyber-pink bg-cyber-pink/15 px-2 py-0.5 rounded-full border border-cyber-pink/40">
                          TRADISCI
                        </span>
                      </div>
                      <div className="text-base font-orbitron font-black text-white">STEAL</div>
                      <p className="text-[10px] font-rajdhani text-slate-300 mt-1 leading-tight">
                        Se l'altro fa Split, incassi il 100% del piatto! Ma se ruba anche lui, perdi tutto!
                      </p>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-cyber-bg/60 border border-cyber-border rounded-2xl p-4 text-center max-w-sm w-full space-y-2">
                <Flame className="w-6 h-6 text-purple-400 mx-auto animate-pulse" />
                <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  SCELTA SEGRETA DEI DUELLANTI
                </h4>
                <p className="text-xs font-chakra text-slate-300">
                  I giocatori stanno scegliendo tra cooperare o tradire. I risultati verranno mostrati a breve!
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
                  🤝 PACE ASSOLUTA (SPLIT / SPLIT)
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  Entrambi i duellanti hanno scelto la cooperazione!
                </p>
                <div className="text-xs font-chakra font-bold text-cyber-green pt-1">
                  Puntata rimborsata ({wagerTon} GRAM)
                  {bonusPerPlayerGram && bonusPerPlayerGram > 0 && (
                    <span className="block text-amber-300 text-sm font-orbitron mt-0.5">
                      + {bonusPerPlayerGram.toFixed(2)} GRAM BONUS JACKPOT DELLA FIDUCIA!
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
                  🗡️ TRADIMENTO VINCENTE!
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  {outcome === 'P1_STEAL' ? playerAName : playerBName} ha scelto <strong>STEAL</strong> mentre l'avversario ha scelto <strong>SPLIT</strong>!
                </p>
                <div className="text-xs font-chakra font-bold text-cyber-pink pt-1">
                  {outcome === 'P1_STEAL' ? playerAName : playerBName} incassa l'intero piatto!
                </div>
              </div>
            )}

            {outcome === 'DOUBLE_STEAL' && (
              <div className="w-full bg-gradient-to-r from-red-500/20 via-amber-900/20 to-red-500/20 border-2 border-red-500 rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(239,68,68,0.25)] space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto">
                  <Skull className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-base font-orbitron font-black text-white tracking-wider">
                  💀 DOPPIO TRADIMENTO (STEAL / STEAL)
                </h3>
                <p className="text-xs font-chakra text-slate-200">
                  Entrambi i duellanti hanno provato a rubare! Nessun vincitore.
                </p>
                <div className="text-xs font-chakra text-amber-300 pt-1">
                  100% del piatto perso: 50% alla Piattaforma e 50% alimenta il Jackpot della Fiducia!
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
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{playerAName}</span>
                <span className="text-lg font-orbitron font-black block mt-0.5">{choiceA}</span>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center ${
                  choiceB === 'SPLIT'
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-white'
                    : 'bg-cyber-pink/15 border-cyber-pink text-white'
                }`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase block">{playerBName}</span>
                <span className="text-lg font-orbitron font-black block mt-0.5">{choiceB}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions: Rematch / Return to Lobby */}
      {isSettled && (
        <div className="w-full z-10 pt-2 border-t border-cyber-border/60 space-y-2">
          {/* Rematch Offer Received */}
          {rematchOffer && !isRematchProposer && (
            <div className="bg-purple-950/40 border border-purple-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs font-chakra">
              <span className="text-white">
                <strong>{rematchOffer.proposerName}</strong> ha proposto una rivincita ({rematchOffer.newWagerTon} GRAM)!
              </span>
              <div className="flex space-x-1.5">
                <button
                  onClick={onAcceptRematch}
                  className="px-3 py-1 bg-cyber-green text-cyber-bg font-orbitron font-bold text-[10px] rounded-lg"
                >
                  ACCETTA
                </button>
                <button
                  onClick={onDeclineRematch}
                  className="px-2 py-1 bg-black/40 text-slate-400 font-chakra text-[10px] rounded-lg"
                >
                  RIFIUTA
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            {role === 'player' && opponentConnected && onRequestRematch && !rematchOffer && (
              <button
                onClick={() => {
                  triggerImpact('medium');
                  onRequestRematch();
                }}
                disabled={isRematchProposer}
                className="flex-1 py-2.5 bg-purple-600/30 border border-purple-500/60 hover:bg-purple-600/50 text-white font-orbitron font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRematchProposer ? 'RIVINCITA RICHIESTA...' : 'CHIEDI RIVINCITA'}</span>
              </button>
            )}

            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border text-slate-300 hover:text-white font-chakra font-bold text-xs uppercase rounded-xl transition-all"
              >
                TORNA ALL'ARENA
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
