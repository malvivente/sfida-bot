import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { Swords, User, Users } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';

interface NavbarProps {
  activeTab: 'arena' | 'profile' | 'referrals';
  onTabChange: (tab: 'arena' | 'profile' | 'referrals') => void;
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenRules }) => {
  const { triggerSelection, triggerImpact } = useHaptics();

  const handleTab = (tab: 'arena' | 'profile' | 'referrals') => {
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
              CYBER QUICKDRAW
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TonConnectButton />
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-cyber-card border border-cyber-border rounded-xl p-1 shadow-md">
        <button
          onClick={() => handleTab('arena')}
          className={`flex-1 py-2 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'arena'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>ARENA</span>
        </button>

        <button
          onClick={() => handleTab('referrals')}
          className={`flex-1 py-2 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'referrals'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>AFFILIATI</span>
        </button>

        <button
          onClick={() => handleTab('profile')}
          className={`flex-1 py-2 rounded-lg text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === 'profile'
              ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>PROFILO</span>
        </button>
      </nav>
    </header>
  );
};
