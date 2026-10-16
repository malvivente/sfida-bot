import React, { useState, useEffect } from 'react';
import { QuickdrawCanvas } from '../components/QuickdrawCanvas.js';
import { RussianRouletteArena } from '../components/games/RussianRouletteArena.js';
import { BlackjackArena } from '../components/games/BlackjackArena.js';
import { GlassBridgeArena } from '../components/games/GlassBridgeArena.js';
import { ChronoBlindArena } from '../components/games/ChronoBlindArena.js';
import { SplitStealArena } from '../components/games/SplitStealArena.js';
import { CyberShotgunArena } from '../components/games/CyberShotgunArena.js';
import { Connect4Arena } from '../components/games/Connect4Arena.js';
import { CubeCountArena } from '../components/games/CubeCountArena.js';
import { SpectatorOddsBar } from '../components/SpectatorOddsBar.js';
import { DuelLobby } from '../components/DuelLobby.js';
import { GramIcon } from '../components/GramIcon.js';
import { DepositModal } from '../components/DepositModal.js';
import { useSocket } from '../hooks/useSocket.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { MatchData, UserBalance, FeeConfig, GameType } from '../types/index.js';
import { Address } from '@ton/ton';
import { areAddressesEqual } from '../utils/ton.js';
import { ArrowLeft, Trash2, AlertTriangle, Loader2, CheckCircle2, ArrowDownLeft, AlertCircle, Share2, Swords, X, Target } from 'lucide-react';
import { shareToTelegram } from '../utils/telegram.js';
import { GAMES_METADATA } from '../config/gamesConfig.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { cleanPlayerName } from '../utils/cleanName.js';

interface ArenaProps {
  initialMatchId?: string;
  initialInviteCode?: string;
  role?: 'player' | 'spectator';
  onClearDeepMatch?: () => void;
  onMatchActiveChange?: (isActive: boolean) => void;
  showBanners?: boolean;
  showMatchesList?: boolean;
  onOpenSpectate?: () => void;
  onNavigateToDuels?: (gameType?: string) => void;
  initialGameFilter?: string;
  onClearInitialGameFilter?: () => void;
  onOpenAffiliates?: () => void;
  onOpenJackpotModal?: () => void;
  onBalanceUpdated?: (balance: string) => void;
  initialCreateGame?: GameType | null;
  onClearInitialCreateGame?: () => void;
  initialCreateWager?: string | null;
  onClearInitialCreateWager?: () => void;
  groupChatId?: string;
}

