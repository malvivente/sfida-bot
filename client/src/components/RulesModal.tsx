import React, { useState } from 'react';
import { ShieldCheck, Swords, TrendingUp, Users, X, FileText, CheckCircle2 } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const { triggerImpact } = useHaptics();
  const [activeSection, setActiveSection] = useState<'fairplay' | 'duels' | 'fees' | 'affiliates'>('fairplay');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/60">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyber-cyan" />
            <h2 className="text-base font-orbitron font-bold text-white tracking-wide">
              RULES & TERMS (ToS)
            </h2>
          </div>
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-cyber-border/40 hover:bg-cyber-border text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex border-b border-cyber-border bg-cyber-bg/40 p-1 space-x-1 text-xs">
          {[
            { id: 'fairplay', label: 'FAIR PLAY', icon: ShieldCheck },
            { id: 'duels', label: '1V1 DUELS', icon: Swords },
            { id: 'fees', label: 'FEES & PRIZES', icon: TrendingUp },
            { id: 'affiliates', label: 'AFFILIATES', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerImpact('light');
                  setActiveSection(tab.id as any);
                }}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all ${
                  isActive
                    ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed font-rajdhani">
          {activeSection === 'fairplay' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-cyan font-bold font-orbitron text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SMART CONTRACT ESCROW (ZERO-HOUSE RISK)</span>
                </div>
                <p className="text-xs text-slate-300">
                  All 1v1 duel wagers and spectator bets are securely held by dedicated smart contracts written in Tact on the <strong>TON</strong> blockchain.
                </p>
                <p className="text-xs text-slate-400">
                  No intermediary or server can seize user funds: outcomes are cryptographically signed with authoritative Ed25519 signatures and settled automatically to the winner at the conclusion of each duel.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span><strong>Total Transparency:</strong> Every transaction and resolution is publicly verifiable on the TON Explorer.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span><strong>Automatic Refund:</strong> If you create a duel and no opponent joins, you can cancel and refund the full wager at any time.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'duels' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-pink font-bold font-orbitron text-xs">
                  <Swords className="w-4 h-4" />
                  <span>CYBER QUICKDRAW COMBAT RULES</span>
                </div>
                <p className="text-xs text-slate-300">
                  Duels are played in a Best-of-3 round format (first player to secure 2 rounds wins the match).
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-cyan block mb-0.5">1. "FIRE!" Signal</strong>
                  <span>Fires randomly between 1.8 and 4.2 seconds. The player with the fastest reaction time (measured in milliseconds) wins the round.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-amber block mb-0.5">2. "WAIT!" Decoy Signal</strong>
                  <span>An amber decoy light designed to test trigger discipline. Pressing during decoy or before the FIRE signal triggers an instant false start ("MISFIRE") penalty and awards the round to your opponent.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-slate-300 block mb-0.5">3. Disconnection & Forfeit</strong>
                  <span>If a player disconnects, an 8-second grace countdown initiates. If they fail to reconnect in time, a forfeit victory is awarded to the opponent.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-pink block mb-0.5">4. Double or Nothing (Rematch 2X)</strong>
                  <span>At the end of a match, either duelist can propose an immediate rematch with 2X the stake! If accepted, both players enter the lobby for doubled stakes.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'fees' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-amber font-bold font-orbitron text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>HOW WINNINGS & FEES WORK</span>
                </div>
                <p className="text-xs text-slate-300">
                  Zero hidden rake. The 1v1 winner collects the total prize pool generated by both players' wagers (2x the stake), minus a standard <strong>4%</strong> platform fee retained by the smart contract.
                </p>
              </div>

              <div className="bg-cyber-bg/50 border border-cyber-border rounded-xl p-3 text-xs space-y-1.5 font-chakra">
                <div className="text-white font-bold mb-1 font-orbitron">Practical Example:</div>
                <div className="flex justify-between items-center">
                  <span>Wager per player:</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>1.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total prize pool generated:</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>2.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-cyber-border pt-1 text-cyber-green font-bold">
                  <span>Net prize to winner (96%):</span>
                  <span className="flex items-center space-x-1">
                    <span>+1.92</span>
                    <GramIcon className="w-3 h-3 text-cyber-green" />
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                For spectator Pari-Mutuel betting, multipliers are dynamic and calculated based on proportional pool volume, with a 6% fee supporting platform liquidity and the affiliate program.
              </p>
            </div>
          )}

          {activeSection === 'affiliates' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-cyan font-bold font-orbitron text-xs">
                  <Users className="w-4 h-4" />
                  <span>EARNING WITH AFFILIATES</span>
                </div>
                <p className="text-xs text-slate-300">
                  Every duelist has a unique invite link. By sharing it with friends or adding the bot to your Telegram groups, you automatically earn a share of every duel played:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Direct Player Referrals</strong>
                  <span className="text-slate-300">Earn up to 30% of platform fees generated from all duels played by friends you invited.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Telegram Group Admins</strong>
                  <span className="text-slate-300">Add the bot to your Telegram community: when members duel within the group, the group admin automatically earns recurring rewards on every match.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Instant On-Chain Payouts</strong>
                  <span className="text-slate-300">Affiliate commissions are credited directly from the smart contract to your linked TON wallet address.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyber-border bg-cyber-bg/80 flex justify-end">
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="w-full py-2.5 bg-cyber-cyan text-cyber-bg font-bold font-orbitron text-xs uppercase tracking-wider rounded-xl shadow-neon-cyan active:scale-95 transition-all"
          >
            UNDERSTOOD
          </button>
        </div>

      </div>
    </div>
  );
};
