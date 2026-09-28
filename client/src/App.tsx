import React, { useEffect, useState } from 'react';
import { Arena } from './pages/Arena.js';
import { ReferralDashboard } from './pages/ReferralDashboard.js';
import { Profile } from './pages/Profile.js';
import { Leaderboard } from './pages/Leaderboard.js';
import { RulesModal } from './components/RulesModal.js';
import { TrustJackpotModal } from './components/TrustJackpotModal.js';
import { DepositModal } from './components/DepositModal.js';
import { TelegramTopSlot } from './components/TelegramTopSlot.js';
import { EpicHeader } from './components/EpicHeader.js';
import { EpicBottomNav, EpicTab } from './components/EpicBottomNav.js';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from './i18n/index.js';
import { useTelegramViewport, isDesktopPlatform, isHorizontalScreen } from './hooks/useTelegramViewport.js';
import { requestTelegramFullscreen, exitTelegramFullscreen, getTelegramWebApp } from './utils/telegram.js';
import { useTelegram } from './hooks/useTelegram.js';
import { useTonClashContract } from './hooks/useTonClashContract.js';
import { GameType } from './types/index.js';

export const App: React.FC = () => {
  const { isFullscreen, topInset } = useTelegramViewport();
  const [activeTab, setActiveTab] = useState<EpicTab>('home');
  const [deepMatchId, setDeepMatchId] = useState<string | undefined>(undefined);
  const [deepInviteCode, setDeepInviteCode] = useState<string | undefined>(undefined);
  const [deepRole, setDeepRole] = useState<'player' | 'spectator'>('player');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [jackpotGram, setJackpotGram] = useState<string>('5.00');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [isInsideMatch, setIsInsideMatch] = useState(false);
  const [lastTabBeforeLeaderboard, setLastTabBeforeLeaderboard] = useState<EpicTab>('profile');
  const [pendingCreateGame, setPendingCreateGame] = useState<GameType | null>(null);
  const { t } = useI18n();

  // Periodic Trust Jackpot fetch from server
  useEffect(() => {
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

  const { userId, username, firstName, lastName, fullName, displayName, photoUrl } = useTelegram();
  const { userAddress } = useTonClashContract();

  // In-bot balance state synced from localStorage / server
  const [userBalanceGram, setUserBalanceGram] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_user_balance');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.balanceGram || parsed.balanceTon || '0.00';
      }
      return '0.00';
    } catch {
      return '0.00';
    }
  });

  // Fetch live balance from backend and keep header in sync
  const fetchLiveBalance = React.useCallback(async () => {
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    if (!serverUrl) return;
    const targetKey = userAddress || (userId ? `tg_${userId}` : '');
    if (!targetKey) return;

    try {
      const q = new URLSearchParams();
      if (userId) q.set('telegramId', String(userId));
      if (username) q.set('username', username);
      const disp = displayName || fullName;
      if (disp) q.set('displayName', disp);
      if (photoUrl) q.set('photoUrl', photoUrl);

      const res = await fetch(`${serverUrl}/api/users/${targetKey}/balance?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.account) {
          const bal = data.account.balanceGram || data.account.balanceTon || '0.00';
          setUserBalanceGram(bal);
          try {
            localStorage.setItem('sfidabot_user_balance', JSON.stringify(data.account));
          } catch {}
        }
      }
    } catch {}
  }, [userAddress, userId, username, displayName, fullName, photoUrl]);

  // Sync balance on user/wallet change and periodically
  useEffect(() => {
    fetchLiveBalance();
    const interval = setInterval(fetchLiveBalance, 6000);
    return () => clearInterval(interval);
  }, [fetchLiveBalance]);

  // Listen to global balance update events from deposits / wins / matches
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail?.balance !== undefined) {
        setUserBalanceGram(String(e.detail.balance));
      } else {
        fetchLiveBalance();
      }
    };
    window.addEventListener('sfida_balance_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sfida_balance_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchLiveBalance]);

  // Open rooms counter for Duels badge
  const [openRoomsCount, setOpenRoomsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_saved_matches');
      if (saved) {
        const matches = JSON.parse(saved);
        return Array.isArray(matches) ? matches.filter((m: any) => m.state === 'LOBBY' && !m.playerB).length : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  // Sync open rooms count from localStorage periodically
  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('sfidabot_saved_matches');
        if (saved) {
          const matches = JSON.parse(saved);
          if (Array.isArray(matches)) {
            setOpenRoomsCount(matches.filter((m: any) => m.state === 'LOBBY' && !m.playerB).length);
          }
        }
      } catch {}
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Automatic profile & avatar synchronization with server on app launch
  useEffect(() => {
    if (!userId) return;
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    if (!serverUrl) return;

    fetch(`${serverUrl}/api/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: userId,
        username,
        firstName,
        lastName,
        fullName,
        photoUrl,
        walletAddress: userAddress,
      }),
    }).catch(() => {});
  }, [userId, username, firstName, lastName, fullName, photoUrl, userAddress]);

  useEffect(() => {
    // Automatically request fullscreen on mobile portrait, or exit fullscreen on desktop/horizontal
    const ensureFullscreen = () => {
      try {
        const tg = getTelegramWebApp();
        if (!tg) return;

        if (isDesktopPlatform() || isHorizontalScreen()) {
          if (tg.isFullscreen) {
            exitTelegramFullscreen();
          }
          return;
        }

        if (!tg.isFullscreen) {
          requestTelegramFullscreen();
        }
      } catch (err) {
        console.warn('[Telegram] ensureFullscreen error:', err);
      }
    };

    try {
      const tg = getTelegramWebApp();
      if (tg) {
        tg.ready?.();
        tg.expand?.();
      }
      ensureFullscreen();
    } catch {
      // Browser preview fallback
    }

    const t1 = setTimeout(ensureFullscreen, 50);
    const t2 = setTimeout(ensureFullscreen, 150);
    const t3 = setTimeout(ensureFullscreen, 400);
    const t4 = setTimeout(ensureFullscreen, 800);
    const t5 = setTimeout(ensureFullscreen, 1500);

    window.addEventListener('click', ensureFullscreen, { passive: true });
    window.addEventListener('touchstart', ensureFullscreen, { passive: true });
    window.addEventListener('pointerdown', ensureFullscreen, { passive: true });
    window.addEventListener('resize', ensureFullscreen, { passive: true });
    window.addEventListener('orientationchange', ensureFullscreen, { passive: true });

    // Parse Telegram startapp parameter or URL query
    const params = new URLSearchParams(window.location.search);
    const tg = getTelegramWebApp();
    const startParam = tg?.initDataUnsafe?.start_param || params.get('startapp') || '';

    if (startParam.startsWith('duel_')) {
      const parts = startParam.split('_');
      setDeepMatchId(parts[1]);
      if (parts[2]) {
        setDeepInviteCode(parts[2]);
        try {
          const stored = JSON.parse(localStorage.getItem('sfidabot_invite_codes') || '{}');
          stored[parts[1]] = parts[2];
          localStorage.setItem('sfidabot_invite_codes', JSON.stringify(stored));
        } catch {}
      }
      setDeepRole('player');
      setActiveTab('home');
    } else if (startParam.startsWith('spectate_')) {
      const parts = startParam.split('_');
      setDeepMatchId(parts[1]);
      setDeepRole('spectator');
      setActiveTab('home');
    } else if (startParam.startsWith('ref_')) {
      setActiveTab('referrals');
    } else if (startParam.startsWith('lead_') || params.get('tab') === 'leaderboard') {
      setActiveTab('leaderboard');
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      window.removeEventListener('click', ensureFullscreen);
      window.removeEventListener('touchstart', ensureFullscreen);
      window.removeEventListener('pointerdown', ensureFullscreen);
      window.removeEventListener('resize', ensureFullscreen);
      window.removeEventListener('orientationchange', ensureFullscreen);
    };
  }, []);

  // Scroll to top instantly on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  return (
    <div
      className={`min-h-screen bg-[#0e1015] text-slate-100 flex flex-col items-center justify-start px-3 sm:px-4 select-none font-sans relative ${
        isFullscreen ? 'pt-1' : 'pt-2'
      }`}
    >
      {/* Top clearance for Telegram Fullscreen mode */}
      <TelegramTopSlot isFullscreen={isFullscreen} topInset={topInset} />

      {/* Modern Epic Header (Hidden during active duel arena to give 100% screen focus) */}
      {!isInsideMatch && (
        <EpicHeader
          userBalanceGram={userBalanceGram}
          onOpenDeposit={() => setShowDepositModal(true)}
          photoUrl={photoUrl}
          displayName={displayName || fullName || username}
          username={username}
          onOpenRules={() => setShowRulesModal(true)}
          onOpenProfile={() => setActiveTab('profile')}
        />
      )}

      {/* Main Content Area */}
      <main className={`w-full max-w-md ${!isInsideMatch ? 'pb-24' : 'pb-6'}`}>
        {/* Tab 1: DUELS (Public & Private Arena Duels Lobbies with Filters, Search, NO Banners) */}
        {activeTab === 'duels' && (
          <Arena
            showBanners={false}
            showMatchesList={true}
            initialMatchId={deepMatchId}
            initialInviteCode={deepInviteCode}
            role={deepRole}
            onClearDeepMatch={() => {
              setDeepMatchId(undefined);
              setDeepInviteCode(undefined);
            }}
            onMatchActiveChange={setIsInsideMatch}
            onOpenAffiliates={() => setActiveTab('referrals')}
            onOpenJackpotModal={() => setShowJackpotModal(true)}
            onBalanceUpdated={setUserBalanceGram}
            initialCreateGame={pendingCreateGame}
            onClearInitialCreateGame={() => setPendingCreateGame(null)}
          />
        )}

        {/* Tab 2: HOME (Epic Banners + Live Activity + Play Hub, ZERO Duels List Redundancy) */}
        {activeTab === 'home' && (
          <Arena
            showBanners={true}
            showMatchesList={false}
            onOpenSpectate={() => setActiveTab('duels')}
            initialMatchId={deepMatchId}
            initialInviteCode={deepInviteCode}
            role={deepRole}
            onClearDeepMatch={() => {
              setDeepMatchId(undefined);
              setDeepInviteCode(undefined);
            }}
            onMatchActiveChange={setIsInsideMatch}
            onOpenAffiliates={() => setActiveTab('referrals')}
            onOpenJackpotModal={() => setShowJackpotModal(true)}
            onBalanceUpdated={setUserBalanceGram}
            initialCreateGame={pendingCreateGame}
            onClearInitialCreateGame={() => setPendingCreateGame(null)}
          />
        )}

        {/* Tab 3: REFERRALS & GROUPS */}
        {activeTab === 'referrals' && <ReferralDashboard />}

        {/* Tab 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <Leaderboard onBack={() => setActiveTab(lastTabBeforeLeaderboard)} />
        )}

        {/* Tab 5: PROFILE & WALLET */}
        {activeTab === 'profile' && (
          <Profile
            onResumeDuel={(matchId) => {
              setDeepMatchId(matchId);
              setDeepRole('player');
              setActiveTab('duels');
            }}
            onGoToDuels={() => setActiveTab('duels')}
            onOpenLeaderboard={() => {
              setLastTabBeforeLeaderboard('profile');
              setActiveTab('leaderboard');
            }}
          />
        )}
      </main>

      {/* Subtle Footer (Visible only when not in active match) */}
      {!isInsideMatch && (
        <footer className="w-full max-w-md pb-24 pt-2 flex items-center justify-center text-[10px] text-slate-500 font-medium space-x-1.5 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{t('footer.escrow')}</span>
        </footer>
      )}

      {/* Epic Bottom Navigation Dock (Hidden during active combat arena) */}
      {!isInsideMatch && (
        <EpicBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab !== 'home' && tab !== 'duels') {
              setDeepMatchId(undefined);
              setDeepInviteCode(undefined);
            }
            if (tab === 'leaderboard' && activeTab !== 'leaderboard') {
              setLastTabBeforeLeaderboard(activeTab === 'profile' ? 'profile' : 'home');
            }
            setActiveTab(tab);
          }}
          openRoomsCount={openRoomsCount}
        />
      )}

      {/* Rules & ToS Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Trust Jackpot Explainer Modal */}
      <TrustJackpotModal
        isOpen={showJackpotModal}
        onClose={() => setShowJackpotModal(false)}
        jackpotGram={jackpotGram}
        onPlaySplitSteal={() => {
          setShowJackpotModal(false);
          setActiveTab('home');
          setPendingCreateGame('split');
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent('sfida_open_create_game', { detail: { game: 'split' } }));
            } catch {}
          }, 50);
        }}
      />

      {/* Quick Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        currentBalanceGram={userBalanceGram}
        onSuccess={(newBal) => {
          if (newBal) {
            setUserBalanceGram(newBal);
          } else {
            fetchLiveBalance();
          }
        }}
      />
    </div>
  );
};

export default App;
