import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Swords, Coins, Check, X, Trash2, Search, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { FriendUser, FriendRequestItem } from '../types/index.js';
import { UserAvatar } from './UserAvatar.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { cleanPlayerName } from '../utils/cleanName.js';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeFriend?: (friend: FriendUser) => void;
  onTipFriend?: (friend: FriendUser) => void;
  onPendingRequestsChange?: (count: number) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onChallengeFriend,
  onTipFriend,
  onPendingRequestsChange,
}) => {
  const { userId } = useTelegram();
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [addInput, setAddInput] = useState<string>('');
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  const fetchFriendsData = async () => {
    if (!userId && !userAddress) return;
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (userId) q.set('telegramId', String(userId));
      if (userAddress) q.set('wallet', userAddress);

      const res = await fetch(`${serverUrl}/api/friends?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          setFriends(data.friends || []);
          setIncoming(data.incoming || []);
          setOutgoing(data.outgoing || []);
          onPendingRequestsChange?.((data.incoming || []).length);
        }
      }
    } catch (err) {
      console.warn('[FriendsModal] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriendsData();
      setFeedbackMsg(null);
    }
  }, [isOpen, userId, userAddress]);

  if (!isOpen) return null;

  const handleSendRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addInput.trim()) return;

    setAddLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${serverUrl}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderTelegramId: userId ? String(userId) : undefined,
          senderWallet: userAddress,
          targetIdentifier: addInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        triggerImpact('medium');
        setFeedbackMsg({ type: 'success', text: 'Richiesta di amicizia inviata con successo!' });
        setAddInput('');
        fetchFriendsData();
      } else {
        triggerImpact('heavy');
        setFeedbackMsg({ type: 'error', text: data?.error || 'Errore durante l\'invio della richiesta' });
      }
    } catch {
      triggerImpact('heavy');
      setFeedbackMsg({ type: 'error', text: 'Errore di connessione al server' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRespond = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    triggerImpact('light');
    try {
      const res = await fetch(`${serverUrl}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          userTelegramId: userId ? String(userId) : undefined,
          userWallet: userAddress,
          action,
        }),
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.warn('[FriendsModal] Respond error:', err);
    }
  };

  const handleRemoveFriend = async (friend: FriendUser) => {
    const friendKey = friend.telegramId || friend.walletAddress || friend.username;
    if (!friendKey) return;
    triggerImpact('light');
    try {
      const q = new URLSearchParams();
      if (userId) q.set('userTelegramId', String(userId));
      if (userAddress) q.set('userWallet', userAddress);

      const res = await fetch(`${serverUrl}/api/friends/${friendKey}?${q.toString()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.warn('[FriendsModal] Remove error:', err);
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const name = (f.displayName || f.name || '').toLowerCase();
    return (
      name.includes(term) ||
      (f.username && f.username.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121422] border border-white/15 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative overflow-hidden font-sans">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                Amici & Social
              </h3>
              <p className="text-[11px] text-slate-400">
                {friends.length} {friends.length === 1 ? 'amico' : 'amici'} • Sfida o invia tip
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

        {/* Tabs Switcher */}
        <div className="grid grid-cols-3 p-1 bg-black/40 border border-white/10 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setActiveTab('friends');
              setFeedbackMsg(null);
            }}
            className={`py-1.5 rounded-xl text-xs font-heading font-black transition-all ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Amici ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setActiveTab('requests');
              setFeedbackMsg(null);
            }}
            className={`py-1.5 rounded-xl text-xs font-heading font-black transition-all relative ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Richieste</span>
            {incoming.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                {incoming.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setActiveTab('add');
              setFeedbackMsg(null);
            }}
            className={`py-1.5 rounded-xl text-xs font-heading font-black transition-all ${
              activeTab === 'add'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + Aggiungi
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`p-2.5 rounded-2xl text-xs font-medium border flex items-center space-x-2 shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              {friends.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Cerca amico per nome o @username..."
                    className="w-full bg-[#181a29] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              )}

              {isLoading && friends.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span>Caricamento amici...</span>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-10 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-heading font-bold text-slate-300">Nessun amico trovato</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Aggiungi amici inserendo il loro @username o aggiungili direttamente dopo una sfida!
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-bold active:scale-95"
                  >
                    + Aggiungi un amico
                  </button>
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const uname = f.username ? `@${f.username.replace(/^@/, '')}` : undefined;
                  return (
                    <div
                      key={f.telegramId || f.walletAddress || f.username}
                      className="bg-[#181b2a] border border-white/10 hover:border-purple-500/30 rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <UserAvatar
                          name={cleanPlayerName(f.displayName || f.name || 'Amico')}
                          photoUrl={f.photoUrl}
                          sizeClass="w-9 h-9"
                          textClass="text-xs"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-heading font-black text-white truncate">
                            {cleanPlayerName(f.displayName || f.name || 'Amico')}
                          </p>
                          {uname && (
                            <p className="text-[11px] text-purple-300 font-mono truncate">{uname}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {onChallengeFriend && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerImpact('medium');
                              onClose();
                              onChallengeFriend(f);
                            }}
                            className="px-2 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-[11px] font-heading font-black uppercase tracking-wider active:scale-95 flex items-center space-x-1 shadow-sm"
                            title="Sfida a duello"
                          >
                            <Swords className="w-3 h-3" />
                            <span>Sfida</span>
                          </button>
                        )}
                        {onTipFriend && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerImpact('light');
                              onClose();
                              onTipFriend(f);
                            }}
                            className="px-2 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-heading font-black uppercase tracking-wider active:scale-95 flex items-center space-x-1"
                            title="Invia Tip"
                          >
                            <Coins className="w-3 h-3" />
                            <span>Tip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(f)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
                          title="Rimuovi amico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-wider block mb-2">
                  Richieste Ricevute ({incoming.length})
                </span>
                {incoming.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4 bg-white/5 rounded-2xl">
                    Nessuna richiesta in attesa
                  </p>
                ) : (
                  <div className="space-y-2">
                    {incoming.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#181b2a] border border-purple-500/30 rounded-2xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <UserAvatar
                            name={cleanPlayerName(req.fromDisplayName || req.fromUsername || 'User')}
                            photoUrl={req.fromPhotoUrl}
                            sizeClass="w-9 h-9"
                            textClass="text-xs"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-heading font-black text-white truncate">
                              {cleanPlayerName(req.fromDisplayName || req.fromUsername || 'User')}
                            </p>
                            {req.fromUsername && (
                              <p className="text-[11px] text-purple-300 font-mono truncate">
                                @{req.fromUsername.replace(/^@/, '')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleRespond(req.id, 'ACCEPT')}
                            className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 active:scale-95"
                            title="Accetta"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRespond(req.id, 'DECLINE')}
                            className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 active:scale-95"
                            title="Rifiuta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {outgoing.length > 0 && (
                <div>
                  <span className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Richieste Inviate ({outgoing.length})
                  </span>
                  <div className="space-y-1.5">
                    {outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 flex items-center justify-between text-xs text-slate-400"
                      >
                        <span>Inviata a @{req.toUsername || req.toUserKey}</span>
                        <span className="text-[10px] text-amber-400/80 font-mono">In attesa...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADD FRIEND */}
          {activeTab === 'add' && (
            <form onSubmit={handleSendRequest} className="space-y-3 py-1">
              <div>
                <label className="text-[11px] font-heading font-black text-slate-300 uppercase tracking-wider block mb-1.5">
                  Inserisci Username o Telegram ID
                </label>
                <div className="relative">
                  <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    placeholder="es. @duelist o 123456789"
                    className="w-full bg-[#181a29] border border-white/15 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  L'utente riceverà una notifica in chat da @SfidaRobot e potrà accettare la tua richiesta.
                </p>
              </div>

              <button
                type="submit"
                disabled={addLoading || !addInput.trim()}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
              >
                {addLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Invio in corso...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Invia Richiesta di Amicizia</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
