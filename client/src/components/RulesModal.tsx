import React, { useState } from 'react';
import { ShieldCheck, Swords, TrendingUp, Users, X, FileText, CheckCircle2 } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';
import { useI18n } from '../i18n/index.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const { isFullscreen, topInset } = useTelegramViewport();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<'fairplay' | 'duels' | 'fees' | 'affiliates'>('fairplay');

  if (!isOpen) return null;

  const topOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 16;
  const bottomOffset = isFullscreen ? 24 : 16;

  return (
    <div
      style={{ paddingTop: `${topOffset}px`, paddingBottom: `${bottomOffset}px` }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center px-3 sm:px-4 overflow-y-auto"
    >
      <div
        style={{ maxHeight: `calc(100dvh - ${topOffset + bottomOffset}px)` }}
        className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Modal Header */}
        <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/60">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyber-cyan" />
            <h2 className="text-base font-orbitron font-bold text-white tracking-wide">
              {t('rules.title')}
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
            { id: 'fairplay', label: t('rules.fairplay'), icon: ShieldCheck },
            { id: 'duels', label: t('rules.duels'), icon: Swords },
            { id: 'fees', label: t('rules.fees'), icon: TrendingUp },
            { id: 'affiliates', label: t('rules.affiliates'), icon: Users },
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
                  <span>{t('rules.escrowTitle')}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t('rules.escrowP1')}
                </p>
                <p className="text-xs text-slate-400">
                  {t('rules.escrowP2')}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span>{t('rules.transparency')}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span>{t('rules.autoRefund')}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'duels' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-pink font-bold font-orbitron text-xs">
                  <Swords className="w-4 h-4" />
                  <span>{t('rules.duelsTitle')}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t('rules.duelsDesc')}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-pink block mb-0.5">1. Russian Roulette (8 Chambers, 1 Bullet)</strong>
                  <span>{t('rules.rrRule')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-cyan block mb-0.5">2. Blackjack Face-Up (Duel to 21)</strong>
                  <span>{t('rules.bjRule')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-green block mb-0.5">3. Endless Glass Bridge (Survival Leap)</strong>
                  <span>{t('rules.gbRule')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-amber block mb-0.5">4. Chrono Blind (Precision Countdown)</strong>
                  <span>{t('rules.cbRule')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-yellow-400 block mb-0.5">5. Split or Steal (Trust Dilemma & Shared Jackpot)</strong>
                  <span>{t('rules.ssRule')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-slate-300 block mb-0.5">6. Automated Prize Settlement & Rematches</strong>
                  <span>{t('rules.settleRule')}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'fees' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-amber font-bold font-orbitron text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>{t('rules.feesTitle')}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t('rules.feesDesc')}
                </p>
              </div>

              <div className="bg-cyber-bg/50 border border-cyber-border rounded-xl p-3 text-xs space-y-1.5 font-chakra">
                <div className="text-white font-bold mb-1 font-orbitron">{t('rules.example')}</div>
                <div className="flex justify-between items-center">
                  <span>{t('rules.wagerPerPlayer')}</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>1.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('rules.poolGenerated')}</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>2.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-cyber-border pt-1 text-cyber-green font-bold">
                  <span>{t('rules.netPrize')}</span>
                  <span className="flex items-center space-x-1">
                    <span>+1.92</span>
                    <GramIcon className="w-3 h-3 text-cyber-green" />
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {t('rules.pariMutuelDesc')}
              </p>
            </div>
          )}

          {activeSection === 'affiliates' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-cyan font-bold font-orbitron text-xs">
                  <Users className="w-4 h-4" />
                  <span>{t('rules.affiliatesTitle')}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {t('rules.affiliatesDesc')}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">{t('rules.affiliateDirect')}</strong>
                  <span className="text-slate-300">{t('rules.affiliateDirectDesc')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">{t('rules.affiliateGroup')}</strong>
                  <span className="text-slate-300">{t('rules.affiliateGroupDesc')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">{t('rules.affiliatePayout')}</strong>
                  <span className="text-slate-300">{t('rules.affiliatePayoutDesc')}</span>
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
            {t('rules.understood')}
          </button>
        </div>

      </div>
    </div>
  );
};
