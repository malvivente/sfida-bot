import React, { useState, useEffect } from 'react';
import { ArrowLeft, Ticket, Trophy, ShieldCheck } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { GramIcon } from '../GramIcon.js';

interface RaffleViewProps {
  onBack: () => void;
  userBalanceGram?: string;
  onBalanceUpdated?: (newBalance: string) => void;
}

interface ActiveRaffle {
  id: string;
  title: string;
  badge: string;
  prizeGram: number;
  ticketPriceGram: number;
  totalTickets: number;
  soldTickets: number;
  endsAtEpoch: number;
  color: string;
}

export const RaffleView: React.FC<RaffleViewProps> = ({
  onBack,
  userBalanceGram = '0.00',
  onBalanceUpdated,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'active' | 'my_tickets' | 'winners' | 'rules'>('active');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(5);
  const [userTickets, setUserTickets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_user_raffle_tickets');
      return saved ? JSON.parse(saved) : ['#TK-8342', '#TK-8343'];
    } catch {
      return ['#TK-8342', '#TK-8343'];
    }
  });

  const [buySuccessMsg, setBuySuccessMsg] = useState<string | null>(null);

  // Active Raffles configuration
  const raffles: ActiveRaffle[] = [
    {
      id: 'mega_14',
      title: 'SFIDA MEGA RAFFLE #14',
      badge: 'MONTEPREMI RECORD',
      prizeGram: 1000,
      ticketPriceGram: 0.5,
      totalTickets: 1000,
      soldTickets: 648,
      endsAtEpoch: Date.now() + 1000 * 60 * 60 * 48 + 1000 * 60 * 14,
      color: 'from-purple-900/60 via-[#181326] to-[#0e1018]',
    },
    {
      id: 'daily_sprint',
      title: 'DAILY SPRINT RAFFLE',
      badge: 'OGNI 24 ORE',
      prizeGram: 100,
      ticketPriceGram: 0.1,
      totalTickets: 200,
      soldTickets: 142,
      endsAtEpoch: Date.now() + 1000 * 60 * 60 * 6 + 1000 * 60 * 22,
      color: 'from-amber-900/60 via-[#1c1612] to-[#0e1018]',
    },
    {
      id: 'community_free',
      title: 'COMMUNITY FREE RAFFLE',
      badge: '100% GRATIS',
      prizeGram: 50,
      ticketPriceGram: 0.0,
      totalTickets: 500,
      soldTickets: 389,
      endsAtEpoch: Date.now() + 1000 * 60 * 60 * 18,
      color: 'from-emerald-900/60 via-[#121c18] to-[#0e1018]',
    },
  ];

  // Countdown timer calculation for hero raffle
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({
    d: 2,
    h: 14,
    m: 28,
    s: 15,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, raffles[0].endsAtEpoch - Date.now());
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft({ d, h, m, s });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentBalNum = parseFloat(userBalanceGram || '0');
  const ticketCost = selectedQuantity * 0.5;
  const isAffordable = currentBalNum >= ticketCost;

  const handleBuyTickets = () => {
    if (!isAffordable) {
      triggerNotification('warning');
      return;
    }

    triggerImpact('heavy');
    const newTickets: string[] = [];
    for (let i = 0; i < selectedQuantity; i++) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      newTickets.push(`#TK-${randomNum}`);
    }

    const updated = [...userTickets, ...newTickets];
    setUserTickets(updated);
    try {
      localStorage.setItem('sfidabot_user_raffle_tickets', JSON.stringify(updated));
    } catch {}

    // Deduct cost
    const nextBal = Math.max(0, parseFloat((currentBalNum - ticketCost).toFixed(2)));
    onBalanceUpdated?.(nextBal.toFixed(2));
    try {
      const saved = localStorage.getItem('sfidabot_user_balance');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.balanceGram = nextBal.toFixed(2);
        localStorage.setItem('sfidabot_user_balance', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('sfida_balance_updated', { detail: { balance: nextBal.toFixed(2) } }));
      }
    } catch {}

    triggerNotification('success');
    setBuySuccessMsg(`+${selectedQuantity} Tickets!`);
    setTimeout(() => setBuySuccessMsg(null), 4000);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-14 animate-in fade-in slide-in-from-right-4 duration-200 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            onBack();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 text-xs font-heading font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-heading font-extrabold uppercase tracking-wider">
          <Ticket className="w-3.5 h-3.5" />
          <span>{userTickets.length} {t('raffle.activeTickets')}</span>
        </div>
      </div>

      {/* Hero Mega Raffle Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/80 via-[#181126] to-[#0c0914] border border-purple-500/40 p-5 shadow-2xl space-y-4">
        {/* Ambient Glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-fuchsia-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[9.5px] uppercase tracking-wider flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>{t('raffle.drawInProgress')}</span>
            </span>

            <span className="text-[11px] font-mono text-purple-300 font-bold">
              0.50 G / TICKET
            </span>
          </div>

          <h3 className="text-xl font-heading font-black text-white uppercase tracking-wider">
            SFIDA MEGA RAFFLE #14
          </h3>

          {/* Jackpot Amount */}
          <div className="flex items-baseline space-x-2">
            <GramIcon className="w-6 h-6 text-amber-400 self-center" />
            <span className="text-3xl sm:text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 drop-shadow-md">
              1,000.00
            </span>
            <span className="text-sm font-heading font-black text-amber-400">GRAM</span>
          </div>

          {/* Countdown Clock */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <span className="text-base font-mono font-black text-white">{timeLeft.d}</span>
              <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.days')}</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <span className="text-base font-mono font-black text-white">{timeLeft.h}</span>
              <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.hours')}</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <span className="text-base font-mono font-black text-white">{timeLeft.m}</span>
              <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.minutes')}</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
              <span className="text-base font-mono font-black text-amber-400">{timeLeft.s}</span>
              <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.seconds')}</span>
            </div>
          </div>

          {/* Ticket Sold Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] text-slate-300 font-mono">
              <span>{t('raffle.ticketsSold')}: 648 / 1,000</span>
              <span className="text-purple-300 font-bold">64.8%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400"
                style={{ width: '64.8%' }}
              />
            </div>
          </div>
        </div>

        {/* Quick Ticket Selector & Buy Action */}
        <div className="relative z-10 pt-2 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-heading">
            <span>{t('raffle.selectQuantity')}:</span>
            <span className="text-amber-300 font-bold">{t('raffle.total')}: {ticketCost.toFixed(2)} GRAM</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[1, 5, 10, 25].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  triggerImpact('light');
                  setSelectedQuantity(qty);
                }}
                className={`py-2 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all border ${
                  selectedQuantity === qty
                    ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {qty} {qty === 1 ? 'TKT' : 'TKTS'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBuyTickets}
            disabled={!isAffordable}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <Ticket className="w-4 h-4" />
            <span>{t('raffle.buyTickets')} ({ticketCost.toFixed(2)} GRAM)</span>
          </button>

          {buySuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-heading font-bold text-center animate-in zoom-in-95 duration-150">
              {buySuccessMsg}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-4 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveTab('active');
          }}
          className={`py-2 px-1 rounded-xl text-center text-[10px] font-heading uppercase tracking-wider transition-all ${
            activeTab === 'active' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-400'
          }`}
        >
          {t('raffle.tabActive')}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveTab('my_tickets');
          }}
          className={`py-2 px-1 rounded-xl text-center text-[10px] font-heading uppercase tracking-wider transition-all ${
            activeTab === 'my_tickets' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-400'
          }`}
        >
          {t('raffle.tabMyTickets')} ({userTickets.length})
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveTab('winners');
          }}
          className={`py-2 px-1 rounded-xl text-center text-[10px] font-heading uppercase tracking-wider transition-all ${
            activeTab === 'winners' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-400'
          }`}
        >
          {t('raffle.tabWinners')}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerImpact('light');
            setActiveTab('rules');
          }}
          className={`py-2 px-1 rounded-xl text-center text-[10px] font-heading uppercase tracking-wider transition-all ${
            activeTab === 'rules' ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-slate-400'
          }`}
        >
          {t('raffle.tabRules')}
        </button>
      </div>

      {/* Tab 1: Active Raffles */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          {raffles.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-3xl bg-gradient-to-r ${r.color} border border-white/10 shadow-lg space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-heading font-black text-[9px] uppercase tracking-wider">
                  {r.badge}
                </span>
                <span className="text-xs font-heading font-bold text-amber-300">
                  {r.ticketPriceGram > 0 ? `${r.ticketPriceGram} GRAM` : t('raffle.free')}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                  {r.title}
                </h4>
                <div className="flex items-center space-x-1.5 text-amber-300 mt-1">
                  <GramIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-lg font-heading font-black">{r.prizeGram} GRAM</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-300">
                <span>{r.soldTickets} / {r.totalTickets} {t('raffle.ticketsSold')}</span>
                <button
                  type="button"
                  onClick={() => triggerImpact('light')}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-heading font-bold text-[10px] uppercase"
                >
                  {t('raffle.participate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: My Tickets */}
      {activeTab === 'my_tickets' && (
        <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-heading font-bold text-white uppercase">
              {t('raffle.activeTicketsTitle')}
            </span>
            <span className="text-xs text-purple-300 font-mono font-bold">
              {userTickets.length} / 1,000
            </span>
          </div>

          {userTickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              {t('raffle.noTickets')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {userTickets.map((tkt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-black/40 border border-purple-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-4 h-4 text-purple-400" />
                    <span className="font-mono font-bold text-xs text-white">{tkt}</span>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase">{t('raffle.valid')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Past Winners History */}
      {activeTab === 'winners' && (
        <div className="space-y-2.5">
          {[
            { id: 13, user: '@alessio_ton', tkt: '#TK-0349', prize: '850 GRAM', date: '24 Oct 2026' },
            { id: 12, user: '@crypto_marco', tkt: '#TK-0911', prize: '1,200 GRAM', date: '17 Oct 2026' },
            { id: 11, user: '@giulia_crypto', tkt: '#TK-0128', prize: '500 GRAM', date: '10 Oct 2026' },
          ].map((w) => (
            <div
              key={w.id}
              className="p-3.5 rounded-2xl bg-[#141724] border border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-heading font-black text-white block">
                    {w.user}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Raffle #{w.id} • {w.tkt} • {w.date}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-heading font-black text-emerald-400">
                  +{w.prize}
                </span>
                <span className="text-[9px] text-slate-400 block uppercase">{t('raffle.credited')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Rules & Fairness */}
      {activeTab === 'rules' && (
        <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="flex items-center space-x-2 text-white font-heading font-black text-sm uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('raffle.howItWorks')}</span>
          </div>

          <p>
            1. <strong>{t('raffle.rule1Title')}</strong> {t('raffle.rule1Desc')}
          </p>
          <p>
            2. <strong>{t('raffle.rule2Title')}</strong> {t('raffle.rule2Desc')}
          </p>
          <p>
            3. <strong>{t('raffle.rule3Title')}</strong> {t('raffle.rule3Desc')}
          </p>
        </div>
      )}
    </div>
  );
};
