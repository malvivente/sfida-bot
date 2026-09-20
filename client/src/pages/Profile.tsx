import React from 'react';
import { User, Zap, Trophy, TrendingUp, History } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';

export const Profile: React.FC = () => {
  const { userAddress } = useTonClashContract();

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Profile Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan flex items-center justify-center shadow-neon-cyan">
            <User className="w-6 h-6 text-cyber-cyan" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">CYBER DUELIST</h2>
            <p className="text-xs font-mono text-slate-400 truncate max-w-[200px]">
              {userAddress || 'Wallet Not Connected'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono mb-1">
              <Trophy className="w-3.5 h-3.5 text-cyber-amber" />
              <span>WIN RATE</span>
            </div>
            <div className="text-xl font-mono font-extrabold text-white">75.0%</div>
            <div className="text-[10px] text-cyber-muted font-mono mt-0.5">18 Wins / 24 Played</div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono mb-1">
              <Zap className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>BEST REACTION</span>
            </div>
            <div className="text-xl font-mono font-extrabold text-cyber-cyan">182ms</div>
            <div className="text-[10px] text-cyber-muted font-mono mt-0.5">Avg: 224ms</div>
          </div>
        </div>

        {/* Total Profits */}
        <div className="bg-gradient-to-r from-cyber-cyan/10 to-transparent border border-cyber-cyan/30 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-cyber-cyan" />
            <div>
              <span className="text-xs font-mono text-slate-300">TOTAL DUEL PROFITS</span>
              <div className="text-base font-mono font-bold text-white">+48.50 TON</div>
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <History className="w-4 h-4 text-cyber-cyan" />
          <span>RECENT DUEL HISTORY</span>
        </h3>

        <div className="space-y-2">
          {[
            { id: '1001', opp: 'VaporBlade', result: 'WIN', score: '2-1', reaction: '194ms', reward: '+1.92 TON' },
            { id: '998', opp: 'ZeroCool', result: 'WIN', score: '2-0', reaction: '182ms', reward: '+4.80 TON' },
            { id: '992', opp: 'NeonGhost', result: 'LOSS', score: '1-2', reaction: '241ms', reward: '-1.00 TON' },
          ].map((item) => (
            <div
              key={item.id}
              className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-2.5 flex items-center justify-between text-xs font-mono"
            >
              <div>
                <span className="text-white font-bold">{item.opp}</span>
                <span className="text-[10px] text-slate-500 block">
                  Score: {item.score} • {item.reaction}
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
      </div>
    </div>
  );
};
