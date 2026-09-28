import React from 'react';
import { Trophy, Coins } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { GramIcon } from '../components/GramIcon.js';
import { useI18n } from '../i18n/index.js';

interface MatchDetailProps {
  matchId: string;
}

export const MatchDetail: React.FC<MatchDetailProps> = ({ matchId }) => {
  const { claimSpectatorPayout } = useTonClashContract();
  const { t } = useI18n();

  const handleClaim = async () => {
    try {
      await claimSpectatorPayout('EQA_mock_match_escrow_address', matchId);
      alert(t('matchDetail.claimSuccess'));
    } catch (err: any) {
      alert(t('matchDetail.claimError', { error: err.message }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-sans">
      <div className="bg-gradient-to-b from-[#181b29] to-[#121420] border border-white/10 rounded-3xl p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-heading font-extrabold text-white tracking-wide">MATCH #{matchId}</span>
          <span className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {t('matchDetail.settledOnTon')}
          </span>
        </div>

        {/* Winner Spotlight */}
        <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-4 text-center mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
          <h3 className="text-base font-heading font-extrabold text-white">{t('matchDetail.winnerCrown')}</h3>
          <p className="text-xs text-slate-400 font-sans mt-1">2 - 1 • Reaction: 194.2ms</p>
          <div className="mt-2 text-xs font-heading font-black text-amber-300 flex items-center justify-center space-x-1">
            <span>+2.00</span>
            <GramIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-sans font-medium text-[11px]">({t('matchDetail.payoutLabel')})</span>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2 text-xs font-sans text-slate-300 mb-4 bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('matchDetail.totalPot')}</span>
            <span className="text-white font-bold flex items-center space-x-1">
              <span>2.00</span>
              <GramIcon className="w-3 h-3 text-white" />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('matchDetail.playerRake')}</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <span>0.00</span>
              <GramIcon className="w-3 h-3 text-emerald-400" />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('matchDetail.spectatorPool')}</span>
            <span className="text-white font-bold flex items-center space-x-1">
              <span>5.00</span>
              <GramIcon className="w-3 h-3 text-white" />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{t('matchDetail.spectatorRake')}</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <span>0.00</span>
              <GramIcon className="w-3 h-3 text-emerald-400" />
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-2 font-bold">
            <span className="text-slate-400">{t('matchDetail.distributablePool')}</span>
            <span className="text-emerald-400 font-extrabold flex items-center space-x-1">
              <span>5.00</span>
              <GramIcon className="w-3 h-3 text-emerald-400" />
              <span>(100%)</span>
            </span>
          </div>
        </div>

        {/* Claim Reward Button */}
        <button
          onClick={handleClaim}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-heading font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-epic-purple active:scale-95 transition-all flex items-center justify-center space-x-1.5"
        >
          <Coins className="w-4 h-4 shrink-0 text-amber-300" />
          <span className="flex items-center space-x-1">
            <span>{t('matchDetail.claimSpectator')} (1.88</span>
            <GramIcon className="w-3.5 h-3.5 text-white" />
            <span>)</span>
          </span>
        </button>
      </div>
    </div>
  );
};
