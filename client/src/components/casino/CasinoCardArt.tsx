import React from 'react';

export type CasinoArtType = 'crash' | 'mines' | 'plinko' | 'roulette' | 'dice' | 'hilo';

interface CasinoCardArtProps {
  type: CasinoArtType;
  className?: string;
}

export const CasinoCardArt: React.FC<CasinoCardArtProps> = ({ type, className = '' }) => {
  switch (type) {
    case 'crash':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <linearGradient id="jetTrail" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="jetGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <radialGradient id="glowRed" cx="70%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowRed)" />
          {/* Grid lines */}
          <line x1="20" y1="100" x2="180" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="20" y1="60" x2="180" y2="60" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
          {/* Curved trajectory */}
          <path d="M 25 100 Q 80 95, 145 35" stroke="url(#jetTrail)" strokeWidth="3" strokeLinecap="round" />
          {/* Supersonic Jet */}
          <g transform="translate(145, 35) rotate(-35)">
            <polygon points="0,-12 14,8 0,5 -14,8" fill="url(#jetGrad)" />
            <polygon points="0,-6 4,4 0,2 -4,4" fill="#ffe4e6" />
            {/* Jet flame */}
            <circle cx="0" cy="9" r="3" fill="#fbbf24" opacity="0.9" />
          </g>
          {/* Multiplier pill */}
          <rect x="75" y="15" width="48" height="18" rx="9" fill="#0f172a" stroke="#f43f5e" strokeWidth="1" />
          <text x="99" y="27" fill="#f43f5e" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            2.85x
          </text>
        </svg>
      );

    case 'mines':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <radialGradient id="glowEmerald" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowEmerald)" />
          {/* Hex grid tiles background */}
          <g opacity="0.4">
            <rect x="35" y="25" width="30" height="30" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <rect x="75" y="25" width="30" height="30" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <rect x="135" y="25" width="30" height="30" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <rect x="35" y="65" width="30" height="30" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <rect x="135" y="65" width="30" height="30" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          </g>
          {/* Main Giant Brilliant Gem */}
          <g transform="translate(100, 60)">
            <polygon points="0,-24 22,-8 14,24 -14,24 -22,-8" fill="url(#gemGrad)" />
            <polygon points="0,-24 10,-8 0,8 -10,-8" fill="#a7f3d0" opacity="0.8" />
            <polygon points="0,8 14,24 -14,24" fill="#065f46" />
          </g>
        </svg>
      );

    case 'plinko':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <radialGradient id="glowPurple" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#eab308" />
            </radialGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowPurple)" />
          {/* Pyramid Pegs */}
          <circle cx="100" cy="20" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="85" cy="40" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="115" cy="40" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="70" cy="60" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="100" cy="60" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="130" cy="60" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="55" cy="80" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="85" cy="80" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="115" cy="80" r="3" fill="#e2e8f0" opacity="0.8" />
          <circle cx="145" cy="80" r="3" fill="#e2e8f0" opacity="0.8" />
          {/* Golden Ball cascading down */}
          <circle cx="95" cy="48" r="7" fill="url(#ballGrad)" />
          {/* Bottom multiplier buckets */}
          <rect x="40" y="100" width="20" height="12" rx="3" fill="#ef4444" opacity="0.8" />
          <rect x="65" y="100" width="20" height="12" rx="3" fill="#f59e0b" opacity="0.8" />
          <rect x="90" y="100" width="20" height="12" rx="3" fill="#10b981" opacity="0.8" />
          <rect x="115" y="100" width="20" height="12" rx="3" fill="#f59e0b" opacity="0.8" />
          <rect x="140" y="100" width="20" height="12" rx="3" fill="#ef4444" opacity="0.8" />
        </svg>
      );

    case 'roulette':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <radialGradient id="glowAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="goldRim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowAmber)" />
          {/* 3D Angled Roulette Wheel */}
          <g transform="translate(100, 60)">
            {/* Outer Rim */}
            <circle cx="0" cy="0" r="44" fill="#1e1b4b" stroke="url(#goldRim)" strokeWidth="3" />
            {/* Colored pockets ring */}
            <circle cx="0" cy="0" r="35" fill="#0f172a" stroke="#d97706" strokeWidth="1" strokeDasharray="6 3" />
            {/* Wheel Spokes */}
            <line x1="-32" y1="0" x2="32" y2="0" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            <line x1="0" y1="-32" x2="0" y2="32" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            <line x1="-22" y1="-22" x2="22" y2="22" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            <line x1="-22" y1="22" x2="22" y2="-22" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
            {/* Turret Center */}
            <circle cx="0" cy="0" r="14" fill="url(#goldRim)" />
            <circle cx="0" cy="0" r="6" fill="#fef3c7" />
            {/* Ivory Spinning Ball */}
            <circle cx="24" cy="-18" r="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          </g>
        </svg>
      );

    case 'dice':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <radialGradient id="glowYellow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="diceGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <linearGradient id="diceGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowYellow)" />
          {/* Die 1 (Left - Tilt -12deg) */}
          <g transform="translate(75, 60) rotate(-14)">
            <rect x="-20" y="-20" width="40" height="40" rx="8" fill="url(#diceGrad1)" stroke="#fef9c3" strokeWidth="1.5" />
            {/* Pips for 5 */}
            <circle cx="-10" cy="-10" r="3" fill="#1c1917" />
            <circle cx="10" cy="-10" r="3" fill="#1c1917" />
            <circle cx="0" cy="0" r="3.5" fill="#ef4444" />
            <circle cx="-10" cy="10" r="3" fill="#1c1917" />
            <circle cx="10" cy="10" r="3" fill="#1c1917" />
          </g>
          {/* Die 2 (Right - Tilt +16deg) */}
          <g transform="translate(125, 58) rotate(16)">
            <rect x="-18" y="-18" width="36" height="36" rx="8" fill="url(#diceGrad2)" stroke="#ffedd5" strokeWidth="1.5" />
            {/* Pips for 6 */}
            <circle cx="-9" cy="-10" r="2.5" fill="#1c1917" />
            <circle cx="9" cy="-10" r="2.5" fill="#1c1917" />
            <circle cx="-9" cy="0" r="2.5" fill="#1c1917" />
            <circle cx="9" cy="0" r="2.5" fill="#1c1917" />
            <circle cx="-9" cy="10" r="2.5" fill="#1c1917" />
            <circle cx="9" cy="10" r="2.5" fill="#1c1917" />
          </g>
        </svg>
      );

    case 'hilo':
      return (
        <svg viewBox="0 0 200 120" className={`w-full h-full object-contain ${className}`} fill="none">
          <defs>
            <radialGradient id="glowRose" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="120" fill="url(#glowRose)" />
          {/* Back Card (King of Hearts) */}
          <g transform="translate(85, 60) rotate(-12)">
            <rect x="-22" y="-32" width="44" height="64" rx="6" fill="#ffffff" stroke="#fda4af" strokeWidth="2" />
            <text x="-15" y="-18" fill="#e11d48" fontSize="12" fontWeight="900" fontFamily="sans-serif">K</text>
            <text x="0" y="6" fill="#e11d48" fontSize="18" textAnchor="middle" fontFamily="sans-serif">♥</text>
          </g>
          {/* Front Card (Ace of Spades) */}
          <g transform="translate(115, 60) rotate(10)">
            <rect x="-22" y="-32" width="44" height="64" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <text x="-15" y="-18" fill="#0f172a" fontSize="12" fontWeight="900" fontFamily="sans-serif">A</text>
            <text x="0" y="6" fill="#0f172a" fontSize="20" textAnchor="middle" fontFamily="sans-serif">♠</text>
          </g>
        </svg>
      );

    default:
      return null;
  }
};
