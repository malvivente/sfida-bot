import React from 'react';
import { Wrench, ShieldAlert, ExternalLink, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

interface MaintenanceScreenProps {
  customMessage?: string;
  onRetry?: () => Promise<void> | void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  customMessage,
}) => {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 bg-[#07090f] text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />

      {/* Top Header Brand */}
      <div className="w-full flex items-center justify-center pt-2 z-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-[10px] font-heading font-black tracking-widest text-amber-300 uppercase">
            SFIDA ARENA • MAINTENANCE
          </span>
        </div>
      </div>

      {/* Center Hero Content Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-6 my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#121626] to-cyan-500/20 border border-amber-400/40 p-1 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.25)]">
            <div className="w-full h-full rounded-2xl bg-[#0b0e18] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-cyan-500/10" />
              <Wrench className="w-11 h-11 sm:w-12 sm:h-12 text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
            </div>
          </div>

          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-[#0f1422] border border-cyan-400/50 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        {/* Title and Badges */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-heading font-black tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{t('maintenance.badge')}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide uppercase">
            {t('maintenance.title')}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-[320px] mx-auto font-medium">
            {customMessage || t('maintenance.desc')}
          </p>
        </div>

        {/* Glass Info Box */}
        <div className="w-full bg-[#101424]/80 border border-white/10 rounded-2xl p-4 space-y-2.5 text-left text-xs shadow-2xl backdrop-blur-xl">
          <div className="flex items-start space-x-2.5 text-slate-300">
            <div className="mt-0.5 p-1 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11.5px] leading-snug">{t('maintenance.point1')}</span>
          </div>
          <div className="flex items-start space-x-2.5 text-slate-300">
            <div className="mt-0.5 p-1 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11.5px] leading-snug">{t('maintenance.point2')}</span>
          </div>
          <div className="flex items-start space-x-2.5 text-slate-300">
            <div className="mt-0.5 p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11.5px] leading-snug">{t('maintenance.point3')}</span>
          </div>
        </div>
      </div>

      {/* Footer Support Info */}
      <div className="relative z-10 w-full text-center space-y-2 pb-3">
        <a
          href="https://t.me/sfida"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 transition-all font-heading font-bold"
        >
          <span>{t('maintenance.officialChannel')}</span>
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
        </a>
        <p className="text-[10px] text-slate-500 font-mono tracking-wider">
          SFIDA PLATFORM ENGINE • 2026
        </p>
      </div>
    </div>
  );
};
