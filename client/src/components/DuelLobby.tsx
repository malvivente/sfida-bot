import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame, AlertCircle, Loader2, Trash2, RefreshCw, ArrowDownLeft, Wallet } from 'lucide-react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA, GameMetadata } from '../config/gamesConfig.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from './GramIcon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { areAddressesEqual } from '../utils/ton.js';
import { useI18n } from '../i18n/index.js';

interface DuelLobbyProps {
  matches: MatchData[];
  onCreateMatch: (wagerGram: string, gameType: GameType) => Promise<boolean | void> | void;
  onJoinMatch: (match: MatchData) => void;
  onSpectateMatch: (matchId: string) => void;
  onCancelMatch?: (match: MatchData) => void;
  onRefreshMatches?: () => void;
  isRefreshing?: boolean;
  createStatus?: string | null;
  createError?: string | null;
  onClearError?: () => void;
  userAddress?: string;
  onOpenWallet?: () => void;
  userBalanceGram?: string;
  creationFeeGram?: number;
  onOpenDeposit?: (missingAmount?: string) => void;
}

export const DuelLobby: React.FC<DuelLobbyProps> = ({
  matches,
  onCreateMatch,
  onJoinMatch,
  onSpectateMatch,
  onCancelMatch,
  onRefreshMatches,
  isRefreshing = false,
  createStatus,
  createError,
  onClearError,
  userAddress,
  onOpenWallet,
  userBalanceGram = '0.00',
  creationFeeGram = 0.02,
  onOpenDeposit,
}) => {
  const { triggerImpact } = useHaptics();
  const { botUsername, userId, username, fullName, displayName } = useTelegram();
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wagerChoice, setWagerChoice] = useState<string>('1');
  const [selectedGameType, setSelectedGameType] = useState<GameType>('roulette');
  const [filterGameType, setFilterGameType] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insufficientJoinMatch, setInsufficientJoinMatch] = useState<{ match: MatchData; required: string; missing: string } | null>(null);

  const parsedWager = parseFloat(wagerChoice || '0');
  const isOverMax = parsedWager > GAME_CONFIG.MAX_WAGER;
  const netWinnerPayout = (parsedWager * 1.92).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const totalRequired = parsedWager > 0 ? (parsedWager + creationFeeGram).toFixed(2) : '0.00';
  const isInsufficient = parsedWager > 0 && currentBal < (parsedWager + creationFeeGram);
  const missingAmount = parsedWager > 0 ? ((parsedWager + creationFeeGram) - currentBal).toFixed(2) : '0.00';

  const handleOpenModal = () => {
    onClearError?.();
    if (!userAddress) {
      triggerImpact('medium');
      onOpenWallet?.();
      return;
    }
    triggerImpact('medium');
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (parsedWager <= 0 || isOverMax || isSubmitting) return;
    if (isInsufficient) {
      triggerImpact('heavy');
      setShowCreateModal(false);
      onOpenDeposit?.(missingAmount);
      return;
    }

    triggerImpact('heavy');
    setIsSubmitting(true);
    try {
      const result = await onCreateMatch(wagerChoice, selectedGameType);
      if (result !== false) {
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttemptJoin = (m: MatchData) => {
    if (!userAddress) {
      triggerImpact('medium');
      onOpenWallet?.();
      return;
    }
    const wagerGram = parseFloat(m.wagerAmountNano) / 1e9;
    if (currentBal < wagerGram) {
      triggerImpact('heavy');
      const diff = (wagerGram - currentBal).toFixed(2);
      setInsufficientJoinMatch({ match: m, required: wagerGram.toFixed(2), missing: diff });
      return;
    }
    onJoinMatch(m);
  };

  const handleShare = (matchId: string, wager: string, gType: GameType = 'roulette') => {
    triggerImpact('light');
    const meta = GAMES_METADATA[gType] || GAMES_METADATA.roulette;
    const text = `⚔️ I challenge you to a ${meta.title} duel for ${wager} GRAM! ${meta.tagline}`;
    const url = `https://t.me/${botUsername}?start=duel_${matchId}`;
    shareToTelegram(url, text);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setWagerChoice(val);
  };

  const filteredMatches = matches.filter((m: MatchData) => {
    if (filterGameType === 'ALL') return true;
    const g = m.gameType || 'roulette';
    return g === filterGameType;
  });

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Balance Bar & Create Duel Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/20 via-cyber-card to-cyber-pink/20 border border-cyber-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <h2 className="text-base font-orbitron font-bold text-white">{t('lobby.liveDuels')}</h2>
          </div>
          <div className="flex items-center space-x-1.5 mt-1 text-xs font-chakra text-slate-300">
            <Wallet className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>{t('lobby.balance')} <strong className="text-white font-bold">{currentBal.toFixed(2)} GRAM</strong></span>
            {onOpenDeposit && (
              <button
                onClick={() => onOpenDeposit()}
                className="text-[10px] text-cyber-cyan hover:underline ml-1 font-bold"
              >
                {t('lobby.deposit')}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t('lobby.create')}</span>
        </button>
      </div>

      {/* Active Matches Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider">
            {t('lobby.activeDuels')} ({filteredMatches.length})
          </h3>
          {onRefreshMatches && (
            <button
              onClick={() => {
                triggerImpact('light');
                onRefreshMatches();
              }}
              disabled={isRefreshing}
              className={`text-[11px] font-chakra transition-all flex items-center space-x-1.5 py-1 px-2.5 rounded-lg border active:scale-95 ${
                isRefreshing
                  ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan cursor-wait'
                  : 'text-slate-400 hover:text-cyber-cyan bg-cyber-bg/60 border-cyber-border/80 hover:border-cyber-cyan/50'
              }`}
              title="Refresh duels list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyber-cyan' : ''}`} />
              <span>{isRefreshing ? t('lobby.refreshing') : t('lobby.refresh')}</span>
            </button>
          )}
        </div>

        {/* Game Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', 'roulette', 'blackjack', 'bridge', 'chrono'].map((gKey) => {
            const isSelected = filterGameType === gKey;
            const label = gKey === 'ALL' ? t('lobby.allGames') : GAMES_METADATA[gKey as GameType]?.title || gKey;
            return (
              <button
                key={gKey}
                onClick={() => {
                  triggerImpact('light');
                  setFilterGameType(gKey);
                }}
                className={`px-3 py-1 rounded-xl text-[11px] font-chakra font-bold uppercase transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-cyber-cyan text-cyber-bg border-cyber-cyan shadow-neon-cyan'
                    : 'bg-black/40 text-slate-400 border-cyber-border hover:border-slate-600'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="text-center py-10 bg-cyber-card border border-cyber-border rounded-2xl p-6">
            <Swords className="w-12 h-12 text-cyber-cyan/40 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-slate-200 font-bold font-orbitron">{t('lobby.noDuelsTitle')}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {t('lobby.noDuelsDesc')}
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-4 px-5 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('lobby.createDuelBtn')}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((m) => {
              const wagerGram = (parseFloat(m.wagerAmountNano) / 1e9).toString();
              const totalPotGram = (parseFloat(m.wagerAmountNano) * 2 / 1e9).toString();
              const gameMeta = GAMES_METADATA[m.gameType || 'roulette'] || GAMES_METADATA.roulette;

              // Check if current user is Player A (creator)
              const isPlayerA = Boolean(
                (userAddress && areAddressesEqual(m.playerA.wallet, userAddress)) ||
                (userId && (m.playerA as any).telegramUserId === userId) ||
                (fullName && m.playerA.name === fullName) ||
                (username && (m.playerA.name === `@${username}` || m.playerA.name?.toLowerCase().includes(username.toLowerCase()))) ||
                m.playerA.name === 'Tu' ||
                m.playerA.wallet === 'EQ_you' ||
                m.playerA.wallet === 'EQ_pending_wallet'
              );

              // Check if current user is Player B (joined duelist)
              const isPlayerB = Boolean(
                m.playerB && (
                  (userAddress && areAddressesEqual(m.playerB.wallet, userAddress)) ||
                  (userId && (m.playerB as any).telegramUserId === userId) ||
                  (fullName && m.playerB.name === fullName) ||
                  (username && (m.playerB.name === `@${username}` || m.playerB.name?.toLowerCase().includes(username.toLowerCase()))) ||
                  (displayName && m.playerB.name?.toLowerCase().includes(displayName.toLowerCase()))
                )
              );

              const isAlreadyPlayer = isPlayerA || isPlayerB;
              const isCreator = isPlayerA;

              return (
                <div
                  key={m.matchId}
                  className="bg-cyber-card border border-cyber-border hover:border-cyber-cyan/50 rounded-2xl p-4 transition-all shadow-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-orbitron font-bold text-white">
                          MATCH #{m.matchId}
                        </span>
                        <span
                          className={`text-[10px] font-chakra px-2 py-0.5 rounded-full border ${
                            m.state === 'LOBBY'
                              ? 'bg-cyber-amber/15 text-cyber-amber border-cyber-amber/30'
                              : 'bg-cyber-green/15 text-cyber-green border-cyber-green/30'
                          }`}
                        >
                          {m.state}
                        </span>
                        <span
                          className={`text-[10px] font-chakra font-bold px-2 py-0.5 rounded-full border ${gameMeta.borderColor.split(' ')[0]} ${gameMeta.accentColor} bg-black/60`}
                        >
                          {gameMeta.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-chakra mt-0.5">
                        Created by <span className="text-slate-200 font-semibold">{m.playerA.name}</span>
                        {isCreator && <span className="text-[10px] text-cyber-cyan ml-1.5 font-bold font-chakra">(YOUR DUEL)</span>}
                        {m.playerB && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            vs <span className="text-cyber-pink font-semibold">{m.playerB.name}</span>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-chakra block">{t('lobby.poolLabel')}</span>
                      <span className="text-sm font-chakra font-extrabold text-cyber-cyan flex items-center justify-end space-x-1">
                        <span>{totalPotGram}</span>
                        <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 mb-3 text-xs font-chakra">
                    <span className="text-slate-400">{t('lobby.wagerLabel')}:</span>
                    <span className="text-white font-bold flex items-center space-x-1">
                      <span>{wagerGram}</span>
                      <GramIcon className="w-3 h-3 text-white" />
                      <span className="text-slate-400 text-[10px]">each</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* If user is already a participant, provide direct RESUME DUEL button */}
                    {isAlreadyPlayer ? (
                      <button
                        onClick={() => onJoinMatch(m)}
                        className="flex-1 py-2 bg-gradient-to-r from-cyber-cyan to-blue-500 text-cyber-bg font-orbitron font-extrabold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{t('profile.resume')}</span>
                      </button>
                    ) : !m.playerB ? (
                      <button
                        onClick={() => handleAttemptJoin(m)}
                        className="flex-1 py-2 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span className="flex items-center space-x-1">
                          <span>{t('lobby.joinBtn')} ({wagerGram}</span>
                          <GramIcon className="w-3 h-3 text-cyber-bg inline-block" />
                          <span>)</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSpectateMatch(m.matchId)}
                        className="flex-1 py-2 bg-cyber-border text-slate-200 font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:border-cyber-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyber-cyan" />
                        <span>{t('lobby.spectateBtn')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShare(m.matchId, wagerGram, m.gameType)}
                      title="Share to Telegram"
                      className="p-2 bg-cyber-bg border border-cyber-border rounded-xl text-slate-300 hover:text-cyber-cyan active:scale-95 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Cancellation button shown exclusively to creator before Player B joins */}
                    {onCancelMatch && isCreator && !m.playerB && (
                      <button
                        onClick={() => {
                          triggerImpact('medium');
                          onCancelMatch(m);
                        }}
                        title="Cancel duel and refund balance"
                        className="p-2 bg-cyber-bg border border-cyber-border hover:border-cyber-pink text-slate-400 hover:text-cyber-pink active:scale-95 transition-all rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insufficient Balance to Join Modal */}
      {insufficientJoinMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-pink/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-cyber-pink" />
              <span>{t('lobby.insufficientModalTitle')}</span>
            </h3>

            <p className="text-xs text-slate-300 font-chakra">
              {t('lobby.insufficientJoinDesc', {
                required: insufficientJoinMatch.required,
                current: currentBal.toFixed(2),
              })}
            </p>

            <div className="p-3 bg-cyber-bg/70 border border-cyber-border rounded-xl flex items-center justify-between text-xs font-chakra">
              <span className="text-slate-400">{t('lobby.missingDeposit')}</span>
              <span className="font-bold text-cyber-pink flex items-center space-x-1">
                <span>{insufficientJoinMatch.missing}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-pink" />
              </span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setInsufficientJoinMatch(null)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-orbitron font-semibold text-slate-400 hover:text-white"
              >
                {t('lobby.cancelBtn')}
              </button>
              <button
                onClick={() => {
                  const missing = insufficientJoinMatch.missing;
                  setInsufficientJoinMatch(null);
                  onOpenDeposit?.(missing);
                }}
                className="flex-1 py-2.5 bg-cyber-pink text-white font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-pink hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>{t('lobby.depositGram')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-orbitron font-bold text-white mb-1 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-cyber-cyan" />
              <span>{t('lobby.createModalTitle')}</span>
            </h3>
            <p className="text-xs text-slate-400 font-chakra mb-3">
              {t('lobby.createModalDesc')}
            </p>

            {/* Game Mode Selection */}
            <div className="mb-3 space-y-1.5">
              <label className="text-[11px] font-chakra text-slate-400 uppercase tracking-wider block">
                {t('lobby.gameMode')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.values(GAMES_METADATA) as GameMetadata[]).map((game) => {
                  const isSelected = selectedGameType === game.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setSelectedGameType(game.id);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? `bg-cyber-bg border-2 ${game.borderColor.split(' ')[0]} shadow-[0_0_12px_rgba(0,240,255,0.2)]`
                          : 'bg-black/50 border-cyber-border hover:border-slate-600 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[8px] font-mono px-1 rounded bg-black/70 font-bold ${game.accentColor}`}>
                          {game.badge}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />}
                      </div>
                      <div className={`text-[11px] font-orbitron font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {game.title}
                      </div>
                      <div className="text-[9px] font-rajdhani text-slate-400 mt-0.5 truncate">
                        {game.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message Display */}
            {createError && (
              <div className="bg-cyber-pink/15 border border-cyber-pink/50 text-cyber-pink rounded-xl p-3 text-xs font-chakra flex items-start space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">
                  <span className="font-bold block text-white mb-0.5">{t('lobby.creationError')}</span>
                  <span>{createError}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra mb-1.5">
              <span>{t('lobby.presetAmount')}</span>
              <span className="flex items-center space-x-1">
                <span>{t('lobby.maxWagerLabel', { max: GAME_CONFIG.MAX_WAGER })}</span>
                <GramIcon className="w-3 h-3 text-slate-400" />
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {GAME_CONFIG.PRESET_DUEL_WAGERS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    triggerImpact('light');
                    setWagerChoice(amt);
                  }}
                  className={`py-2 rounded-xl font-chakra text-xs font-bold border transition-all flex items-center justify-center space-x-0.5 ${
                    wagerChoice === amt
                      ? 'bg-cyber-cyan text-cyber-bg border-cyber-cyan shadow-neon-cyan'
                      : 'bg-cyber-bg border-cyber-border text-slate-300 hover:border-cyber-cyan/50'
                  }`}
                >
                  <span>{amt}</span>
                  <GramIcon className={`w-3 h-3 ${wagerChoice === amt ? 'text-cyber-bg' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center space-x-2 bg-cyber-bg/70 border border-cyber-border rounded-xl px-3 py-1.5 mb-3">
              <span className="text-xs text-slate-400 font-chakra">{t('lobby.customStake')}</span>
              <input
                type="text"
                inputMode="decimal"
                value={wagerChoice}
                onChange={handleCustomInput}
                placeholder={`1 - ${GAME_CONFIG.MAX_WAGER}`}
                className="flex-1 bg-transparent text-sm font-chakra font-bold text-white text-right focus:outline-none"
              />
              <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
            </div>

            {isOverMax && (
              <p className="text-[11px] text-cyber-pink font-chakra mb-3">
                {t('lobby.maxWagerWarn', { max: GAME_CONFIG.MAX_WAGER })}
              </p>
            )}

            {/* Stake Breakdown */}
            <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3 mb-3 text-xs font-chakra text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center">
                <span>{t('lobby.yourWager')}</span>
                <span className="text-white font-bold flex items-center space-x-1">
                  <span>{wagerChoice || '0'}</span>
                  <GramIcon className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('lobby.creationFee')}</span>
                <span className="text-cyber-amber flex items-center space-x-1">
                  <span>+{creationFeeGram.toFixed(2)}</span>
                  <GramIcon className="w-3 h-3 text-cyber-amber" />
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-cyber-border pt-1 font-bold text-white">
                <span>{t('lobby.totalNeeded')}</span>
                <span className="text-cyber-cyan flex items-center space-x-1">
                  <span>{totalRequired}</span>
                  <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{t('lobby.availableBalance')}</span>
                <span className={isInsufficient ? 'text-cyber-pink font-bold' : 'text-cyber-green font-bold'}>
                  {currentBal.toFixed(2)} GRAM
                </span>
              </div>
            </div>

            {/* Insufficient Balance Notice */}
            {isInsufficient && (
              <div className="p-2.5 rounded-xl bg-cyber-pink/15 border border-cyber-pink/40 text-xs font-chakra text-cyber-pink flex items-center space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t('lobby.insufficientShort', { total: totalRequired, missing: missingAmount })}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-orbitron font-semibold text-slate-400 hover:text-white"
              >
                {t('lobby.cancelBtn')}
              </button>

              {isInsufficient ? (
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    onOpenDeposit?.(missingAmount);
                  }}
                  className="flex-1 py-2.5 bg-cyber-pink text-white font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-pink hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{t('lobby.depositMissingBtn', { missing: missingAmount })}</span>
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={!wagerChoice || parsedWager <= 0 || isOverMax || isSubmitting}
                  className={`flex-1 py-2.5 font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                    !wagerChoice || parsedWager <= 0 || isOverMax || isSubmitting
                      ? 'bg-cyber-border text-cyber-muted cursor-not-allowed'
                      : 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('lobby.creatingEscrow')}</span>
                    </>
                  ) : (
                    <span>{t('lobby.createDuelWithAmount', { amount: totalRequired })}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
