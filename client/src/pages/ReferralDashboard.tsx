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
  Sparkles,
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

interface AffiliateCacheData {
  totalEarnedGram: string;
  friendsInvited: number;
  groups: ManagedGroup[];
}

const memoryAffiliateCache: Record<string, AffiliateCacheData> = {};

function getCachedAffiliate(key: string): AffiliateCacheData | null {
  if (memoryAffiliateCache[key]) {
    return memoryAffiliateCache[key];
  }
  try {
    const raw = localStorage.getItem(`sfida_affiliate_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalEarnedGram === 'string') {
        memoryAffiliateCache[key] = parsed;
        return parsed;
      }
    }
  } catch {}
  return null;
}

function setCachedAffiliate(key: string, data: AffiliateCacheData) {
  memoryAffiliateCache[key] = data;
  try {
    localStorage.setItem(`sfida_affiliate_${key}`, JSON.stringify(data));
  } catch {}
}

export const ReferralDashboard: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { userId, username, fullName, botUsername } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const cacheKey = userId ? `tg_${userId}` : (userAddress || 'guest');
  const initialCached = getCachedAffiliate(cacheKey);

  const [totalEarnings, setTotalEarnings] = useState<string>(() => initialCached?.totalEarnedGram || '0.00');
  const [friendsInvited, setFriendsInvited] = useState<number>(() => initialCached?.friendsInvited || 0);
  const [managedGroups, setManagedGroups] = useState<ManagedGroup[]>(() => initialCached?.groups || []);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);

  // Referral code tied to Telegram ID or wallet fallback
  const refCode = userId ? `ref_${userId}` : (userAddress ? `ref_${userAddress}` : 'ref_arena');
  const refLink = `https://t.me/${botUsername || 'sfida_bot'}?start=${refCode}`;

  useEffect(() => {
    // If cache has data for current key, sync immediately
    const currentCached = getCachedAffiliate(cacheKey);
    if (currentCached) {
      setTotalEarnings(currentCached.totalEarnedGram || '0.00');
      setFriendsInvited(currentCached.friendsInvited || 0);
      setManagedGroups(currentCached.groups || []);
      setLoading(false);
    }

    const fetchAffiliateData = async () => {
      try {
        const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
        const identifier = userId ? `tg_${userId}` : (userAddress || 'guest');
        const res = await fetch(`${serverUrl}/api/affiliate/${identifier}?telegramId=${userId || ''}`);
        if (res.ok) {
          const data = await res.json();
          const earned = data.totalEarnedGram || '0.00';
          const friends = data.friendsInvited || 0;
          const groups = Array.isArray(data.groups) ? data.groups : [];

          setTotalEarnings(earned);
          setFriendsInvited(friends);
          setManagedGroups(groups);

          setCachedAffiliate(cacheKey, {
            totalEarnedGram: earned,
            friendsInvited: friends,
            groups: groups,
          });
        }
      } catch (err) {
        console.warn('[Affiliates] Failed to fetch live data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [userId, userAddress, cacheKey]);

  const copyRefLink = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    triggerImpact('medium');
    const text = '⚔️ Join Sfida Arena on Telegram: fast-paced 1v1 reflex duels and live spectator betting with GRAM!';
    shareToTelegram(refLink, text);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans select-none pb-12 animate-in fade-in duration-200">
      
      {/* Featured Overview Card (Praised Berry Magenta Jewel Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#500724] via-[#701a75] to-[#3b0764] p-5 shadow-2xl border border-pink-500/40">
        <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-md">
            <Users className="w-6 h-6 text-pink-200" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-heading font-black text-[9px] uppercase tracking-wider">
                COMMUNITY & EARN
              </span>
              <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
            </div>
            <h2 className="text-base font-heading font-black text-white mt-0.5">{t('affiliates.title')}</h2>
            <p className="text-xs text-pink-100/90 font-medium">{t('affiliates.subtitle')}</p>
          </div>
        </div>

        {/* Live Earnings Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/35 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-md">
            <div className="flex items-center space-x-1.5 text-pink-200 text-xs mb-1 font-semibold">
              <DollarSign className="w-3.5 h-3.5 text-pink-300" />
              <span>{t('affiliates.totalEarnings')}</span>
            </div>
            <div className="text-xl font-heading font-black text-white flex items-center space-x-1">
              <span>{totalEarnings}</span>
              <GramIcon className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-[11px] text-pink-200/80 mt-0.5 font-medium">{t('affiliates.instantPayout')}</div>
          </div>

          <div className="bg-black/35 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-md">
            <div className="flex items-center space-x-1.5 text-pink-200 text-xs mb-1 font-semibold">
              <Users className="w-3.5 h-3.5 text-pink-300" />
              <span>{t('affiliates.friendsInvited')}</span>
            </div>
            <div className="text-xl font-heading font-black text-white">{friendsInvited}</div>
            <div className="text-[11px] text-pink-200/80 mt-0.5 font-medium">{t('affiliates.activeInDuels')}</div>
          </div>
        </div>

        {/* Personal Invite Link Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-pink-200 uppercase font-heading font-extrabold tracking-wider block">
              {t('affiliates.personalLink')}
            </label>
            {copied && (
              <span className="text-xs font-heading font-extrabold text-emerald-300 flex items-center space-x-1 animate-pulse">
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
              className="flex-1 bg-black/40 border border-white/20 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none select-all font-medium"
            />
            <button
              onClick={copyRefLink}
              title="Copy link"
              className={`p-2.5 rounded-2xl border transition-all flex items-center space-x-1 text-xs font-heading font-extrabold active:scale-95 ${
                copied
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                  : 'bg-white/15 border-white/25 hover:bg-white/25 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              title="Share to Telegram"
              className="px-3.5 py-2.5 bg-white text-purple-900 font-heading font-black rounded-2xl shadow-lg active:scale-95 hover:bg-slate-100 transition-all flex items-center space-x-1.5 text-xs uppercase tracking-wider"
            >
              <Share2 className="w-4 h-4 text-purple-900" />
              <span className="hidden sm:inline">{t('affiliates.inviteBtn')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-pink-200/90 pt-1 font-medium">
            <span className="flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-pink-300" />
              <span>{t('affiliates.telegramParam')} <strong className="text-white font-mono">{refCode}</strong></span>
            </span>
            {username && <span className="text-pink-300 font-mono">(@{username})</span>}
          </div>

          <p className="text-[11px] text-pink-200/80">
            {userAddress
              ? t('affiliates.walletConnected')
              : t('affiliates.walletNotConnected')}
          </p>
        </div>
      </div>

      {/* Group Affiliates Section */}
      {managedGroups.length > 0 ? (
        <div className="bg-[#141724]/90 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-white">{t('affiliates.groupsTitle')}</h3>
              <p className="text-xs text-slate-400 font-medium">{t('affiliates.groupsSubtitle')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {managedGroups.map((group) => (
              <div
                key={group.chatId}
                className="bg-[#10131d]/90 border border-white/10 hover:border-cyan-400/40 transition-all rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-heading font-extrabold text-white flex items-center space-x-1.5">
                      <span>{group.title}</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">ID: {group.chatId}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-heading font-extrabold text-emerald-300">
                    {group.commissionRatePercent}% RAKE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
                  <div className="bg-white/5 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block font-medium">{t('affiliates.groupMatches')}</span>
                    <span className="text-xs font-heading font-extrabold text-white">{group.totalMatchesHosted}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block font-medium">{t('affiliates.groupVolume')}</span>
                    <span className="text-xs font-heading font-extrabold text-white flex items-center justify-center space-x-0.5">
                      <span>{parseFloat(group.totalVolumeGram || '0').toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400" />
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-cyan-400/30">
                    <span className="text-[10px] text-cyan-300 block font-medium">{t('affiliates.groupEarnings')}</span>
                    <span className="text-xs font-heading font-black text-cyan-300 flex items-center justify-center space-x-0.5">
                      <span>{group.totalEarningsGram}</span>
                      <GramIcon className="w-2.5 h-2.5 text-cyan-300" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#141724]/90 border border-white/10 rounded-3xl p-5 shadow-xl flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 shrink-0 mt-0.5">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h4 className="text-xs font-heading font-extrabold text-white uppercase tracking-wider">
              {t('affiliates.noGroupsTitle')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {t('affiliates.noGroupsDesc')}
            </p>
            <a
              href={APP_CONFIG.ADMIN_TELEGRAM_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-heading font-black text-cyan-400 hover:underline pt-1"
            >
              <span>{t('affiliates.contactAdminBtn')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* How it Works Section */}
      <div className="bg-[#141724]/90 border border-white/10 rounded-3xl p-5 shadow-xl space-y-3.5">
        <h3 className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-purple-400" />
          <span>{t('affiliates.howItWorks')}</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-heading font-black block mb-0.5 text-xs">{t('affiliates.step1Title')}</span>
              <span className="text-slate-300 leading-relaxed font-medium">
                {t('affiliates.step1Desc')}
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-pink-500/15 text-pink-300 shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-heading font-black block mb-0.5 text-xs">{t('affiliates.step2Title')}</span>
              <span className="text-slate-300 leading-relaxed font-medium">
                {t('affiliates.step2Desc')}
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-heading font-black block mb-0.5 text-xs">{t('affiliates.step3Title')}</span>
              <span className="text-slate-300 leading-relaxed font-medium">
                {t('affiliates.step3Desc')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