export const Arena: React.FC<ArenaProps> = ({
  initialMatchId,
  initialInviteCode,
  role: initialRole = 'player',
  onClearDeepMatch,
  onMatchActiveChange,
  showBanners = true,
  showMatchesList = true,
  onOpenSpectate,
  onNavigateToDuels,
  initialGameFilter,
  onClearInitialGameFilter,
  onOpenAffiliates,
  onOpenJackpotModal,
  onBalanceUpdated,
  initialCreateGame,
  onClearInitialCreateGame,
  initialCreateWager,
  onClearInitialCreateWager,
  groupChatId,
}) => {
  const { isFullscreen, topInset } = useTelegramViewport();
  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 12;
  const modalBottomOffset = isFullscreen ? 24 : 12;
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);
  const [unavailableMatchNotice, setUnavailableMatchNotice] = useState<{ matchId?: string } | null>(null);

  useEffect(() => {
    onMatchActiveChange?.(Boolean(activeMatchId));
  }, [activeMatchId, onMatchActiveChange]);
  const [role, setRole] = useState<'player' | 'spectator'>(initialRole);
  const [isReady, setIsReady] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [matchToCancel, setMatchToCancel] = useState<MatchData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // In-bot balance & fee configuration
  const [userBalance, setUserBalance] = useState<UserBalance | null>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_user_balance');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [feeConfigData, setFeeConfigData] = useState<FeeConfig | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMsg, setDepositMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    userAddress,
    sendDepositTransaction,
    openWalletModal,
    placeSpectatorBetOnChain,
  } = useTonClashContract();
  const { userId, username, fullName, displayName, botUsername, photoUrl } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
  const [isClaimingPayout, setIsClaimingPayout] = useState(false);
  const [payoutClaimed, setPayoutClaimed] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const fetchUserBalance = async () => {
    const targetKey = userAddress || (userId ? `tg_${userId}` : '');
    if (!targetKey || !serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/users/${targetKey}/balance?telegramId=${userId || ''}&username=${encodeURIComponent(username || '')}&fullName=${encodeURIComponent(fullName || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.account) {
          setUserBalance(data.account);
          onBalanceUpdated?.(data.account.balanceGram || data.account.balanceTon || '0.00');
          try {
            localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
          } catch {}
        }
      }
    } catch {}
  };

  const fetchFeeConfig = async () => {
    if (!serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/config/fees`);
      if (res.ok) {
        const data = await res.json();
        if (data?.config) {
          setFeeConfigData(data.config);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchFeeConfig();
  }, [serverUrl]);

  useEffect(() => {
    fetchUserBalance();
  }, [userAddress, userId, serverUrl]);

  // Persistent match feed: restored from localStorage and/or synced with backend API
  const [matches, setMatches] = useState<MatchData[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_saved_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMatches = async () => {
    setIsRefreshing(true);
    const minSpinPromise = new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const url = serverUrl ? `${serverUrl}/api/matches?_t=${Date.now()}` : `/api/matches?_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.matches && Array.isArray(data.matches)) {
          setMatches(data.matches);
          try {
            localStorage.setItem('sfidabot_saved_matches', JSON.stringify(data.matches.slice(0, 30)));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Backend match polling failed (offline or pending):', err);
    } finally {
      await minSpinPromise;
      setIsRefreshing(false);
    }
  };

  // Fetch live matches from server
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 8000);
    return () => clearInterval(interval);
  }, [serverUrl, activeMatchId]);

  const currentActiveMatch = matches.find((m) => m.matchId === activeMatchId);
  const effectivePlayerAddress = userAddress || (userId ? `tg_${userId}` : '');
  const isMatchPlayer = Boolean(
    currentActiveMatch &&
    (
      (effectivePlayerAddress && (
        areAddressesEqual(currentActiveMatch.playerA.wallet, effectivePlayerAddress) ||
        (currentActiveMatch.playerB?.wallet && areAddressesEqual(currentActiveMatch.playerB.wallet, effectivePlayerAddress))
      )) ||
      (userId && (
        String((currentActiveMatch.playerA as any)?.telegramUserId) === String(userId) ||
        (currentActiveMatch.playerB && String((currentActiveMatch.playerB as any)?.telegramUserId) === String(userId))
      )) ||
      (username && (
        currentActiveMatch.playerA.name?.toLowerCase().includes(username.toLowerCase()) ||
        currentActiveMatch.playerB?.name?.toLowerCase().includes(username.toLowerCase())
      ))
    )
  );
  const initialEffectiveRole: 'player' | 'spectator' = isMatchPlayer ? 'player' : role;

  const socketData = useSocket({
    matchId: activeMatchId || '',
    wallet: effectivePlayerAddress,
    role: initialEffectiveRole,
    telegramId: userId,
    username: cleanPlayerName(displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : (userId ? `Player_${String(userId).slice(-4)}` : 'Warrior'))),
    serverUrl,
  });

  useEffect(() => {
    if (
      socketData.feedMessage?.includes('Match not found') ||
      socketData.feedMessage?.includes('already closed')
    ) {
      setUnavailableMatchNotice({ matchId: activeMatchId || initialMatchId || undefined });
      setActiveMatchId(null);
      onClearDeepMatch?.();
    }
  }, [socketData.feedMessage, activeMatchId, initialMatchId, onClearDeepMatch]);

  // Auto-refresh user balance when match settles or is cancelled
  useEffect(() => {
    if (socketData.roomState === 'MATCH_SETTLED' || socketData.roomState === 'CANCELLED') {
      fetchUserBalance();
      const t1 = setTimeout(fetchUserBalance, 1200);
      const t2 = setTimeout(fetchUserBalance, 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [socketData.roomState]);

  // Handle Real On-Chain Deposit from Tonkeeper
  const handleQuickDeposit = async () => {
    if (!userAddress) {
      openWalletModal();
      return;
    }
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setDepositLoading(true);
    setDepositMsg(null);
    try {
      let targetDepositAddress = '';
      try {
        const addrRes = await fetch(`${serverUrl}/api/treasury/address`);
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          targetDepositAddress = addrData.depositAddress;
        }
      } catch {}

      if (!targetDepositAddress) {
        targetDepositAddress = 'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
      }

      setDepositMsg({ type: 'success', text: 'Confirm the deposit transaction in your Tonkeeper wallet...' });

      let friendlyWallet = userAddress;
      try {
        friendlyWallet = Address.parse(userAddress).toString({ bounceable: false });
      } catch {}

      const txResult = await sendDepositTransaction(
        targetDepositAddress,
        depositAmount,
        'Sfida deposit'
      );

      const boc = txResult?.boc;
      const res = await fetch(`${serverUrl}/api/users/${userAddress}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountGram: depositAmount, boc }),
      });
      const data = await res.json();
      if (res.ok && data?.account) {
        setUserBalance(data.account);
        try {
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
        } catch {}
        setDepositMsg({ type: 'success', text: `Deposit confirmed! +${depositAmount} GRAM added to your balance!` });
        setTimeout(() => {
          setShowDepositModal(false);
          setDepositMsg(null);
        }, 2000);
      } else {
        setDepositMsg({ type: 'error', text: data?.error || 'Deposit verification failed.' });
      }
    } catch (err: any) {
      setDepositMsg({ type: 'error', text: err?.message || 'Transaction rejected in wallet.' });
    } finally {
      setDepositLoading(false);
    }
  };

  // Create match using in-bot balance
  const handleCreateMatch = async (
    wagerGram: string,
    gameType: GameType = 'roulette',
    isPrivate?: boolean,
    targetOpponentUsername?: string
  ): Promise<boolean> => {
    setCreateError(null);

    const playerAddress = userAddress || (userId ? `tg_${userId}` : '');
    if (!playerAddress) {
      openWalletModal();
      setCreateError(t('arena.connectWalletToWager'));
      return false;
    }

    if (!serverUrl) {
      setCreateError(t('arena.serverUnreachable'));
      return false;
    }

    try {
      const playerName = cleanPlayerName(displayName || (userAddress ? `Player_${userAddress.slice(-4)}` : (username ? username.replace(/^@/, '') : 'Warrior')));

      // Call server to create match with in-bot balance
      const res = await fetch(`${serverUrl}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wagerAmountNano: (parseFloat(wagerGram) * 1e9).toString(),
          playerAAddress: playerAddress,
          telegramUserId: userId,
          telegramUsername: cleanPlayerName(displayName || fullName || username || 'Player A'),
          photoUrl: photoUrl || '',
          gameType,
          isPrivate: Boolean(isPrivate) || Boolean(targetOpponentUsername),
          groupChatId,
          targetOpponentUsername: targetOpponentUsername?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'INSUFFICIENT_BALANCE') {
          setDepositAmount(data.missingGram || '1.0');
          setShowDepositModal(true);
        }
        throw new Error(data?.message || data?.error || `Server returned HTTP ${res.status}`);
      }

      if (!data?.matchId) {
        throw new Error('Match ID missing in server response.');
      }

      if (data?.inviteCode) {
        try {
          const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
          stored[data.matchId.toString()] = data.inviteCode;
          localStorage.setItem('sfidabot_invite_codes', JSON.stringify(stored));
        } catch {}
      }

      // Refresh balance
      fetchUserBalance();

      const newMatch: MatchData = {
        matchId: data.matchId.toString(),
        gameType,
        isPrivate: data.isPrivate || false,
        inviteCode: data.inviteCode,
        escrowAddress: data.escrowAddress,
        createdAt: data.createdAt || Date.now(),
        expiresAt: data.expiresAt || (Date.now() + 10 * 60 * 1000),
        targetOpponentUsername: data.targetOpponentUsername,
        state: 'LOBBY',
        currentRound: 1,
        playerA: {
          wallet: playerAddress,
          name: playerName,
          ready: true,
          score: 0,
        },
        playerB: null,
        wagerAmountNano: (parseFloat(wagerGram) * 1e9).toString(),
        totalBetsA: '0',
        totalBetsB: '0',
        oddsA: 1.0,
        oddsB: 1.0,
        spectatorCount: 0,
      };

      setMatches((prev) => [newMatch, ...prev.filter((m) => m.matchId !== newMatch.matchId)]);
      setActiveMatchId(data.matchId.toString());
      setRole('player');
      setIsReady(false);
      return true;
    } catch (err: any) {
      console.warn('Match creation error:', err);
      setCreateError(err?.message || t('arena.serverConnError'));
      return false;
    }
  };

  // Join match using in-bot balance
  const handleJoinMatch = async (match: MatchData, inviteCode?: string, isUserClick: boolean = true) => {
    const playerAddress = userAddress || (userId ? `tg_${userId}` : '');
    if (!playerAddress) {
      if (isUserClick) {
        openWalletModal();
        setCreateError(t('arena.connectWalletToJoin'));
      }
      return;
    }

    const isPlayerA = Boolean(
      (userAddress && areAddressesEqual(match.playerA?.wallet, userAddress)) ||
      (userId && ((match.playerA as any)?.telegramUserId === userId || match.playerA?.wallet === `tg_${userId}`)) ||
      (fullName && match.playerA?.name === fullName) ||
      (username && (match.playerA?.name === `@${username}` || match.playerA?.name?.toLowerCase().includes(username.toLowerCase()))) ||
      (displayName && match.playerA?.name?.toLowerCase().includes(displayName.toLowerCase()))
    );

    const isPlayerB = Boolean(
      match.playerB && (
        (userAddress && areAddressesEqual(match.playerB?.wallet, userAddress)) ||
        (userId && ((match.playerB as any)?.telegramUserId === userId || match.playerB?.wallet === `tg_${userId}`)) ||
        (fullName && match.playerB?.name === fullName) ||
        (username && (match.playerB?.name === `@${username}` || match.playerB?.name?.toLowerCase().includes(username.toLowerCase()))) ||
        (displayName && match.playerB?.name?.toLowerCase().includes(displayName.toLowerCase()))
      )
    );

    const isAlreadyPlayer = isPlayerA || isPlayerB;

    if (isAlreadyPlayer) {
      setActiveMatchId(match.matchId);
      setRole('player');
      setIsReady(false);
      setCreateError(null);
      return;
    }

    const wagerGram = (parseFloat(match.wagerAmountNano) / 1e9).toFixed(2);
    setCreateStatus('Joining duel and reserving wager from balance...');
    try {
      let resolvedCode = inviteCode || initialInviteCode || match.inviteCode;
      if (!resolvedCode && typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
          resolvedCode = stored[match.matchId];
        } catch {}
      }

      const res = await fetch(`${serverUrl}/api/matches/${match.matchId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerBAddress: playerAddress,
          telegramUserId: userId,
          telegramUsername: cleanPlayerName(displayName || fullName || username || 'Player B'),
          rawUsername: username || '',
          photoUrl: photoUrl || '',
          inviteCode: resolvedCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404 || data?.error === 'MATCH_NOT_FOUND' || data?.error === 'MATCH_CANCELLED' || data?.error === 'MATCH_CLOSED') {
          setCreateStatus(null);
          setUnavailableMatchNotice({ matchId: match.matchId });
          return;
        }
        if (data?.error === 'INSUFFICIENT_BALANCE') {
          setDepositAmount(data.missingGram || wagerGram);
          setShowDepositModal(true);
        }
        throw new Error(data?.message || data?.error || 'Failed to join match');
      }

      setCreateStatus(null);
      fetchUserBalance();
      setActiveMatchId(match.matchId);
      setRole('player');
      setIsReady(false);
    } catch (err: any) {
      setCreateStatus(null);
      setCreateError(err?.message || t('arena.joinMatchError'));
    }
  };

  // Sync initialMatchId when navigation passes a match to open
  useEffect(() => {
    if (!initialMatchId) return;

    const resolveDeepMatch = async () => {
      let notFoundOrEnded = false;
      let m = matches.find((x) => x.matchId === initialMatchId);
      if (!m && serverUrl) {
        try {
          const res = await fetch(`${serverUrl}/api/matches/${initialMatchId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.matchId) m = data;
          } else if (res.status === 404) {
            notFoundOrEnded = true;
          }
        } catch {}
      }

      if (m && (m.state === 'MATCH_SETTLED' || m.state === 'FORFEITED' || (m.state as string) === 'CANCELLED' || (m.state as string) === 'RESOLVED' || (m.state as string) === 'FINISHED')) {
        notFoundOrEnded = true;
      }

      if (notFoundOrEnded) {
        setActiveMatchId(null);
        onClearDeepMatch?.();
        setUnavailableMatchNotice({ matchId: initialMatchId });
        return;
      }

      if (!m) {
        setActiveMatchId(initialMatchId);
        setRole(initialRole);
        return;
      }

      const isPlayerA = Boolean(
        (userAddress && areAddressesEqual(m.playerA?.wallet, userAddress)) ||
        (userId && (String((m.playerA as any)?.telegramUserId) === String(userId) || m.playerA?.wallet === `tg_${userId}`)) ||
        (fullName && m.playerA?.name === fullName) ||
        (username && (m.playerA?.name === `@${username}` || m.playerA?.name?.toLowerCase().includes(username.toLowerCase()))) ||
        (displayName && m.playerA?.name?.toLowerCase().includes(displayName.toLowerCase()))
      );

      const isPlayerB = Boolean(
        m.playerB && (
          (userAddress && areAddressesEqual(m.playerB?.wallet, userAddress)) ||
          (userId && (String((m.playerB as any)?.telegramUserId) === String(userId) || m.playerB?.wallet === `tg_${userId}`)) ||
          (fullName && m.playerB?.name === fullName) ||
          (username && (m.playerB?.name === `@${username}` || m.playerB?.name?.toLowerCase().includes(username.toLowerCase()))) ||
          (displayName && m.playerB?.name?.toLowerCase().includes(displayName.toLowerCase()))
        )
      );

      if (isPlayerA || isPlayerB) {
        // Participant resuming duel
        setActiveMatchId(initialMatchId);
        setRole('player');
      } else if (!m.playerB && initialRole === 'player') {
        const hasOpponentSet = Boolean(m.targetOpponentUsername || m.targetOpponentId);
        const cleanTargetUser = m.targetOpponentUsername?.replace(/^@/, '').toLowerCase().trim();
        const cleanUser = username?.replace(/^@/, '').toLowerCase().trim();
        const isTargetUser = Boolean(
          (cleanTargetUser && cleanUser && cleanTargetUser === cleanUser) ||
          (m.targetOpponentId && userId && String(m.targetOpponentId) === String(userId))
        );

        if (hasOpponentSet && !isTargetUser) {
          // If a direct opponent was specified and visitor is not the target, they can only spectate
          setActiveMatchId(initialMatchId);
          setRole('spectator');
          return;
        }

        if (initialInviteCode) {
          try {
            const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
            stored[initialMatchId] = initialInviteCode;
            localStorage.setItem('sfidabot_invite_codes', JSON.stringify(stored));
          } catch {}
        }
        // User opened invite link: auto-join as Player B
        const playerAddress = userAddress || (userId ? `tg_${userId}` : '');
        if (playerAddress) {
          await handleJoinMatch(m, initialInviteCode, false);
        } else {
          setActiveMatchId(initialMatchId);
          setRole('player');
        }
      } else {
        // Duel is full or spectator requested
        setActiveMatchId(initialMatchId);
        setRole('spectator');
      }
    };

    resolveDeepMatch();
  }, [initialMatchId, initialInviteCode, initialRole, userAddress, userId, displayName, fullName, username, serverUrl]);

  const handleSpectateMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setRole('spectator');
  };

  const handleSpectatorBet = async (target: 'A' | 'B' | 'X', amountGram: string) => {
    if (isMatchPlayer) {
      setCreateError(t('arena.spectatorSelfBetDisabled'));
      return;
    }

    const effectiveBettorAddress = userAddress || (userId ? `tg_${userId}` : '');
    if (!effectiveBettorAddress) {
      openWalletModal();
      return;
    }

    const betAmount = parseFloat(amountGram);
    const specFee = feeConfigData?.spectatorFeeGram || 0.05;
    const totalNeeded = betAmount + specFee;
    const curBal = parseFloat(availableBalanceGram || '0');

    if (curBal < totalNeeded) {
      setDepositAmount((totalNeeded - curBal).toFixed(2));
      setShowDepositModal(true);
      return;
    }

    const amountNano = BigInt(Math.round(betAmount * 1e9));
    socketData.placeSpectatorBet(target, amountNano.toString());
  };

  const handleReady = () => {
    setIsReady(true);
    socketData.sendReady();
  };

  const handleClaimPayout = async () => {
    setIsClaimingPayout(true);
    setTimeout(() => {
      setIsClaimingPayout(false);
      setPayoutClaimed(true);
      fetchUserBalance();
    }, 1000);
  };

  const handleCancelMatch = (match: MatchData) => {
    setMatchToCancel(match);
  };

  const confirmCancelMatch = async () => {
    if (!matchToCancel) return;
    const matchIdToCancel = matchToCancel.matchId;
    setIsCancelling(true);
    try {
      if (serverUrl) {
        const res = await fetch(`${serverUrl}/api/matches/${matchIdToCancel}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Failed to cancel match');
        }
      }
      fetchUserBalance();
      if (matchToCancel.playerB) {
        setCancelSuccessMsg(`Match #${matchIdToCancel} cancelled. Wagers refunded to both players!`);
      } else {
        setCancelSuccessMsg(`Match #${matchIdToCancel} cancelled. Wager and fee refunded to your balance!`);
      }
      setMatches((prev) => {
        const updated = prev.filter((m) => m.matchId !== matchIdToCancel);
        try {
          localStorage.setItem('sfidabot_saved_matches', JSON.stringify(updated.slice(0, 30)));
        } catch {}
        return updated;
      });
      if (activeMatchId === matchIdToCancel) {
        setActiveMatchId(null);
        onClearDeepMatch?.();
      }
      setMatchToCancel(null);
      setTimeout(() => setCancelSuccessMsg(null), 4000);
    } catch (err: any) {
      console.warn('Error cancelling match:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const activeWagerTon = currentActiveMatch
    ? (parseFloat(currentActiveMatch.wagerAmountNano) / 1e9).toString()
    : '1';

  const isMatchPlayerResolved = Boolean(
    socketData.socketRole === 'PLAYER_A' ||
    socketData.socketRole === 'PLAYER_B' ||
    (effectivePlayerAddress && socketData.socketPlayerA?.wallet && areAddressesEqual(socketData.socketPlayerA.wallet, effectivePlayerAddress)) ||
    (effectivePlayerAddress && socketData.socketPlayerB?.wallet && areAddressesEqual(socketData.socketPlayerB.wallet, effectivePlayerAddress)) ||
    (userId && socketData.socketPlayerA?.telegramUserId && String(socketData.socketPlayerA.telegramUserId) === String(userId)) ||
    (userId && socketData.socketPlayerB?.telegramUserId && String(socketData.socketPlayerB.telegramUserId) === String(userId)) ||
    isMatchPlayer
  );

  const effectiveRole: 'player' | 'spectator' = (
    socketData.socketRole === 'PLAYER_A' ||
    socketData.socketRole === 'PLAYER_B' ||
    isMatchPlayerResolved
  ) ? 'player' : (socketData.socketRole === 'SPECTATOR' ? 'spectator' : initialEffectiveRole);

  const userSide: 'A' | 'B' = (
    socketData.socketRole === 'PLAYER_B' ||
    (effectivePlayerAddress && socketData.socketPlayerB?.wallet && areAddressesEqual(socketData.socketPlayerB.wallet, effectivePlayerAddress)) ||
    (userId && socketData.socketPlayerB?.telegramUserId && String(socketData.socketPlayerB.telegramUserId) === String(userId)) ||
    (effectivePlayerAddress && currentActiveMatch?.playerB?.wallet && areAddressesEqual(currentActiveMatch.playerB.wallet, effectivePlayerAddress)) ||
    (userId && currentActiveMatch?.playerB && String((currentActiveMatch.playerB as any)?.telegramUserId) === String(userId)) ||
    (username && currentActiveMatch?.playerB && currentActiveMatch.playerB.name?.toLowerCase().includes(username.toLowerCase()))
  ) ? 'B' : 'A';

  const isUserWinner = Boolean(
    socketData.roomState === 'MATCH_SETTLED' &&
    (
      socketData.winnerSide
        ? (socketData.winnerSide === userSide && effectiveRole === 'player')
        : (effectivePlayerAddress && socketData.matchWinner && areAddressesEqual(socketData.matchWinner, effectivePlayerAddress))
    )
  );

  const isCurrentCreator = Boolean(
    socketData.socketRole === 'PLAYER_A' ||
    (effectivePlayerAddress && socketData.socketPlayerA?.wallet && areAddressesEqual(socketData.socketPlayerA.wallet, effectivePlayerAddress)) ||
    (userId && socketData.socketPlayerA?.telegramUserId && String(socketData.socketPlayerA.telegramUserId) === String(userId)) ||
    (currentActiveMatch && (
      (effectivePlayerAddress && areAddressesEqual(currentActiveMatch.playerA.wallet, effectivePlayerAddress)) ||
      (userId && String((currentActiveMatch.playerA as any)?.telegramUserId) === String(userId)) ||
      (fullName && currentActiveMatch.playerA.name === fullName) ||
      (username && (currentActiveMatch.playerA.name === `@${username}` || currentActiveMatch.playerA.name?.toLowerCase().includes(username.toLowerCase())))
    ))
  );

  const liveRoomState = socketData.isConnected ? socketData.roomState : currentActiveMatch?.state;
  const isRematchRoom = Boolean(socketData.isRematch || (currentActiveMatch as any)?.isRematch);

  const canCancelCurrentMatch = Boolean(
    effectiveRole === 'player' &&
    isCurrentCreator &&
    currentActiveMatch &&
    liveRoomState === 'LOBBY' &&
    socketData.countdownSeconds === null &&
    !isRematchRoom
  );

  const effectiveGameType: GameType = socketData.gameType || currentActiveMatch?.gameType || 'roulette';

  const isPlayerTurn = Boolean(
    effectiveGameType === 'chrono'
      ? true
      : socketData.gameData?.currentTurn === userSide
  );

  const hasPlayerB = Boolean(socketData.socketPlayerB || socketData.playerBName || currentActiveMatch?.playerB);
  const playerA_Name = cleanPlayerName(socketData.socketPlayerA?.name || socketData.playerAName || currentActiveMatch?.playerA.name || 'Player A');
  const playerB_Name = cleanPlayerName(socketData.socketPlayerB?.name || socketData.playerBName || currentActiveMatch?.playerB?.name || (hasPlayerB ? 'Player B' : t('arena.waitingForOpponent')));

  const effectiveWinnerName = socketData.matchWinnerName ? cleanPlayerName(socketData.matchWinnerName) : (
    socketData.winnerSide ? (socketData.winnerSide === 'A' ? playerA_Name : playerB_Name) : (
      socketData.matchWinner ? (
        (socketData.socketPlayerA?.wallet && areAddressesEqual(socketData.matchWinner, socketData.socketPlayerA.wallet)) ||
        (currentActiveMatch?.playerA?.wallet && areAddressesEqual(socketData.matchWinner, currentActiveMatch.playerA.wallet))
          ? playerA_Name
          : playerB_Name
      ) : (isUserWinner ? (userSide === 'A' ? playerA_Name : playerB_Name) : undefined)
    )
  );

  const isPrivateMatch = Boolean(currentActiveMatch?.isPrivate || (socketData as any)?.isPrivate);
  const effectiveInviteCode = initialInviteCode || currentActiveMatch?.inviteCode || (activeMatchId ? (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
      return stored[activeMatchId];
    } catch { return undefined; }
  })() : undefined);

  const hasDesignatedOpponent = Boolean(currentActiveMatch?.targetOpponentUsername || currentActiveMatch?.targetOpponentId);
  const cleanTargetOpponent = currentActiveMatch?.targetOpponentUsername?.replace(/^@/, '').toLowerCase().trim();
  const cleanCurrentUsername = username?.replace(/^@/, '').toLowerCase().trim();
  const isTargetOpponent = Boolean(
    (cleanTargetOpponent && cleanCurrentUsername && cleanTargetOpponent === cleanCurrentUsername) ||
    (currentActiveMatch?.targetOpponentId && userId && String(currentActiveMatch.targetOpponentId) === String(userId))
  );

  const canJoinAsPlayer = !hasPlayerB && !isCurrentCreator && (
    hasDesignatedOpponent
      ? isTargetOpponent
      : (!isPrivateMatch || Boolean(effectiveInviteCode))
  );

  const canInviteChallenger = isCurrentCreator && !hasPlayerB && !hasDesignatedOpponent;

  const isMatchInProgress = Boolean(
    isMatchPlayer &&
    (socketData.roomState === 'GAME_ACTIVE' || socketData.roomState === 'SIGNAL_FIRED' || socketData.roomState === 'ROUND_END' || socketData.roomState === 'BETTING_WINDOW' || (socketData.roomState === 'LOBBY' && hasPlayerB))
  );

  const handleAttemptExitMatch = () => {
    if (isMatchInProgress) {
      triggerImpact('heavy');
      setShowExitConfirmModal(true);
    } else {
      triggerImpact('light');
      setActiveMatchId(null);
      onClearDeepMatch?.();
    }
  };

  const handleJoinFromArena = () => {
    if (!currentActiveMatch && activeMatchId) {
      const m = matches.find((x) => x.matchId === activeMatchId);
      if (m) {
        handleJoinMatch(m, m.inviteCode);
      }
      return;
    }
    if (currentActiveMatch) {
      handleJoinMatch(currentActiveMatch, currentActiveMatch.inviteCode);
    }
  };

  const isCurrentUserReady = isReady || (userSide === 'A' ? socketData.playerAReady : socketData.playerBReady);

  const isOpponentInRoom = Boolean(
    userSide === 'A' ? socketData.playerBConnected : socketData.playerAConnected
  );

  const isRematchProposer = Boolean(
    isMatchPlayer &&
    socketData.rematchOffer?.proposerWallet &&
    effectivePlayerAddress &&
    areAddressesEqual(socketData.rematchOffer.proposerWallet, effectivePlayerAddress)
  );

  useEffect(() => {
    if (socketData.roomState === 'LOBBY') {
      const serverReady = userSide === 'A' ? socketData.playerAReady : socketData.playerBReady;
      if (!serverReady) {
        setIsReady(false);
      }
    } else {
      setIsReady(false);
    }
  }, [socketData.roomState, socketData.playerAReady, socketData.playerBReady, userSide]);

  useEffect(() => {
    const handleRematchAccepted = () => {
      setIsReady(false);
    };
    window.addEventListener('sfida_rematch_accepted', handleRematchAccepted);
    return () => {
      window.removeEventListener('sfida_rematch_accepted', handleRematchAccepted);
    };
  }, []);

  useEffect(() => {
    if (activeMatchId && !canCancelCurrentMatch && matchToCancel?.matchId === activeMatchId) {
      setMatchToCancel(null);
    }
  }, [activeMatchId, canCancelCurrentMatch, matchToCancel]);

  const availableBalanceGram = userBalance?.balanceGram || userBalance?.balanceTon || '0.00';

  // Spectator Share (from top bar Share button)
  const handleInGameShare = () => {
    if (!activeMatchId) return;
    triggerImpact('light');
    const m = currentActiveMatch;
    const wager = m ? (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2) : (socketData.activeWagerTon || activeWagerTon || '1.0');
    const gType = effectiveGameType || 'roulette';
    const meta = GAMES_METADATA[gType] || GAMES_METADATA.roulette;

    const text = t('arena.shareSpectatorText', { title: meta.title, wager });
    const url = `https://t.me/${botUsername}?start=spectate_${activeMatchId}`;
    shareToTelegram(url, text);
  };

  // Dedicated Challenger Invite (from Lobby "Invita sfidante" button)
  const handleInviteChallenger = () => {
    if (!activeMatchId) return;
    triggerImpact('medium');
    const m = currentActiveMatch;
    const wager = m ? (parseFloat(m.wagerAmountNano) / 1e9).toFixed(2) : (socketData.activeWagerTon || activeWagerTon || '1.0');
    const gType = effectiveGameType || 'roulette';
    const meta = GAMES_METADATA[gType] || GAMES_METADATA.roulette;
    const isPrivate = m?.isPrivate || false;

    let code = m?.inviteCode || initialInviteCode;
    if (!code && typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
        code = stored[activeMatchId];
      } catch {}
    }

    if (isPrivate && code) {
      const text = t('arena.invitePrivateText', { title: meta.title, wager });
      const url = `https://t.me/${botUsername}?start=duel_${activeMatchId}_${code}`;
      shareToTelegram(url, text);
    } else {
      const text = t('arena.invitePublicText', { title: meta.title, wager });
      const url = `https://t.me/${botUsername}?start=duel_${activeMatchId}`;
      shareToTelegram(url, text);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Toast Confirmation Banner */}
      {cancelSuccessMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl p-3.5 flex items-center space-x-2 text-xs font-sans animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Cancel Match Modal */}
      {matchToCancel && (
        <div
          style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-3 sm:px-4 overflow-y-auto"
        >
          <div
            style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
            className="bg-[#181b29] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto"
          >
            <h3 className="text-base font-heading font-extrabold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              <span>{t('arena.cancelModalTitle')}</span>
            </h3>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {t('arena.cancelModalDesc', { matchId: matchToCancel.matchId })}
            </p>

            <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-slate-400 font-sans">{t('arena.amountToRefund')}</span>
              <span className="text-sm font-heading font-black text-amber-300 flex items-center space-x-1">
                <span>{(parseFloat(matchToCancel.wagerAmountNano) / 1e9 + (feeConfigData?.creationFeeGram || 0.02)).toFixed(2)}</span>
                <GramIcon className="w-3.5 h-3.5 text-amber-400 inline" />
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans">
              {t('arena.cancelRefundNotice')}
              {matchToCancel.playerB && t('arena.cancelOpponentRefundNotice')}
            </p>

            <div className="flex space-x-2.5 pt-1">
              <button
                disabled={isCancelling}
                onClick={() => setMatchToCancel(null)}
                className="flex-1 min-h-[44px] py-2.5 px-3 bg-white/5 border border-white/10 text-slate-300 rounded-2xl font-heading font-bold text-xs uppercase hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center text-center"
              >
                {t('lobby.cancelBtn')}
              </button>
              <button
                disabled={isCancelling}
                onClick={confirmCancelMatch}
                className="flex-1 min-h-[44px] py-2.5 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl font-heading font-extrabold text-xs uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    <span className="leading-tight text-center">{t('arena.refundingBtn')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="leading-tight text-center">{t('arena.confirmCancelBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        currentBalanceGram={availableBalanceGram}
        defaultAmount={depositAmount || '1.0'}
        onSuccess={() => {
          fetchUserBalance();
        }}
      />

      {/* Match Cancelled / Wager Refunded Friendly Notice Modal */}
      {activeMatchId && (socketData.roomState === 'CANCELLED' || Boolean(socketData.kickedInactivity)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/40 p-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl">
              ⏱️
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-heading font-black text-white uppercase tracking-wider">
                {socketData.kickedInactivity ? 'TEMPO SCADUTO' : t('arena.matchCancelledTitle')}
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {socketData.kickedInactivity || socketData.feedMessage || t('arena.matchCancelledDesc')}
              </p>
            </div>
            <div className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono font-bold text-amber-300 flex items-center justify-center space-x-1.5">
              <span>✓ {t('arena.wagerRefundedNotice')}</span>
            </div>
            <button
              onClick={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                socketData.setKickedInactivity?.(null);
                fetchUserBalance();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-heading font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
            >
              {t('arena.returnToLobbyBtn')}
            </button>
          </div>
        </div>
      )}

      {activeMatchId ? (
        <div className="space-y-4">
          {/* Top Header Controls: Back to Lobby + Share + Cancel Duel if Creator */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              onClick={handleAttemptExitMatch}
              className="flex items-center space-x-1.5 text-xs font-heading font-bold text-slate-400 hover:text-cyan-400 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('arena.backToLobby')}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleInGameShare}
                className="flex items-center space-x-1.5 text-[11px] font-heading font-bold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 px-2.5 py-1 rounded-xl transition-all active:scale-95 shadow-sm"
                title={t('arena.shareDuel')}
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('arena.shareDuel')}</span>
              </button>

              {canCancelCurrentMatch && currentActiveMatch && (
                <button
                  onClick={() => handleCancelMatch(currentActiveMatch)}
                  className="flex items-center space-x-1.5 text-[11px] font-heading font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 px-2.5 py-1 rounded-xl transition-all active:scale-95 shadow-sm"
                  title={t('arena.cancelDuel')}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('arena.cancelDuel')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Direct Duel Waiting Banner */}
          {isCurrentCreator && !hasPlayerB && hasDesignatedOpponent && (
            <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-2xl p-2.5 px-3 flex items-center justify-between text-xs font-sans shadow-md animate-in fade-in duration-200">
              <div className="flex items-center space-x-2 min-w-0">
                <Target className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {t('arena.waitingForDirectOpponent', {
                    target: currentActiveMatch?.targetOpponentUsername ? `@${currentActiveMatch.targetOpponentUsername.replace(/^@/, '')}` : t('arena.designatedOpponentFallback')
                  })}
                </span>
              </div>
              <span className="text-[10px] font-heading font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 shrink-0 ml-2">
                {t('arena.privateDuelBadge')}
              </span>
            </div>
          )}

          {/* Dynamic Game Arenas */}
          {effectiveGameType === 'blackjack' ? (
            <BlackjackArena
              gameData={socketData.gameData}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onHit={() => socketData.sendBlackjackAction('HIT')}
              onStand={() => socketData.sendBlackjackAction('STAND')}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              winnerSide={socketData.winnerSide}
              winnerName={effectiveWinnerName}
              spectatorOutcome={socketData.spectatorOutcome}
              placedBet={socketData.placedBet}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'bridge' ? (
            <GlassBridgeArena
              gameData={socketData.gameData}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onStep={socketData.sendBridgeStep}
              onPass={socketData.sendBridgePass}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'chrono' ? (
            <ChronoBlindArena
              gameData={socketData.gameData}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onStop={socketData.sendChronoStop}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'split' ? (
            <SplitStealArena
              matchId={activeMatchId || currentActiveMatch?.matchId}
              gameData={socketData.gameData as any}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onChoice={socketData.sendSplitStealChoice}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              rematchDeclined={isMatchPlayer ? socketData.rematchDeclined : false}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'shotgun' ? (
            <CyberShotgunArena
              gameData={socketData.gameData as any}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onShoot={socketData.sendShotgunShoot}
              onUseItem={socketData.sendShotgunUseItem}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              winnerName={effectiveWinnerName}
              spectatorOutcome={socketData.spectatorOutcome}
              placedBet={socketData.placedBet}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'connect4' ? (
            <Connect4Arena
              gameData={socketData.gameData as any}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onDrop={socketData.sendConnect4Drop}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : effectiveGameType === 'cubecount' ? (
            <CubeCountArena
              gameData={socketData.gameData as any}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onSubmit={socketData.sendCubeCountSubmit}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          ) : (
            <RussianRouletteArena
              gameData={socketData.gameData}
              role={effectiveRole}
              isPlayerTurn={isPlayerTurn}
              onShoot={socketData.sendRouletteShoot}
              playerAName={playerA_Name}
              playerBName={playerB_Name}
              playerAReady={socketData.playerAReady}
              playerBReady={socketData.playerBReady}
              isReady={isCurrentUserReady}
              onReady={handleReady}
              countdownSeconds={socketData.countdownSeconds}
              roomState={socketData.roomState}
              wagerTon={socketData.activeWagerTon || activeWagerTon}
              isCreator={isCurrentCreator}
              onCancelMatch={canCancelCurrentMatch && currentActiveMatch ? () => handleCancelMatch(currentActiveMatch) : undefined}
              isWinner={isUserWinner}
              winnerName={effectiveWinnerName}
              spectatorOutcome={socketData.spectatorOutcome}
              placedBet={socketData.placedBet}
              onClaimPayout={isUserWinner ? handleClaimPayout : undefined}
              isClaimingPayout={isClaimingPayout}
              payoutClaimed={payoutClaimed}
              onReturnToLobby={() => {
                setActiveMatchId(null);
                setPayoutClaimed(false);
                fetchUserBalance();
              }}
              rematchOffer={isMatchPlayer ? socketData.rematchOffer : null}
              onRequestRematch={isMatchPlayer ? socketData.requestRematch : undefined}
              onAcceptRematch={isMatchPlayer ? socketData.acceptRematch : undefined}
              onDeclineRematch={isMatchPlayer ? socketData.declineRematch : undefined}
              isRematchProposer={isRematchProposer}
              opponentConnected={isOpponentInRoom}
              userSide={userSide}
              userAddress={effectivePlayerAddress}
              userBalanceGram={availableBalanceGram}
              onOpenDeposit={(missing) => {
                if (missing) setDepositAmount(missing);
                setShowDepositModal(true);
              }}
              socketError={socketData.socketError}
              hasPlayerB={hasPlayerB}
              onJoinAsPlayer={canJoinAsPlayer ? handleJoinFromArena : undefined}
              onInviteChallenger={canInviteChallenger ? handleInviteChallenger : undefined}
            />
          )}

          {/* Spectator Totalizer Betting Bar - Hidden for Duelists */}
          {!isMatchPlayer && (
            <SpectatorOddsBar
              oddsA={socketData.oddsA}
              oddsB={socketData.oddsB}
              oddsX={socketData.oddsX}
              totalBetsA={socketData.totalBetsA}
              totalBetsB={socketData.totalBetsB}
              totalBetsX={socketData.totalBetsX}
              gameType={effectiveGameType}
              playerAName={socketData.playerAName || currentActiveMatch?.playerA.name || 'Player A'}
              playerBName={socketData.playerBName || currentActiveMatch?.playerB?.name || (currentActiveMatch?.playerB ? 'Player B' : 'Player B')}
              onBet={handleSpectatorBet}
              disabled={socketData.roomState !== 'BETTING_WINDOW'}
              isPlayer={isMatchPlayer}
              roomState={socketData.roomState}
              countdownSeconds={socketData.countdownSeconds}
              placedBet={socketData.placedBet}
              betStatus={socketData.betStatus}
              betError={socketData.betError}
              onClearPlacedBet={socketData.clearPlacedBet}
              spectatorOutcome={socketData.spectatorOutcome}
              winnerName={socketData.matchWinnerName || undefined}
              winnerSide={
                socketData.matchWinner
                  ? currentActiveMatch?.playerA && areAddressesEqual(socketData.matchWinner, currentActiveMatch.playerA.wallet)
                    ? 'A'
                    : 'B'
                  : undefined
              }
            />
          )}
        </div>
      ) : (
        <DuelLobby
          matches={matches}
          onCreateMatch={handleCreateMatch}
          onJoinMatch={handleJoinMatch}
          onSpectateMatch={handleSpectateMatch}
          onCancelMatch={handleCancelMatch}
          onRefreshMatches={fetchMatches}
          isRefreshing={isRefreshing}
          createStatus={createStatus}
          createError={createError}
          onClearError={() => {
            setCreateError(null);
            setCreateStatus(null);
          }}
          userAddress={userAddress}
          onOpenWallet={openWalletModal}
          userBalanceGram={availableBalanceGram}
          creationFeeGram={feeConfigData?.creationFeeGram || 0.05}
          joinFeeGram={feeConfigData?.joinFeeGram || 0.05}
          initialInviteCode={initialInviteCode}
          onOpenDeposit={(missing) => {
            if (missing) setDepositAmount(missing);
            setShowDepositModal(true);
          }}
          showBanners={showBanners}
          showMatchesList={showMatchesList}
          onOpenSpectate={onOpenSpectate}
          onNavigateToDuels={onNavigateToDuels}
          initialGameFilter={initialGameFilter}
          onClearInitialGameFilter={onClearInitialGameFilter}
          onOpenAffiliates={onOpenAffiliates}
          onOpenJackpotModal={onOpenJackpotModal}
          initialCreateGame={initialCreateGame}
          onClearInitialCreateGame={onClearInitialCreateGame}
          initialCreateWager={initialCreateWager}
          onClearInitialCreateWager={onClearInitialCreateWager}
        />
      )}

      {/* Active Match In-Progress Exit Warning Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141724] border-2 border-amber-500/60 p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-heading font-black text-white uppercase tracking-wide">
                {t('arena.exitWarningTitle')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t('arena.exitWarningDesc')}
              </p>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-epic-cyan active:scale-95 transition-all"
              >
                {t('arena.stayInGame')}
              </button>
              <button
                onClick={() => {
                  setShowExitConfirmModal(false);
                  setActiveMatchId(null);
                  onClearDeepMatch?.();
                }}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 font-heading font-bold text-xs uppercase tracking-wider transition-all"
              >
                {t('arena.exitAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unavailable / Concluded Duel Notice Modal */}
      {unavailableMatchNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141724] border-2 border-rose-500/50 p-6 shadow-2xl space-y-5 text-center relative">
            <button
              onClick={() => {
                setUnavailableMatchNotice(null);
                onNavigateToDuels?.('ALL');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <Swords className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-heading font-black text-white uppercase tracking-wide">
                {t('arena.duelUnavailableTitle')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t('arena.duelUnavailableDesc')}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setUnavailableMatchNotice(null);
                  onNavigateToDuels?.('ALL');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-epic-cyan active:scale-95 transition-all"
              >
                {t('arena.goToDuelsBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
