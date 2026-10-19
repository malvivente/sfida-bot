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
  QrCode,
  Gift,
  Clock,
  Crown,
  Radio,
} from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { GramIcon } from '../components/GramIcon.js';
import { useI18n } from '../i18n/index.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { ReferralQrModal } from '../components/ReferralQrModal.js';
import { CreatePromoModal } from '../components/CreatePromoModal.js';
import { RedeemPromoModal } from '../components/RedeemPromoModal.js';

interface PromoRequiredChat {
  chatId: string;
  chatUsername?: string;
  chatTitle?: string;
  chatType?: 'channel' | 'group';
}

interface PromoCodeItem {
  id: string;
  code: string;
  creatorTelegramId?: string;
  creatorWallet?: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  gramPerClaim: string;
  maxClaims: number;
  claimedCount: number;
  totalEscrowGram: string;
  remainingEscrowGram: string;
  expiresAt?: number;
  requiresPremium: boolean;
  requiredChatId?: string;
  requiredChatUsername?: string;
  requiredChatTitle?: string;
  requiredChats?: PromoRequiredChat[];
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
  createdAt: number;
  refundedAt?: number;
}

interface ReferralDashboardProps {
  userBalanceGram?: string;
  onBalanceUpdated?: (bal: string) => void;
}

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

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({
  userBalanceGram = '0.00',
  onBalanceUpdated,
}) => {
  const { userAddress } = useTonClashContract();
  const { userId, username, fullName, botUsername } = useTelegram();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Promo Codes State
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [promoFilter, setPromoFilter] = useState<'active' | 'expired'>('active');
  const [showCreatePromoModal, setShowCreatePromoModal] = useState<boolean>(false);
  const [showRedeemPromoModal, setShowRedeemPromoModal] = useState<boolean>(false);
  const [copiedPromoId, setCopiedPromoId] = useState<string | null>(null);

  const fetchPromoCodes = async () => {
    try {
      const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
      const q = new URLSearchParams();
      if (userId) q.set('telegramId', String(userId));
      if (userAddress) q.set('walletAddress', userAddress);
      const res = await fetch(`${serverUrl}/api/promocodes/my?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.promoCodes)) {
          setPromoCodes(data.promoCodes);
        }
      }
    } catch (err) {
      console.warn('[PromoCodes] Failed to fetch my promo codes:', err);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [userId, userAddress]);

  const activePromoCodes = promoCodes.filter(
    (p) => p.status === 'ACTIVE' && p.claimedCount < p.maxClaims && (!p.expiresAt || p.expiresAt > Date.now())
  );
  const expiredPromoCodes = promoCodes.filter(
    (p) => p.status === 'EXPIRED' || p.status === 'EXHAUSTED' || p.claimedCount >= p.maxClaims || (p.expiresAt && p.expiresAt <= Date.now())
  );
  const displayedPromoCodes = promoFilter === 'active' ? activePromoCodes : expiredPromoCodes;

  const copyPromoCode = (code: string, id: string) => {
    triggerImpact('light');
    navigator.clipboard.writeText(code);
    setCopiedPromoId(id);
    setTimeout(() => setCopiedPromoId(null), 2500);
  };

  const formatTimeRemaining = (expiresAt: number): string => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return t('promo.statusExpired');
    const hours = Math.floor(diffMs / (3600 * 1000));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${t('promo.expiresIn')} ${days}g`;
    }
    const mins = Math.floor(diffMs / (60 * 1000));
    if (hours < 1) {
      return `${t('promo.expiresIn')} ${mins}m`;
    }
    return `${t('promo.expiresIn')} ${hours}h`;
  };

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

          {/* Link row: Input + Copy + QR Code */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={refLink}
              className="flex-1 min-w-0 bg-black/40 border border-white/20 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none select-all font-medium truncate"
            />
            <button
              onClick={copyRefLink}
              title={copied ? t('affiliates.copied') : t('affiliates.copyBtn')}
              className={`p-2.5 shrink-0 rounded-2xl border transition-all flex items-center justify-center active:scale-95 ${
                copied
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-white/15 border-white/25 hover:bg-white/25 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerImpact('light');
                setShowQrModal(true);
              }}
              title={t('affiliates.qrCodeBtn')}
              className="p-2.5 shrink-0 rounded-2xl border border-white/25 bg-white/15 hover:bg-white/25 text-white transition-all flex items-center justify-center active:scale-95"
            >
              <QrCode className="w-4 h-4 text-pink-200" />
            </button>
          </div>

          {/* Full-width Telegram Share Button */}
          <button
            onClick={handleShare}
            title={t('affiliates.shareTelegramBtn')}
            className="w-full py-3 px-4 bg-gradient-to-r from-white via-pink-50 to-white text-purple-950 font-heading font-black rounded-2xl shadow-xl shadow-purple-950/30 active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
          >
            <Share2 className="w-4 h-4 text-purple-900 shrink-0" />
            <span>{t('affiliates.shareTelegramBtn')}</span>
          </button>

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

      {/* Promo Code & Airdrop Card (Dollar Green Luxury Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#022c22] p-5 shadow-2xl border border-emerald-500/40">
        <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        {/* Card Header with Dollar SVG Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-heading font-black text-[9px] uppercase tracking-wider">
                AIRDROP & PROMO
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            </div>
            <h2 className="text-base font-heading font-black text-white mt-0.5 truncate">{t('promo.cardTitle')}</h2>
            <p className="text-xs text-emerald-100/90 font-medium leading-tight">{t('promo.cardSubtitle')}</p>
          </div>
        </div>

        {/* Action Buttons: Crea Codice & Riscatta Codice */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={() => {
              triggerImpact('medium');
              setShowCreatePromoModal(true);
            }}
            className="py-2.5 px-3 bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 text-slate-950 font-heading font-black rounded-2xl shadow-lg active:scale-95 hover:brightness-105 transition-all flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>{t('promo.createBtn')}</span>
          </button>

          <button
            onClick={() => {
              triggerImpact('medium');
              setShowRedeemPromoModal(true);
            }}
            className="py-2.5 px-3 bg-black/40 hover:bg-black/50 border border-emerald-400/40 text-emerald-200 font-heading font-extrabold rounded-2xl transition-all active:scale-95 flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider"
          >
            <Gift className="w-4 h-4 text-emerald-300" />
            <span>{t('promo.redeemBtn')}</span>
          </button>
        </div>

        {/* Filter Tabs: Attivi vs Scaduti / Esauriti */}
        <div className="flex items-center space-x-2 border-b border-white/10 pb-2 mb-3">
          <button
            onClick={() => {
              triggerImpact('light');
              setPromoFilter('active');
            }}
            className={`pb-1 px-1 text-xs font-heading font-black uppercase tracking-wider flex items-center space-x-1.5 border-b-2 transition-all ${
              promoFilter === 'active'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-emerald-200/60 hover:text-emerald-100'
            }`}
          >
            <span>{t('promo.tabActive')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300">
              {activePromoCodes.length}
            </span>
          </button>

          <button
            onClick={() => {
              triggerImpact('light');
              setPromoFilter('expired');
            }}
            className={`pb-1 px-1 text-xs font-heading font-black uppercase tracking-wider flex items-center space-x-1.5 border-b-2 transition-all ${
              promoFilter === 'expired'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-emerald-200/60 hover:text-emerald-100'
            }`}
          >
            <span>{t('promo.tabExpired')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-slate-300">
              {expiredPromoCodes.length}
            </span>
          </button>
        </div>

        {/* Promo Codes List */}
        <div className="space-y-2.5">
          {displayedPromoCodes.length > 0 ? (
            displayedPromoCodes.map((promo) => {
              const isActive = promoFilter === 'active';
              const isCopied = copiedPromoId === promo.id;
              const progressPct = Math.min(100, Math.round((promo.claimedCount / promo.maxClaims) * 100));

              return (
                <div
                  key={promo.id}
                  onClick={() => {
                    if (isActive) {
                      copyPromoCode(promo.code, promo.id);
                    }
                  }}
                  className={`rounded-2xl p-3 border transition-all ${
                    isActive
                      ? 'bg-black/45 border-emerald-400/30 hover:border-emerald-400/70 cursor-pointer active:scale-[0.99] shadow-md group'
                      : 'bg-black/30 border-white/10 opacity-70 cursor-default select-text'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-white tracking-wider">
                        {promo.code}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-emerald-300/80 font-medium hidden sm:inline">
                          ({t('promo.tapToCopy')})
                        </span>
                      )}
                    </div>

                    {/* Copy feedback badge or status badge */}
                    {isActive ? (
                      isCopied ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-[10px] font-heading font-bold flex items-center space-x-1 animate-pulse">
                          <Check className="w-3 h-3" />
                          <span>{t('promo.copiedLabel')}</span>
                        </span>
                      ) : (
                        <span className="p-1 rounded-lg bg-white/10 text-emerald-300 group-hover:bg-emerald-400/20 transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-400 text-[10px] font-heading font-bold uppercase">
                        {promo.status === 'EXHAUSTED' || promo.claimedCount >= promo.maxClaims ? t('promo.statusExhausted') : t('promo.statusExpired')}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-emerald-100/90 font-medium">
                      <span>{promo.claimedCount} / {promo.maxClaims} {t('promo.claimedProgress')}</span>
                      <span className="flex items-center space-x-1 text-white font-heading font-bold">
                        <span>{promo.gramPerClaim} GRAM</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isActive ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-slate-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges: Premium, Group, Expiry */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-1 border-t border-white/5 text-[10px]">
                    {promo.requiresPremium && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-heading font-bold flex items-center space-x-1">
                        <Crown className="w-3 h-3" />
                        <span>{t('promo.badgePremiumShort')}</span>
                      </span>
                    )}
                    {/* Requirements: Telegram Channels and Groups */}
                    {promo.requiredChats && promo.requiredChats.length > 0 ? (
                      promo.requiredChats.map((c, idx) => (
                        <span
                          key={c.chatId || idx}
                          className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-heading font-bold flex items-center space-x-1"
                        >
                          {c.chatType === 'channel' ? (
                            <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
                          ) : (
                            <Users className="w-3 h-3 text-cyan-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[120px]">
                            {c.chatUsername ? `@${c.chatUsername}` : (c.chatTitle || (c.chatType === 'channel' ? t('promo.badgeChannel') : t('promo.badgeGroup')))}
                          </span>
                        </span>
                      ))
                    ) : (promo.requiredChatTitle || promo.requiredChatUsername || promo.requiredChatId) ? (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-heading font-bold flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">
                          {promo.requiredChatUsername ? `@${promo.requiredChatUsername}` : (promo.requiredChatTitle || t('promo.badgeGroup'))}
                        </span>
                      </span>
                    ) : null}
                    {promo.expiresAt && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-emerald-200/90 font-medium flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isActive
                            ? formatTimeRemaining(promo.expiresAt)
                            : `${t('promo.expiredAt')} ${new Date(promo.expiresAt).toLocaleDateString()}`}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-5 bg-black/20 rounded-2xl border border-white/5 space-y-1">
              <p className="text-xs text-emerald-100/70 font-medium">
                {promoFilter === 'active' ? t('promo.noActiveCodes') : t('promo.noExpiredCodes')}
              </p>
            </div>
          )}
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
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col justify-center items-center min-h-[52px]">
                    <span className="text-[10px] text-slate-400 block font-medium leading-tight mb-1">{t('affiliates.groupMatches')}</span>
                    <div className="flex items-center justify-center h-5">
                      <span className="text-xs font-heading font-extrabold text-white leading-none">{group.totalMatchesHosted}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5 flex flex-col justify-center items-center min-h-[52px]">
                    <span className="text-[10px] text-slate-400 block font-medium leading-tight mb-1">{t('affiliates.groupVolume')}</span>
                    <div className="flex items-center justify-center h-5 space-x-0.5">
                      <span className="text-xs font-heading font-extrabold text-white leading-none">{parseFloat(group.totalVolumeGram || '0').toFixed(1)}</span>
                      <GramIcon className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-cyan-400/30 flex flex-col justify-center items-center min-h-[52px]">
                    <span className="text-[10px] text-cyan-300 block font-medium leading-tight mb-1">{t('affiliates.groupEarnings')}</span>
                    <div className="flex items-center justify-center h-5 space-x-0.5">
                      <span className="text-xs font-heading font-black text-cyan-300 leading-none">{group.totalEarningsGram}</span>
                      <GramIcon className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
                    </div>
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

      {/* Referral QR Code Modal */}
      <ReferralQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        refLink={refLink}
        refCode={refCode}
        username={username}
      />

      {/* Create Promo Code Modal */}
      <CreatePromoModal
        isOpen={showCreatePromoModal}
        onClose={() => setShowCreatePromoModal(false)}
        userBalanceGram={userBalanceGram}
        onSuccess={(newPromo, newBal) => {
          setPromoCodes((prev) => [newPromo, ...prev]);
          if (newBal && onBalanceUpdated) {
            onBalanceUpdated(newBal);
          }
          fetchPromoCodes();
        }}
      />

      {/* Redeem Promo Code Modal */}
      <RedeemPromoModal
        isOpen={showRedeemPromoModal}
        onClose={() => setShowRedeemPromoModal(false)}
        onSuccess={(_gramAwarded, newBal) => {
          if (newBal && onBalanceUpdated) {
            onBalanceUpdated(newBal);
          }
          fetchPromoCodes();
        }}
      />
    </div>
  );
};
