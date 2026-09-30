import React from 'react';
import { GameType } from '../types/index.js';

interface GameIconProps {
  type?: GameType | string;
  className?: string;
  size?: number;
}

export const GameIcon: React.FC<GameIconProps> = ({ type, className = 'w-5 h-5', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  switch (type) {
    case 'roulette':
      // Russian Roulette: Tactical 6-chamber revolver cylinder with crosshair
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Outer cylinder ring */}
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          {/* Center spindle */}
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          {/* Chambers */}
          <circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
          <circle cx="17.6" cy="8.7" r="1.5" stroke="currentColor" />
          <circle cx="17.6" cy="15.3" r="1.5" stroke="currentColor" />
          <circle cx="12" cy="18.5" r="1.5" stroke="currentColor" />
          <circle cx="6.4" cy="15.3" r="1.5" stroke="currentColor" />
          <circle cx="6.4" cy="8.7" r="1.5" stroke="currentColor" />
        </svg>
      );

    case 'blackjack':
      // Face-Up Blackjack: Pair of overlapping cards with Spade & Ace
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Back card */}
          <rect x="2" y="5" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          {/* Front card */}
          <rect x="8" y="3" width="13" height="17" rx="2" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
          {/* Spade symbol in front card */}
          <path
            d="M14.5 13.5 C13 11 11.5 9 14.5 7 C17.5 9 16 11 14.5 13.5 Z"
            fill="currentColor"
          />
          <path d="M14.5 13 L14.5 16 M13 16 L16 16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case 'bridge':
      // Glass Bridge: Two parallel bridge rails with tempered vs broken glass panes
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Left rail */}
          <path d="M4 2 L4 22" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
          {/* Right rail */}
          <path d="M20 2 L20 22" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
          {/* Step 1: solid pane */}
          <rect x="6.5" y="4" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
          <rect x="13" y="4" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
          {/* Step 2: reversed panes */}
          <rect x="6.5" y="10.5" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
          <rect x="13" y="10.5" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
          {/* Step 3: solid pane */}
          <rect x="6.5" y="17" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
          <rect x="13" y="17" width="4.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        </svg>
      );

    case 'chrono':
      // Chrono Blind: High-precision stopwatch with lightning pulse and countdown needle
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          <circle cx="12" cy="13" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2 L12 4.5" stroke="currentColor" strokeWidth="2" />
          <path d="M10 2 L14 2" stroke="currentColor" strokeWidth="2" />
          <path d="M18 6.5 L19.5 5" stroke="currentColor" strokeWidth="1.8" />
          {/* Clock hands pointing at zero */}
          <path d="M12 13 L12 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
          {/* Ticks */}
          <path d="M12 19 L12 20 M6.5 13 L5.5 13 M18.5 13 L17.5 13" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );

    case 'split':
      // Split or Steal: Crossed daggers & scales of trust
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Dagger 1 */}
          <path d="M4 4 L11 11 M11 11 L14 8 M11 11 L8 14 M4 4 L3 7 L7 3 Z" stroke="currentColor" strokeWidth="1.8" />
          {/* Dagger 2 */}
          <path d="M20 4 L13 11 M13 11 L10 8 M13 11 L16 14 M20 4 L21 7 L17 3 Z" stroke="currentColor" strokeWidth="1.8" />
          {/* Central diamond / prize */}
          <polygon points="12,14 15,18 12,22 9,18" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );

    case 'shotgun':
      // Cyber Shotgun: Tactical shotgun silhouette with barrel, pump, receiver, stock, and ejected shell spark
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Main barrel & receiver */}
          <path d="M3 13 L8 12 L19 12 L22 10.5 L19 10 L8 10 L3 12 Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
          {/* Pump slider underneath */}
          <rect x="9" y="12.5" width="5" height="2" rx="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          {/* Pistol grip & stock */}
          <path d="M5 13 L4 18 L2 18 L2 14 L3 13 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" />
          <path d="M6 14.5 L7.5 17" stroke="currentColor" strokeWidth="1.5" />
          {/* Shell chamber slot */}
          <line x1="14" y1="10.5" x2="16.5" y2="10.5" stroke="currentColor" strokeWidth="2" />
          {/* Cyber spark / red shell blast */}
          <circle cx="21" cy="7.5" r="1.5" fill="currentColor" />
          <path d="M19.5 6 L21 4 M22.5 6 L23.5 5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    case 'connect4':
      // Forza 4: 4x4 mini-grid representing Connect 4 with a winning diagonal line
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          {/* Grid frame */}
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
          {/* Slots / tokens */}
          {/* Diagonal 4 in a row filled */}
          <circle cx="6.5" cy="17.5" r="1.8" fill="currentColor" />
          <circle cx="10" cy="14" r="1.8" fill="currentColor" />
          <circle cx="14" cy="10" r="1.8" fill="currentColor" />
          <circle cx="17.5" cy="6.5" r="1.8" fill="currentColor" />
          {/* Winning line connecting them */}
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1" />
          {/* Other open/empty slots */}
          <circle cx="6.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="10" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="14" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="17.5" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="14" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
        </svg>
      );

    default:
      // Default: Crossed Swords
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          style={style}
        >
          <path d="M14.5 17.5 L3 6 V3 H6 L17.5 14.5" stroke="currentColor" strokeWidth="2" />
          <path d="M13 19 L19 13 M16 16 L21 21" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 17.5 L21 6 V3 H18 L6.5 14.5" stroke="currentColor" strokeWidth="2" />
          <path d="M11 19 L5 13 M8 16 L3 21" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
};
