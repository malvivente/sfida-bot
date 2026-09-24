import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { Swords, User, Users } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface NavbarProps {
  activeTab: 'arena' | 'leaderboard' | 'referrals' | 'profile';
  onTabChange: (tab: 'arena' | 'leaderboard' | 'referrals' | 'profile') => void;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenRules }) => {
  const { triggerSelection } = useHaptics();
  const { t } = useI18n();

  const handleTab = (tab: 'arena' | 'leaderboard' | 'referrals' | 'profile') => {
    triggerSelection();
    onTabChange(tab);
  };

  return (
    <header className="w-full max-w-md mx-auto mb-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between py-3 px-1">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan flex items-center justify-center shadow-neon-cyan">
            <Swords className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-orbitron font-extrabold tracking-wider text-white">SFIDA ARENA</h1>
            <p className="text-[10px] font-chakra text-cyber-cyan tracking-widest uppercase">
              {t('nav.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TonConnectButton />
        </div>
      </div>

      {/* Navigation Tabs (3 Clean Tabs) */}
      <nav className="flex items-center space-x-1.5 bg-cyber-card border border-cyber-border rounded-xl p-1 shadow-md">
        <button
          onClick={() => handleTab('arena')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'arena'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4 shrink-0" />
          <span>{t('nav.arena')}</span>
        </button>

        <button
          onClick={() => handleTab('referrals')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'referrals'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>{t('nav.affiliates')}</span>
        </button>

        <button
          onClick={() => handleTab('profile')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'profile'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>{t('nav.profile')}</span>
        </button>
      </nav>
    </header>
  );
};
