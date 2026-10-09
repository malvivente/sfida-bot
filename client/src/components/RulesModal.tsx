import React, { useState } from 'react';
import { ShieldCheck, TrendingUp, Users, X, FileText, CheckCircle2 } from 'lucide-react';
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
  const [activeSection, setActiveSection] = useState<'fairplay' | 'fees' | 'affiliates'>('fairplay');

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
        className="bg-[#111420]/95 border border-white/15 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
      >
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-heading font-black text-white tracking-wide">
              {t('rules.title')}
            </h2>
          </div>
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex border-b border-white/10 bg-black/40 p-1.5 space-x-1 text-xs">
          {[
            { id: 'fairplay', label: t('rules.fairplay'), icon: ShieldCheck },
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
                className={`flex-1 py-2 rounded-xl font-heading font-bold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple'
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
        <div className="p-4 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed font-sans">
          {activeSection === 'fairplay' && (
            <div className="space-y-3">
              <div className="bg-[#141724]/90 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-300 font-heading font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>{t('rules.escrowTitle')}</span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {t('rules.escrowP1')}
                </p>
                <p className="text-xs text-slate-400">
                  {t('rules.escrowP2')}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start space-x-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200">{t('rules.transparency')}</span>
                </div>
                <div className="flex items-start space-x-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200">{t('rules.autoRefund')}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'fees' && (
            <div className="space-y-3">
              <div className="bg-[#141724]/90 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-amber-300 font-heading font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>{t('rules.feesTitle')}</span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {t('rules.feesDesc')}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs space-y-1.5">
                <div className="text-white font-heading font-black mb-1">{t('rules.example')}</div>
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span>{t('rules.wagerPerPlayer')}</span>
                  <span className="font-heading font-bold text-white flex items-center space-x-1">
                    <span>1.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span>{t('rules.poolGenerated')}</span>
                  <span className="font-heading font-bold text-white flex items-center space-x-1">
                    <span>2.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-1 text-emerald-400 font-heading font-black">
                  <span>{t('rules.netPrize')}</span>
                  <span className="flex items-center space-x-1">
                    <span>+2.00</span>
                    <GramIcon className="w-3 h-3 text-emerald-400" />
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-medium">
                {t('rules.pariMutuelDesc')}
              </p>
            </div>
          )}

          {activeSection === 'affiliates' && (
            <div className="space-y-3">
              <div className="bg-[#141724]/90 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-purple-300 font-heading font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>{t('rules.affiliatesTitle')}</span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {t('rules.affiliatesDesc')}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <strong className="text-white font-heading font-bold block mb-0.5">{t('rules.affiliateDirect')}</strong>
                  <span className="text-slate-300 font-medium">{t('rules.affiliateDirectDesc')}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <strong className="text-white font-heading font-bold block mb-0.5">{t('rules.affiliateGroup')}</strong>
                  <span className="text-slate-300 font-medium">{t('rules.affiliateGroupDesc')}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <strong className="text-white font-heading font-bold block mb-0.5">{t('rules.affiliatePayout')}</strong>
                  <span className="text-slate-300 font-medium">{t('rules.affiliatePayoutDesc')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex justify-end">
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-heading font-black text-xs uppercase tracking-wider rounded-2xl shadow-epic-purple active:scale-95 transition-all"
          >
            {t('rules.understood')}
          </button>
        </div>

      </div>
    </div>
  );
};
