import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { X, Copy, Check, Share2, Sparkles, QrCode } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { shareToTelegram } from '../utils/telegram.js';
import { useI18n } from '../i18n/index.js';

interface ReferralQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  refLink: string;
  refCode: string;
  username?: string;
}

// Crisp, vector SVG data URI of the Swords logo matching the icon next to "SFIDA" in TelegramTopSlot
const SWORDS_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="badgeBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#121829" />
      <stop offset="100%" stop-color="#090d16" />
    </radialGradient>
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22d3ee" flood-opacity="0.6"/>
    </filter>
  </defs>
  <!-- Rounded square background container -->
  <rect x="2" y="2" width="96" height="96" rx="28" fill="url(#badgeBg)" stroke="#22d3ee" stroke-width="3.5" />
  <!-- Crossed Swords (Lucide Swords geometry scaled and centered) -->
  <g transform="translate(18, 18) scale(2.66)" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#cyanGlow)">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
    <line x1="5" y1="14" x2="9" y2="18"/>
    <line x1="7" y1="17" x2="4" y2="20"/>
    <line x1="3" y1="19" x2="5" y2="21"/>
  </g>
</svg>
`)}`;

export const ReferralQrModal: React.FC<ReferralQrModalProps> = ({
  isOpen,
  onClose,
  refLink,
  refCode,
  username,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);
  const { triggerImpact } = useHaptics();
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;

    // Initialize stylized, soft QR code
    const qr = new QRCodeStyling({
      width: 220,
      height: 220,
      type: 'svg',
      data: refLink,
      image: SWORDS_LOGO_DATA_URI,
      margin: 6,
      dotsOptions: {
        type: 'rounded',
        gradient: {
          type: 'linear',
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: '#22d3ee' }, // vibrant cyan
            { offset: 0.6, color: '#818cf8' }, // indigo
            { offset: 1, color: '#c084fc' }, // purple/fuchsia
          ],
        },
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: '#22d3ee',
      },
      cornersDotOptions: {
        type: 'dot',
        color: '#38bdf8',
      },
      backgroundOptions: {
        color: '#0a0d14',
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.32,
        margin: 5,
        crossOrigin: 'anonymous',
      },
      qrOptions: {
        errorCorrectionLevel: 'H', // High error correction so center logo leaves QR 100% scannable
      },
    });

    qrCodeInstance.current = qr;

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qr.append(qrRef.current);
    }
  }, [isOpen, refLink]);

  if (!isOpen) return null;

  const handleCopy = () => {
    triggerImpact('light');
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = () => {
    triggerImpact('medium');
    const text = '⚔️ Join Sfida Arena on Telegram: fast-paced 1v1 reflex duels and live spectator betting with GRAM!';
    shareToTelegram(refLink, text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#181c2b] via-[#121522] to-[#0d101a] border border-cyan-500/30 p-5 shadow-2xl flex flex-col items-center space-y-4">
        {/* Glow ambient effect */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-heading font-black uppercase tracking-wider">
            <QrCode className="w-3 h-3 text-cyan-400" />
            <span>REFERRAL QR CODE</span>
            <Sparkles className="w-3 h-3 text-cyan-300" />
          </div>
          <h3 className="text-base font-heading font-black text-white tracking-wide">
            {t('affiliates.qrModalTitle')}
          </h3>
          <p className="text-xs text-slate-400 font-sans max-w-[260px] mx-auto leading-relaxed">
            {t('affiliates.qrModalDesc')}
          </p>
        </div>

        {/* QR Code Container - Interactive Tap to Copy */}
        <div
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          title={t('affiliates.tapQrToCopy')}
          className="relative group p-3.5 rounded-3xl bg-[#0a0d14] border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center transition-all cursor-pointer hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95"
        >
          <div ref={qrRef} className="rounded-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02]" />

          {/* Tap-to-copy helper pill on QR */}
          <div className="mt-2.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/40 transition-all flex items-center space-x-1.5 text-[11px] font-sans text-slate-300 group-hover:text-cyan-200">
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-heading font-black text-emerald-300">{t('affiliates.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-cyan-400" />
                <span>{t('affiliates.tapQrToCopy')}</span>
              </>
            )}
          </div>

          {/* Floating animated success badge on copy */}
          {copied && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center animate-in fade-in zoom-in-90 duration-150 z-20">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.5)] mb-2 animate-bounce">
                <Check className="w-6 h-6 text-emerald-300" />
              </div>
              <span className="font-heading font-black text-white text-sm tracking-wider uppercase drop-shadow">
                {t('affiliates.copied')}
              </span>
            </div>
          )}
        </div>

        {/* Referral info label */}
        <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-2.5 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase font-heading font-bold block tracking-wider">
            {t('affiliates.yourRefCode')}
          </span>
          <span className="text-xs font-mono font-bold text-cyan-300 block truncate">
            {refCode} {username ? `(@${username})` : ''}
          </span>
        </div>

        {/* Full-width Share to Telegram Button */}
        <button
          onClick={handleShare}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-heading font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span>{t('affiliates.shareTelegramBtn')}</span>
        </button>
      </div>
    </div>
  );
};
