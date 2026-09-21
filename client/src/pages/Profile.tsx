import React, { useState, useEffect } from 'react';
import { Zap, Trophy, TrendingUp, History, Swords, Sparkles, Wallet } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { GramIcon } from '../components/GramIcon.js';
import { DuelHistoryRecord, UserStats } from '../types/index.js';

export const Profile: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { userId, username, fullName, photoUrl, isPremium } = useTelegram();

  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';

  const [history, setHistory] = useState<DuelHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('sfidabot_duel_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [serverStats, setServerStats] = useState<UserStats | null>(null);

  // Caricamento dati permanenti dal Database del Backend Server
  useEffect(() => {
    if (!userAddress) return;

    const fetchDatabaseData = async () => {
      if (serverUrl) {
        try {
          // 1. Fetch storico permanente dal DB del server
          const historyRes = await fetch(`${serverUrl}/api/users/${userAddress}/history`);
          if (historyRes.ok) {
            const hData = await historyRes.json();
            if (hData?.history && Array.isArray(hData.history)) {
              setHistory(hData.history);
              try {
                localStorage.setItem('sfidabot_duel_history', JSON.stringify(hData.history));
              } catch {}
            }
          }

          // 2. Fetch statistiche certificate dal DB del server
          const statsRes = await fetch(`${serverUrl}/api/users/${userAddress}/stats`);
          if (statsRes.ok) {
            const sData = await statsRes.json();
            if (sData?.stats) {
              setServerStats(sData.stats);
            }
          }
        } catch (err) {
          console.warn('[Profile] Connessione al database server in attesa, uso cache locale:', err);
        }
      }
    };

    fetchDatabaseData();
    window.addEventListener('focus', fetchDatabaseData);
    return () => window.removeEventListener('focus', fetchDatabaseData);
  }, [userAddress, serverUrl]);

  // Calcolo statistiche con fallback locale se server non ha ancora risposto
  const duelsPlayed = serverStats ? serverStats.duelsPlayed : history.length;
  const duelsWon = serverStats ? serverStats.duelsWon : history.filter((h) => h.outcome === 'WIN').length;

  const validReactions = history
    .map((h) => h.reactionTimeMs)
    .filter((ms): ms is number => typeof ms === 'number' && ms > 0);
  const bestReaction = serverStats?.bestReaction && serverStats.bestReaction !== '-'
    ? serverStats.bestReaction
    : (validReactions.length > 0 ? `${Math.min(...validReactions)}` : '-');

  const totalProfitsTon = serverStats ? serverStats.totalProfitsTon : history
    .reduce((acc, h) => {
      if (h.outcome === 'WIN') {
        const p = parseFloat(h.payoutTon);
        return acc + (isNaN(p) ? 0 : p);
      }
      return acc;
    }, 0)
    .toFixed(2);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Real Telegram Profile Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-cyber-bg border border-cyber-cyan shadow-neon-cyan shrink-0 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyber-cyan/15 text-cyber-cyan font-orbitron font-bold text-lg">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            {isPremium && (
              <div className="absolute top-0 right-0 bg-cyber-amber text-cyber-bg p-0.5 rounded-bl-md" title="Telegram Premium">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-base font-orbitron font-bold text-white truncate">{fullName}</h2>
              {isPremium && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 rounded-full font-bold">
                  ★ PREMIUM
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs font-chakra text-slate-400 mt-0.5">
              {username && <span className="text-cyber-cyan font-bold">@{username}</span>}
              {userId && <span className="text-slate-500 font-mono text-[11px]">ID: {userId}</span>}
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-chakra text-slate-400 mt-1">
              <Wallet className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}` : 'Wallet non collegato'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Trophy className="w-3.5 h-3.5 text-cyber-amber" />
              <span>VITTORIE 1V1</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-white">
              {duelsWon}
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">
              {duelsPlayed} Duelli Giocati
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Zap className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>MIGLIOR RIFLESSO</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-cyan">
              {bestReaction === '-' ? '- ms' : `${bestReaction}ms`}
            </div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">Tempo di reazione personale</div>
          </div>
        </div>

        {/* Total Profits */}
        <div className="bg-gradient-to-r from-cyber-cyan/10 to-transparent border border-cyber-cyan/30 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyber-cyan/20 text-cyber-cyan">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-chakra text-slate-400 block">VINCITE TOTALI ACCREDITATE</span>
              <div className="text-base font-chakra font-extrabold text-cyber-cyan flex items-center space-x-1">
                <span>+{totalProfitsTon}</span>
                <GramIcon className="w-3.5 h-3.5 text-cyber-cyan" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History (Permanent Server Database Record) */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="w-4 h-4 text-cyber-cyan" />
            <span>STORICO DUELLI PERMANENTE (DATABASE)</span>
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 bg-cyber-bg/40 border border-cyber-border/60 rounded-xl p-4">
            <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-slate-300 font-semibold font-rajdhani">Nessun duello completato ancora</p>
            <p className="text-[11px] text-slate-500 font-rajdhani mt-0.5">
              Entra nell'Arena per sfidare avversari e registrare le tue vincite sul database!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const isWin = item.outcome === 'WIN';
              const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={item.matchId}
                  className={`bg-cyber-bg/60 border rounded-xl p-3 flex items-center justify-between text-xs font-chakra transition-all ${
                    isWin ? 'border-cyber-green/40 hover:border-cyber-green' : 'border-cyber-pink/30 hover:border-cyber-pink'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-orbitron font-extrabold ${
                          isWin ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-pink/20 text-cyber-pink'
                        }`}
                      >
                        {item.outcome}
                      </span>
                      <span className="text-white font-bold tracking-wide">VS {item.opponentName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-rajdhani">
                      Score: <strong className="text-slate-200">{item.score}</strong>
                      {item.reactionTimeMs ? ` • Tuo Riflesso: ${item.reactionTimeMs}ms` : ''} • {dateStr}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`font-extrabold font-chakra text-sm flex items-center space-x-1 ${
                        isWin ? 'text-cyber-green' : 'text-cyber-pink'
                      }`}
                    >
                      <span>{isWin ? `+${item.payoutTon}` : `-${item.wagerTon}`}</span>
                      <GramIcon className={`w-3.5 h-3.5 ${isWin ? 'text-cyber-green' : 'text-cyber-pink'}`} />
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">#{item.matchId}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
