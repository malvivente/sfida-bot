import React from 'react';
import { Users, Copy, Share2, DollarSign, HelpCircle, Network } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';

export const ReferralDashboard: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();

  const refLink = `https://t.me/sfida_arena_bot?start=ref_${userAddress || 'demo_wallet'}`;

  const copyRefLink = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    alert('Referral link copied to clipboard!');
  };

  const shareToTelegram = () => {
    triggerImpact('medium');
    const text = encodeURIComponent(
      '⚔️ Join Sfida Arena: 1v1 Reflex Duels & Live Spectator Betting on TON! Earn affiliate cuts on every match.'
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Overview Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-pink/15 border border-cyber-pink flex items-center justify-center shadow-neon-pink">
            <Users className="w-6 h-6 text-cyber-pink" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">HOST VS RECRUITER</h2>
            <p className="text-xs font-mono text-slate-400">Automated Affiliate Split Engine</p>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>RECRUITER EARNED</span>
            </div>
            <div className="text-xl font-mono font-extrabold text-cyber-cyan">+8.40 TON</div>
            <div className="text-[10px] text-cyber-muted font-mono mt-0.5">19 Recruits Active</div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono mb-1">
              <Network className="w-3.5 h-3.5 text-cyber-pink" />
              <span>GROUP HOST EARNED</span>
            </div>
            <div className="text-xl font-mono font-extrabold text-cyber-pink">+4.44 TON</div>
            <div className="text-[10px] text-cyber-muted font-mono mt-0.5">38 Matches in Groups</div>
          </div>
        </div>

        {/* Invite Link Controls */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Your Viral Referral Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={refLink}
              className="flex-1 bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
            />
            <button
              onClick={copyRefLink}
              className="p-2.5 bg-cyber-bg border border-cyber-border hover:border-cyber-cyan rounded-xl text-slate-300 active:scale-95 transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={shareToTelegram}
              className="p-2.5 bg-cyber-cyan text-cyber-bg font-bold rounded-xl shadow-neon-cyan active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Case Split Rules Explanation */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-cyber-amber" />
          <span>AFFILIATE SPLIT ALLOCATION MATRIX (30% RAKE)</span>
        </h3>

        <div className="space-y-2 text-xs font-mono">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex justify-between items-center">
            <div>
              <span className="text-white font-bold block">Case 1: Recruiter + Group Chat</span>
              <span className="text-[10px] text-slate-400">Match played in Telegram Group</span>
            </div>
            <span className="text-cyber-green font-bold text-right">
              15% Recruiter<br />15% Group Admin
            </span>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex justify-between items-center">
            <div>
              <span className="text-white font-bold block">Case 2: Recruiter Only</span>
              <span className="text-[10px] text-slate-400">Private / Direct Duel</span>
            </div>
            <span className="text-cyber-cyan font-bold text-right">
              30% to Recruiter
            </span>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex justify-between items-center">
            <div>
              <span className="text-white font-bold block">Case 3: Group Chat Only</span>
              <span className="text-[10px] text-slate-400">No Recruiter assigned</span>
            </div>
            <span className="text-cyber-pink font-bold text-right">
              30% to Group Admin
            </span>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex justify-between items-center">
            <div>
              <span className="text-white font-bold block">Case 4: Direct Solo Play</span>
              <span className="text-[10px] text-slate-400">No Recruiter, No Group</span>
            </div>
            <span className="text-slate-400 font-bold text-right">
              100% to Treasury
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
