import React, { useState } from 'react';
import {
  X,
  Gift,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useI18n } from '../i18n/index.js';

interface RedeemPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (gramAwarded: string, newBalance?: string) => void;
}

export const RedeemPromoModal: React.FC<RedeemPromoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userId, username, fullName } = useTelegram();
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [code, setCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rewardWon, setRewardWon] = useState<{ gram: string; newBalance?: string } | null>(null);

  if (!isOpen) return null;

  const resolveErrorMessage = (errCode: string, serverMessage?: string): string => {
    switch (errCode) {
      case 'NOT_FOUND':
        return t('promo.errNotFound');
      case 'EXPIRED':
        return t('promo.errExpired');
      case 'EXHAUSTED':
        return t('promo.errExhausted');
      case 'SELF_REDEEM':
        return t('promo.errSelfRedeem');
      case 'ALREADY_REDEEMED':
        return t('promo.errAlreadyRedeemed');
      case 'PREMIUM_REQUIRED':
        return t('promo.errPremiumRequired');
      case 'TELEGRAM_REQUIRED':
        return t('promo.errTelegramRequired');
      case 'NOT_IN_GROUP':
        return serverMessage || t('promo.errNotInGroup');
      default:
        return serverMessage || t('promo.errGeneric');
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) {
      triggerImpact('heavy');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    triggerImpact('medium');

    try {
      const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
      
      // Check if running in Telegram WebApp to extract is_premium
      const tgWebApp = (window as any)?.Telegram?.WebApp;
      const isPremium = !!(tgWebApp?.initDataUnsafe?.user?.is_premium);

      const res = await fetch(`${serverUrl}/api/promocodes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          telegramId: userId ? String(userId) : undefined,
          walletAddress: userAddress || undefined,
          username: username || undefined,
          displayName: fullName || username || 'Duelist',
          isPremium,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(resolveErrorMessage(data.error, data.message));
      }

      triggerImpact('heavy');
      setRewardWon({ gram: data.gramAwarded, newBalance: data.newBalance });

      // Update global balance across entire app
      if (data.newBalance !== undefined) {
        try {
          window.dispatchEvent(new CustomEvent('sfida_balance_updated', { detail: { balance: data.newBalance } }));
        } catch {}
      }

      if (onSuccess) {
        onSuccess(data.gramAwarded, data.newBalance);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('promo.errGeneric'));
      triggerImpact('heavy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setCode('');
    setRewardWon(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#181c2b] via-[#121522] to-[#0d101a] border border-cyan-500/30 p-5 shadow-2xl flex flex-col space-y-4 overflow-hidden my-auto">
        
        {/* Glow ambient effects */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {!rewardWon ? (
          <>
            {/* Header */}
            <div className="text-center space-y-1 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md mx-auto mb-2">
                <Gift className="w-6 h-6 text-cyan-300" />
              </div>
              <h3 className="text-base font-heading font-black text-white tracking-wide">
                {t('promo.redeemModalTitle')}
              </h3>
              <p className="text-xs text-slate-400 font-sans max-w-[260px] mx-auto leading-relaxed">
                {t('promo.redeemModalSubtitle')}
              </p>
            </div>

            {/* Input field (Paste button removed as requested; users can tap & paste directly) */}
            <div className="space-y-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('promo.codeInputPlaceholder')}
                className="w-full bg-black/50 border border-white/20 focus:border-cyan-400 rounded-2xl px-4 py-3 text-center text-sm text-white placeholder-slate-500 font-mono font-bold uppercase tracking-wider focus:outline-none"
              />

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Redeem Action Button */}
            <button
              onClick={handleRedeem}
              disabled={isSubmitting || !code.trim()}
              className={`w-full py-3.5 px-4 rounded-2xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-xl ${
                !code.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-cyan-950/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{t('promo.verifyingStatus')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>{t('promo.redeemNowBtn')}</span>
                </>
              )}
            </button>
          </>
        ) : (
          /* Celebration State */
          <div className="text-center space-y-4 pt-2 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-xl mx-auto">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-heading font-black text-white tracking-wide">
                {t('promo.redeemSuccessTitle')}
              </h3>
              <p className="text-xs text-slate-300">
                {t('promo.redeemSuccessDesc')}
              </p>
            </div>

            {/* Award Banner */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-heading font-bold text-emerald-300 uppercase tracking-widest block mb-1">
                {t('promo.rewardRedeemedLabel')}
              </span>
              <div className="text-3xl font-heading font-black text-white flex items-center justify-center space-x-1.5">
                <span>+{rewardWon.gram}</span>
                <GramIcon className="w-6 h-6 text-amber-300" />
              </div>
              <span className="text-[11px] text-emerald-200/90 font-medium block mt-1">
                {t('promo.creditedToBalance')}
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-slate-950 font-heading font-black rounded-2xl shadow-xl active:scale-[0.98] hover:brightness-105 transition-all text-xs uppercase tracking-wider"
            >
              {t('promo.greatBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
