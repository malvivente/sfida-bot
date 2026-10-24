import React, { useState } from 'react';
import { Coins, TrendingUp, Swords, Lock, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Bell } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { useLanguage } from '../i18n/index.js';
import { GameType } from '../types/index.js';

interface SpectatorOddsBarProps {
  oddsA: number;
  oddsB: number;
  oddsX?: number;
  totalBetsA: string;
  totalBetsB: string;
  totalBetsX?: string;
  gameType?: GameType;
  onBet: (side: 'A' | 'B' | 'X', amountTon: string) => void;
  disabled?: boolean;
  isPlayer?: boolean;
  playerAName?: string;
  playerBName?: string;
  roomState?: string;
  countdownSeconds?: number | null;
  placedBet?: {
    target: 'A' | 'B' | 'X';
    amountGram: string;
    feePaidGram: string;
    targetName?: string;
    odds?: number;
  } | null;
  betStatus?: 'idle' | 'placing' | 'confirmed' | 'error';
  betError?: string | null;
  onClearPlacedBet?: () => void;
  spectatorOutcome?: {
    won: boolean;
    payoutGram: string;
    refunded?: boolean;
  } | null;
  winnerName?: string;
  winnerSide?: 'A' | 'B' | 'X';
  onExit?: () => void;
}

