import React, { useState } from 'react';
import { Wrench, ShieldAlert, RotateCw, ExternalLink, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

interface MaintenanceScreenProps {
  customMessage?: string;
  onRetry: () => Promise<void> | void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  customMessage,
  onRetry,
}) => {
  const { t } = useI18n();
  const { triggerImpact } = useHaptics();
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    triggerImpact('medium');
    setChecking(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090c16] text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Top Header Brand */}
      <div className="w-full flex items-center justify-center pt-2 z-10">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] font-heading font-black tracking-widest text-amber-300 uppercase">
            SFIDA ARENA • MAINTENANCE
          </span>
        </div>
      </div>

      {/* Center Hero Content */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-6 my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#181d2e] to-cyan-500/20 border border-amber-400/40 p-1 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.25)]">
            <div className="w-full h-full rounded-2xl bg-[#0d111d] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
              <Wrench className="w-12 h-12 text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
            </div>
          </div>

          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-[#121624] border border-cyan-400/50 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Title and Badges */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-heading font-black tracking-wider uppercase">
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

        {/* Info Box */}
        <div className="w-full bg-[#121624]/90 border border-white/10 rounded-2xl p-3.5 space-y-1.5 text-left text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="font-medium">I tuoi fondi e saldi sono al 100% al sicuro.</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="font-medium">Nessuna partita o puntata andrà persa.</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium">Gli accessi riprenderanno automaticamente al termine.</span>
          </div>
        </div>

        {/* Action Button: Check Status */}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
        >
          <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? t('maintenance.checking') : t('maintenance.retry')}</span>
        </button>
      </div>

      {/* Footer Support Info */}
      <div className="relative z-10 w-full text-center space-y-2 pb-2">
        <a
          href="https://t.me/sfida_arena"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-xs text-cyan-400/90 hover:text-cyan-300 transition-colors font-medium"
        >
          <span>{t('maintenance.officialChannel')}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <p className="text-[10px] text-slate-500 font-mono">
          SFIDA PLATFORM ENGINE • 2026
        </p>
      </div>
    </div>
  );
};
