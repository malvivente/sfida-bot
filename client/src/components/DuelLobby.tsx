import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { MatchData } from '../types/index.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from './GramIcon.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { useTelegram } from '../hooks/useTelegram.js';

interface DuelLobbyProps {
  matches: MatchData[];
  onCreateMatch: (wagerTon: string) => Promise<boolean | void> | void;
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
}) => {
  const { triggerImpact } = useHaptics();
  const { botUsername, userId, username, fullName } = useTelegram();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wagerChoice, setWagerChoice] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedWager = parseFloat(wagerChoice || '0');
  const isOverMax = parsedWager > GAME_CONFIG.MAX_WAGER;
  const netWinnerPayout = (parsedWager * 1.92).toFixed(2);

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
    triggerImpact('heavy');
    setIsSubmitting(true);
    try {
      const result = await onCreateMatch(wagerChoice);
      if (result !== false) {
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = (matchId: string, wager: string) => {
    triggerImpact('light');
    const text = `⚔️ I challenge you to a Cyber Quickdraw duel for ${wager} TON! Tap faster across 3 rounds to win the pot!`;
    const url = `https://t.me/${botUsername}?start=duel_${matchId}`;
    shareToTelegram(url, text);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setWagerChoice(val);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Create Duel Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/20 via-cyber-card to-cyber-pink/20 border border-cyber-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-base font-orbitron font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <span>1V1 LIVE DUELS</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Best of 3 • Instant Winner Payout
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE</span>
        </button>
      </div>

      {/* Active Matches Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider">
            ACTIVE ARENA DUELS ({matches.length})
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
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-10 bg-cyber-card border border-cyber-border rounded-2xl p-6">
            <Swords className="w-12 h-12 text-cyber-cyan/40 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-slate-200 font-bold font-orbitron">No active duels in lobby</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Create the first duel to challenge your friends or wait for an opponent to join!
            </p>
            <button
              onClick={handleOpenModal}
              className="mt-4 px-5 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>CREATE FIRST DUEL</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const wagerTon = (parseFloat(m.wagerAmountNano) / 1e9).toString();
              const totalPotTon = (parseFloat(m.wagerAmountNano) * 2 / 1e9).toString();

              // Check if the current user is already in this match
              const isAlreadyPlayer = Boolean(
                userAddress && (
                  (m.playerA.wallet && m.playerA.wallet.toLowerCase() === userAddress.toLowerCase()) ||
                  (m.playerB?.wallet && m.playerB.wallet.toLowerCase() === userAddress.toLowerCase())
                )
              );

              // Cancellation is authorized exclusively for match creator before Player B joins
              const isCreator = Boolean(
                (userAddress && m.playerA.wallet && m.playerA.wallet.toLowerCase() === userAddress.toLowerCase()) ||
                (userId && (m.playerA as any).telegramUserId === userId) ||
                (fullName && m.playerA.name === fullName) ||
                (username && m.playerA.name === `@${username}`) ||
                m.playerA.name === 'Tu' ||
                m.playerA.wallet === 'EQ_you' ||
                m.playerA.wallet === 'EQ_pending_wallet'
              );

              return (
                <div
                  key={m.matchId}
                  className="bg-cyber-card border border-cyber-border hover:border-cyber-cyan/50 rounded-2xl p-4 transition-all shadow-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
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
                      <span className="text-[11px] text-slate-400 font-chakra block">Total Pot</span>
                      <span className="text-sm font-chakra font-extrabold text-cyber-cyan flex items-center justify-end space-x-1">
                        <span>{totalPotTon}</span>
                        <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 mb-3 text-xs font-chakra">
                    <span className="text-slate-400">Single Player Stake:</span>
                    <span className="text-white font-bold flex items-center space-x-1">
                      <span>{wagerTon}</span>
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
                        <span>RESUME DUEL</span>
                      </button>
                    ) : !m.playerB ? (
                      <button
                        onClick={() => {
                          if (!userAddress) {
                            triggerImpact('medium');
                            onOpenWallet?.();
                            return;
                          }
                          onJoinMatch(m);
                        }}
                        className="flex-1 py-2 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl text-xs uppercase tracking-wider hover:brightness-110 shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center space-x-1"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span className="flex items-center space-x-1">
                          <span>ACCEPT ({wagerTon}</span>
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
                        <span>SPECTATE</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShare(m.matchId, wagerTon)}
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
                        title="Cancel duel and claim refund"
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

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-orbitron font-bold text-white mb-1 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-cyber-cyan" />
              <span>SET UP YOUR DUEL</span>
            </h3>
            <p className="text-xs text-slate-400 font-chakra mb-4">
              Select wager in TON for the 1v1 Best of 3 duel
            </p>

            {/* Status / Loading Display */}
            {createStatus && (
              <div className="bg-cyber-cyan/15 border border-cyber-cyan/50 text-cyber-cyan rounded-xl p-3 text-xs font-chakra flex items-start space-x-2.5 mb-3 animate-pulse">
                <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin text-cyber-cyan" />
                <div className="flex-1 text-[11px] leading-relaxed">
                  <span className="font-bold block text-white mb-0.5">Awaiting signature on Tonkeeper</span>
                  <span className="text-slate-200">{createStatus}</span>
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {createError && (
              <div className="bg-cyber-pink/15 border border-cyber-pink/50 text-cyber-pink rounded-xl p-3 text-xs font-chakra flex items-start space-x-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">
                  <span className="font-bold block text-white mb-0.5">Creation Error</span>
                  <span>{createError}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-chakra mb-1.5">
              <span>Preset amount:</span>
              <span className="flex items-center space-x-1">
                <span>Max: {GAME_CONFIG.MAX_WAGER}</span>
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
              <span className="text-xs text-slate-400 font-chakra">Custom amount:</span>
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
                Warning: Maximum allowed wager is {GAME_CONFIG.MAX_WAGER} TON.
              </p>
            )}

            {/* Stake Breakdown */}
            <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3 mb-4 text-xs font-chakra text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center">
                <span>Your wager:</span>
                <span className="text-white font-bold flex items-center space-x-1">
                  <span>{wagerChoice || '0'}</span>
                  <GramIcon className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Contract gas contribution:</span>
                <span className="text-cyber-amber flex items-center space-x-1">
                  <span>+0.02</span>
                  <GramIcon className="w-3 h-3 text-cyber-amber" />
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-cyber-border pt-1.5 text-cyber-cyan">
                <span className="font-bold">Net Winner Prize:</span>
                <span className="font-extrabold text-sm text-cyber-cyan flex items-center space-x-1">
                  <span>+{netWinnerPayout}</span>
                  <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 bg-cyber-bg border border-cyber-border rounded-xl text-xs font-orbitron font-semibold text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>CREATING...</span>
                  </>
                ) : (
                  <span>CREATE DUEL</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
