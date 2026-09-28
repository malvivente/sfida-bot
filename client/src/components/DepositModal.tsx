import React, { useState } from 'react';
import { ArrowDownLeft, X, Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useTelegramViewport } from '../hooks/useTelegramViewport.js';
import { useI18n } from '../i18n/index.js';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalanceGram?: string;
  defaultAmount?: string;
  onSuccess?: (newBalance?: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalanceGram = '0.00',
  defaultAmount = '1.0',
  onSuccess,
}) => {
  const { isFullscreen, topInset } = useTelegramViewport();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const { userId } = useTelegram();
  const { userAddress, sendDepositTransaction, openWalletModal } = useTonClashContract();

  const [depositAmount, setDepositAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const modalTopOffset = isFullscreen ? Math.max(topInset, 80) + 8 : 16;
  const modalBottomOffset = isFullscreen ? 24 : 16;

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;

    if (!userAddress) {
      triggerImpact('medium');
      openWalletModal();
      return;
    }

    setLoading(true);
    setMsg(null);
    triggerImpact('light');

    try {
      const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
      let targetDepositAddress = '';

      try {
        const addrRes = await fetch(`${serverUrl}/api/treasury/address`);
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          targetDepositAddress = addrData?.depositAddress || addrData?.address || '';
        }
      } catch {}

      if (!targetDepositAddress) {
        targetDepositAddress = 'UQDB50s2jHBMMrq5VKt2ChdvDBJ3uqgsDnxrMckjNT1V2wVx';
      }

      // Step 1: Execute on-chain TonConnect transaction
      const txResult = await sendDepositTransaction(
        targetDepositAddress,
        amt.toString(),
        `Sfida Deposit: ${userAddress}`
      );
      const boc = txResult?.boc;

      // Step 2: Request backend to scan and verify the on-chain deposit
      const initialBalNum = parseFloat(currentBalanceGram || '0');
      let finalAccount: any = null;
      let confirmed = false;

      // Poll sync-deposit up to 4 times (every 2.5s) to allow TON block inclusion
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const syncRes = await fetch(`${serverUrl}/api/users/${userAddress}/sync-deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boc,
              telegramId: userId,
            }),
          });
          const syncData = await syncRes.json();
          if (syncData?.account) {
            finalAccount = syncData.account;
            const balNow = parseFloat(syncData.account.balanceGram || syncData.account.balanceTon || '0');
            if (balNow > initialBalNum) {
              confirmed = true;
              break;
            }
          }
        } catch {}

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }

      if (finalAccount) {
        const newBal = finalAccount.balanceGram || finalAccount.balanceTon || (initialBalNum + amt).toFixed(2);
        try {
          localStorage.setItem('sfidabot_user_balance', JSON.stringify(finalAccount));
        } catch {}

        // Fire global balance update event so header and all views update instantly
        window.dispatchEvent(
          new CustomEvent('sfida_balance_updated', { detail: { balance: newBal } })
        );

        onSuccess?.(newBal);
        setMsg({
          type: 'success',
          text: confirmed
            ? t('depositModal.successMsg', { amount: amt.toFixed(2) })
            : `Transazione inviata! L'accredito di ${amt.toFixed(2)} GRAM avviene in automatico appena validato dal blocco.`,
        });

        triggerImpact('heavy');
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        // Fallback reassurance: on-chain tx succeeded
        setMsg({
          type: 'success',
          text: `Transazione confermata nel wallet! Il deposito verrà accreditato automaticamente sul tuo saldo tra pochi istanti.`,
        });
        setTimeout(() => {
          onClose();
        }, 2800);
      }
    } catch (err: any) {
      triggerImpact('heavy');
      const rawMsg = err?.message || '';
      let friendlyError = t('depositModal.errorGeneric');

      if (/Transaction was not sent|reject|cancel|TON_CONNECT_SDK_ERROR/i.test(rawMsg)) {
        friendlyError = t('depositModal.errorRejected');
      } else if (/network|failed to fetch/i.test(rawMsg)) {
        friendlyError = t('depositModal.errorNetwork');
      } else if (rawMsg) {
        friendlyError = rawMsg.replace(/\[TON_CONNECT_SDK_ERROR\]\s*/i, '');
      }

      setMsg({
        type: 'error',
        text: friendlyError,
      });
    } finally {
      setLoading(false);
    }
  };

  const QUICK_AMOUNTS = ['1.0', '5.0', '10.0', '25.0'];

  return (
    <div
      style={{ paddingTop: `${modalTopOffset}px`, paddingBottom: `${modalBottomOffset}px` }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center px-3 sm:px-4 overflow-y-auto"
    >
      <div
        style={{ maxHeight: `calc(100dvh - ${modalTopOffset + modalBottomOffset}px)` }}
        className="bg-[#151821] border border-white/10 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                {t('depositModal.title')}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {t('depositModal.subtitle')}
              </p>
            </div>
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

        {/* Feedback Alert */}
        {msg && (
          <div
            className={`p-3 rounded-2xl border text-xs font-medium flex items-center space-x-2 ${
              msg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="leading-tight">{msg.text}</span>
          </div>
        )}

        {/* Balance Status */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <span>{t('depositModal.currentBalance')}</span>
          <span className="font-heading font-bold text-white flex items-center space-x-1">
            <span>{currentBalanceGram}</span>
            <GramIcon className="w-3 h-3 text-cyan-400" />
          </span>
        </div>

        {/* Input Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-heading font-bold text-slate-300 uppercase tracking-wider block">
            {t('depositModal.amountLabel')}
          </label>
          <div className="flex items-center space-x-2 bg-[#0e1015] border border-white/10 focus-within:border-purple-500/60 rounded-2xl px-3.5 py-2.5 transition-all">
            <input
              type="text"
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="1.0"
              className="flex-1 min-w-0 bg-transparent text-lg font-heading font-black text-white focus:outline-none"
            />
            <div className="shrink-0 flex items-center space-x-1.5 text-xs font-heading font-extrabold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-xl border border-cyan-400/20">
              <GramIcon className="w-3.5 h-3.5" />
              <span>GRAM</span>
            </div>
          </div>
        </div>

        {/* Quick Amount Preset Chips */}
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                triggerImpact('light');
                setDepositAmount(amt);
              }}
              className={`py-1.5 rounded-xl text-xs font-heading font-bold border transition-all text-center ${
                depositAmount === amt
                  ? 'bg-purple-600 text-white border-purple-500 shadow-epic-purple'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              +{amt}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-heading font-bold text-slate-300 hover:text-white rounded-2xl transition-all active:scale-95"
          >
            {t('depositModal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDeposit}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-heading font-black rounded-2xl shadow-epic-purple active:scale-95 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>{t('depositModal.confirm')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
