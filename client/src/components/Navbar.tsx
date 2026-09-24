import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { Swords, User, Users, Trophy, Globe } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

interface NavbarProps {
  activeTab: 'arena' | 'leaderboard' | 'referrals' | 'profile';
  onTabChange: (tab: 'arena' | 'leaderboard' | 'referrals' | 'profile') => void;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenRules }) => {
  const { triggerSelection, triggerImpact } = useHaptics();
  const { language, toggleLanguage, t } = useI18n();

  const handleTab = (tab: 'arena' | 'leaderboard' | 'referrals' | 'profile') => {
    triggerSelection();
    onTabChange(tab);
  };

  const handleLanguageToggle = () => {
    triggerImpact('light');
    toggleLanguage();
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
          {/* Language Switcher Toggle */}
          <button
            onClick={handleLanguageToggle}
            className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-xs font-chakra font-bold text-slate-200 transition-all shadow-sm active:scale-95"
            title="Switch Language (Italiano / English)"
            aria-label="Switch Language"
          >
            <span className="text-sm">{language === 'it' ? '🇮🇹' : '🇬🇧'}</span>
            <span className="font-orbitron text-[11px] text-cyber-cyan uppercase">{language}</span>
          </button>

          <TonConnectButton />
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-cyber-card border border-cyber-border rounded-xl p-1 shadow-md">
        <button
          onClick={() => handleTab('arena')}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'arena'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('nav.arena')}</span>
        </button>

        <button
          onClick={() => handleTab('leaderboard')}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('nav.leaderboard')}</span>
        </button>

        <button
          onClick={() => handleTab('referrals')}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'referrals'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('nav.affiliates')}</span>
        </button>

        <button
          onClick={() => handleTab('profile')}
          className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
            activeTab === 'profile'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('nav.profile')}</span>
        </button>
      </nav>
    </header>
  );
};
