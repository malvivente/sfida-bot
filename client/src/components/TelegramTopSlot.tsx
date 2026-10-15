import React from 'react';
import { Swords } from 'lucide-react';

interface TelegramTopSlotProps {
  isFullscreen: boolean;
  topInset: number;
  isIos?: boolean;
  children?: React.ReactNode;
}

/**
 * Top clearance slot for Telegram Mini App.
 * 
 * In Fullscreen mode, Telegram renders floating system buttons at the top:
 * - Top Left: '✕ Close'
 * - Top Right: 'v' and '⋮' (Menu)
 * 
 * This component preserves the left and right zones for the Telegram buttons,
 * and centers the miniapp title "SFIDA" with the Swords SVG logo in the vacant middle space.
 */
export const TelegramTopSlot: React.FC<TelegramTopSlotProps> = ({
  isFullscreen,
  topInset,
  isIos,
  children,
}) => {
  const effectiveIsIos = isIos ?? (typeof window !== 'undefined' && (/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) || (window as any).Telegram?.WebApp?.platform === 'ios'));
  const minHeight = isFullscreen ? (effectiveIsIos ? 106 : 80) : 42;
  const totalHeight = isFullscreen ? Math.max(topInset, minHeight) : 42;
  const barHeight = 40;
  // On iOS with notch / Dynamic Island, status bar is ~54px. Centering around Y=52px aligns horizontally with '✕ Chiudi' and leaves plenty of clearance below.
  const paddingTop = isFullscreen ? (effectiveIsIos ? 52 : Math.max(0, totalHeight - barHeight - 4)) : 0;

  return (
    <div
      style={{ height: `${totalHeight}px`, paddingTop: `${paddingTop}px` }}
      className="w-full max-w-md mx-auto flex items-center justify-between relative select-none pointer-events-none transition-all duration-200 shrink-0"
    >
      {/* Left zone: Reserved empty space underneath Telegram's floating '✕ Close' button */}
      <div className="w-20 sm:w-24 h-full shrink-0" />

      {/* Center zone: Dedicated slot between '✕ Close' and 'v ⋮' buttons */}
      <div
        id="telegram-top-system-slot"
        className="flex-1 h-full flex items-center justify-center px-1 pointer-events-auto min-w-0"
      >
        {children || (
          <div className="flex items-center space-x-1.5 py-1 px-3.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-md translate-y-0.5">
            <Swords className="w-4 h-4 text-cyan-400" />
            <span className="font-heading font-black text-xs sm:text-sm tracking-widest text-white uppercase drop-shadow">
              SFIDA
            </span>
          </div>
        )}
      </div>

      {/* Right zone: Reserved empty space underneath Telegram's floating 'v' and '⋮' buttons */}
      <div className="w-20 sm:w-24 h-full shrink-0" />
    </div>
  );
};
