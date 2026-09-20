import React, { useState } from 'react';
import { Users, Copy, Share2, DollarSign, Check, MessageSquare, Zap, ShieldCheck } from 'lucide-react';
import { useTonClashContract } from '../hooks/useTonClashContract.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';

export const ReferralDashboard: React.FC = () => {
  const { userAddress } = useTonClashContract();
  const { triggerImpact } = useHaptics();
  const [copied, setCopied] = useState(false);

  // Link personale associato al wallet dell'utente che ha aperto la Mini App
  const refLink = `https://t.me/SfidaRobot?start=ref_${userAddress || 'arena'}`;

  const copyRefLink = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    triggerImpact('medium');
    const text = '⚔️ Unisciti a Sfida Arena su Telegram: duelli di riflessi 1v1 e scommesse live su blockchain TON!';
    shareToTelegram(refLink, text);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 font-rajdhani">
      {/* Overview Card */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cyber-pink/15 border border-cyber-pink flex items-center justify-center shadow-neon-pink">
            <Users className="w-6 h-6 text-cyber-pink" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold text-white">IL TUO PROGRAMMA AFFILIATI</h2>
            <p className="text-xs text-slate-400">Guadagna rendite in TON dalle sfide dei tuoi amici</p>
          </div>
        </div>

        {/* Live Earnings Stats (Real Production Initial State) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>GUADAGNO TOTALE</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-cyan">0.00 TON</div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">Accredito istantaneo</div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-chakra mb-1">
              <Users className="w-3.5 h-3.5 text-cyber-pink" />
              <span>AMICI INVITATI</span>
            </div>
            <div className="text-xl font-chakra font-extrabold text-cyber-pink">0</div>
            <div className="text-[11px] text-slate-500 font-chakra mt-0.5">Attivi nei duelli</div>
          </div>
        </div>

        {/* Personal Invite Link Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-chakra text-slate-300 uppercase tracking-wider block">
              Il tuo Link di Invito Personale
            </label>
            {copied && (
              <span className="text-xs font-chakra font-bold text-cyber-green flex items-center space-x-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>COPIATO!</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={refLink}
              className="flex-1 bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs font-chakra text-slate-300 focus:outline-none select-all"
            />
            <button
              onClick={copyRefLink}
              title="Copia link"
              className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1 text-xs font-bold font-orbitron ${
                copied
                  ? 'bg-cyber-green/20 border-cyber-green text-cyber-green'
                  : 'bg-cyber-bg border-cyber-border hover:border-cyber-cyan text-slate-300 active:scale-95'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              title="Condividi su Telegram"
              className="px-3 py-2.5 bg-cyber-cyan text-cyber-bg font-orbitron font-bold rounded-xl shadow-neon-cyan active:scale-95 transition-all flex items-center space-x-1.5 text-xs"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">INVITA</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {userAddress
              ? 'Il tuo wallet TON è collegato e riceverà i premi in automatico.'
              : 'Connetti il tuo wallet TON in alto per riscattare le vincite affiliate.'}
          </p>
        </div>
      </div>

      {/* Clear Benefits Section */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-orbitron font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-cyber-cyan" />
          <span>COME FUNZIONA IL GUADAGNO</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-cyan/15 text-cyber-cyan shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">1. Invita i tuoi Amici</span>
              <span className="text-slate-300 leading-relaxed">
                Invia il tuo link a qualsiasi contatto su Telegram. Ogni volta che giocano una sfida o piazzano una scommessa, una parte della vincita viene accreditata a te.
              </span>
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-pink/15 text-cyber-pink shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">2. Aggiungi il Bot nei tuoi Gruppi</span>
              <span className="text-slate-300 leading-relaxed">
                Aggiungi <strong>@SfidaRobot</strong> al tuo gruppo Telegram. Se i membri del gruppo si sfidano nella chat, l'admin del gruppo guadagna automaticamente su ogni duello.
              </span>
            </div>
          </div>

          <div className="bg-cyber-bg/60 border border-cyber-border rounded-xl p-3 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-cyber-green/15 text-cyber-green shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold block mb-0.5 font-orbitron text-[11px]">3. Incassi Diretti su Smart Contract</span>
              <span className="text-slate-300 leading-relaxed">
                Nessun saldo congelato: i guadagni vengono calcolati e trasferiti in maniera trasparente tramite smart contract sulla blockchain TON.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