export const SpectatorOddsBar: React.FC<SpectatorOddsBarProps> = ({
  oddsA,
  oddsB,
  oddsX,
  totalBetsA,
  totalBetsB,
  totalBetsX,
  gameType,
  onBet,
  disabled = false,
  isPlayer = false,
  playerAName = 'PLAYER A',
  playerBName = 'PLAYER B',
  roomState,
  countdownSeconds,
  placedBet,
  betStatus = 'idle',
  betError,
  onClearPlacedBet,
  spectatorOutcome,
  winnerName,
  winnerSide,
  onExit,
}) => {
  const { t } = useLanguage();
  const { triggerImpact } = useHaptics();
  const [selectedSide, setSelectedSide] = useState<'A' | 'B' | 'X'>('A');
  const [betAmount, setBetAmount] = useState<string>('1');

  const isSplit = gameType === 'split';
  const betsANum = Number(BigInt(totalBetsA || '0')) / 1e9;
  const betsBNum = Number(BigInt(totalBetsB || '0')) / 1e9;
  const betsXNum = Number(BigInt(totalBetsX || '0')) / 1e9;
  const total = betsANum + betsBNum + (isSplit ? betsXNum : 0);

  const pctA = total > 0 ? Math.round((betsANum / total) * 100) : (isSplit ? 34 : 50);
  const pctX = isSplit ? (total > 0 ? Math.round((betsXNum / total) * 100) : 33) : 0;
  const pctB = isSplit ? Math.max(0, 100 - pctA - pctX) : (100 - pctA);

  const currentOdds = selectedSide === 'A' ? oddsA : selectedSide === 'X' ? (oddsX || 2.0) : oddsB;
  const parsedBet = parseFloat(betAmount || '0');
  const isBelowMin = parsedBet < GAME_CONFIG.MIN_WAGER;
  const isOverMax = parsedBet > GAME_CONFIG.MAX_WAGER;
  const spectatorFee = GAME_CONFIG.SPECTATOR_FEE_GRAM || 0.05;
  const totalBetRequired = parsedBet > 0 ? (parsedBet + spectatorFee).toFixed(2) : '0.00';
  const estimatedPayout = (parsedBet * currentOdds).toFixed(2);

  const handleQuickAmount = (val: string) => {
    triggerImpact('light');
    setBetAmount(val);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setBetAmount(val);
  };

  const handlePlaceBet = () => {
    if (isBelowMin || isOverMax) return;
    triggerImpact('medium');
    onBet(selectedSide, betAmount);
  };

  const isBettingWindow = roomState === 'BETTING_WINDOW';
  const isLobby = roomState === 'LOBBY';
  const isBettingClosed = !isBettingWindow && !isLobby;
  const isPoolLocked = isLobby || isBettingWindow;

  const countdownFormatted =
    countdownSeconds !== null && countdownSeconds !== undefined
      ? countdownSeconds < 10
        ? `0${countdownSeconds}`
        : `${countdownSeconds}`
      : '30';

  return (
    <div className="w-full max-w-md mx-auto bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl mt-4 font-rajdhani">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-cyber-cyan" />
          <span className="text-xs font-orbitron font-bold text-slate-200 tracking-wider">
            {isPlayer
              ? isSplit ? t('spectator.oddsSplit') : t('spectator.oddsSpectators')
              : isSplit ? t('spectator.oddsSplit') : t('spectator.title')}
          </span>
        </div>
        {!isPlayer ? (
          <div>
            {isBettingWindow ? (
              <div className="flex items-center space-x-1.5 text-xs font-chakra font-bold text-cyber-amber bg-cyber-amber/15 px-2.5 py-0.5 rounded-lg border border-cyber-amber/40 animate-pulse">
                <Clock className="w-3.5 h-3.5 text-cyber-amber animate-spin" />
                <span>00:{countdownFormatted}</span>
              </div>
            ) : isLobby ? (
              <div className="flex items-center space-x-1.5 text-xs font-chakra font-bold text-slate-400 bg-cyber-bg px-2.5 py-0.5 rounded-lg border border-cyber-border">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>{t('spectator.waitingReady')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-xs font-chakra font-bold text-cyber-green bg-cyber-bg px-2.5 py-0.5 rounded-lg border border-cyber-border">
                <span>{t('spectator.estPayout')} ~+{estimatedPayout}</span>
                <GramIcon className="w-3 h-3 text-cyber-green" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs font-chakra font-bold text-cyber-cyan bg-cyber-bg px-2.5 py-0.5 rounded-lg border border-cyber-border">
            <span>{t('spectator.livePool')}</span>
          </div>
        )}
      </div>

      {/* Dynamic Odds Cards */}
      {isSplit ? (
        /* 3-Way 1-X-2 Market Grid */
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Side 1: Player A Steals */}
          {isPlayer ? (
            <div className="p-2.5 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                  1: {playerAName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsANum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-cyan" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsA.toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-cyan uppercase font-bold mt-0.5">P1 STEAL</div>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerImpact('light');
                setSelectedSide('A');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
                selectedSide === 'A'
                  ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-cyan/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                  1: {playerAName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsANum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-cyan" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsA.toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-cyan uppercase font-bold mt-0.5">P1 STEAL</div>
            </button>
          )}

          {/* Side X: Peace (Both Split) */}
          {isPlayer ? (
            <div className="p-2.5 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-green truncate max-w-[70%]" title="Peace">
                  X: PEACE
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsXNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-green" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${(oddsX || 2.0).toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-green uppercase font-bold mt-0.5">BOTH SPLIT</div>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerImpact('light');
                setSelectedSide('X');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
                selectedSide === 'X'
                  ? 'bg-cyber-green/15 border-cyber-green shadow-[0_0_12px_rgba(0,255,136,0.25)]'
                  : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-green/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-green truncate max-w-[70%]" title="Peace">
                  X: PEACE
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsXNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-green" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${(oddsX || 2.0).toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-green uppercase font-bold mt-0.5">BOTH SPLIT</div>
            </button>
          )}

          {/* Side 2: Player B Steals */}
          {isPlayer ? (
            <div className="p-2.5 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                  2: {playerBName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsBNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-pink" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsB.toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-pink uppercase font-bold mt-0.5">P2 STEAL</div>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerImpact('light');
                setSelectedSide('B');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
                selectedSide === 'B'
                  ? 'bg-cyber-pink/15 border-cyber-pink shadow-[0_0_12px_rgba(255,0,85,0.25)]'
                  : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-pink/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                  2: {playerBName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒</span>
                  ) : (
                    <>
                      <span>{betsBNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-base font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-xs font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-cyber-pink" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsB.toFixed(2)}x`
                )}
              </div>
              <div className="text-[9px] font-chakra text-cyber-pink uppercase font-bold mt-0.5">P2 STEAL</div>
            </button>
          )}
        </div>
      ) : (
        /* Standard 2-Way Market Grid */
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Side A */}
          {isPlayer ? (
            <div className="p-3 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                  {playerAName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒 --</span>
                  ) : (
                    <>
                      <span>{betsANum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-xl font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-sm font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsA.toFixed(2)}x`
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerImpact('light');
                setSelectedSide('A');
              }}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                selectedSide === 'A'
                  ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-cyan/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-chakra font-bold text-cyber-cyan truncate max-w-[70%]" title={playerAName}>
                  {playerAName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒 --</span>
                  ) : (
                    <>
                      <span>{betsANum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-xl font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-sm font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsA.toFixed(2)}x`
                )}
              </div>
            </button>
          )}

          {/* Side B */}
          {isPlayer ? (
            <div className="p-3 rounded-xl border text-left bg-cyber-bg/60 border-cyber-border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                  {playerBName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒 --</span>
                  ) : (
                    <>
                      <span>{betsBNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-xl font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-sm font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-cyber-pink" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsB.toFixed(2)}x`
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerImpact('light');
                setSelectedSide('B');
              }}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                selectedSide === 'B'
                  ? 'bg-cyber-pink/15 border-cyber-pink shadow-[0_0_12px_rgba(255,0,85,0.25)]'
                  : 'bg-cyber-bg/60 border-cyber-border hover:border-cyber-pink/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-chakra font-bold text-cyber-pink truncate max-w-[70%]" title={playerBName}>
                  {playerBName}
                </span>
                <span className="text-[10px] text-slate-400 font-chakra flex items-center space-x-0.5">
                  {isPoolLocked ? (
                    <span className="text-slate-500 font-mono">🔒 --</span>
                  ) : (
                    <>
                      <span>{betsBNum.toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </>
                  )}
                </span>
              </div>
              <div className="text-xl font-orbitron font-extrabold text-white mt-1">
                {isPoolLocked ? (
                  <span className="text-sm font-chakra text-slate-400 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-cyber-pink" />
                    <span>LOCKED</span>
                  </span>
                ) : (
                  `${oddsB.toFixed(2)}x`
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Pool Distribution Bar */}
      {isLobby ? (
        <div className="w-full py-2 bg-cyber-bg/90 rounded-xl flex items-center justify-center mb-3 border border-cyber-border/70 relative px-2.5 text-center">
          <span className="text-[10px] font-chakra font-bold text-slate-400 flex items-center space-x-1.5">
            <Lock className="w-3 h-3 text-cyber-cyan shrink-0" />
            <span>{t('spectator.waitingReadyNotice')}</span>
          </span>
        </div>
      ) : isBettingWindow ? (
        <div className="w-full py-2 bg-cyber-amber/10 rounded-xl flex items-center justify-center mb-3 border border-cyber-amber/50 relative px-2.5 text-center animate-pulse">
          <span className="text-[11px] font-chakra font-extrabold text-cyber-amber flex items-center space-x-1.5 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{t('spectator.bettingWindowActive')}: 00:{countdownFormatted}</span>
          </span>
        </div>
      ) : isSplit ? (
        <div className="mb-3 space-y-1">
          <div className="w-full h-2.5 bg-cyber-bg rounded-full overflow-hidden flex border border-cyber-border">
            <div
              style={{ width: `${pctA}%` }}
              className="bg-cyber-cyan h-full transition-all duration-500"
            />
            <div
              style={{ width: `${pctX}%` }}
              className="bg-cyber-green h-full transition-all duration-500"
            />
            <div
              style={{ width: `${pctB}%` }}
              className="bg-cyber-pink h-full transition-all duration-500"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-chakra text-slate-400 px-0.5">
            <span className="text-cyber-cyan font-bold">{pctA}% (1: {playerAName})</span>
            <span className="text-cyber-green font-bold">{pctX}% (X: Peace)</span>
            <span className="text-cyber-pink font-bold">{pctB}% (2: {playerBName})</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 space-y-1">
          <div className="w-full h-2.5 bg-cyber-bg rounded-full overflow-hidden flex border border-cyber-border">
            <div
              style={{ width: `${pctA}%` }}
              className="bg-cyber-cyan h-full transition-all duration-500"
            />
            <div
              style={{ width: `${pctB}%` }}
              className="bg-cyber-pink h-full transition-all duration-500"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-chakra text-slate-400 px-0.5">
            <span className="text-cyber-cyan font-bold">{pctA}% ({playerAName})</span>
            <span className="text-cyber-pink font-bold">{pctB}% ({playerBName})</span>
          </div>
        </div>
      )}

      {/* Notice for Duelists or Bet Controls for Spectators */}
      {isPlayer ? null : (
        <>
          {/* Spectator Refund Banner (e.g. single-sided pool auto-refund) */}
          {spectatorOutcome?.refunded && !placedBet && (
            <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-500 text-center flex flex-col items-center justify-center space-y-1 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-in fade-in">
              <div className="flex items-center space-x-1.5 text-amber-400 font-chakra font-black text-xs uppercase tracking-wider">
                <span>↩️</span>
                <span>{t('spectator.outcomeRefundTitle') || 'SCOMMESSA RIMBORSATA'}</span>
              </div>
              <div className="text-base font-orbitron font-black text-white flex items-center space-x-1">
                <span className="text-amber-400">+{spectatorOutcome.payoutGram}</span>
                <GramIcon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[10px] text-slate-300 font-chakra">
                {t('spectator.refundNotice') || 'Puntata restituita al tuo saldo in-app'}
              </span>
            </div>
          )}

          {/* Confirmed Placed Bet Card */}
          {placedBet && (
            <div className="mb-3.5 p-3.5 rounded-xl bg-cyber-green/10 border border-cyber-green/50 shadow-[0_0_15px_rgba(0,255,136,0.18)] flex flex-col space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-cyber-green font-chakra font-black text-xs tracking-wider">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-cyber-green" />
                  <span>{t('spectator.betConfirmedTitle')}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyber-green/20 text-cyber-green border border-cyber-green/40">
                  Pool Pari-Mutuel
                </span>
              </div>

              <div className="bg-cyber-bg/80 rounded-xl p-2.5 border border-cyber-border/70 grid grid-cols-3 gap-2 text-center">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-chakra uppercase">{t('spectator.targetChoice')}</span>
                  <span className="text-xs font-chakra font-extrabold text-white truncate block">
                    {placedBet.target === 'A'
                      ? (isSplit ? `1: ${playerAName}` : playerAName)
                      : placedBet.target === 'X'
                      ? 'X: PEACE'
                      : (isSplit ? `2: ${playerBName}` : playerBName)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-chakra uppercase">{t('spectator.stakeAmount')}</span>
                  <span className="text-xs font-chakra font-black text-cyber-cyan flex items-center justify-center space-x-0.5">
                    <span>{placedBet.amountGram}</span>
                    <GramIcon className="w-3 h-3 text-cyber-cyan" />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-chakra uppercase">{t('spectator.estPayoutLabel')}</span>
                  <span className="text-xs font-chakra font-black text-cyber-green flex items-center justify-end space-x-0.5">
                    <span>~{(parseFloat(placedBet.amountGram) * (placedBet.odds || (placedBet.target === 'A' ? oddsA : placedBet.target === 'X' ? (oddsX || 2.0) : oddsB))).toFixed(2)}</span>
                    <GramIcon className="w-3 h-3 text-cyber-green" />
                  </span>
                </div>
              </div>

              {roomState === 'MATCH_SETTLED' ? (
                spectatorOutcome?.won || (winnerSide && placedBet.target === winnerSide) ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyber-green/20 to-emerald-600/30 border border-cyber-green text-center flex flex-col items-center justify-center space-y-1 shadow-[0_0_20px_rgba(0,255,136,0.25)] animate-pulse">
                    <div className="flex items-center space-x-1.5 text-cyber-green font-chakra font-black text-xs uppercase tracking-wider">
                      <span>🎉</span>
                      <span>{t('spectator.outcomeWonTitle') || 'SCOMMESSA VINTA!'}</span>
                    </div>
                    <div className="text-base font-orbitron font-black text-white flex items-center space-x-1">
                      <span className="text-cyber-green">
                        +{spectatorOutcome?.payoutGram || (parseFloat(placedBet.amountGram) * (placedBet.odds || (placedBet.target === 'A' ? oddsA : placedBet.target === 'X' ? (oddsX || 2.0) : oddsB))).toFixed(2)}
                      </span>
                      <GramIcon className="w-4 h-4 text-cyber-green" />
                    </div>
                    <span className="text-[10px] text-slate-300 font-chakra">
                      {t('spectator.payoutAutoCredited') || 'Accreditati automaticamente al tuo saldo in-app'}
                    </span>
                  </div>
                ) : spectatorOutcome?.refunded ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-500 text-center flex flex-col items-center justify-center space-y-1 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <div className="flex items-center space-x-1.5 text-amber-400 font-chakra font-black text-xs uppercase tracking-wider">
                      <span>↩️</span>
                      <span>{t('spectator.outcomeRefundTitle') || 'SCOMMESSA RIMBORSATA'}</span>
                    </div>
                    <div className="text-base font-orbitron font-black text-white flex items-center space-x-1">
                      <span className="text-amber-400">+{spectatorOutcome.payoutGram}</span>
                      <GramIcon className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-[10px] text-slate-300 font-chakra">
                      {t('spectator.refundNotice') || 'Puntata restituita al tuo saldo in-app'}
                    </span>
                  </div>
                ) : (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-950/40 to-rose-900/40 border border-rose-500 text-center flex flex-col items-center justify-center space-y-1 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                    <div className="flex items-center space-x-1.5 text-rose-400 font-chakra font-black text-xs uppercase tracking-wider">
                      <span>💀</span>
                      <span>{t('spectator.outcomeLostTitle') || 'SCOMMESSA NON VINCENTE'}</span>
                    </div>
                    <div className="text-sm font-chakra font-bold text-slate-300 flex items-center space-x-1">
                      <span className="text-rose-400">-{placedBet.amountGram}</span>
                      <GramIcon className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-chakra">
                      {t('spectator.lossNotice') || 'Pronostico non andato a segno'}
                    </span>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="w-full py-2 px-3 rounded-lg bg-black/60 border border-cyber-green/40 text-center flex items-center justify-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-cyber-green" />
                    <span className="text-[11px] font-chakra font-bold text-cyber-green uppercase tracking-wider">
                      {t('spectator.betLockedNotice')}
                    </span>
                  </div>

                  {/* Inform user they can leave freely & receive private TG notification */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40 border border-cyan-500/30 text-left flex items-start space-x-2">
                    <Bell className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                    <span className="text-[11px] text-cyan-200/90 leading-tight font-chakra">
                      {t('spectator.exitLobbyHint')}
                    </span>
                  </div>

                  {onExit && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        onExit();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-chakra font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('spectator.btnExitAndNotify')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bet Error Alert */}
          {betError && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-chakra flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1 font-semibold">{betError}</span>
            </div>
          )}

          {/* Quick Stake Buttons Grid & Place Bet - Only when bet is not placed yet */}
          {!placedBet && (
            <>
              <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra">
              <span>{t('spectator.selectAmount')}</span>
              <span className="flex items-center space-x-1">
                <span>{t('spectator.maxLimit', { amount: GAME_CONFIG.MAX_WAGER })}</span>
                <GramIcon className="w-3 h-3 text-slate-400" />
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {GAME_CONFIG.PRESET_SPECTATOR_BETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickAmount(amt)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-chakra font-bold border transition-all flex items-center justify-center space-x-0.5 ${
                    betAmount === amt
                      ? 'bg-cyber-cyan/25 border-cyber-cyan text-cyber-cyan shadow-sm'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:text-white hover:border-cyber-border/80'
                  }`}
                >
                  <span>+{amt}</span>
                  <GramIcon className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>

            {/* Custom Input Field */}
            <div className="flex items-center space-x-2 bg-cyber-bg/70 border border-cyber-border rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400 font-chakra">{t('spectator.customAmount')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={betAmount}
                onChange={handleCustomInput}
                placeholder={`${GAME_CONFIG.MIN_WAGER} - ${GAME_CONFIG.MAX_WAGER}`}
                className="flex-1 bg-transparent text-sm font-chakra font-bold text-white text-right focus:outline-none"
              />
              <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
            </div>
            {isBelowMin && parsedBet > 0 && (
              <p className="text-[11px] text-cyber-amber font-chakra">
                {t('spectator.minBetError', { amount: GAME_CONFIG.MIN_WAGER })}
              </p>
            )}
            {isOverMax && (
              <p className="text-[11px] text-cyber-pink font-chakra">
                {t('spectator.maxBetWarning', { amount: GAME_CONFIG.MAX_WAGER })}
              </p>
            )}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-chakra px-1 pt-1">
              <span>{t('spectator.betFee')} <strong className="text-cyber-amber">+{spectatorFee.toFixed(2)} GRAM</strong></span>
              <span>{t('spectator.totalNeeded')} <strong className="text-cyber-cyan">{totalBetRequired} GRAM</strong></span>
            </div>
          </div>

          {/* Place Bet Action Button */}
          {isLobby ? (
            <button
              disabled={true}
              className="w-full py-3.5 px-4 rounded-xl font-orbitron font-bold uppercase tracking-wider text-xs bg-cyber-border/30 border border-cyber-border/60 text-slate-400 cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>{t('spectator.btnWaitingReady')}</span>
            </button>
          ) : isBettingClosed ? (
            <button
              disabled={true}
              className="w-full py-3.5 px-4 rounded-2xl font-heading font-black uppercase tracking-wider text-xs bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>{t('spectator.btnBettingClosed')}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] font-sans text-slate-400">
                <span>Totale: <strong className="text-white font-medium">{totalBetRequired} GRAM</strong> <span className="text-[10px] text-slate-500">(fee {spectatorFee.toFixed(2)})</span></span>
                <span className="font-heading font-black text-amber-400 flex items-center space-x-1">
                  <span>⏱️ 00:{countdownFormatted}</span>
                </span>
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={disabled || !betAmount || isBelowMin || isOverMax || betStatus === 'placing'}
                className={`w-full py-3 px-4 rounded-2xl font-heading font-black uppercase tracking-wider text-xs transition-all shadow-xl active:scale-[0.98] flex items-center justify-center space-x-2 border ${
                  disabled || !betAmount || isBelowMin || isOverMax || betStatus === 'placing'
                    ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                    : selectedSide === 'A'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/30 shadow-cyan-500/25 hover:brightness-110'
                    : selectedSide === 'X'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/30 shadow-emerald-500/25 hover:brightness-110'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400/30 shadow-pink-500/25 hover:brightness-110'
                }`}
              >
                {betStatus === 'placing' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{t('spectator.placingBet')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-1.5 truncate">
                    <Coins className="w-4 h-4 shrink-0 text-white" />
                    <span>
                      PUNTA {betAmount || '0'} GRAM SU{' '}
                      {selectedSide === 'A'
                        ? isSplit
                          ? `${playerAName} (Steal)`
                          : playerAName
                        : selectedSide === 'X'
                        ? 'PEACE'
                        : isSplit
                        ? `${playerBName} (Steal)`
                        : playerBName}
                    </span>
                  </div>
                )}
              </button>

              <div className="text-[10px] font-sans text-center text-slate-500">
                {t('spectator.pariMutuelNotice')}
              </div>
            </div>
          )}
            </>
          )}
        </>
      )}
    </div>
  );
};
