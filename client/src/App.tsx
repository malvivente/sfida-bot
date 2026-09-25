import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Navbar } from './components/Navbar.js';
import { Arena } from './pages/Arena.js';
import { ReferralDashboard } from './pages/ReferralDashboard.js';
import { Profile } from './pages/Profile.js';
import { Leaderboard } from './pages/Leaderboard.js';
import { RulesModal } from './components/RulesModal.js';
import { TelegramTopSlot } from './components/TelegramTopSlot.js';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { useI18n } from './i18n/index.js';
import { useTelegramViewport } from './hooks/useTelegramViewport.js';

export const App: React.FC = () => {
  const { isFullscreen, topInset } = useTelegramViewport();
  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'profile' | 'referrals'>('arena');
  const [deepMatchId, setDeepMatchId] = useState<string | undefined>(undefined);
  const [deepInviteCode, setDeepInviteCode] = useState<string | undefined>(undefined);
  const [deepRole, setDeepRole] = useState<'player' | 'spectator'>('player');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isInsideMatch, setIsInsideMatch] = useState(false);
  const [lastTabBeforeLeaderboard, setLastTabBeforeLeaderboard] = useState<'arena' | 'profile'>('profile');
  const { language, toggleLanguage, t } = useI18n();

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {
      // Browser preview fallback
    }

    // Parse Telegram startapp parameter or URL query
    const params = new URLSearchParams(window.location.search);
    const startParam = WebApp.initDataUnsafe?.start_param || params.get('startapp') || '';

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
      setActiveTab('arena');
    } else if (startParam.startsWith('spectate_')) {
      const parts = startParam.split('_');
      setDeepMatchId(parts[1]);
      setDeepRole('spectator');
      setActiveTab('arena');
    } else if (startParam.startsWith('ref_')) {
      setActiveTab('referrals');
    } else if (startParam.startsWith('lead_') || params.get('tab') === 'leaderboard') {
      setActiveTab('leaderboard');
    }
  }, []);

  // Floating controls (Language on bottom-left and ToS on bottom-right)
  // are hidden during active game matches to keep the battle screen completely clean
  const showFloatingButtons = activeTab !== 'arena' || !isInsideMatch;

  return (
    <div
      className={`min-h-screen bg-cyber-bg text-slate-100 flex flex-col items-center justify-start px-3 sm:px-6 pb-20 select-none font-rajdhani relative ${
        isFullscreen ? 'pt-1' : 'pt-3'
      }`}
    >
      {/* Top clearance & Jackpot Slot for Telegram Fullscreen mode */}
      <TelegramTopSlot isFullscreen={isFullscreen} topInset={topInset} />

      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== 'arena') {
            setDeepMatchId(undefined);
            setDeepInviteCode(undefined);
          }
          setActiveTab(tab);
        }}
        onOpenRules={() => setShowRulesModal(true)}
      />

      <main className="w-full max-w-md">
        {activeTab === 'arena' && (
          <Arena
            initialMatchId={deepMatchId}
            initialInviteCode={deepInviteCode}
            role={deepRole}
            onClearDeepMatch={() => {
              setDeepMatchId(undefined);
              setDeepInviteCode(undefined);
            }}
            onMatchActiveChange={setIsInsideMatch}
          />
        )}
        {activeTab === 'leaderboard' && (
          <Leaderboard onBack={() => setActiveTab(lastTabBeforeLeaderboard)} />
        )}
        {activeTab === 'referrals' && <ReferralDashboard />}
        {activeTab === 'profile' && (
          <Profile
            onResumeDuel={(matchId) => {
              setDeepMatchId(matchId);
              setDeepRole('player');
              setActiveTab('arena');
            }}
            onOpenLeaderboard={() => {
              setLastTabBeforeLeaderboard('profile');
              setActiveTab('leaderboard');
            }}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-md mt-6 pt-4 border-t border-cyber-border/40 flex items-center justify-center text-[11px] text-slate-500 font-chakra space-x-1.5 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
        <span>{t('footer.escrow')}</span>
      </footer>

      {/* Floating Action Buttons: Language (Bottom-Left) & ToS (Bottom-Right) */}
      {showFloatingButtons && (
        <>
          {/* Language Switcher - Fixed in bottom-left corner */}
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'Passa alla lingua Italiana' : 'Switch to English'}
            aria-label="Toggle language"
            className="fixed bottom-5 left-4 z-40 w-11 h-11 rounded-2xl bg-cyber-card/90 hover:bg-cyber-cyan text-cyber-cyan hover:text-cyber-bg border border-cyber-cyan/50 hover:border-cyber-cyan shadow-neon-cyan backdrop-blur-md flex items-center justify-center transition-all active:scale-95 group font-orbitron font-extrabold text-xs"
          >
            <span className="group-hover:text-cyber-bg transition-colors">
              {language === 'en' ? 'IT' : 'EN'}
            </span>
          </button>

          {/* Rules & ToS (?) - Fixed in bottom-right corner */}
          <button
            onClick={() => setShowRulesModal(true)}
            title="Game Rules & ToS (?)"
            aria-label="Game Rules & ToS"
            className="fixed bottom-5 right-4 z-40 w-11 h-11 rounded-2xl bg-cyber-card/90 hover:bg-cyber-cyan text-cyber-cyan hover:text-cyber-bg border border-cyber-cyan/50 hover:border-cyber-cyan shadow-neon-cyan backdrop-blur-md flex items-center justify-center transition-all active:scale-95 group"
          >
            <HelpCircle className="w-5 h-5 text-cyber-cyan group-hover:text-cyber-bg transition-colors" />
          </button>
        </>
      )}

      {/* Rules & ToS Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
};

export default App;
