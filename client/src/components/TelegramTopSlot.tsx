import React from 'react';

interface TelegramTopSlotProps {
  isFullscreen: boolean;
  topInset: number;
  children?: React.ReactNode;
}

/**
 * Top clearance slot for Telegram Mini App Fullscreen mode.
 * 
 * In Fullscreen, Telegram renders floating pill buttons at the top:
 * - Top Left: '✕ Close' (~80px wide)
 * - Top Right: 'v' and '⋮' (~80px wide)
 * 
 * This component:
 * 1. Pushes the entire app (SFIDA ARENA, TonConnect, tabs, arena) down below the floating buttons.
 * 2. Leaves the center space between the buttons clear and ready for the upcoming Jackpot Mini-Card.
 */
export const TelegramTopSlot: React.FC<TelegramTopSlotProps> = ({
  isFullscreen,
  topInset,
  children,
}) => {
  if (!isFullscreen && topInset <= 0) {
    return null;
  }

  const height = Math.max(topInset, 56);

  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full max-w-md mx-auto flex items-center justify-between relative select-none pointer-events-none transition-all duration-200 shrink-0"
      aria-hidden="true"
    >
      {/* Left zone: Reserved empty space underneath Telegram's floating '✕ Close' button */}
      <div className="w-20 h-full shrink-0" />

      {/* Center zone: Dedicated slot between '✕ Close' and 'v ⋮' buttons */}
      <div
        id="telegram-top-jackpot-slot"
        className="flex-1 h-full flex items-center justify-center px-1 pointer-events-auto"
      >
        {children || null}
      </div>

      {/* Right zone: Reserved empty space underneath Telegram's floating 'v' and '⋮' buttons */}
      <div className="w-20 h-full shrink-0" />
    </div>
  );
};
