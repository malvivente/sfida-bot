import React from 'react';
import { User, Zap, Trophy, TrendingUp, History, Swords } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';

export const Profile: React.FC = () => {
  const { userAddress } = useTonClashContract();

  // Production initial state: real user data starts clean
  const duelsWon = 0;
  const duelsPlayed = 0;
  const bestReaction = '-';
  const totalProfitsTon = '0.00';
  const history: any[] = [];

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Profile Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan flex items-center justify-center shadow-neon-cyan">
            <User className="w-6 h-6 text-cyber-cyan" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold text-white">CYBER DUELIST</h2>
            <p className="text-xs font-chakra text-slate-400 truncate max-w-[200px]">
              {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-6)}` : 'Wallet non collegato'}
            </p>
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
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">Tempo di reazione</div>
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
              <div className="text-base font-chakra font-extrabold text-cyber-cyan">
                +{totalProfitsTon} TON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl">
        <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <History className="w-4 h-4 text-cyber-cyan" />
          <span>STORICO DUELLI RECENTI</span>
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8 bg-cyber-bg/40 border border-cyber-border/60 rounded-xl p-4">
            <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-slate-300 font-semibold font-rajdhani">Nessun duello completato ancora</p>
            <p className="text-[11px] text-slate-500 font-rajdhani mt-0.5">
              Entra nell'Arena per sfidare avversari e registrare le tue prime vincite!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex items-center justify-between text-xs font-chakra"
              >
                <div>
                  <span className="text-white font-bold">{item.opp}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Punteggio: {item.score} • {item.reaction}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-extrabold ${
                      item.result === 'WIN' ? 'text-cyber-green' : 'text-cyber-pink'
                    }`}
                  >
                    {item.reward}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Match #{item.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
