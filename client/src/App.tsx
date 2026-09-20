import React, { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Navbar } from './components/Navbar.js';
import { Arena } from './pages/Arena.js';
import { ReferralDashboard } from './pages/ReferralDashboard.js';
import { Profile } from './pages/Profile.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'arena' | 'profile' | 'referrals'>('arena');
  const [deepMatchId, setDeepMatchId] = useState<string | undefined>(undefined);
  const [deepRole, setDeepRole] = useState<'player' | 'spectator'>('player');

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
    <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 select-none">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="w-full max-w-md">
        {activeTab === 'arena' && (
          <Arena initialMatchId={deepMatchId} role={deepRole} />
        )}
        {activeTab === 'referrals' && <ReferralDashboard />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  );
};

export default App;
