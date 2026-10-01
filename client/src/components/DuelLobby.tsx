import React, { useState } from 'react';
import { Swords, Eye, Plus, Share2, Flame, AlertCircle, Loader2, Trash2, RefreshCw, ArrowDownLeft, Wallet, Lock, Globe, X, Trophy, Sparkles, Search, SlidersHorizontal, MessageSquare, ArrowLeft } from 'lucide-react';
import { MatchData, GameType } from '../types/index.js';
import { GAMES_METADATA, GameMetadata } from '../config/gamesConfig.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from './GramIcon.js';
import { GameIcon } from './GameIcon.js';
import { UserAvatar } from './UserAvatar.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { areAddressesEqual } from '../utils/ton.js';
import { useI18n } from '../i18n/index.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { EpicBanners } from './EpicBanners.js';
import { LiveActivityTicker } from './LiveActivityTicker.js';
import { PlayHubView } from './PlayHubView.js';

interface DuelLobbyProps {
  matches: MatchData[];
  onCreateMatch: (wagerGram: string, gameType: GameType, isPrivate?: boolean) => Promise<boolean | void> | void;
  onJoinMatch: (match: MatchData, inviteCode?: string) => void;
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
  joinFeeGram?: number;
  initialInviteCode?: string;
  onOpenDeposit?: (missingAmount?: string) => void;
  showBanners?: boolean;
  showMatchesList?: boolean;
  onOpenSpectate?: () => void;
  onNavigateToDuels?: (gameType?: string) => void;
  initialGameFilter?: string;
  onClearInitialGameFilter?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  initialCreateGame?: GameType | null;
  onClearInitialCreateGame?: () => void;
  initialCreateWager?: string | null;
  onClearInitialCreateWager?: () => void;
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
  creationFeeGram = 0.05,
  joinFeeGram = 0.05,
  initialInviteCode,
  onOpenDeposit,
  showBanners = true,
  showMatchesList = true,
  onOpenSpectate,
  onNavigateToDuels,
  initialGameFilter,
  onClearInitialGameFilter,
  onOpenAffiliates,
  onOpenJackpotModal,
  initialCreateGame,
  onClearInitialCreateGame,
  initialCreateWager,
  onClearInitialCreateWager,
}) => {
  const { triggerImpact } = useHaptics();
  const { botUsername, userId, username, fullName, displayName } = useTelegram();
  const { t } = useI18n();
  const { isFullscreen, topInset } = useTelegramViewport();
  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 12;
  const modalBottomOffset = isFullscreen ? 24 : 12;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockedGameType, setLockedGameType] = useState<GameType | null>(null);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [wagerChoice, setWagerChoice] = useState<string>('1');
  const [selectedGameType, setSelectedGameType] = useState<GameType>('roulette');
  const [filterGameType, setFilterGameType] = useState<string>(initialGameFilter || 'ALL');

  React.useEffect(() => {
    if (initialGameFilter && initialGameFilter !== 'ALL') {
      setFilterGameType(initialGameFilter);
      onClearInitialGameFilter?.();
    }
  }, [initialGameFilter, onClearInitialGameFilter]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insufficientJoinMatch, setInsufficientJoinMatch] = useState<{ match: MatchData; required: string; missing: string } | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [filterBetTier, setFilterBetTier] = useState<'ALL' | 'MICRO' | 'MID' | 'HIGH'>('ALL');
  const [filterOpenOnly, setFilterOpenOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'bet_desc' | 'bet_asc'>('newest');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [sectionView, setSectionView] = useState<'hub' | 'play_hub' | 'pvp'>('hub');
  const [playHubSection, setPlayHubSection] = useState<'all' | 'quick' | 'strategy'>('all');
  const [previousView, setPreviousView] = useState<'hub' | 'play_hub'>('hub');
  const [jackpotGram, setJackpotGram] = useState<string>('5.00');

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [sectionView]);

  React.useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
        const res = await fetch(`${serverUrl}/api/jackpot`);
        if (res.ok) {
          const data = await res.json();
          if (data?.trustJackpotGram) {
            setJackpotGram(parseFloat(data.trustJackpotGram).toFixed(2));
          }
        }
      } catch {}
    };

    fetchJackpot();
    const interval = setInterval(fetchJackpot, 10000);
    return () => clearInterval(interval);
  }, []);

  const effectiveMinWager = selectedGameType === 'split' ? 5.0 : GAME_CONFIG.MIN_WAGER;
  const parsedWager = parseFloat(wagerChoice || '0');
  const isOverMax = parsedWager > GAME_CONFIG.MAX_WAGER;
  const isBelowMin = parsedWager > 0 && parsedWager < effectiveMinWager;
  const netWinnerPayout = (parsedWager * 2).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const totalRequired = parsedWager > 0 ? (parsedWager + creationFeeGram).toFixed(2) : '0.00';
  const isInsufficient = parsedWager > 0 && currentBal < (parsedWager + creationFeeGram);
  const missingAmount = parsedWager > 0 ? ((parsedWager + creationFeeGram) - currentBal).toFixed(2) : '0.00';

  const getMatchInviteCode = (match: MatchData) => {
    if (match.inviteCode) return match.inviteCode;
    if (initialInviteCode) return initialInviteCode;
    try {
      const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
      return stored[match.matchId] || undefined;
    } catch {
      return undefined;
    }
  };

  const handleOpenModal = (defaultGame?: GameType, lockGame: boolean = false, defaultWager?: string) => {
    onClearError?.();
    if (!userAddress && !userId) {
      triggerImpact('medium');
      onOpenWallet?.();
      return;
    }
    setLockedGameType(lockGame && defaultGame ? defaultGame : null);
    if (defaultGame) {
      setSelectedGameType(defaultGame);
      if (defaultWager) {
        setWagerChoice(defaultWager);
      } else if (defaultGame === 'split' && parseFloat(wagerChoice || '0') < 5.0) {
        setWagerChoice('5');
      }
    } else if (defaultWager) {
      setWagerChoice(defaultWager);
    }
    triggerImpact('medium');
    setShowCreateModal(true);
  };

  // Handle programmatic create duel trigger (e.g. from Trust Jackpot modal or external button or startapp create)
  React.useEffect(() => {
    if (initialCreateGame) {
      handleOpenModal(initialCreateGame, true, initialCreateWager || undefined);
      onClearInitialCreateGame?.();
      onClearInitialCreateWager?.();
    }
  }, [initialCreateGame, initialCreateWager]);

  React.useEffect(() => {
    const handleCustomOpen = (e: any) => {
      const g = e?.detail?.game as GameType | undefined;
      const w = e?.detail?.wager as string | undefined;
      if (g) {
        handleOpenModal(g, true, w);
      }
    };
    window.addEventListener('sfida_open_create_game', handleCustomOpen);
    return () => window.removeEventListener('sfida_open_create_game', handleCustomOpen);
  }, []);

  const handleCreate = async () => {
    if (parsedWager < effectiveMinWager || isOverMax || isSubmitting) return;
    if (isInsufficient) {
      triggerImpact('heavy');
      setShowCreateModal(false);
      onOpenDeposit?.(missingAmount);
      return;
    }

    triggerImpact('heavy');
    setIsSubmitting(true);
    try {
      const result = await onCreateMatch(wagerChoice, selectedGameType, isPrivateRoom);
      if (result !== false) {
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttemptJoin = (m: MatchData, inviteCode?: string) => {
    if (!userAddress && !userId) {
      triggerImpact('medium');
      onOpenWallet?.();
      return;
    }
    const wagerGram = parseFloat(m.wagerAmountNano) / 1e9;
    const fee = joinFeeGram !== undefined ? joinFeeGram : 0.05;
    const requiredTotal = wagerGram + fee;
    if (currentBal < requiredTotal) {
      triggerImpact('heavy');
      const diff = (requiredTotal - currentBal).toFixed(2);
      setInsufficientJoinMatch({ match: m, required: requiredTotal.toFixed(2), missing: diff });
      return;
    }
    onJoinMatch(m, inviteCode);
  };

  const handleShare = (matchId: string, wager: string, gType: GameType = 'roulette', isPrivate?: boolean, inviteCode?: string) => {
    triggerImpact('light');
    const meta = GAMES_METADATA[gType] || GAMES_METADATA.roulette;
    let code = inviteCode;
    if (!code && typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
        code = stored[matchId];
      } catch {}
    }
    if (isPrivate && code) {
      const text = t('lobby.sharePrivateText', { title: meta.title, wager });
      const url = `https://t.me/${botUsername}?start=duel_${matchId}_${code}`;
      shareToTelegram(url, text);
    } else {
      const text = t('lobby.sharePublicText', { title: meta.title, wager, tagline: meta.tagline });
      const url = `https://t.me/${botUsername}?start=duel_${matchId}`;
      shareToTelegram(url, text);
    }
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setWagerChoice(val);
  };

  const hasActiveFilters =
    filterGameType !== 'ALL' ||
    filterVisibility !== 'ALL' ||
    filterBetTier !== 'ALL' ||
    filterOpenOnly ||
    searchQuery.trim() !== '' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setFilterGameType('ALL');
    setFilterVisibility('ALL');
    setFilterBetTier('ALL');
    setFilterOpenOnly(false);
    setSearchQuery('');
    setSortBy('newest');
  };

  const filteredMatches = matches
    .filter((m: MatchData) => {
      // 1. Game Type
      if (filterGameType !== 'ALL') {
        const g = m.gameType || 'roulette';
        if (g !== filterGameType) return false;
      }

      // 2. Visibility (Public / Private)
      if (filterVisibility === 'PUBLIC' && m.isPrivate) return false;
      if (filterVisibility === 'PRIVATE' && !m.isPrivate) return false;

      // 3. Open Rooms Only (Waiting for Player B)
      if (filterOpenOnly && (m.playerB !== null || m.state !== 'LOBBY')) return false;

      // 4. Bet Tier
      const wagerGram = parseFloat(m.wagerAmountNano) / 1e9;
      if (filterBetTier === 'MICRO' && wagerGram > 1) return false;
      if (filterBetTier === 'MID' && (wagerGram <= 1 || wagerGram > 5)) return false;
      if (filterBetTier === 'HIGH' && wagerGram <= 5) return false;

      // 5. Search query (matches playerA, playerB, matchId)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = (m.matchId || '').toLowerCase();
        const playerAName = (m.playerA?.name || '').toLowerCase();
        const playerBName = (m.playerB?.name || '').toLowerCase();
        if (!matchId.includes(q) && !playerAName.includes(q) && !playerBName.includes(q)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'bet_desc') {
        return (parseFloat(b.wagerAmountNano) || 0) - (parseFloat(a.wagerAmountNano) || 0);
      }
      if (sortBy === 'bet_asc') {
        return (parseFloat(a.wagerAmountNano) || 0) - (parseFloat(b.wagerAmountNano) || 0);
      }
      return 0;
    });

  const userActiveMatch = matches.find((m) => {
    if (m.state === 'MATCH_SETTLED' || m.state === 'FORFEITED') return false;
    const isA = (userAddress && m.playerA && m.playerA.wallet && userAddress.toLowerCase() === m.playerA.wallet.toLowerCase()) || (userId && String((m.playerA as any)?.telegramUserId) === String(userId));
    const isB = m.playerB && ((userAddress && m.playerB.wallet && userAddress.toLowerCase() === m.playerB.wallet.toLowerCase()) || (userId && String((m.playerB as any)?.telegramUserId) === String(userId)));
    return isA || isB;
  });

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans pb-10">
      {/* Pinned Ongoing Duel Alert Card */}
      {userActiveMatch && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400/30 border border-amber-400/50 flex items-center justify-center shrink-0 text-amber-300">
              <Swords className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-heading font-black text-amber-200 block truncate">
                {t('lobby.ongoingDuelNotice')}
              </span>
              <span className="text-[10px] text-slate-300 block truncate">
                #{userActiveMatch.matchId} • {(parseFloat(userActiveMatch.wagerAmountNano) / 1e9).toFixed(2)} GRAM
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerImpact('heavy');
              onSpectateMatch(userActiveMatch.matchId);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-heading font-black text-xs uppercase tracking-wider shrink-0 shadow-md hover:bg-amber-300 active:scale-95 transition-all"
          >
            {t('lobby.resumeDuel')}
          </button>
        </div>
      )}

      {sectionView === 'play_hub' ? (
        <PlayHubView
          onBack={() => setSectionView('hub')}
          matches={matches}
          initialSection={playHubSection}
          onSelectGame={(g) => {
            if (onNavigateToDuels) {
              onNavigateToDuels(g);
            } else {
              setFilterGameType(g);
              setPreviousView('play_hub');
              setSectionView('pvp');
            }
          }}
          onNavigateToDuels={onNavigateToDuels}
          onCreateMatchForGame={(g) => handleOpenModal(g, true)}
        />
      ) : (
        <>
          {/* Live Activity Ticker (Real-time and previous victories ticker) */}
          <LiveActivityTicker
            matches={matches}
            onSelectGame={(g) => {
              if (onNavigateToDuels) {
                onNavigateToDuels(g);
              } else {
                setFilterGameType(g);
                setPreviousView('hub');
                setSectionView('pvp');
              }
            }}
          />

          {/* Epic Banners only in Hub mode */}
          {showBanners && sectionView === 'hub' && (
            <EpicBanners
              matches={matches}
              onOpenCreateModal={(g) => handleOpenModal(g, true)}
              onJoinMatch={(m) => handleAttemptJoin(m, getMatchInviteCode(m))}
              onSelectGame={(g) => {
                if (onNavigateToDuels) {
                  onNavigateToDuels(g);
                } else {
                  setFilterGameType(g);
                  setPreviousView('hub');
                  setSectionView('pvp');
                }
              }}
              onOpenPlayHub={(sec) => {
                setPlayHubSection(sec || 'all');
                setSectionView('play_hub');
              }}
              onOpenSpectate={onOpenSpectate}
              onOpenAffiliates={onOpenAffiliates}
              onOpenJackpotModal={onOpenJackpotModal}
              jackpotAmountGram={jackpotGram}
            />
          )}

          {/* Active Matches Feed Section Header */}
          {(showMatchesList || sectionView === 'pvp') && (
          <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
              {t('lobby.activeDuels')}
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/10 text-cyan-400 text-xs">
                {filteredMatches.length}
              </span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenModal()}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-bold rounded-xl text-xs uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('lobby.create')}</span>
            </button>

            {onRefreshMatches && (
              <button
                onClick={() => {
                  triggerImpact('light');
                  onRefreshMatches();
                }}
                disabled={isRefreshing}
                className={`text-[11px] font-medium transition-all flex items-center space-x-1.5 py-1.5 px-2.5 rounded-xl border active:scale-95 ${
                  isRefreshing
                    ? 'bg-purple-500/10 border-purple-500 text-purple-400 cursor-wait'
                    : 'text-slate-400 hover:text-white bg-white/5 border-white/10 hover:border-white/20'
                }`}
                title="Refresh duels list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? t('lobby.refreshing') : t('lobby.refresh')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Advanced Filters Bar */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('lobby.searchPlaceholder')}
                className="w-full bg-[#151823] border border-white/10 rounded-2xl pl-9 pr-8 py-2 text-xs font-sans text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                triggerImpact('light');
                setShowFiltersPanel(!showFiltersPanel);
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-heading font-extrabold flex items-center space-x-1.5 border transition-all active:scale-95 shrink-0 ${
                showFiltersPanel || hasActiveFilters
                  ? 'bg-purple-900/40 border-purple-400/40 text-purple-200 shadow-sm'
                  : 'bg-[#151823] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t('lobby.filterBtn')}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {/* Expandable Filter Drawer */}
          {showFiltersPanel && (
            <div className="bg-[#131622] border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('lobby.filterTitle')}</span>
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      triggerImpact('light');
                      resetFilters();
                    }}
                    className="text-[11px] font-heading font-bold text-purple-300 hover:underline"
                  >
                    {t('lobby.resetFilters')}
                  </button>
                )}
              </div>

              {/* Game Type Filter */}
              <div>
                <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  {t('lobby.gameTypeLabel') || 'Disciplina / Gioco'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'roulette', 'blackjack', 'bridge', 'chrono', 'split', 'shotgun', 'connect4', 'cubecount'].map((gKey) => {
                    const isSelected = filterGameType === gKey;
                    const label = gKey === 'ALL' ? t('lobby.allGames') : GAMES_METADATA[gKey as GameType]?.title || gKey;
                    return (
                      <button
                        key={gKey}
                        onClick={() => {
                          triggerImpact('light');
                          setFilterGameType(gKey);
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center space-x-1.5 whitespace-nowrap active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/20 shadow-sm'
                            : 'bg-[#181b28] text-slate-300 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {gKey !== 'ALL' && (
                          <GameIcon type={gKey} className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Access Filter (Public vs Private) */}
              <div>
                <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  {t('lobby.roomType')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['ALL', 'PUBLIC', 'PRIVATE'] as const).map((mode) => {
                    const active = filterVisibility === mode;
                    const label = mode === 'ALL' ? t('lobby.filterAll') : mode === 'PUBLIC' ? t('lobby.filterPublic') : t('lobby.filterPrivate');
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          triggerImpact('light');
                          setFilterVisibility(mode);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-heading font-bold border transition-all text-center flex items-center justify-center space-x-1 active:scale-95 ${
                          active
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/20 shadow-sm'
                            : 'bg-[#181b28] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {mode === 'PRIVATE' && <Lock className="w-2.5 h-2.5" />}
                        {mode === 'PUBLIC' && <Globe className="w-2.5 h-2.5" />}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bet Stake Tier */}
              <div>
                <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  {t('lobby.wagerLabel')}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['ALL', 'MICRO', 'MID', 'HIGH'] as const).map((tier) => {
                    const active = filterBetTier === tier;
                    const label =
                      tier === 'ALL'
                        ? t('lobby.filterAllBets')
                        : tier === 'MICRO'
                        ? t('lobby.filterMicroBet')
                        : tier === 'MID'
                        ? t('lobby.filterMidBet')
                        : t('lobby.filterHighBet');
                    return (
                      <button
                        key={tier}
                        onClick={() => {
                          triggerImpact('light');
                          setFilterBetTier(tier);
                        }}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-heading font-extrabold border transition-all text-center truncate active:scale-95 ${
                          active
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-white/20 shadow-sm'
                            : 'bg-[#181b28] text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Sorting Row */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                {/* Open Rooms Only Toggle */}
                <button
                  onClick={() => {
                    triggerImpact('light');
                    setFilterOpenOnly(!filterOpenOnly);
                  }}
                  className={`py-1 px-2.5 rounded-xl text-xs font-heading font-bold border transition-all flex items-center space-x-1.5 active:scale-95 ${
                    filterOpenOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filterOpenOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{t('lobby.filterOpenOnly')}</span>
                </button>

                {/* Sort selector */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 font-medium">{t('lobby.sortLabel')}</span>
                  {(['newest', 'bet_desc', 'bet_asc'] as const).map((sort) => {
                    const active = sortBy === sort;
                    const label =
                      sort === 'newest'
                        ? t('lobby.sortNewest')
                        : sort === 'bet_desc'
                        ? '▼ GRAM'
                        : '▲ GRAM';
                    return (
                      <button
                        key={sort}
                        onClick={() => {
                          triggerImpact('light');
                          setSortBy(sort);
                        }}
                        className={`px-2 py-1 rounded-xl text-[10px] font-heading font-bold border transition-all active:scale-95 ${
                          active
                            ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {hasActiveFilters && !showFiltersPanel && (
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none text-[10px] font-sans">
              <span className="text-slate-500 shrink-0">{t('lobby.filtersLabel')}</span>
              {filterGameType !== 'ALL' && (
                <button
                  onClick={() => setFilterGameType('ALL')}
                  className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 flex items-center space-x-1"
                >
                  <span>{GAMES_METADATA[filterGameType as GameType]?.title || filterGameType}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {filterVisibility !== 'ALL' && (
                <button
                  onClick={() => setFilterVisibility('ALL')}
                  className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0 flex items-center space-x-1"
                >
                  <span>{filterVisibility === 'PUBLIC' ? t('lobby.filterPublic') : t('lobby.filterPrivate')}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {filterBetTier !== 'ALL' && (
                <button
                  onClick={() => setFilterBetTier('ALL')}
                  className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0 flex items-center space-x-1"
                >
                  <span>
                    {filterBetTier === 'MICRO'
                      ? t('lobby.filterMicroBet')
                      : filterBetTier === 'MID'
                      ? t('lobby.filterMidBet')
                      : t('lobby.filterHighBet')}
                  </span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {filterOpenOnly && (
                <button
                  onClick={() => setFilterOpenOnly(false)}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center space-x-1"
                >
                  <span>{t('lobby.filterOpenOnly')}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0 flex items-center space-x-1"
                >
                  <span>"{searchQuery}"</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {sortBy !== 'newest' && (
                <button
                  onClick={() => setSortBy('newest')}
                  className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/40 shrink-0 flex items-center space-x-1"
                >
                  <span>{sortBy === 'bet_desc' ? t('lobby.sortHighBet') : t('lobby.sortLowBet')}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={resetFilters}
                className="text-[10px] text-slate-400 hover:text-white underline shrink-0 ml-1"
              >
                {t('lobby.resetFilters')}
              </button>
            </div>
          )}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="text-center py-10 bg-[#141724]/90 border border-white/10 rounded-3xl p-6 shadow-xl">
            {hasActiveFilters ? (
              <>
                <Search className="w-10 h-10 text-purple-400/60 mx-auto mb-3" />
                <p className="text-sm text-slate-200 font-heading font-black">{t('lobby.filteredNoResults')}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {t('lobby.filteredNoResultsDesc')}
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 rounded-xl text-xs font-heading font-bold uppercase tracking-wider active:scale-95 transition-all"
                >
                  {t('lobby.resetFilters')}
                </button>
              </>
            ) : (
              <>
                <Swords className="w-12 h-12 text-purple-400/60 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-slate-200 font-heading font-black">{t('lobby.noDuelsTitle')}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {t('lobby.noDuelsDesc')}
                </p>
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-bold rounded-2xl text-xs uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('lobby.createDuelBtn')}</span>
                </button>
              </>
            )}
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

              const effectiveInviteCode = getMatchInviteCode(m);

              return (
                <div
                  key={m.matchId}
                  className="bg-gradient-to-b from-[#181b29] to-[#121420] border border-white/10 hover:border-purple-500/40 rounded-3xl p-4 transition-all shadow-xl hover:shadow-purple-900/10"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-heading font-extrabold text-white tracking-wide">
                          MATCH #{m.matchId}
                        </span>
                        <span
                          className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border ${
                            m.state === 'LOBBY'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {m.state}
                        </span>
                        <span
                          className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border ${gameMeta.borderColor.split(' ')[0]} ${gameMeta.accentColor} bg-black/60`}
                        >
                          {gameMeta.title}
                        </span>
                        {m.isPrivate && (
                          <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/15 text-purple-300 flex items-center space-x-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{t('lobby.privateBadge')}</span>
                          </span>
                        )}
                        {m.groupChatId && (
                          <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 flex items-center space-x-1">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>COMMUNITY</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-sans mt-1.5 space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">{t('lobby.createdByName')}</span>
                          <span className="inline-flex items-center space-x-1.5 text-slate-200 font-semibold">
                            <UserAvatar
                              name={m.playerA.name}
                              photoUrl={m.playerA.photoUrl}
                              sizeClass="w-4 h-4"
                              textClass="text-[8px]"
                            />
                            <span>{m.playerA.name}</span>
                          </span>
                          {isCreator && (
                            <span className="text-[10px] text-purple-300 font-bold font-sans bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                              {t('lobby.yourDuelTag')}
                            </span>
                          )}
                        </div>
                        {m.playerB && (
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                            <span>vs</span>
                            <span className="inline-flex items-center space-x-1.5 text-purple-300 font-semibold">
                              <UserAvatar
                                name={m.playerB.name}
                                photoUrl={m.playerB.photoUrl}
                                sizeClass="w-4 h-4"
                                textClass="text-[8px]"
                              />
                              <span>{m.playerB.name}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-sans block">{t('lobby.poolLabel')}</span>
                      <span className="text-sm font-heading font-black text-amber-300 flex items-center justify-end space-x-1">
                        <span>{totalPotGram}</span>
                        <GramIcon className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 mb-3 text-xs font-sans">
                    <span className="text-slate-400">{t('lobby.wagerLabel')}:</span>
                    <span className="text-white font-bold flex items-center space-x-1">
                      <span>{wagerGram}</span>
                      <GramIcon className="w-3 h-3 text-white" />
                      <span className="text-slate-400 text-[10px]">{t('lobby.eachLabel')}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* If user is already a participant, provide direct RESUME DUEL button */}
                    {isAlreadyPlayer ? (
                      <button
                        onClick={() => onJoinMatch(m)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider hover:brightness-110 shadow-md active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{t('profile.resume')}</span>
                      </button>
                    ) : !m.playerB ? (
                      m.isPrivate && !effectiveInviteCode ? (
                        <button
                          onClick={() => onSpectateMatch(m.matchId)}
                          className="flex-1 py-2.5 bg-purple-950/40 border border-purple-500/40 text-purple-200 font-heading font-bold rounded-2xl text-xs uppercase tracking-wider hover:border-purple-400 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400" />
                          <span>{t('lobby.spectatePrivate')}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAttemptJoin(m, effectiveInviteCode)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all flex items-center justify-center space-x-1"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span className="flex items-center space-x-1">
                              <span>{t('lobby.joinBtn')} ({wagerGram}</span>
                              <GramIcon className="w-3 h-3 text-white inline-block" />
                              <span>)</span>
                            </span>
                          </button>
                          <button
                            onClick={() => onSpectateMatch(m.matchId)}
                            title={t('lobby.spectateBtn')}
                            className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-heading font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('lobby.spectateBtn')}</span>
                          </button>
                        </>
                      )
                    ) : (
                      <button
                        onClick={() => onSpectateMatch(m.matchId)}
                        className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-200 font-heading font-bold rounded-2xl text-xs uppercase tracking-wider hover:border-white/20 active:scale-95 transition-all flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('lobby.spectateBtn')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShare(m.matchId, wagerGram, m.gameType, m.isPrivate, effectiveInviteCode)}
                      title="Share to Telegram"
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-2xl transition-all active:scale-95 shrink-0"
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
                        className="p-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-2xl transition-all active:scale-95 shrink-0"
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
      )}
      </>
      )}

      {/* Insufficient Balance to Join Modal */}
      {insufficientJoinMatch && (
        <div
          style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-3 sm:px-4 overflow-y-auto"
        >
          <div
            style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
            className="bg-[#181b29] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
          >
            <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{t('lobby.insufficientModalTitle')}</span>
            </h3>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {t('lobby.insufficientJoinDesc', {
                required: insufficientJoinMatch.required,
                current: currentBal.toFixed(2),
              })}
            </p>

            <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between text-xs font-sans">
              <span className="text-slate-400">{t('lobby.missingDeposit')}</span>
              <span className="font-bold text-rose-400 flex items-center space-x-1">
                <span>{insufficientJoinMatch.missing}</span>
                <GramIcon className="w-3.5 h-3.5 text-rose-400" />
              </span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setInsufficientJoinMatch(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-heading font-bold text-slate-400 hover:text-white"
              >
                {t('lobby.cancelBtn')}
              </button>
              <button
                onClick={() => {
                  const missing = insufficientJoinMatch.missing;
                  setInsufficientJoinMatch(null);
                  onOpenDeposit?.(missing);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
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
        <div
          style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-3 sm:px-4 overflow-y-auto"
        >
          <div
            style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
            className="bg-[#161826] border border-white/10 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 pb-3 border-b border-white/10 flex items-start justify-between shrink-0 bg-white/[0.02]">
              <div>
                <h3 className="text-base font-heading font-extrabold text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>
                    {lockedGameType
                      ? t('lobby.configureForGame', { game: GAMES_METADATA[selectedGameType]?.title || '' })
                      : t('lobby.createModalTitle')}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  {lockedGameType
                    ? (GAMES_METADATA[selectedGameType]?.tagline || t('lobby.createModalDesc'))
                    : t('lobby.createModalDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerImpact('light');
                  setShowCreateModal(false);
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-2 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-5 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {/* Game Mode Selection / Dedicated Game Banner */}
              {lockedGameType ? (
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  selectedGameType === 'split'
                    ? 'bg-gradient-to-r from-sky-950/60 via-indigo-950/50 to-blue-950/60 border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-purple-950/50 border-purple-500/40 shadow-epic-purple'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-heading font-black px-2 py-0.5 rounded-md bg-black/60 ${GAMES_METADATA[selectedGameType]?.accentColor || 'text-cyan-400'}`}>
                          {GAMES_METADATA[selectedGameType]?.badge}
                        </span>
                        <span className="text-xs sm:text-sm font-heading font-black text-white tracking-wide truncate">
                          {GAMES_METADATA[selectedGameType]?.title}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-slate-300 leading-snug">
                        {GAMES_METADATA[selectedGameType]?.tagline}
                      </p>
                    </div>

                    {selectedGameType === 'split' && (
                      <div className="shrink-0 flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 via-purple-900/40 to-amber-500/20 border border-amber-400/50 rounded-2xl px-2.5 py-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                        <div className="text-left">
                          <div className="text-[8px] font-heading font-black text-amber-300 tracking-wider">
                            TRUST JACKPOT
                          </div>
                          <div className="text-[10px] font-heading font-black text-emerald-400">
                            +25% BONUS
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-heading font-bold text-slate-400 uppercase tracking-wider block">
                    {t('lobby.gameMode')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.values(GAMES_METADATA) as GameMetadata[]).map((game) => {
                      const isSelected = selectedGameType === game.id;
                      const isSplit = game.id === 'split';
                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => {
                            triggerImpact('light');
                            setSelectedGameType(game.id);
                            if (game.id === 'split' && parseFloat(wagerChoice || '0') < 5.0) {
                              setWagerChoice('5');
                            }
                          }}
                          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                            isSplit ? 'col-span-2 bg-gradient-to-r from-purple-950/40 via-yellow-950/20 to-purple-950/40' : ''
                          } ${
                            isSelected
                              ? `bg-purple-950/60 border-2 border-purple-500 shadow-epic-purple`
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20 opacity-70'
                          }`}
                        >
                          {isSplit ? (
                            <div className="flex items-center justify-between w-full gap-2.5">
                              {/* Left: Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1.5 mb-1">
                                  <span className={`text-[8px] font-heading font-extrabold px-1.5 py-0.5 rounded-md bg-black/60 ${game.accentColor}`}>
                                    {game.badge}
                                  </span>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                                </div>
                                <div className={`text-[11px] font-heading font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                  {game.title}
                                </div>
                                <div className="text-[9px] font-sans text-slate-400 mt-0.5 truncate">
                                  {game.tagline}
                                </div>
                              </div>

                              {/* Right: Adapted Trust Jackpot Mini-Card */}
                              <div className="shrink-0 flex items-center space-x-2 bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/15 border border-amber-400/50 rounded-2xl px-2.5 py-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                                <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0 relative">
                                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                                  <Sparkles className="w-2 h-2 text-amber-300 absolute -top-0.5 -right-0.5 animate-pulse" />
                                </div>
                                <div className="text-left">
                                  <div className="text-[8px] font-heading font-extrabold text-amber-300 tracking-wider">
                                    TRUST JACKPOT
                                  </div>
                                  <div className="text-[10px] font-sans font-bold text-emerald-400 flex items-center space-x-1">
                                    <span>+25% BONUS</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[8px] font-heading font-extrabold px-1.5 py-0.5 rounded-md bg-black/60 ${game.accentColor}`}>
                                  {game.badge}
                                </span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                              </div>
                              <div className={`text-[11px] font-heading font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {game.title}
                              </div>
                              <div className="text-[9px] font-sans text-slate-400 mt-0.5 truncate">
                                {game.tagline}
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Room Access Selection: Public vs Private */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-heading font-bold text-slate-400 uppercase tracking-wider block">
                  {t('lobby.roomType')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('light');
                      setIsPrivateRoom(false);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      !isPrivateRoom
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-heading font-bold text-white">{t('lobby.public')}</span>
                    </div>
                    <p className="text-[9px] font-sans text-slate-400 leading-tight">
                      {t('lobby.publicDesc')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('light');
                      setIsPrivateRoom(true);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      isPrivateRoom
                        ? 'bg-purple-500/20 border-purple-400 text-white shadow-epic-purple'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs font-heading font-bold text-white">{t('lobby.private')}</span>
                    </div>
                    <p className="text-[9px] font-sans text-slate-400 leading-tight">
                      {t('lobby.privateDesc')}
                    </p>
                  </button>
                </div>
                {selectedGameType === 'split' && isPrivateRoom && (
                  <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-2.5 py-1.5 font-sans flex items-center space-x-1.5">
                    <span>ℹ️</span>
                    <span>{t('lobby.splitPrivateJackpotNotice')}</span>
                  </div>
                )}
              </div>

              {/* Error Message Display */}
              {createError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl p-3 text-xs font-sans flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">
                    <span className="font-bold block text-white mb-0.5">{t('lobby.creationError')}</span>
                    <span>{createError}</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 font-sans font-medium mb-1.5">
                  <span className="text-white font-bold">{t('lobby.presetAmount')}</span>
                  <span className="flex items-center space-x-1 text-slate-400">
                    <span>{t('lobby.maxWagerLabel', { max: GAME_CONFIG.MAX_WAGER })}</span>
                    <GramIcon className="w-3.5 h-3.5 text-cyan-400" />
                  </span>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                  {(selectedGameType === 'split'
                    ? GAME_CONFIG.PRESET_DUEL_WAGERS.filter((amt) => parseFloat(amt) >= 5.0)
                    : GAME_CONFIG.PRESET_DUEL_WAGERS
                  ).map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        triggerImpact('light');
                        setWagerChoice(amt);
                      }}
                      className={`py-2 rounded-2xl font-heading text-xs font-black border transition-all flex items-center justify-center space-x-0.5 active:scale-95 ${
                        wagerChoice === amt
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white border-purple-400/60 shadow-epic-purple'
                          : 'bg-white/[0.04] border-white/10 text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <span>{amt}</span>
                      <GramIcon className={`w-3.5 h-3.5 ${wagerChoice === amt ? 'text-white' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="flex items-center space-x-2 bg-black/40 border border-white/15 rounded-2xl px-3.5 py-2.5">
                  <span className="text-xs text-slate-300 font-sans font-medium">{t('lobby.customStake')}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={wagerChoice}
                    onChange={handleCustomInput}
                    placeholder={`${effectiveMinWager} - ${GAME_CONFIG.MAX_WAGER}`}
                    className="flex-1 bg-transparent text-sm sm:text-base font-heading font-black text-white text-right focus:outline-none"
                  />
                  <GramIcon className="w-4 h-4 text-purple-400 shrink-0" />
                </div>

                {isBelowMin && (
                  <p className="text-[11px] text-rose-400 font-sans font-medium mt-1.5">
                    {selectedGameType === 'split'
                      ? t('lobby.splitMinWagerWarn')
                      : t('lobby.minWagerWarn')}
                  </p>
                )}
                {isOverMax && (
                  <p className="text-[11px] text-rose-400 font-sans font-medium mt-1.5">
                    {t('lobby.maxWagerWarn', { max: GAME_CONFIG.MAX_WAGER })}
                  </p>
                )}
              </div>

              {/* Stake Breakdown */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-xs font-sans text-slate-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('lobby.yourWager')}</span>
                  <span className="text-white font-heading font-bold text-sm flex items-center space-x-1">
                    <span>{wagerChoice || '0'}</span>
                    <GramIcon className="w-3.5 h-3.5 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('lobby.creationFee')}</span>
                  <span className="text-amber-400 font-heading font-bold flex items-center space-x-1">
                    <span>+{creationFeeGram.toFixed(2)}</span>
                    <GramIcon className="w-3.5 h-3.5 text-amber-400" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('lobby.winnerTakes')}</span>
                  <span className="text-emerald-400 font-heading font-bold text-sm flex items-center space-x-1">
                    <span>+{netWinnerPayout}</span>
                    <GramIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2 font-bold text-white">
                  <span className="text-xs uppercase font-heading">{t('lobby.totalNeeded')}</span>
                  <span className="text-purple-300 font-heading font-black text-base flex items-center space-x-1">
                    <span>{totalRequired}</span>
                    <GramIcon className="w-4 h-4 text-purple-400" />
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>{t('lobby.availableBalance')}</span>
                  <span className={`font-heading font-bold text-xs ${isInsufficient ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentBal.toFixed(2)} GRAM
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Notice */}
              {isInsufficient && (
                <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-sans text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{t('lobby.insufficientShort', { total: totalRequired, missing: missingAmount })}</span>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer Action Buttons */}
            <div className="p-4 sm:p-5 pt-3 border-t border-white/10 bg-[#161826] shrink-0 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  triggerImpact('light');
                  setShowCreateModal(false);
                }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-heading font-bold text-slate-400 hover:text-white"
              >
                {t('lobby.cancelBtn')}
              </button>

              {isInsufficient ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerImpact('light');
                    setShowCreateModal(false);
                    onOpenDeposit?.(missingAmount);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{t('lobby.depositMissingBtn', { missing: missingAmount })}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!wagerChoice || parsedWager < effectiveMinWager || isOverMax || isSubmitting}
                  className={`flex-1 py-2.5 font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                    !wagerChoice || parsedWager < effectiveMinWager || isOverMax || isSubmitting
                      ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple active:scale-95'
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
