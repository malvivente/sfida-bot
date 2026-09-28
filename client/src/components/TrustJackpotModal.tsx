import React from 'react';
import { Trophy, Sparkles, X, Shield, ArrowRight, Flame, Lock, Users, Zap, CheckCircle2 } from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';

interface TrustJackpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  jackpotGram?: string;
  onPlaySplitSteal?: () => void;
}

export const TrustJackpotModal: React.FC<TrustJackpotModalProps> = ({
  isOpen,
  onClose,
  jackpotGram = '5.00',
  onPlaySplitSteal,
}) => {
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const { isFullscreen, topInset } = useTelegramViewport();

  if (!isOpen) return null;

  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 12;
  const modalBottomOffset = isFullscreen ? 24 : 12;

  const currentJackpotNum = parseFloat(jackpotGram || '5.00');
  const isActive = currentJackpotNum >= 5.0;

  return (
    <div
      style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center px-3 sm:px-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
        className="bg-[#121520] border border-amber-400/40 rounded-3xl max-w-sm w-full shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150 font-sans"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/10 flex items-start justify-between shrink-0 bg-gradient-to-r from-amber-500/10 via-purple-950/30 to-amber-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-[#161826] rounded-[14px] flex items-center justify-center relative">
                <Trophy className="w-5 h-5 text-amber-400" />
                <Sparkles className="w-2.5 h-2.5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-heading font-black text-white tracking-wide">
                  {t('jackpotModal.title')}
                </h3>
                <span className="text-[9px] font-heading font-black px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t('jackpotModal.luckyDropBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                {t('split.title')} • {t('jackpotModal.sharedPool')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 pt-3 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
          {/* Jackpot Amount Hero Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-purple-900/20 to-indigo-950/40 border border-amber-400/50 shadow-inner text-center space-y-2 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
            
            <span className="text-[10px] font-heading font-black text-amber-300 uppercase tracking-widest block">
              {t('jackpotModal.currentPool')}
            </span>

            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl sm:text-4xl font-heading font-black text-white drop-shadow-md">
                {currentJackpotNum.toFixed(2)}
              </span>
              <GramIcon className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-heading font-bold text-amber-300">GRAM</span>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/40 border border-amber-400/30 text-[10px] font-heading font-extrabold">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isActive ? 'text-emerald-300' : 'text-amber-300'}>
                {isActive ? t('jackpotModal.statusActive') : t('jackpotModal.statusCharging')}
              </span>
            </div>
          </div>

          {/* Dinamiche di Gioco */}
          <div className="space-y-2">
            <span className="text-[11px] font-heading font-black text-slate-300 uppercase tracking-wider block">
              {t('jackpotModal.howItWorks')}
            </span>

            {/* Caso 1: Doppio Split */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black text-emerald-400 flex items-center space-x-1.5">
                  <span>🤝</span>
                  <span>{t('jackpotModal.splitTitle')}</span>
                </span>
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {t('jackpotModal.splitBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {t('jackpotModal.splitDesc')}
              </p>
            </div>

            {/* Caso 2: Steal vs Split */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black text-amber-300 flex items-center space-x-1.5">
                  <span>🗡️</span>
                  <span>{t('jackpotModal.stealTitle')}</span>
                </span>
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {t('jackpotModal.stealBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {t('jackpotModal.stealDesc')}
              </p>
            </div>

            {/* Caso 3: Doppio Steal */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-black text-rose-400 flex items-center space-x-1.5">
                  <span>💀</span>
                  <span>{t('jackpotModal.doubleStealTitle')}</span>
                </span>
                <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  {t('jackpotModal.doubleStealBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {t('jackpotModal.doubleStealDesc')}
              </p>
            </div>
          </div>

          {/* Regole di Protezione e Fairplay */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-[10px] font-heading font-black text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5" />
              <span>{t('jackpotModal.safeguardsTitle')}</span>
            </span>
            <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t('jackpotModal.safeguardPublic')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t('jackpotModal.safeguardCooldown')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t('jackpotModal.safeguardReferral')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t('jackpotModal.safeguardMinBet')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 pt-3 border-t border-white/10 bg-[#161826] shrink-0 flex space-x-2">
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-heading font-bold text-slate-400 hover:text-white"
          >
            {t('jackpotModal.close')}
          </button>

          {onPlaySplitSteal && (
            <button
              type="button"
              onClick={() => {
                triggerImpact('medium');
                onClose();
                onPlaySplitSteal();
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-black font-heading font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <span>{t('jackpotModal.playSplitSteal')}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
