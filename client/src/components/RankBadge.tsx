import React, { useState } from 'react';
import { Shield, Award, Star, Crown, Sparkles, Gem, Flame, ChevronRight, Gift, Ticket, Zap, Info, X, Trophy } from 'lucide-react';
import { UserRank, RANKS_CONFIG, RANKS_LIST, getRankFromXp, getNextRankProgress } from '../config/ranksConfig.js';
import { GramIcon } from './GramIcon.js';
import { useI18n } from '../i18n/index.js';
import { useHaptics } from '../hooks/useHaptics.js';

interface RankAvatarBadgeProps {
  rank?: UserRank;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RankAvatarBadge: React.FC<RankAvatarBadgeProps> = ({
  rank = 'wood',
  size = 'sm',
  className = '',
}) => {
  const config = RANKS_CONFIG[rank] || RANKS_CONFIG.wood;

  const sizeClasses = {
    sm: 'w-4 h-4 -bottom-1 -right-1 border',
    md: 'w-5 h-5 -bottom-1 -right-1 border-[1.5px]',
    lg: 'w-6 h-6 -bottom-1.5 -right-1.5 border-2',
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  }[size];

  const renderIcon = () => {
    switch (rank) {
      case 'bronze':
        return <Award className={`${iconSizes} text-amber-200`} />;
      case 'silver':
        return <Star className={`${iconSizes} text-slate-100 fill-slate-100`} />;
      case 'gold':
        return <Crown className={`${iconSizes} text-yellow-100 fill-yellow-200`} />;
      case 'platinum':
        return <Sparkles className={`${iconSizes} text-cyan-100`} />;
      case 'diamond':
        return <Gem className={`${iconSizes} text-sky-100 fill-sky-200`} />;
      case 'obsidian':
        return <Flame className={`${iconSizes} text-purple-100 fill-fuchsia-300 animate-pulse`} />;
      case 'wood':
      default:
        return <Shield className={`${iconSizes} text-amber-200`} />;
    }
  };

  return (
    <div
      title={`Rank: ${config.name} (Fee: ${config.feeGram} GRAM)`}
      className={`absolute ${sizeClasses} rounded-full bg-gradient-to-tr ${config.bgGradient} ${config.borderColor} flex items-center justify-center ${config.glowShadow} transition-all z-10 ${className}`}
    >
      {renderIcon()}
    </div>
  );
};

export const RankPill: React.FC<{
  rank?: UserRank;
  showFee?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({
  rank = 'wood',
  showFee = false,
  className = '',
  onClick,
}) => {
  const config = RANKS_CONFIG[rank] || RANKS_CONFIG.wood;

  const renderIcon = () => {
    const iconClass = "w-3 h-3 shrink-0";
    switch (rank) {
      case 'bronze': return <Award className={`${iconClass} text-amber-300`} />;
      case 'silver': return <Star className={`${iconClass} text-slate-200 fill-slate-200`} />;
      case 'gold': return <Crown className={`${iconClass} text-yellow-300 fill-yellow-300`} />;
      case 'platinum': return <Sparkles className={`${iconClass} text-cyan-300`} />;
      case 'diamond': return <Gem className={`${iconClass} text-sky-300 fill-sky-300`} />;
      case 'obsidian': return <Flame className={`${iconClass} text-purple-300 fill-fuchsia-400 animate-pulse`} />;
      case 'wood':
      default: return <Shield className={`${iconClass} text-amber-400`} />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${config.bgGradient} border ${config.borderColor} ${config.glowShadow} text-[10px] font-heading font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${className}`}
    >
      {renderIcon()}
      <span className={config.textColor}>{config.name}</span>
      {showFee && (
        <span className="text-white/80 font-mono text-[9px] lowercase bg-black/40 px-1 rounded">
          {config.feeGram}g fee
        </span>
      )}
    </div>
  );
};

interface RankProgressCardProps {
  xp?: number;
  rank?: UserRank;
  className?: string;
}

export const RankProgressCard: React.FC<RankProgressCardProps> = ({
  xp = 0,
  rank,
  className = '',
}) => {
  const { language } = useI18n();
  const { triggerImpact } = useHaptics();
  const [showRanksModal, setShowRanksModal] = useState(false);

  const effectiveRank = rank || getRankFromXp(xp);
  const currentConfig = RANKS_CONFIG[effectiveRank] || RANKS_CONFIG.wood;
  const progress = getNextRankProgress(xp);
  const nextConfig = progress.nextRank ? RANKS_CONFIG[progress.nextRank] : null;

  const isIt = language === 'it';

  return (
    <>
      <div className={`bg-[#141724]/90 border ${currentConfig.borderColor} rounded-3xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden ${className}`}>
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${currentConfig.bgGradient} opacity-20 blur-2xl pointer-events-none`} />

        {/* Header: Rank Title & All Ranks Link */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${currentConfig.bgGradient} border ${currentConfig.borderColor} flex items-center justify-center ${currentConfig.glowShadow}`}>
              {effectiveRank === 'bronze' ? (
                <Award className="w-5 h-5 text-amber-200" />
              ) : effectiveRank === 'silver' ? (
                <Star className="w-5 h-5 text-slate-100 fill-slate-100" />
              ) : effectiveRank === 'gold' ? (
                <Crown className="w-5 h-5 text-yellow-200 fill-yellow-300" />
              ) : effectiveRank === 'platinum' ? (
                <Sparkles className="w-5 h-5 text-cyan-200" />
              ) : effectiveRank === 'diamond' ? (
                <Gem className="w-5 h-5 text-sky-200 fill-sky-300" />
              ) : effectiveRank === 'obsidian' ? (
                <Flame className="w-5 h-5 text-purple-200 fill-fuchsia-300 animate-pulse" />
              ) : (
                <Shield className="w-5 h-5 text-amber-200" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-heading font-extrabold text-slate-400 uppercase tracking-wider">
                  {isIt ? 'GRADO UTENTE' : 'USER RANK'}
                </span>
                <span className={`text-[10px] font-heading font-black uppercase ${currentConfig.textColor}`}>
                  • {isIt ? currentConfig.nameIt : currentConfig.name}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-sm font-heading font-black text-white tracking-wide">
                  {xp.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerImpact('light');
              setShowRanksModal(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-heading font-bold text-slate-300 hover:text-white flex items-center space-x-1 transition-all active:scale-95"
          >
            <span>{isIt ? 'Tutti i Rank' : 'All Tiers'}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Perks & Fee Row */}
        <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-sans font-medium">
              {isIt ? 'Fee Partita' : 'Match Fee'}
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className={`text-base font-heading font-black ${currentConfig.textColor}`}>
                {currentConfig.feeGram.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">GRAM</span>
              {currentConfig.feeGram < 0.10 && (
                <span className="text-[9px] text-emerald-400 font-mono font-bold ml-auto">
                  -{Math.round((1 - currentConfig.feeGram / 0.10) * 100)}%
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-sans font-medium">
              {isIt ? 'Prossimo Sblocco' : 'Next Unlock'}
            </span>
            <div className="flex items-center space-x-1 mt-1 text-[11px] font-heading font-bold text-white truncate">
              {nextConfig ? (
                <>
                  <span className={nextConfig.textColor}>{nextConfig.name}</span>
                  <span className="text-slate-400 text-[10px]">({nextConfig.feeGram}g)</span>
                </>
              ) : (
                <span className="text-purple-300 font-bold">TOP TIER MAX!</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar towards next tier */}
        {nextConfig ? (
          <div className="space-y-1.5 relative z-10">
            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
              <span>{isIt ? 'Progresso' : 'Progress'}</span>
              <span>
                {progress.xpInCurrentTier} / {progress.xpNeededForNextTier} XP ({progress.progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${currentConfig.bgGradient} transition-all duration-500`}
                style={{ width: `${Math.max(4, progress.progressPercent)}%` }}
              />
            </div>
            {nextConfig.rewardGram > 0 && (
              <div className="flex items-center space-x-1 text-[9px] text-amber-300 font-sans pt-0.5">
                <Gift className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  {isIt
                    ? `Premio Rank ${nextConfig.name}: +${nextConfig.rewardGram} GRAM e ${nextConfig.rewardTickets} Biglietti Raffle!`
                    : `Rank ${nextConfig.name} Reward: +${nextConfig.rewardGram} GRAM and ${nextConfig.rewardTickets} Raffle Tickets!`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-center text-[10px] font-heading font-bold text-purple-300">
            👑 {isIt ? 'Hai raggiunto il Rank Massimo Ossidiana! Fee minima 0.01 GRAM permanente.' : 'Maximum Obsidian Rank achieved! Permanent 0.01 GRAM fee.'}
          </div>
        )}
      </div>

      {/* Modal: All Ranks & Perks Table */}
      {showRanksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141724] border border-white/20 p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider">
                  {isIt ? 'SISTEMA DI RANK E LIVELLI' : 'RANKS & PERKS SYSTEM'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRanksModal(false)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed shrink-0">
              {isIt
                ? 'Guadagna XP giocando match PvP (+15 XP base, +10 XP per vittoria, +5 XP per 1 GRAM scommesso). Più alto è il tuo Rank, meno paghi di fee!'
                : 'Earn XP by playing PvP duels (+15 XP base, +10 XP for victory, +5 XP per 1 GRAM wagered). Higher ranks pay lower platform fees!'}
            </p>

            {/* Ranks List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {RANKS_LIST.map((rankId) => {
                const cfg = RANKS_CONFIG[rankId];
                const isCurrent = rankId === effectiveRank;
                const isReached = xp >= cfg.minXp;

                return (
                  <div
                    key={rankId}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? `bg-gradient-to-r ${cfg.bgGradient} ${cfg.borderColor} shadow-lg`
                        : isReached
                        ? 'bg-white/5 border-white/10 opacity-90'
                        : 'bg-black/30 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cfg.bgGradient} border ${cfg.borderColor} flex items-center justify-center shrink-0`}>
                        {rankId === 'bronze' ? (
                          <Award className="w-4 h-4 text-amber-200" />
                        ) : rankId === 'silver' ? (
                          <Star className="w-4 h-4 text-slate-100 fill-slate-100" />
                        ) : rankId === 'gold' ? (
                          <Crown className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                        ) : rankId === 'platinum' ? (
                          <Sparkles className="w-4 h-4 text-cyan-200" />
                        ) : rankId === 'diamond' ? (
                          <Gem className="w-4 h-4 text-sky-200 fill-sky-200" />
                        ) : rankId === 'obsidian' ? (
                          <Flame className="w-4 h-4 text-purple-200 fill-fuchsia-300" />
                        ) : (
                          <Shield className="w-4 h-4 text-amber-200" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-heading font-black text-white uppercase truncate">
                            {cfg.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] bg-white text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                              {isIt ? 'ATTUALE' : 'CURRENT'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {cfg.minXp === 0 ? 'Base' : `${cfg.minXp.toLocaleString()} XP`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">
                        {cfg.feeGram.toFixed(2)} GRAM <span className="text-[10px] text-slate-400">fee</span>
                      </div>
                      {cfg.rewardGram > 0 && (
                        <div className="text-[9px] text-amber-300 font-sans">
                          +{cfg.rewardGram}g & {cfg.rewardTickets} tickets
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowRanksModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider shrink-0"
            >
              {isIt ? 'CHIUDI' : 'CLOSE'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
