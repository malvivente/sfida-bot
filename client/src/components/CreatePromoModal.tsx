import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Sparkles,
  Clock,
  Crown,
  Users,
  Copy,
  Check,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useI18n } from '../i18n/index.js';
import { shareToTelegram } from '../utils/telegram.js';

interface CreatePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalanceGram?: string;
  onSuccess?: (promoCode: any, newBalance?: string) => void;
}

export const CreatePromoModal: React.FC<CreatePromoModalProps> = ({
  isOpen,
  onClose,
  userBalanceGram = '0.00',
  onSuccess,
}) => {
  const { userId, username, fullName } = useTelegram();
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  // Economic Parameters
  const [maxClaims, setMaxClaims] = useState<number>(10);
  const [gramPerClaim, setGramPerClaim] = useState<string>('0.50');
  const [customClaims, setCustomClaims] = useState<string>('');
  const [customGram, setCustomGram] = useState<string>('');

  // Requirements
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [requiresPremium, setRequiresPremium] = useState<boolean>(false);
  const [requiresGroup, setRequiresGroup] = useState<boolean>(false);
  const [groupInput, setGroupInput] = useState<string>('');

  // Group Validation State
  const [groupStatus, setGroupStatus] = useState<{
    loading: boolean;
    valid: boolean | null;
    title?: string;
    username?: string;
    chatId?: string;
    error?: string;
  }>({
    loading: false,
    valid: null,
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdPromo, setCreatedPromo] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Debounced group validation
  useEffect(() => {
    if (!requiresGroup || !groupInput.trim()) {
      setGroupStatus({ loading: false, valid: null });
      return;
    }

    const timer = setTimeout(async () => {
      setGroupStatus({ loading: true, valid: null });
      try {
        const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
        const res = await fetch(`${serverUrl}/api/promocodes/validate-group?target=${encodeURIComponent(groupInput.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.inGroup) {
            setGroupStatus({
              loading: false,
              valid: true,
              title: data.chatTitle,
              username: data.chatUsername,
              chatId: data.chatId,
            });
          } else {
            setGroupStatus({
              loading: false,
              valid: false,
              title: data.chatTitle,
              username: data.chatUsername,
              chatId: data.chatId,
              error: data.message || 'BOT_NOT_MEMBER',
            });
          }
        } else {
          setGroupStatus({ loading: false, valid: false, error: 'CHAT_NOT_FOUND' });
        }
      } catch {
        setGroupStatus({ loading: false, valid: false, error: 'NETWORK_ERROR' });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [groupInput, requiresGroup]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setCreatedPromo(null);
      setCopiedCode(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveClaims = customClaims.trim()
    ? Math.max(1, parseInt(customClaims) || 1)
    : maxClaims;
  const effectiveGram = customGram.trim()
    ? Math.max(0.01, parseFloat(customGram) || 0.01)
    : (parseFloat(gramPerClaim) || 0.50);
  const totalCost = (effectiveClaims * effectiveGram).toFixed(2);
  const currentBal = parseFloat(userBalanceGram || '0');
  const isInsufficient = currentBal < parseFloat(totalCost);

  const handleCreate = async () => {
    if (isInsufficient) {
      triggerImpact('heavy');
      return;
    }

    if (requiresGroup && groupStatus.valid === false) {
      triggerImpact('heavy');
      setSubmitError(t('promo.botNotInGroupAlert'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    triggerImpact('medium');

    try {
      const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
      const payload: any = {
        creatorTelegramId: userId ? String(userId) : undefined,
        creatorWallet: userAddress || undefined,
        creatorUsername: username || undefined,
        creatorDisplayName: fullName || username || 'Duelist',
        gramPerClaim: effectiveGram.toFixed(2),
        maxClaims: effectiveClaims,
        expiryHours: hasExpiry ? expiryHours : undefined,
        requiresPremium,
      };

      if (requiresGroup && groupStatus.valid) {
        payload.requiredChatId = groupStatus.chatId || groupInput.trim();
        payload.requiredChatTitle = groupStatus.title;
        payload.requiredChatUsername = groupStatus.username;
      }

      const res = await fetch(`${serverUrl}/api/promocodes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Errore nella creazione');
      }

      triggerImpact('heavy');
      setCreatedPromo(data.promoCode);

      // Dispatch global balance update event so header and profile update instantly
      if (data.newBalance !== undefined) {
        try {
          window.dispatchEvent(new CustomEvent('sfida_balance_updated', { detail: { balance: data.newBalance } }));
        } catch {}
      }

      if (onSuccess) {
        onSuccess(data.promoCode, data.newBalance);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Errore imprevisto durante la creazione');
      triggerImpact('heavy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPromoCode = (code: string) => {
    triggerImpact('light');
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSharePromo = (code: string, gram: string) => {
    triggerImpact('medium');
    const text = `🎁 Ho creato un Codice Promo da ${gram} GRAM su Sfida Arena! Usa il codice "${code}" per riscattarlo subito! ⚔️`;
    shareToTelegram('', text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm max-h-[88vh] rounded-3xl bg-gradient-to-b from-[#0a2016] via-[#061810] to-[#030d08] border border-emerald-500/40 shadow-2xl flex flex-col overflow-hidden my-auto">
        
        {/* Glow ambient effects */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* State 1: Creation Form */}
        {!createdPromo ? (
          <>
            {/* Scrollable Container with Zero Horizontal Overflow */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scrollbar-thin">
              
              {/* Header */}
              <div className="flex items-center space-x-2.5 pt-0.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="pr-6 min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-heading font-black text-[9px] uppercase tracking-wider">
                      PROMO & AIRDROP
                    </span>
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                  </div>
                  <h3 className="text-sm font-heading font-black text-white leading-tight mt-0.5 truncate">
                    {t('promo.createModalTitle')}
                  </h3>
                </div>
              </div>

              {/* Available balance indicator */}
              <div className="bg-black/40 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium text-[11px]">{t('promo.availableBalance')}</span>
                <div className="flex items-center space-x-1 text-white font-heading font-black text-xs">
                  <span>{userBalanceGram}</span>
                  <GramIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                </div>
              </div>

              {/* Parameter 1: Number of Claims */}
              <div className="space-y-1.5 bg-black/25 border border-white/5 rounded-2xl p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-emerald-300 font-heading font-black text-[10px] uppercase tracking-wider">
                    {t('promo.numClaims')}
                  </label>
                  <span className="text-white font-heading font-bold text-[11px]">
                    {effectiveClaims} {t('promo.claimedProgress')}
                  </span>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {[5, 10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setMaxClaims(num);
                        setCustomClaims('');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-heading font-bold border transition-all active:scale-95 ${
                        !customClaims && maxClaims === num
                          ? 'bg-emerald-500/35 border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Custom Claims Input */}
                <div className="flex items-center space-x-2 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {t('promo.orCustomClaims')}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder={t('promo.customClaimsPlaceholder')}
                    value={customClaims}
                    onChange={(e) => setCustomClaims(e.target.value)}
                    className="flex-1 min-w-0 bg-black/40 border border-white/15 focus:border-emerald-400 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 font-heading font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Parameter 2: GRAM per claim */}
              <div className="space-y-1.5 bg-black/25 border border-white/5 rounded-2xl p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-emerald-300 font-heading font-black text-[10px] uppercase tracking-wider">
                    {t('promo.gramPerClaim')}
                  </label>
                  <span className="text-white font-heading font-bold text-[11px]">
                    {effectiveGram.toFixed(2)} GRAM
                  </span>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {['0.10', '0.25', '0.50', '1.00', '2.00'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setGramPerClaim(g);
                        setCustomGram('');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-heading font-bold border transition-all active:scale-95 ${
                        !customGram && gramPerClaim === g
                          ? 'bg-emerald-500/35 border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {/* Custom GRAM Input */}
                <div className="flex items-center space-x-2 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {t('promo.orCustomAmount')}
                  </span>
                  <div className="relative flex-1 min-w-0 flex items-center">
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      placeholder={t('promo.customGramPlaceholder')}
                      value={customGram}
                      onChange={(e) => setCustomGram(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 focus:border-emerald-400 rounded-lg pl-2.5 pr-6 py-1 text-xs text-white placeholder-slate-500 font-heading font-bold focus:outline-none"
                    />
                    <GramIcon className="w-3 h-3 text-amber-300 absolute right-2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Total Cost & Escrow Breakdown */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                isInsufficient
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-emerald-950/40 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">{t('promo.totalCost')}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-sm font-heading font-black ${
                      isInsufficient ? 'text-red-400' : 'text-emerald-300'
                    }`}>
                      {totalCost}
                    </span>
                    <GramIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  </div>
                </div>

                {isInsufficient && (
                  <div className="mt-1.5 pt-1.5 border-t border-red-500/20 flex items-center justify-between text-[11px] text-red-300">
                    <span className="flex items-center space-x-1 font-medium">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                      <span>{t('promo.insufficientBalance')} {(parseFloat(totalCost) - currentBal).toFixed(2)} GRAM</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Requirements & Constraints Header */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-wider block">
                  {t('promo.requirementsTitle')}
                </span>

                {/* Requirement 1: Expiry */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-heading font-bold text-white">{t('promo.reqExpiry')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setHasExpiry(!hasExpiry);
                      }}
                      className={`w-9 h-4.5 rounded-full transition-colors relative ${
                        hasExpiry ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        hasExpiry ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {hasExpiry && (
                    <div className="pt-1 space-y-1 animate-in fade-in duration-150">
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: t('promo.expiry24h'), h: 24 },
                          { label: t('promo.expiry3d'), h: 72 },
                          { label: t('promo.expiry7d'), h: 168 },
                          { label: t('promo.expiry30d'), h: 720 },
                        ].map((item) => (
                          <button
                            key={item.h}
                            type="button"
                            onClick={() => {
                              triggerImpact('light');
                              setExpiryHours(item.h);
                            }}
                            className={`py-1 rounded-lg text-[10px] font-heading font-bold border transition-all ${
                              expiryHours === item.h
                                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        💡 {t('promo.reqExpiryDesc')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Requirement 2: Telegram Premium */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2 pr-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-heading font-bold text-white block">{t('promo.reqPremium')}</span>
                      <span className="text-[9px] text-slate-400 block">{t('promo.reqPremiumDesc')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerImpact('light');
                      setRequiresPremium(!requiresPremium);
                    }}
                    className={`w-9 h-4.5 rounded-full transition-colors relative shrink-0 ${
                      requiresPremium ? 'bg-amber-500' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      requiresPremium ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Requirement 3: Telegram Group ("Gruppo X") */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 pr-2">
                      <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-xs font-heading font-bold text-white block">{t('promo.reqGroup')}</span>
                        <span className="text-[9px] text-slate-400 block">{t('promo.reqGroupDesc')}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerImpact('light');
                        setRequiresGroup(!requiresGroup);
                      }}
                      className={`w-9 h-4.5 rounded-full transition-colors relative shrink-0 ${
                        requiresGroup ? 'bg-cyan-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        requiresGroup ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {requiresGroup && (
                    <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={groupInput}
                        onChange={(e) => setGroupInput(e.target.value)}
                        placeholder={t('promo.groupInputPlaceholder')}
                        className="w-full bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />

                      {/* Group Validation Status */}
                      {groupStatus.loading && (
                        <div className="flex items-center space-x-1.5 text-xs text-cyan-300">
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span className="text-[11px]">{t('promo.botCheckingGroup')}</span>
                        </div>
                      )}

                      {groupStatus.valid === true && (
                        <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-lg p-2 flex items-start space-x-1.5 text-[11px] text-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-heading font-bold block">{t('promo.botInGroup')}</span>
                            <span className="text-white font-medium">{groupStatus.title} {groupStatus.username ? `(@${groupStatus.username})` : ''}</span>
                          </div>
                        </div>
                      )}

                      {groupStatus.valid === false && (
                        <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-2 flex items-start space-x-1.5 text-[11px] text-red-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {t('promo.botNotInGroupAlert')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 font-medium">
                  {submitError}
                </div>
              )}
            </div>

            {/* Fixed Bottom Action Container (No Stretched Modal) */}
            <div className="p-3 bg-black/50 border-t border-white/10 shrink-0">
              <button
                onClick={handleCreate}
                disabled={isSubmitting || isInsufficient || (requiresGroup && groupStatus.valid === false)}
                className={`w-full py-3 px-4 rounded-2xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-xl ${
                  isInsufficient
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-emerald-950/40'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{t('promo.creatingStatus')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>{t('promo.confirmCreateBtn')} ({totalCost} GRAM)</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* State 2: Success Screen with Created Code */
          <div className="text-center space-y-3.5 p-5 pt-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-xl mx-auto">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-heading font-black text-white tracking-wide">
                {t('promo.successTitle')}
              </h3>
              <p className="text-xs text-slate-400 max-w-[260px] mx-auto">
                {t('promo.successSubtitle')}
              </p>
            </div>

            {/* Promo Code Box - Tap to Copy */}
            <div
              onClick={() => copyPromoCode(createdPromo.code)}
              className="bg-black/60 border-2 border-emerald-400/50 hover:border-emerald-400 rounded-2xl p-3.5 cursor-pointer transition-all active:scale-95 group relative shadow-lg"
            >
              <span className="text-[10px] font-heading font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">
                {t('promo.promoCodeLabel')}
              </span>
              <div className="text-lg font-mono font-black text-white tracking-wider">
                {createdPromo.code}
              </div>
              <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-300 font-medium mt-1">
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-heading font-bold">{t('promo.codeCopied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>{t('promo.tapToCopy')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Summary details */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">{t('promo.claimsLabel')}</span>
                <span className="text-white font-heading font-black">{createdPromo.maxClaims}x</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">{t('promo.rewardLabel')}</span>
                <span className="text-emerald-300 font-heading font-black">{createdPromo.gramPerClaim} GRAM</span>
              </div>
            </div>

            {/* Share and Close buttons */}
            <div className="space-y-2 pt-0.5">
              <button
                onClick={() => handleSharePromo(createdPromo.code, createdPromo.gramPerClaim)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-slate-950 font-heading font-black rounded-xl shadow-xl active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
              >
                <Share2 className="w-4 h-4 text-slate-950" />
                <span>{t('promo.shareTelegram')}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 bg-white/10 hover:bg-white/15 text-slate-300 font-heading font-bold rounded-xl transition-all text-xs uppercase tracking-wider"
              >
                {t('promo.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
