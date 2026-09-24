import React, { useState } from 'react';
import { Users, Copy, Share2, DollarSign, Check, MessageSquare, Zap, ShieldCheck, UserCheck } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from '../components/GramIcon.js';
import { useI18n } from '../i18n/index.js';

export const ReferralDashboard: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { userId, username, fullName, botUsername } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  // Referral code tied to Telegram ID or wallet fallback
  const refCode = userId ? `ref_${userId}` : (userAddress ? `ref_${userAddress}` : 'ref_arena');
  const refLink = `https://t.me/${botUsername}?start=${refCode}`;

  const copyRefLink = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    triggerImpact('medium');
    const text = '⚔️ Join Sfida Arena on Telegram: fast-paced 1v1 reaction duels and live betting in TON!';
    shareToTelegram(refLink, text);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Overview Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-pink/15 border border-cyber-pink flex items-center justify-center shadow-neon-pink">
            <Users className="w-6 h-6 text-cyber-pink" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold text-white">{t('affiliates.title')}</h2>
            <p className="text-xs text-slate-400">{t('affiliates.subtitle')}</p>
          </div>
        </div>

        {/* Live Earnings Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>{t('affiliates.totalEarnings')}</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-cyan flex items-center space-x-1">
              <span>0.00</span>
              <GramIcon className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">{t('affiliates.instantPayout')}</div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Users className="w-3.5 h-3.5 text-cyber-pink" />
              <span>{t('affiliates.friendsInvited')}</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-pink">0</div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">{t('affiliates.activeInDuels')}</div>
          </div>
        </div>

        {/* Personal Invite Link Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-chakra text-slate-300 uppercase tracking-wider block">
              {t('affiliates.personalLink')}
            </label>
            {copied && (
              <span className="text-xs font-chakra font-bold text-cyber-green flex items-center space-x-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>{t('affiliates.copied')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={refLink}
              className="flex-1 bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs font-chakra text-slate-300 focus:outline-none select-all"
            />
            <button
              onClick={copyRefLink}
              title="Copy link"
              className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1 text-xs font-bold font-orbitron ${
                copied
                  ? 'bg-cyber-green/20 border-cyber-green text-cyber-green'
                  : 'bg-cyber-bg border-cyber-border hover:border-cyber-cyan text-slate-300 active:scale-95'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              title="Share to Telegram"
              className="px-3 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5 text-xs"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('affiliates.inviteBtn')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-chakra text-slate-400 pt-0.5">
            <span className="flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>{t('affiliates.telegramParam')} <strong className="text-cyber-cyan font-mono">{refCode}</strong></span>
            </span>
            {username && <span className="text-slate-500 font-mono">(@{username})</span>}
          </div>

          <p className="text-[11px] text-slate-400">
            {userAddress
              ? t('affiliates.walletConnected')
              : t('affiliates.walletNotConnected')}
          </p>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-cyber-cyan" />
          <span>{t('affiliates.howItWorks')}</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-cyan/15 text-cyber-cyan shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">{t('affiliates.step1Title')}</span>
              <span className="text-slate-300 leading-relaxed">
                {t('affiliates.step1Desc')}
              </span>
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-pink/15 text-cyber-pink shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">{t('affiliates.step2Title')}</span>
              <span className="text-slate-300 leading-relaxed">
                {t('affiliates.step2Desc')}
              </span>
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-green/15 text-cyber-green shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">{t('affiliates.step3Title')}</span>
              <span className="text-slate-300 leading-relaxed">
                {t('affiliates.step3Desc')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
