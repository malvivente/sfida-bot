import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Navbar } from './components/Navbar.js';
import { Arena } from './pages/Arena.js';
import { ReferralDashboard } from './pages/ReferralDashboard.js';
import { Profile } from './pages/Profile.js';
import { RulesModal } from './components/RulesModal.js';
import { ShieldCheck, BookOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'arena' | 'profile' | 'referrals'>('arena');
  const [deepMatchId, setDeepMatchId] = useState<string | undefined>(undefined);
  const [deepRole, setDeepRole] = useState<'player' | 'spectator'>('player');
  const [showRulesModal, setShowRulesModal] = useState(false);

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
      setDeepRole('player');
      setActiveTab('arena');
    } else if (startParam.startsWith('spectate_')) {
      const parts = startParam.split('_');
      setDeepMatchId(parts[1]);
      setDeepRole('spectator');
      setActiveTab('arena');
    } else if (startParam.startsWith('ref_')) {
      setActiveTab('referrals');
    }
  }, []);

  return (
    <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 pb-20 select-none font-rajdhani relative">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRules={() => setShowRulesModal(true)}
      />

      <main className="w-full max-w-md">
        {activeTab === 'arena' && (
          <Arena initialMatchId={deepMatchId} role={deepRole} />
        )}
        {activeTab === 'referrals' && <ReferralDashboard />}
        {activeTab === 'profile' && <Profile />}
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-md mt-6 pt-4 border-t border-cyber-border/40 flex items-center justify-center text-[11px] text-slate-500 font-chakra space-x-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan" />
        <span>GRAM Smart Contract Escrow • Fair Play Zero House Risk</span>
      </footer>

      {/* Floating Action Button for ToS / Rules - Fixed in bottom-right corner */}
      <button
        onClick={() => setShowRulesModal(true)}
        title="Regole del Gioco & Termini (ToS)"
        aria-label="Regole e Termini"
        className="fixed bottom-5 right-4 z-40 bg-cyber-card/95 hover:bg-cyber-cyan text-slate-200 hover:text-cyber-bg border border-cyber-cyan/50 hover:border-cyber-cyan shadow-neon-cyan backdrop-blur-md px-3.5 py-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-orbitron font-bold uppercase tracking-wider transition-all active:scale-95 group"
      >
        <BookOpen className="w-4 h-4 text-cyber-cyan group-hover:text-cyber-bg transition-colors" />
        <span>REGOLE / TOS</span>
      </button>

      {/* Rules & ToS Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
};

export default App;
