import React, { useEffect, useState } from 'react';
import {
  Users,
  Copy,
  Share2,
  DollarSign,
  Check,
  MessageSquare,
  Zap,
  ShieldCheck,
  UserCheck,
  TrendingUp,
  Award,
  Swords,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from '../components/GramIcon.js';
import { useI18n } from '../i18n/index.js';
import { APP_CONFIG } from '../config/appConfig.js';

interface ManagedGroup {
  chatId: string;
  title: string;
  walletAddress: string;
  commissionRatePercent: number;
  managerTelegramId?: string;
  managerUsername?: string;
  totalMatchesHosted: number;
  totalVolumeGram: string;
  totalEarningsGram: string;
}

export const ReferralDashboard: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { userId, username, fullName, botUsername } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const [totalEarnings, setTotalEarnings] = useState<string>('0.00');
  const [friendsInvited, setFriendsInvited] = useState<number>(0);
  const [managedGroups, setManagedGroups] = useState<ManagedGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Referral code tied to Telegram ID or wallet fallback
  const refCode = userId ? `ref_${userId}` : (userAddress ? `ref_${userAddress}` : 'ref_arena');
  const refLink = `https://t.me/${botUsername || 'sfida_bot'}?start=${refCode}`;

  useEffect(() => {
    const fetchAffiliateData = async () => {
      try {
        const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
        const identifier = userId ? `tg_${userId}` : (userAddress || 'guest');
        const res = await fetch(`${serverUrl}/api/affiliate/${identifier}?telegramId=${userId || ''}`);
        if (res.ok) {
          const data = await res.json();
          setTotalEarnings(data.totalEarnedGram || '0.00');
          setFriendsInvited(data.friendsInvited || 0);
          if (Array.isArray(data.groups)) {
            setManagedGroups(data.groups);
          }
        }
      } catch (err) {
        console.warn('[Affiliates] Failed to fetch live data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [userId, userAddress]);

  const copyRefLink = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    triggerImpact('medium');
    const text = '⚔️ Join Sfida Cyber Arena on Telegram: fast-paced 1v1 reflex duels and live spectator betting with GRAM!';
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
              <span>{totalEarnings}</span>
              <GramIcon className="w-4 h-4 text-cyber-cyan" />
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">{t('affiliates.instantPayout')}</div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Users className="w-3.5 h-3.5 text-cyber-pink" />
              <span>{t('affiliates.friendsInvited')}</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-pink">{friendsInvited}</div>
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

      {/* Group Affiliates Section */}
      {managedGroups.length > 0 ? (
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan flex items-center justify-center shadow-neon-cyan">
              <MessageSquare className="w-5 h-5 text-cyber-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-orbitron font-bold text-white">{t('affiliates.groupsTitle')}</h3>
              <p className="text-xs text-slate-400">{t('affiliates.groupsSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {managedGroups.map((group) => (
              <div
                key={group.chatId}
                className="bg-cyber-bg/70 border border-cyber-border hover:border-cyber-cyan/50 transition-all rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-orbitron font-bold text-white flex items-center space-x-1.5">
                      <span>{group.title}</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">ID: {group.chatId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyber-green/15 border border-cyber-green text-[10px] font-chakra font-bold text-cyber-green">
                    {group.commissionRatePercent}% RAKE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-cyber-border/40 text-center">
                  <div className="bg-cyber-card/60 rounded-lg p-1.5">
                    <span className="text-[10px] font-chakra text-slate-400 block">{t('affiliates.groupMatches')}</span>
                    <span className="text-xs font-chakra font-bold text-slate-200">{group.totalMatchesHosted}</span>
                  </div>
                  <div className="bg-cyber-card/60 rounded-lg p-1.5">
                    <span className="text-[10px] font-chakra text-slate-400 block">{t('affiliates.groupVolume')}</span>
                    <span className="text-xs font-chakra font-bold text-slate-200 flex items-center justify-center space-x-0.5">
                      <span>{parseFloat(group.totalVolumeGram || '0').toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </span>
                  </div>
                  <div className="bg-cyber-card/60 rounded-lg p-1.5 border border-cyber-cyan/30">
                    <span className="text-[10px] font-chakra text-cyber-cyan block">{t('affiliates.groupEarnings')}</span>
                    <span className="text-xs font-chakra font-extrabold text-cyber-cyan flex items-center justify-center space-x-0.5">
                      <span>{group.totalEarningsGram}</span>
                      <GramIcon className="w-2.5 h-2.5 text-cyber-cyan" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-cyber-card border border-cyber-border/70 rounded-2xl p-4 shadow-xl flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan shrink-0 mt-0.5">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h4 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
              {t('affiliates.noGroupsTitle')}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('affiliates.noGroupsDesc')}
            </p>
            <a
              href={APP_CONFIG.ADMIN_TELEGRAM_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-orbitron font-bold text-cyber-cyan hover:underline pt-1"
            >
              <span>{t('affiliates.contactAdminBtn')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

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
