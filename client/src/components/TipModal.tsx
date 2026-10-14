import React, { useState, useEffect } from 'react';
import { Coins, Send, X, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { UserAvatar } from './UserAvatar.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { cleanPlayerName } from '../utils/cleanName.js';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalanceGram?: string;
  initialRecipient?: {
    username?: string;
    telegramId?: string;
    displayName?: string;
    photoUrl?: string;
  } | null;
  onTipSuccess?: (newBalance: string) => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  userBalanceGram = '0.00',
  initialRecipient,
  onTipSuccess,
}) => {
  const { userId } = useTelegram();
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('1.00');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialRecipient?.username) {
        setRecipientInput(`@${initialRecipient.username.replace(/^@/, '')}`);
      } else if (initialRecipient?.telegramId) {
        setRecipientInput(initialRecipient.telegramId);
      } else {
        setRecipientInput('');
      }
      setAmountInput('1.00');
      setNoteInput('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialRecipient]);

  if (!isOpen) return null;

  const currentBal = parseFloat(userBalanceGram || '0');
  const parsedAmt = parseFloat(amountInput || '0');
  const isInsufficient = parsedAmt > currentBal;
  const isBelowMin = parsedAmt > 0 && parsedAmt < 0.1;
  const presets = ['0.50', '1.00', '2.00', '5.00', '10.00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientInput.trim() || isNaN(parsedAmt) || parsedAmt <= 0) return;

    if (parsedAmt < 0.1) {
      setErrorMsg(t('tip.errorMin'));
      return;
    }

    if (parsedAmt > currentBal) {
      setErrorMsg(t('tip.errorInsufficient'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

    try {
      const res = await fetch(`${serverUrl}/api/users/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderTelegramId: userId ? String(userId) : undefined,
          senderWallet: userAddress,
          recipientIdentifier: recipientInput.trim(),
          amountGram: parsedAmt.toFixed(2),
          note: noteInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        triggerImpact('heavy');
        setSuccessMsg(t('tip.successMsg', { amount: parsedAmt.toFixed(2) }));
        if (data.senderAccount?.balanceGram) {
          onTipSuccess?.(data.senderAccount.balanceGram);
          window.dispatchEvent(new CustomEvent('sfida_balance_updated', {
            detail: { balance: data.senderAccount.balanceGram }
          }));
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        triggerImpact('heavy');
        setErrorMsg(data?.error || t('tip.errorGeneric'));
      }
    } catch {
      triggerImpact('heavy');
      setErrorMsg(t('tip.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121422] border border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden font-sans">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                {t('tip.title')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('tip.availableLabel', { amount: currentBal.toFixed(2) })}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Target recipient preview / input */}
          {initialRecipient ? (
            <div className="bg-[#181b2a] border border-white/10 rounded-2xl p-2.5 flex items-center space-x-2.5">
              <UserAvatar
                name={cleanPlayerName(initialRecipient.displayName || initialRecipient.username || 'Friend')}
                photoUrl={initialRecipient.photoUrl}
                sizeClass="w-9 h-9"
                textClass="text-xs"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 uppercase font-heading font-bold block">{t('tip.recipientLabel')}</span>
                <p className="text-xs font-heading font-black text-white truncate">
                  {cleanPlayerName(initialRecipient.displayName || initialRecipient.username || 'Friend')}
                </p>
                {initialRecipient.username && (
                  <p className="text-[11px] text-purple-300 font-mono">@{initialRecipient.username.replace(/^@/, '')}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-heading font-black text-slate-300 uppercase tracking-wider block mb-1">
                {t('tip.recipientLabel')}
              </label>
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder={t('tip.recipientPlaceholder')}
                className="w-full bg-[#181a29] border border-white/15 rounded-2xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                required
              />
            </div>
          )}

          {/* Amount selector & input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-heading font-black text-slate-300 uppercase tracking-wider">
                {t('tip.amountLabel')}
              </label>
              <span className="text-[10px] text-slate-400">Min 0.10 GRAM</span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={currentBal.toString()}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#181a29] border border-white/15 rounded-2xl pl-3 pr-16 py-2.5 text-base font-heading font-black text-white focus:outline-none focus:border-emerald-500 transition-all"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-xs font-heading font-black text-emerald-400 pointer-events-none">
                <span>GRAM</span>
                <GramIcon className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerImpact('light');
                    setAmountInput(preset);
                  }}
                  className={`py-1 rounded-xl text-xs font-heading font-bold border transition-all active:scale-95 ${
                    amountInput === preset
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-[11px] font-heading font-black text-slate-300 uppercase tracking-wider block mb-1">
              {t('tip.noteLabel')}
            </label>
            <input
              type="text"
              maxLength={60}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder={t('tip.notePlaceholder')}
              className="w-full bg-[#181a29] border border-white/15 rounded-2xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !recipientInput.trim() || isInsufficient || isBelowMin}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('tip.sending')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t('tip.sendBtn', { amount: parsedAmt > 0 ? `${parsedAmt.toFixed(2)} GRAM` : '' })}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
