import React, { useState } from 'react';
import { ShieldCheck, Swords, TrendingUp, Users, X, FileText, CheckCircle2 } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { GramIcon } from './GramIcon.js';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const { triggerImpact } = useHaptics();
  const [activeSection, setActiveSection] = useState<'fairplay' | 'duels' | 'fees' | 'affiliates'>('fairplay');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-bg/60">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyber-cyan" />
            <h2 className="text-base font-orbitron font-bold text-white tracking-wide">
              REGOLE & TERMINI (ToS)
            </h2>
          </div>
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-cyber-border/40 hover:bg-cyber-border text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex border-b border-cyber-border bg-cyber-bg/40 p-1 space-x-1 text-xs">
          {[
            { id: 'fairplay', label: 'FAIR PLAY', icon: ShieldCheck },
            { id: 'duels', label: 'DUELLI 1V1', icon: Swords },
            { id: 'fees', label: 'VINCITE & FEE', icon: TrendingUp },
            { id: 'affiliates', label: 'AFFILIATI', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerImpact('light');
                  setActiveSection(tab.id as any);
                }}
                className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all ${
                  isActive
                    ? 'bg-cyber-cyan text-cyber-bg shadow-neon-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed font-rajdhani">
          {activeSection === 'fairplay' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-cyan font-bold font-orbitron text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SMART CONTRACT ESCROW (ZERO-HOUSE RISK)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Tutte le puntate delle sfide 1v1 e le scommesse degli spettatori sono custodite in modo sicuro da smart contract dedicati scritti in Tact su blockchain <strong>TON</strong>.
                </p>
                <p className="text-xs text-slate-400">
                  Nessun intermediario o server può appropriarsi dei fondi: l'esito è validato crittograficamente con firme autoritative Ed25519 e liquidato automaticamente al vincitore al termine della partita.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span><strong>Trasparenza Totale:</strong> Ogni transazione è verificabile pubblicamente sul TON Explorer.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                  <span><strong>Rimborso Automatico:</strong> Se crei una sfida e nessun avversario si unisce, puoi ritirare l'intero importo scommesso.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'duels' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-pink font-bold font-orbitron text-xs">
                  <Swords className="w-4 h-4" />
                  <span>REGOLE DI COMBATTIMENTO QUICKDRAW</span>
                </div>
                <p className="text-xs text-slate-300">
                  I duelli si svolgono al meglio dei 3 round (vince chi conquista per primo 2 round).
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-cyan block mb-0.5">1. Segnale "FIRE!"</strong>
                  <span>Compare a sorpresa tra 1.8 e 4.2 secondi. Il giocatore che tocca il pulsante più velocemente (con minor tempo di reazione in millisecondi) vince il round.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-cyber-amber block mb-0.5">2. Trabocchetto "HOLD!" (Decoy)</strong>
                  <span>Un segnale di finta a luce ambra. Se premi durante il decoy o prima del via, incorri in una penalità di falsa partenza ("MISFIRE") con perdita istantanea del round.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-slate-300 block mb-0.5">3. Disconnessioni & Forfait</strong>
                  <span>Se un giocatore si disconnette, si attiva un timer di sicurezza di 8 secondi. Se non rientra in tempo, viene dichiarato il forfait a favore dell'avversario.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'fees' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-amber font-bold font-orbitron text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>COME FUNZIONANO LE VINCITE</span>
                </div>
                <p className="text-xs text-slate-300">
                  Non ci sono percentuali nascoste. Il vincitore del duello 1v1 riscuote l'intero montepremi generato dalle quote dei due giocatori (2x la puntata), al netto di una commissione di piattaforma del <strong>4%</strong> trattenuta dallo smart contract.
                </p>
              </div>

              <div className="bg-cyber-bg/50 border border-cyber-border rounded-xl p-3 text-xs space-y-1.5 font-chakra">
                <div className="text-white font-bold mb-1 font-orbitron">Esempio Pratico:</div>
                <div className="flex justify-between items-center">
                  <span>Puntata di ciascun giocatore:</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>1.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Montepremi totale generato:</span>
                  <span className="font-bold text-white flex items-center space-x-1">
                    <span>2.00</span>
                    <GramIcon className="w-3 h-3 text-white" />
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-cyber-border pt-1 text-cyber-green font-bold">
                  <span>Vincita netta al vincitore:</span>
                  <span className="flex items-center space-x-1">
                    <span>+1.92</span>
                    <GramIcon className="w-3 h-3 text-cyber-green" />
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Per le scommesse degli spettatori (Pari-Mutuel), le quote sono dinamiche e calcolate in base al volume delle scommesse su ciascun contendente, con una commissione del 6% reinvestita nel programma premi e affiliati.
              </p>
            </div>
          )}

          {activeSection === 'affiliates' && (
            <div className="space-y-3">
              <div className="bg-cyber-bg/70 border border-cyber-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyber-cyan font-bold font-orbitron text-xs">
                  <Users className="w-4 h-4" />
                  <span>GUADAGNARE CON GLI AFFILIATI</span>
                </div>
                <p className="text-xs text-slate-300">
                  Ogni giocatore dispone di un link di invito univoco. Condividendolo con amici o aggiungendo il bot ai tuoi gruppi Telegram, ricevi automaticamente una percentuale sui duelli giocati:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Invito Diretto di Giocatori</strong>
                  <span className="text-slate-300">Ricevi fino al 30% della commissione generata da ogni partita giocata dai tuoi amici invitati.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Admin di Gruppi Telegram</strong>
                  <span className="text-slate-300">Aggiungi il bot al tuo gruppo Telegram: se i membri del gruppo si sfidano all'interno della chat, l'admin del gruppo guadagna automaticamente una rendita su ogni sfida.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cyber-bg/50 border border-cyber-border">
                  <strong className="text-white block mb-0.5">Accredito Istantaneo</strong>
                  <span className="text-slate-300">I guadagni affiliate vengono erogati direttamente dallo smart contract al tuo indirizzo TON collegato.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyber-border bg-cyber-bg/80 flex justify-end">
          <button
            onClick={() => {
              triggerImpact('light');
              onClose();
            }}
            className="w-full py-2.5 bg-cyber-cyan text-cyber-bg font-bold font-orbitron text-xs uppercase tracking-wider rounded-xl shadow-neon-cyan active:scale-95 transition-all"
          >
            HO CAPITO
          </button>
        </div>

      </div>
    </div>
  );
};
