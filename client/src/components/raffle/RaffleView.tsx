import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Ticket, Trophy, ShieldCheck, X, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useI18n } from '../../i18n/index.js';
import { useTelegram } from '../../hooks/useTelegram.js';
import { GramIcon } from '../GramIcon.js';

interface RaffleViewProps {
  onBack: () => void;
  userBalanceGram?: string;
  onBalanceUpdated?: (newBalance: string) => void;
}

export interface StoredRaffle {
  id: string;
  title: string;
  badge?: string;
  prizeGram: number;
  ticketPriceGram: number;
  totalTickets: number;
  maxTickets?: number;
  endsAtEpoch: number;
  createdAt: number;
  isFeatured: boolean;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  color?: string;
  winnerUserId?: string;
  winnerUsername?: string;
  winnerTicketNumber?: number;
  drawnAt?: number;
}

export interface StoredRaffleTicket {
  id: string;
  raffleId: string;
  userId: string;
  username?: string;
  ticketNumber: number;
  purchasedAt: number;
}

export const RaffleView: React.FC<RaffleViewProps> = ({
  onBack,
  userBalanceGram = '0.00',
  onBalanceUpdated,
}) => {
  const { triggerImpact, triggerNotification } = useHaptics();
  const { t } = useI18n();
  const { userId, username, displayName } = useTelegram();

  // Effective user ID strictly associated with Telegram user ID
  const effectiveUserId = useMemo(() => {
    if (userId) return String(userId).trim();
    try {
      const saved = localStorage.getItem('sfidabot_user_id');
      if (saved) return saved;
    } catch {}
    return '1052287650'; // Default fallback admin/dev ID
  }, [userId]);

  const [activeTab, setActiveTab] = useState<'active' | 'my_tickets' | 'winners' | 'rules'>('active');
  const [raffles, setRaffles] = useState<StoredRaffle[]>([]);
  const [featuredRaffle, setFeaturedRaffle] = useState<StoredRaffle | null>(null);
  const [pastWinners, setPastWinners] = useState<StoredRaffle[]>([]);
  const [myTickets, setMyTickets] = useState<StoredRaffleTicket[]>([]);
  const [myRafflesMap, setMyRafflesMap] = useState<Record<string, StoredRaffle>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected raffle for entry modal
  const [modalRaffle, setModalRaffle] = useState<StoredRaffle | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [isBuying, setIsBuying] = useState<boolean>(false);
  const [buyFeedback, setBuyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  // Fetch active raffles
  const fetchRaffles = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/raffles`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRaffles(data.raffles || []);
          setFeaturedRaffle(data.featured || null);
          setPastWinners(data.winners || []);
        }
      }
    } catch (err) {
      console.warn('[RaffleView] Error loading raffles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl]);

  // Fetch user tickets
  const fetchMyTickets = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`${serverUrl}/api/raffles/my-tickets?userId=${encodeURIComponent(effectiveUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMyTickets(data.tickets || []);
          setMyRafflesMap(data.raffles || {});
        }
      }
    } catch (err) {
      console.warn('[RaffleView] Error loading user tickets:', err);
    }
  }, [effectiveUserId, serverUrl]);

  useEffect(() => {
    fetchRaffles();
    fetchMyTickets();
    const interval = setInterval(() => {
      fetchRaffles();
      fetchMyTickets();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchRaffles, fetchMyTickets]);

  // Dynamic countdown tick for featured raffle
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const calculateTimeLeft = (epoch: number) => {
    const diff = Math.max(0, epoch - now);
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return { d, h, m, s, isExpired: diff <= 0 };
  };

  const heroRaffle = featuredRaffle || raffles[0] || null;
  const heroTime = heroRaffle ? calculateTimeLeft(heroRaffle.endsAtEpoch) : null;

  // Open participation modal for a specific raffle
  const handleOpenModal = (r: StoredRaffle) => {
    triggerImpact('light');
    setModalRaffle(r);
    setSelectedQuantity(1);
    setBuyFeedback(null);
  };

  const handleCloseModal = () => {
    triggerImpact('light');
    setModalRaffle(null);
    setBuyFeedback(null);
  };

  // Ticket cost in modal
  const modalTicketPrice = modalRaffle?.ticketPriceGram ?? 0;
  const modalTotalCost = parseFloat((modalTicketPrice * selectedQuantity).toFixed(2));
  const currentBalNum = parseFloat(userBalanceGram || '0');
  const canAfford = currentBalNum >= modalTotalCost;

  // Perform purchase
  const handleConfirmPurchase = async () => {
    if (!modalRaffle || isBuying) return;

    if (!canAfford) {
      triggerNotification('error');
      setBuyFeedback({
        type: 'error',
        message: `${t('raffle.insufficientBalance') || 'Saldo insufficiente!'} (${currentBalNum.toFixed(2)} / ${modalTotalCost.toFixed(2)} GRAM)`,
      });
      return;
    }

    setIsBuying(true);
    setBuyFeedback(null);
    triggerImpact('heavy');

    try {
      const res = await fetch(`${serverUrl}/api/raffles/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: modalRaffle.id,
          userId: effectiveUserId,
          quantity: selectedQuantity,
          username: username || displayName || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        triggerNotification('success');
        triggerImpact('heavy');

        if (data.newBalance !== undefined) {
          onBalanceUpdated?.(data.newBalance);
          try {
            const saved = localStorage.getItem('sfidabot_user_balance');
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.balanceGram = data.newBalance;
              localStorage.setItem('sfidabot_user_balance', JSON.stringify(parsed));
            }
            window.dispatchEvent(
              new CustomEvent('sfida_balance_updated', { detail: { balance: data.newBalance } })
            );
          } catch {}
        }

        const numbersStr = data.ticketNumbers ? data.ticketNumbers.map((n: number) => `#TK-${n}`).join(', ') : '';
        const ticketWord = selectedQuantity === 1 ? (t('raffle.ticketAssigned') || 'biglietto assegnato') : (t('raffle.ticketsAssigned') || 'biglietti assegnati');
        setBuyFeedback({
          type: 'success',
          message: `${t('raffle.buySuccess') || 'Acquisto riuscito!'} ${selectedQuantity} ${ticketWord}: ${numbersStr}`,
        });

        // Re-fetch data
        fetchRaffles();
        fetchMyTickets();
      } else {
        triggerNotification('error');
        setBuyFeedback({
          type: 'error',
          message: data.error || (t('raffle.buyError') || 'Errore durante l\'acquisto del biglietto'),
        });
      }
    } catch (err: any) {
      triggerNotification('error');
      setBuyFeedback({
        type: 'error',
        message: t('raffle.connError') || 'Errore di connessione al server',
      });
    } finally {
      setIsBuying(false);
    }
  };

  // Count user's tickets in a given raffle
  const getUserTicketsForRaffle = (raffleId: string) => {
    return myTickets.filter((t) => t.raffleId === raffleId).length;
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
          <span>{myTickets.length} {t('raffle.activeTickets')}</span>
        </div>
      </div>

      {/* Hero Featured Raffle Banner */}
      {heroRaffle && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/80 via-[#181126] to-[#0c0914] border border-purple-500/40 p-5 shadow-2xl space-y-4">
          {/* Ambient Glow */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-fuchsia-500/25 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-heading font-black text-[9.5px] uppercase tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>{heroRaffle.badge || t('raffle.drawInProgress')}</span>
              </span>

              <span className="text-[11px] font-mono text-purple-300 font-bold uppercase">
                {heroRaffle.ticketPriceGram === 0 ? t('raffle.free') : `${heroRaffle.ticketPriceGram} G / TICKET`}
              </span>
            </div>

            <h3 className="text-xl font-heading font-black text-white uppercase tracking-wider">
              {heroRaffle.title}
            </h3>

            {/* Jackpot Amount */}
            <div className="flex items-baseline space-x-2">
              <GramIcon className="w-6 h-6 text-amber-400 self-center" />
              <span className="text-3xl sm:text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 drop-shadow-md">
                {heroRaffle.prizeGram.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-heading font-black text-amber-400">GRAM</span>
            </div>

            {/* Countdown Clock */}
            {heroTime && (
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
                  <span className="text-base font-mono font-black text-white">{heroTime.d}</span>
                  <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.days')}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
                  <span className="text-base font-mono font-black text-white">{heroTime.h}</span>
                  <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.hours')}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
                  <span className="text-base font-mono font-black text-white">{heroTime.m}</span>
                  <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.minutes')}</span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-center">
                  <span className="text-base font-mono font-black text-amber-400">{heroTime.s}</span>
                  <span className="text-[9px] text-slate-400 block font-heading">{t('raffle.seconds')}</span>
                </div>
              </div>
            )}

            {/* Ticket Sold Info */}
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono pt-1">
              <span>{t('raffle.ticketsSold')}: <b>{heroRaffle.totalTickets}</b></span>
              <span className="text-purple-300 font-bold">
                {getUserTicketsForRaffle(heroRaffle.id)} {t('raffle.tabMyTickets').toLowerCase()}
              </span>
            </div>

            {/* Action button to open detailed entry modal */}
            <button
              type="button"
              onClick={() => handleOpenModal(heroRaffle)}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
            >
              <Ticket className="w-4 h-4" />
              <span>{t('raffle.participate')} ({heroRaffle.ticketPriceGram === 0 ? t('raffle.free') : `${heroRaffle.ticketPriceGram} GRAM`})</span>
            </button>
          </div>
        </div>
      )}

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
          {t('raffle.tabActive')} ({raffles.length})
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
          {t('raffle.tabMyTickets')} ({myTickets.length})
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

      {/* Tab 1: Active Raffles Cards Grid */}
      {activeTab === 'active' && (
        <div className="space-y-3">
          {raffles.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-[#141724] border border-white/10 space-y-2">
              <Ticket className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-sans">
                {t('raffle.noActiveRaffles') || 'Nessuna raffle attiva al momento. L\'amministratore ne aprirà una a breve!'}
              </p>
            </div>
          ) : (
            raffles.map((r) => {
              const rTime = calculateTimeLeft(r.endsAtEpoch);
              const userTktCount = getUserTicketsForRaffle(r.id);

              return (
                <div
                  key={r.id}
                  className={`p-4 rounded-3xl bg-gradient-to-r ${r.color || 'from-[#1b172e] to-[#100e1c]'} border border-white/10 shadow-lg space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-heading font-black text-[9px] uppercase tracking-wider">
                      {r.badge || (r.ticketPriceGram === 0 ? (t('raffle.freeBadge') || 'GRATUITA') : (t('raffle.activeBadge') || 'ATTIVA'))}
                    </span>
                    <span className="text-xs font-heading font-bold text-amber-300">
                      {r.ticketPriceGram > 0 ? `${r.ticketPriceGram} GRAM` : t('raffle.free')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                      {r.title}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-1.5 text-amber-300">
                        <GramIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-lg font-heading font-black">{r.prizeGram} GRAM</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{rTime.d}d {rTime.h}h {rTime.m}m</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-300">
                    <span>
                      {r.totalTickets} {t('raffle.ticketsSold')}
                      {userTktCount > 0 && (
                        <span className="text-purple-300 font-bold ml-1">
                          ({userTktCount} {t('raffle.yours') || 'tuoi'})
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(r)}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-heading font-bold text-[10px] uppercase shadow-md active:scale-95 transition-all"
                    >
                      {t('raffle.participate')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: My Tickets (Associated strictly with Telegram userId) */}
      {activeTab === 'my_tickets' && (
        <div className="p-4 rounded-3xl bg-[#141724] border border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-heading font-bold text-white uppercase">
              {t('raffle.activeTicketsTitle')}
            </span>
            <span className="text-xs text-purple-300 font-mono font-bold uppercase">
              {myTickets.length} {t('raffle.totalTicketsCount') || 'BIGLIETTI TOTALI'}
            </span>
          </div>

          {myTickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              {t('raffle.noTickets')}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
              {myTickets.map((tkt) => {
                const raffleInfo = myRafflesMap[tkt.raffleId] || raffles.find((r) => r.id === tkt.raffleId);
                const isWon = raffleInfo?.winnerTicketNumber === tkt.ticketNumber;

                return (
                  <div
                    key={tkt.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isWon
                        ? 'bg-amber-500/20 border-amber-400/50'
                        : 'bg-black/40 border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono font-black text-xs text-white block">
                          #TK-{tkt.ticketNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[170px]">
                          {raffleInfo?.title || 'Sfida Raffle'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isWon ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/30 text-amber-300 text-[10px] font-heading font-black uppercase tracking-wider">
                          🏆 {t('raffle.wonBadge') || 'VINTO!'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                          {t('raffle.valid')}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-500 block font-mono">
                        {new Date(tkt.purchasedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Past Winners History */}
      {activeTab === 'winners' && (
        <div className="space-y-2.5">
          {pastWinners.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-[#141724] border border-white/10 space-y-2">
              <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-sans">
                {t('raffle.noPastWinners') || 'Nessuna estrazione completata finora. I vincitori appariranno qui!'}
              </p>
            </div>
          ) : (
            pastWinners.map((w) => (
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
                      {w.winnerUsername ? `@${w.winnerUsername}` : `ID: ${w.winnerUserId}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.title} • Ticket #{w.winnerTicketNumber}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-heading font-black text-emerald-400">
                    +{w.prizeGram} GRAM
                  </span>
                  <span className="text-[9px] text-slate-400 block uppercase">{t('raffle.credited')}</span>
                </div>
              </div>
            ))
          )}
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

      {/* Modal: Detailed Raffle Purchase & Entry */}
      {modalRaffle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141726] border border-purple-500/40 p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-heading font-black uppercase">
                  {modalRaffle.badge || 'RAFFLE'}
                </span>
                <span className="text-xs font-heading font-black text-white truncate max-w-[180px]">
                  {modalRaffle.title}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prize & Price Callout */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-heading uppercase block">
                  {t('raffle.prizePool') || 'MONTEPREMI IN PALIO'}
                </span>
                <div className="flex items-center space-x-1 text-amber-400 font-heading font-black text-xl">
                  <GramIcon className="w-5 h-5" />
                  <span>{modalRaffle.prizeGram} GRAM</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-heading uppercase block">
                  {t('raffle.ticketPrice') || 'PREZZO BIGLIETTO'}
                </span>
                <span className="text-sm font-heading font-black text-white">
                  {modalRaffle.ticketPriceGram === 0 ? t('raffle.free') : `${modalRaffle.ticketPriceGram} GRAM`}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-heading">
                <span>{t('raffle.selectQuantity')}:</span>
                <span className="text-amber-300 font-bold">
                  {t('raffle.total')}: {modalTotalCost.toFixed(2)} GRAM
                </span>
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
            </div>

            {/* Buy Action Button */}
            <button
              type="button"
              disabled={isBuying || !canAfford}
              onClick={handleConfirmPurchase}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Ticket className="w-4 h-4" />
              <span>
                {isBuying
                  ? (t('raffle.buying') || 'ACQUISTO IN CORSO...')
                  : modalTotalCost === 0
                  ? (t('raffle.enterFree') || 'PARTECIPA GRATUITAMENTE')
                  : `${t('raffle.buyTickets')} (${modalTotalCost.toFixed(2)} GRAM)`}
              </span>
            </button>

            {/* Feedback alert */}
            {buyFeedback && (
              <div
                className={`p-3 rounded-2xl text-xs font-heading font-bold text-center animate-in zoom-in-95 duration-150 ${
                  buyFeedback.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                }`}
              >
                {buyFeedback.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
