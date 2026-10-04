import React from 'react';

export type CardArtType =
  | 'menu_split'
  | 'menu_quick'
  | 'menu_strategy'
  | 'menu_spectate'
  | 'shotgun'
  | 'connect4'
  | 'split'
  | 'cubecount'
  | 'roulette'
  | 'blackjack'
  | 'bridge'
  | 'chrono';

interface CardBackgroundArtProps {
  type: CardArtType;
  className?: string;
}

export const CardBackgroundArt: React.FC<CardBackgroundArtProps> = ({ type, className = '' }) => {
  switch (type) {
    // =========================================================================
    // MENU CARDS (Epic Banners)
    // =========================================================================

    case 'menu_split':
      // Split or Steal Menu: Dual geometric crystals / dilemma fracture with balance arcs
      return (
        <svg
          viewBox="0 0 220 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-menu-split-cyan" x1="20" y1="20" x2="100" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" stopOpacity="0.9" />
              <stop stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="art-menu-split-gold" x1="120" y1="20" x2="200" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
              <stop stopColor="#d97706" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Background orbital rings */}
          <circle cx="110" cy="70" r="58" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
          <circle cx="110" cy="70" r="42" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />

          {/* Left Harmony Crystal (SPLIT - Cyan) */}
          <g transform="translate(10, 0)">
            <polygon
              points="70,25 95,50 85,95 55,95 45,50"
              fill="url(#art-menu-split-cyan)"
              fillOpacity="0.25"
              stroke="#38bdf8"
              strokeWidth="1.8"
            />
            {/* Facet lines */}
            <line x1="70" y1="25" x2="70" y2="95" stroke="#bae6fd" strokeWidth="1.2" opacity="0.6" />
            <line x1="45" y1="50" x2="95" y2="50" stroke="#bae6fd" strokeWidth="1.2" opacity="0.6" />
            <line x1="70" y1="25" x2="85" y2="95" stroke="#38bdf8" strokeWidth="1" opacity="0.4" />
            {/* Split Peace Symbol Outline */}
            <circle cx="70" cy="65" r="8" stroke="#ffffff" strokeWidth="1.5" fill="#0284c7" fillOpacity="0.3" />
            <line x1="70" y1="57" x2="70" y2="73" stroke="#ffffff" strokeWidth="1.4" />
            <line x1="70" y1="65" x2="64" y2="71" stroke="#ffffff" strokeWidth="1.4" />
            <line x1="70" y1="65" x2="76" y2="71" stroke="#ffffff" strokeWidth="1.4" />
          </g>

          {/* Central Energy Fracture Line */}
          <path
            d="M 110 15 L 108 45 L 113 75 L 107 105 L 110 125"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Energy spark nodes */}
          <circle cx="108" cy="45" r="2.5" fill="#ffffff" />
          <circle cx="113" cy="75" r="3" fill="#ffffff" />
          <circle cx="107" cy="105" r="2.5" fill="#ffffff" />

          {/* Right Predatory Crystal / Claw (STEAL - Amber) */}
          <g transform="translate(10, 0)">
            <polygon
              points="150,25 175,50 165,95 135,95 125,50"
              fill="url(#art-menu-split-gold)"
              fillOpacity="0.25"
              stroke="#fbbf24"
              strokeWidth="1.8"
            />
            {/* Facet lines */}
            <line x1="150" y1="25" x2="150" y2="95" stroke="#fde68a" strokeWidth="1.2" opacity="0.6" />
            <line x1="125" y1="50" x2="175" y2="50" stroke="#fde68a" strokeWidth="1.2" opacity="0.6" />
            <line x1="150" y1="25" x2="135" y2="95" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
            {/* Steal Dagger Glyph */}
            <path
              d="M 146 60 L 154 60 L 150 72 Z"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            <line x1="150" y1="56" x2="150" y2="60" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="145" y1="60" x2="155" y2="60" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'menu_quick':
      // Quick Match Menu: Crossed dynamic duel blades + cutting lightning bolt + velocity arcs
      return (
        <svg
          viewBox="0 0 220 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-menu-quick-grad" x1="30" y1="20" x2="190" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.8" />
              <stop stopColor="#f43f5e" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Speed Arcs */}
          <path d="M 40 100 A 70 70 0 0 1 180 100" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.3" />
          <path d="M 55 90 A 55 55 0 0 1 165 90" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />

          {/* Directional Chevrons */}
          <path d="M 175 40 L 185 50 L 175 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <path d="M 188 40 L 198 50 L 188 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          {/* Blade 1 (Diagonal Top-Left to Bottom-Right) */}
          <g>
            <path
              d="M 65 25 L 145 105 L 138 112 L 58 32 Z"
              fill="url(#art-menu-quick-grad)"
              fillOpacity="0.3"
              stroke="#ffffff"
              strokeWidth="1.6"
            />
            {/* Fuller line */}
            <line x1="72" y1="30" x2="132" y2="90" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
            {/* Guard and Hilt */}
            <line x1="50" y1="40" x2="72" y2="18" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <line x1="45" y1="45" x2="35" y2="55" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Blade 2 (Diagonal Top-Right to Bottom-Left) */}
          <g>
            <path
              d="M 155 25 L 75 105 L 82 112 L 162 32 Z"
              fill="url(#art-menu-quick-grad)"
              fillOpacity="0.3"
              stroke="#ffffff"
              strokeWidth="1.6"
            />
            {/* Fuller line */}
            <line x1="148" y1="30" x2="88" y2="90" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
            {/* Guard and Hilt */}
            <line x1="170" y1="40" x2="148" y2="18" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <line x1="175" y1="45" x2="185" y2="55" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Cutting Lightning Bolt (Center Clash) */}
          <polygon
            points="114,15 98,62 116,62 104,115 128,52 112,52"
            fill="#ffffff"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Clash Impact Sparks */}
          <circle cx="110" cy="57" r="4" fill="#ffffff" opacity="0.9" />
          <line x1="110" y1="47" x2="110" y2="40" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="110" y1="67" x2="110" y2="74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="100" y1="57" x2="93" y2="57" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="120" y1="57" x2="127" y2="57" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'menu_strategy':
      // Strategy Duels Menu: Geometric Chess Knight + Tactical Reticle Grid
      return (
        <svg
          viewBox="0 0 220 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-menu-strat-grad" x1="60" y1="20" x2="180" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fb7185" stopOpacity="0.8" />
              <stop stopColor="#9333ea" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Tactical Grid Background */}
          <g opacity="0.25">
            <line x1="30" y1="35" x2="190" y2="35" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="30" y1="70" x2="190" y2="70" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="30" y1="105" x2="190" y2="105" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="60" y1="15" x2="60" y2="125" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="110" y1="15" x2="110" y2="125" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
            <line x1="160" y1="15" x2="160" y2="125" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
          </g>

          {/* Coordinate Reticle Circle */}
          <circle cx="125" cy="65" r="45" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="125" cy="65" r="28" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />

          {/* Sleek Minimalist 2D Geometric Chess Knight */}
          <g transform="translate(15, 0)">
            {/* Knight Pedestal Base */}
            <path
              d="M 85 118 L 145 118 L 140 108 L 90 108 Z"
              fill="url(#art-menu-strat-grad)"
              stroke="#ffffff"
              strokeWidth="1.6"
            />
            {/* Knight Lower Neck */}
            <path
              d="M 90 108 L 140 108 L 132 88 L 94 92 Z"
              fill="url(#art-menu-strat-grad)"
              fillOpacity="0.25"
              stroke="#ffffff"
              strokeWidth="1.4"
            />
            {/* Knight Head & Mane Profile (Clean geometric polygons) */}
            <path
              d="M 94 92 L 80 75 L 75 62 L 95 62 L 102 50 L 105 32 L 118 36 L 126 26 L 132 40 L 136 60 L 132 88 Z"
              fill="url(#art-menu-strat-grad)"
              fillOpacity="0.35"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Knight Eye Cutout (Minimal geometric slit) */}
            <polygon points="98,52 106,50 102,56" fill="#ffffff" />
            {/* Mane Facet Creases */}
            <line x1="118" y1="36" x2="124" y2="58" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
            <line x1="105" y1="32" x2="114" y2="52" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
            <line x1="95" y1="62" x2="112" y2="78" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
            {/* Snout Jaw Line */}
            <path d="M 75 62 L 85 70 L 95 68" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* Target Brackets around Knight */}
          <path d="M 80 30 L 70 30 L 70 40" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          <path d="M 180 30 L 190 30 L 190 40" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          <path d="M 80 110 L 70 110 L 70 100" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          <path d="M 180 110 L 190 110 L 190 100" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'menu_spectate':
      // Spectate & Bet Menu: Futuristic Broadcast Radar Eye + Betting Tokens + Spotlight Rays
      return (
        <svg
          viewBox="0 0 220 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-menu-spec-grad" x1="50" y1="20" x2="180" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" stopOpacity="0.8" />
              <stop stopColor="#a855f7" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="art-menu-beam" x1="110" y1="120" x2="110" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" stopOpacity="0.25" />
              <stop stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Arena Spotlight Cones */}
          <polygon points="110,130 50,15 170,15" fill="url(#art-menu-beam)" opacity="0.6" />

          {/* Broadcast Waves (Pulsing Arcs) */}
          <path d="M 50 45 A 75 75 0 0 1 170 45" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
          <path d="M 65 55 A 55 55 0 0 1 155 55" stroke="#818cf8" strokeWidth="1.5" opacity="0.4" />

          {/* Center Cyber Eye / Arena Reticle */}
          <g transform="translate(10, 0)">
            {/* Outer Hex Eye Contour */}
            <path
              d="M 55 70 Q 100 35 145 70 Q 100 105 55 70 Z"
              fill="url(#art-menu-spec-grad)"
              fillOpacity="0.2"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
            {/* Iris Outer Ring */}
            <circle cx="100" cy="70" r="22" stroke="#38bdf8" strokeWidth="1.6" />
            {/* Iris Inner Ring */}
            <circle cx="100" cy="70" r="14" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="3 2" />
            {/* Core Pupil with Live Broadcast dot */}
            <circle cx="100" cy="70" r="6" fill="#ffffff" />
            <circle cx="100" cy="70" r="2" fill="#06b6d4" />
          </g>

          {/* Floating Betting Coin/Token Left */}
          <g transform="translate(25, 30)">
            <ellipse cx="20" cy="20" rx="14" ry="9" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5" />
            <ellipse cx="20" cy="18" rx="10" ry="6" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
            <text x="17" y="22" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="sans-serif">$</text>
          </g>

          {/* Floating Betting Coin/Token Right */}
          <g transform="translate(160, 65)">
            <ellipse cx="20" cy="20" rx="16" ry="10" fill="#0f172a" stroke="#c084fc" strokeWidth="1.6" />
            <ellipse cx="20" cy="18" rx="11" ry="7" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
            <text x="14" y="22" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">2X</text>
          </g>
        </svg>
      );

    // =========================================================================
    // GAME CARDS (Play Hub Games)
    // =========================================================================

    case 'shotgun':
      // Cyber Shotgun: Minimalist 2D Tactical Shotgun Silhouette + Ejected Shell + Laser Track
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-shotgun-glow" x1="20" y1="40" x2="220" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f43f5e" stopOpacity="0.2" />
              <stop stopColor="#ef4444" stopOpacity="0.7" />
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Laser Sight Beam forward */}
          <line x1="215" y1="42" x2="240" y2="42" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="3 2" />
          <circle cx="215" cy="42" r="2.5" fill="#f87171" />

          {/* Main Shotgun Silhouette (Clean, sharp 2D vector geometry) */}
          {/* Stock butt pad */}
          <path d="M 20 28 L 26 28 L 28 64 L 20 62 Z" fill="#ffffff" fillOpacity="0.3" stroke="#ffffff" strokeWidth="1.5" />
          {/* Stock body & comb */}
          <path d="M 26 28 L 70 36 L 70 54 L 40 54 L 28 64 Z" fill="#ffffff" fillOpacity="0.15" stroke="#ffffff" strokeWidth="1.4" />
          {/* Receiver / Chamber frame */}
          <path d="M 70 34 L 125 34 L 125 58 L 70 58 Z" fill="#ffffff" fillOpacity="0.25" stroke="#ffffff" strokeWidth="1.6" />
          {/* Receiver Ejection Port */}
          <rect x="88" y="38" width="22" height="10" rx="1.5" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.4" />
          {/* Pistol grip & trigger guard */}
          <path d="M 68 58 L 62 82 L 74 85 L 82 58 Z" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeWidth="1.4" />
          <path d="M 82 58 Q 88 70 94 58" stroke="#ffffff" strokeWidth="1.4" fill="none" />
          <path d="M 87 60 L 89 66" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />

          {/* Barrel (Top Tube) */}
          <rect x="125" y="36" width="88" height="9" fill="url(#art-shotgun-glow)" stroke="#ffffff" strokeWidth="1.5" />
          {/* Muzzle Brake */}
          <rect x="210" y="34" width="6" height="13" rx="1" fill="#f87171" stroke="#ffffff" strokeWidth="1.4" />
          <line x1="213" y1="36" x2="213" y2="44" stroke="#0f172a" strokeWidth="1.2" />

          {/* Magazine Tube (Bottom Tube) */}
          <rect x="125" y="47" width="70" height="7" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeWidth="1.2" />
          {/* Magazine Tube Cap */}
          <circle cx="195" cy="50.5" r="3.5" fill="#f87171" stroke="#ffffff" strokeWidth="1.2" />

          {/* Pump Slide Forend */}
          <rect x="140" y="45" width="34" height="13" rx="2" fill="#ef4444" fillOpacity="0.5" stroke="#ffffff" strokeWidth="1.6" />
          {/* Knurled slide ribs */}
          <line x1="148" y1="47" x2="148" y2="56" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="156" y1="47" x2="156" y2="56" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="164" y1="47" x2="164" y2="56" stroke="#ffffff" strokeWidth="1.2" />

          {/* High-Caliber Cartridge Ejecting into air with flight arc */}
          <path d="M 98 36 Q 110 15 130 18" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="2 2" fill="none" opacity="0.7" />
          <g transform="translate(125, 12) rotate(28)">
            <rect x="0" y="0" width="14" height="7" rx="1" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
            <rect x="0" y="0" width="4" height="7" fill="#ef4444" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#ffffff" strokeWidth="1" />
          </g>

          {/* Muzzle Spark chevrons */}
          <path d="M 220 38 L 226 42 L 220 46" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'connect4':
      // Forza 4: Clean Isometric / Angled Connect-4 Grid + 4 Diagonal Winning Discs + Laser Streak
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-c4-board" x1="15" y1="20" x2="125" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" stopOpacity="0.35" />
              <stop stopColor="#1d4ed8" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Outer Board Frame */}
          <rect x="15" y="20" width="110" height="100" rx="14" fill="url(#art-c4-board)" stroke="#60a5fa" strokeWidth="1.8" />
          {/* Base Stand Feet */}
          <path d="M 12 120 L 25 112 L 25 124 L 8 126 Z" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.2" />
          <path d="M 128 120 L 115 112 L 115 124 L 132 126 Z" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.2" />

          {/* 4x4 Grid of Slots */}
          {/* Row 1 */}
          <circle cx="33" cy="38" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
          <circle cx="58" cy="38" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
          <circle cx="83" cy="38" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
          {/* Row 1, Col 4 -> WINNING TOKEN 4 (Yellow) */}
          <circle cx="108" cy="38" r="8" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="108" cy="38" r="4" fill="#f59e0b" opacity="0.6" />

          {/* Row 2 */}
          <circle cx="33" cy="62" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
          <circle cx="58" cy="62" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />
          {/* Row 2, Col 3 -> WINNING TOKEN 3 (Yellow) */}
          <circle cx="83" cy="62" r="8" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="83" cy="62" r="4" fill="#f59e0b" opacity="0.6" />
          <circle cx="108" cy="62" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />

          {/* Row 3 */}
          <circle cx="33" cy="86" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />
          {/* Row 3, Col 2 -> WINNING TOKEN 2 (Yellow) */}
          <circle cx="58" cy="86" r="8" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="58" cy="86" r="4" fill="#f59e0b" opacity="0.6" />
          <circle cx="83" cy="86" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />
          <circle cx="108" cy="86" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />

          {/* Row 4 */}
          {/* Row 4, Col 1 -> WINNING TOKEN 1 (Yellow) */}
          <circle cx="33" cy="108" r="8" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="33" cy="108" r="4" fill="#f59e0b" opacity="0.6" />
          <circle cx="58" cy="108" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />
          <circle cx="83" cy="108" r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
          <circle cx="108" cy="108" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.4" />

          {/* Diagonal Laser Win-Line through the 4 connected tokens */}
          <line x1="25" y1="116" x2="116" y2="30" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="25" y1="116" x2="116" y2="30" stroke="#fde047" strokeWidth="1.2" strokeLinecap="round" />

          {/* Floating Drop Indicator Token at top */}
          <g opacity="0.8">
            <circle cx="58" cy="10" r="6" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M 58 16 L 58 22 M 56 20 L 58 22 L 60 20" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </svg>
      );

    case 'split':
      // Split or Steal Game Card: Duality Cards + Central Scales Balance Fulcrum
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-split-p" x1="20" y1="20" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" stopOpacity="0.4" />
              <stop stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Ambient balance circle */}
          <circle cx="70" cy="70" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.25" />

          {/* Balance Scale Beam */}
          <line x1="28" y1="46" x2="112" y2="46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {/* Fulcrum Stand */}
          <polygon points="70,44 76,60 64,60" fill="#a855f7" stroke="#ffffff" strokeWidth="1.4" />
          <line x1="70" y1="60" x2="70" y2="105" stroke="#ffffff" strokeWidth="2" />
          <path d="M 55 105 L 85 105 L 90 115 L 50 115 Z" fill="#3b0764" stroke="#ffffff" strokeWidth="1.5" />

          {/* Left Pan: SPLIT Card / Cup */}
          <line x1="34" y1="46" x2="26" y2="72" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="34" y1="46" x2="42" y2="72" stroke="#ffffff" strokeWidth="1.2" />
          <path
            d="M 22 72 L 46 72 L 42 85 L 26 85 Z"
            fill="#10b981"
            fillOpacity="0.4"
            stroke="#34d399"
            strokeWidth="1.5"
          />
          {/* Split symbol */}
          <circle cx="34" cy="78" r="4" fill="#ffffff" />

          {/* Right Pan: STEAL Card / Cup */}
          <line x1="106" y1="46" x2="98" y2="72" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="106" y1="46" x2="114" y2="72" stroke="#ffffff" strokeWidth="1.2" />
          <path
            d="M 94 72 L 118 72 L 114 85 L 98 85 Z"
            fill="#f59e0b"
            fillOpacity="0.4"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          {/* Steal dagger */}
          <path d="M 104 75 L 108 75 L 106 82 Z" fill="#ffffff" />

          {/* Central Glowing Prize Gem */}
          <polygon
            points="70,22 80,34 70,44 60,34"
            fill="#fbbf24"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="70" cy="33" r="2" fill="#ffffff" />
        </svg>
      );

    case 'cubecount':
      // Cube Count: Stepped Isometric 3D Cube Cluster + Scanner Perception Brackets
      return (
        <svg
          viewBox="0 0 180 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-cube-top" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fde68a" stopOpacity="0.9" />
              <stop stopColor="#f59e0b" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="art-cube-left" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#b45309" stopOpacity="0.8" />
              <stop stopColor="#78350f" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="art-cube-right" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#d97706" stopOpacity="0.8" />
              <stop stopColor="#92400e" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Perspective Floor Grid Lines */}
          <g opacity="0.25">
            <line x1="20" y1="100" x2="110" y2="50" stroke="#fef3c7" strokeWidth="1" />
            <line x1="50" y1="115" x2="140" y2="65" stroke="#fef3c7" strokeWidth="1" />
            <line x1="80" y1="115" x2="170" y2="65" stroke="#fef3c7" strokeWidth="1" />
            <line x1="20" y1="70" x2="110" y2="115" stroke="#fef3c7" strokeWidth="1" />
            <line x1="50" y1="50" x2="140" y2="100" stroke="#fef3c7" strokeWidth="1" />
            <line x1="80" y1="35" x2="170" y2="85" stroke="#fef3c7" strokeWidth="1" />
          </g>

          {/* Isometric Cube Helper macro-paths:
              Isometric tile offsets: dx = 22, dy = 13, height = 24
          */}

          {/* Back Column (Height 3): Center ~ (100, 48) */}
          {/* Cube 3 (Top of Column 3) */}
          <g>
            {/* Top Face */}
            <polygon points="100,16 122,29 100,42 78,29" fill="url(#art-cube-top)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Left Face */}
            <polygon points="78,29 100,42 100,66 78,53" fill="url(#art-cube-left)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Right Face */}
            <polygon points="100,42 122,29 122,53 100,66" fill="url(#art-cube-right)" stroke="#ffffff" strokeWidth="1.2" />
          </g>

          {/* Middle Left Column (Height 2): Center ~ (78, 62) */}
          <g>
            {/* Top Face */}
            <polygon points="78,42 100,55 78,68 56,55" fill="url(#art-cube-top)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Left Face */}
            <polygon points="56,55 78,68 78,92 56,79" fill="url(#art-cube-left)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Right Face */}
            <polygon points="78,68 100,55 100,79 78,92" fill="url(#art-cube-right)" stroke="#ffffff" strokeWidth="1.2" />
          </g>

          {/* Middle Right Column (Height 2): Center ~ (122, 62) */}
          <g>
            {/* Top Face */}
            <polygon points="122,42 144,55 122,68 100,55" fill="url(#art-cube-top)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Left Face */}
            <polygon points="100,55 122,68 122,92 100,79" fill="url(#art-cube-left)" stroke="#ffffff" strokeWidth="1.2" />
            {/* Right Face */}
            <polygon points="122,68 144,55 144,79 122,92" fill="url(#art-cube-right)" stroke="#ffffff" strokeWidth="1.2" />
          </g>

          {/* Front Column (Height 1): Center ~ (100, 88) */}
          <g>
            {/* Top Face */}
            <polygon points="100,68 122,81 100,94 78,81" fill="url(#art-cube-top)" stroke="#ffffff" strokeWidth="1.4" />
            {/* Left Face */}
            <polygon points="78,81 100,94 100,118 78,105" fill="url(#art-cube-left)" stroke="#ffffff" strokeWidth="1.4" />
            {/* Right Face */}
            <polygon points="100,94 122,81 122,105 100,118" fill="url(#art-cube-right)" stroke="#ffffff" strokeWidth="1.4" />
          </g>

          {/* Scanner Perception Measurement Brackets */}
          <path d="M 50 20 L 40 20 L 40 35" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M 150 20 L 160 20 L 160 35" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M 50 110 L 40 110 L 40 95" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M 150 110 L 160 110 L 160 95" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />

          {/* Scan Target Crosshairs */}
          <circle cx="100" cy="55" r="4" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.8" />
          <line x1="100" y1="46" x2="100" y2="64" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
          <line x1="91" y1="55" x2="109" y2="55" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
        </svg>
      );

    case 'roulette':
      // Russian Roulette: Tactical 6-Chamber Revolver Cylinder + 1 Live Primer + Flute Notches
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-roulette-grad" x1="20" y1="20" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" stopOpacity="0.3" />
              <stop stopColor="#047857" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Outer Cylinder Wheel */}
          <circle cx="70" cy="70" r="54" fill="url(#art-roulette-grad)" stroke="#34d399" strokeWidth="2" />
          {/* Subtle Outer Flute Notches */}
          <circle cx="70" cy="70" r="50" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />

          {/* Crosshair targeting lines */}
          <line x1="70" y1="8" x2="70" y2="132" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 3" opacity="0.3" />
          <line x1="8" y1="70" x2="132" y2="70" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 3" opacity="0.3" />

          {/* Center Spindle & Star Ratchet */}
          <circle cx="70" cy="70" r="14" fill="#0f172a" stroke="#34d399" strokeWidth="1.8" />
          <circle cx="70" cy="70" r="6" fill="#34d399" />

          {/* Chamber 1: 12 o'clock -> LOADED LIVE BULLET PRIMER */}
          <circle cx="70" cy="34" r="13" fill="#0f172a" stroke="#ef4444" strokeWidth="2.2" />
          <circle cx="70" cy="34" r="9" fill="#f59e0b" stroke="#fde047" strokeWidth="1.4" />
          <circle cx="70" cy="34" r="3.5" fill="#ef4444" />
          <circle cx="70" cy="34" r="1.5" fill="#ffffff" />

          {/* Chamber 2: 2 o'clock (Empty) */}
          <circle cx="101" cy="52" r="12" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="101" cy="52" r="5" stroke="#34d399" strokeWidth="1" opacity="0.4" />

          {/* Chamber 3: 4 o'clock (Empty) */}
          <circle cx="101" cy="88" r="12" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="101" cy="88" r="5" stroke="#34d399" strokeWidth="1" opacity="0.4" />

          {/* Chamber 4: 6 o'clock (Empty) */}
          <circle cx="70" cy="106" r="12" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="70" cy="106" r="5" stroke="#34d399" strokeWidth="1" opacity="0.4" />

          {/* Chamber 5: 8 o'clock (Empty) */}
          <circle cx="39" cy="88" r="12" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="39" cy="88" r="5" stroke="#34d399" strokeWidth="1" opacity="0.4" />

          {/* Chamber 6: 10 o'clock (Empty) */}
          <circle cx="39" cy="52" r="12" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="39" cy="52" r="5" stroke="#34d399" strokeWidth="1" opacity="0.4" />

          {/* Rotation Indicator Arrow */}
          <path d="M 88 18 A 54 54 0 0 1 122 52" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.7" />
          <polygon points="122,52 116,46 124,42" fill="#ffffff" opacity="0.8" />
        </svg>
      );

    case 'blackjack':
      // Face-Up Blackjack: Overlapping Playing Cards (Ace of Spades & King) + Stack of Chips
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-bj-card-bg" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#1e1b4b" stopOpacity="0.8" />
              <stop stopColor="#0f172a" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Card 1: Back Card (King / 10), Angled Right */}
          <g transform="translate(48, 20) rotate(14)">
            <rect x="0" y="0" width="56" height="82" rx="6" fill="url(#art-bj-card-bg)" stroke="#f43f5e" strokeWidth="1.8" />
            {/* Card inner border */}
            <rect x="4" y="4" width="48" height="74" rx="4" stroke="#fb7185" strokeWidth="0.8" opacity="0.5" />
            {/* Corner Rank & Suit */}
            <text x="8" y="16" fill="#fb7185" fontSize="11" fontWeight="900" fontFamily="sans-serif">K</text>
            <path d="M 12 21 L 15 25 L 12 29 L 9 25 Z" fill="#fb7185" />
            {/* Center Crown Glyph */}
            <polygon points="20,48 28,38 36,48 32,54 24,54" fill="#fb7185" opacity="0.4" stroke="#ffffff" strokeWidth="1" />
          </g>

          {/* Card 2: Front Card (Ace of Spades), Angled Left */}
          <g transform="translate(22, 28) rotate(-8)">
            <rect x="0" y="0" width="58" height="84" rx="6" fill="#ffffff" fillOpacity="0.95" stroke="#ffffff" strokeWidth="2" />
            {/* Card inner border */}
            <rect x="4" y="4" width="50" height="76" rx="4" stroke="#e11d48" strokeWidth="0.8" opacity="0.5" />
            {/* Corner Rank & Spade */}
            <text x="7" y="17" fill="#0f172a" fontSize="13" fontWeight="900" fontFamily="sans-serif">A</text>
            {/* Mini spade */}
            <path d="M 12 23 C 10 20 9 19 12 17 C 15 19 14 20 12 23 Z" fill="#0f172a" />

            {/* Central Bold Spade Symbol */}
            <g transform="translate(29, 44)">
              <path
                d="M 0 10 C -12 -1 -12 -9 0 -18 C 12 -9 12 -1 0 10 Z"
                fill="#0f172a"
              />
              <path d="M 0 7 L -4 15 L 4 15 Z" fill="#0f172a" />
            </g>
          </g>

          {/* Stack of Casino Poker Chips on Bottom-Right */}
          <g transform="translate(86, 78)">
            {/* Chip 1 (Bottom) */}
            <ellipse cx="20" cy="30" rx="20" ry="10" fill="#881337" stroke="#ffffff" strokeWidth="1.4" />
            <ellipse cx="20" cy="27" rx="14" ry="7" stroke="#fb7185" strokeWidth="0.8" strokeDasharray="3 2" />
            {/* Chip 2 (Middle) */}
            <ellipse cx="20" cy="22" rx="20" ry="10" fill="#be123c" stroke="#ffffff" strokeWidth="1.4" />
            <ellipse cx="20" cy="19" rx="14" ry="7" stroke="#fecdd3" strokeWidth="0.8" strokeDasharray="3 2" />
            {/* Chip 3 (Top - 21 BlackJack) */}
            <ellipse cx="20" cy="14" rx="20" ry="10" fill="#e11d48" stroke="#ffffff" strokeWidth="1.6" />
            <ellipse cx="20" cy="12" rx="14" ry="7" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 2" />
            <text x="13" y="16" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">21</text>
          </g>
        </svg>
      );

    case 'bridge':
      // Glass Bridge: Two Suspension Rails + Stepping Glass Tiles (Tempered Solid vs Fractured)
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-bridge-glass" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#38bdf8" stopOpacity="0.6" />
              <stop stopColor="#0284c7" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Abyss Glow Lines */}
          <line x1="70" y1="10" x2="70" y2="130" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

          {/* Left Suspension Rail */}
          <line x1="28" y1="15" x2="28" y2="125" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="15" x2="24" y2="125" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />

          {/* Right Suspension Rail */}
          <line x1="112" y1="15" x2="112" y2="125" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="116" y1="15" x2="116" y2="125" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />

          {/* STEP 1: (Top) */}
          {/* Tile 1 Left: Solid Glass (Safe) */}
          <rect x="36" y="24" width="30" height="24" rx="4" fill="url(#art-bridge-glass)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="40" y1="28" x2="62" y2="44" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          {/* Tile 1 Right: Fractured Glass (Broken) */}
          <rect x="74" y="24" width="30" height="24" rx="4" fill="#0369a1" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.4" />
          <path d="M 84 24 L 88 34 L 82 42 L 94 48" stroke="#ffffff" strokeWidth="1.4" opacity="0.8" />
          <line x1="88" y1="34" x2="100" y2="30" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />

          {/* STEP 2: (Middle) */}
          {/* Tile 2 Left: Fractured Glass (Broken) */}
          <rect x="36" y="58" width="30" height="24" rx="4" fill="#0369a1" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.4" />
          <path d="M 46 58 L 50 68 L 44 76 L 56 82" stroke="#ffffff" strokeWidth="1.4" opacity="0.8" />
          <line x1="50" y1="68" x2="62" y2="64" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
          {/* Tile 2 Right: Solid Glass (Safe) */}
          <rect x="74" y="58" width="30" height="24" rx="4" fill="url(#art-bridge-glass)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="78" y1="62" x2="100" y2="78" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />

          {/* STEP 3: (Bottom) */}
          {/* Tile 3 Left: Solid Glass (Safe) */}
          <rect x="36" y="92" width="30" height="24" rx="4" fill="url(#art-bridge-glass)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="40" y1="96" x2="62" y2="112" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          {/* Tile 3 Right: Fractured Glass */}
          <rect x="74" y="92" width="30" height="24" rx="4" fill="#0369a1" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.4" />
          <path d="M 84 92 L 88 102 L 82 110 L 94 116" stroke="#ffffff" strokeWidth="1.4" opacity="0.8" />
        </svg>
      );

    case 'chrono':
      // Chrono Blind: Precision Chronometer + Blind Arc Sweep + High-Speed Needle
      return (
        <svg
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <defs>
            <linearGradient id="art-chrono-sweep" x1="70" y1="70" x2="120" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.5" />
              <stop stopColor="#d97706" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Top Push-Button and Side Lugs */}
          <rect x="64" y="10" width="12" height="8" rx="2" fill="#d97706" stroke="#ffffff" strokeWidth="1.4" />
          <line x1="70" y1="18" x2="70" y2="24" stroke="#ffffff" strokeWidth="2.5" />
          <rect x="100" y="22" width="8" height="6" rx="1.5" transform="rotate(35 100 22)" fill="#d97706" stroke="#ffffff" strokeWidth="1.2" />

          {/* Outer Bezel */}
          <circle cx="70" cy="74" r="50" stroke="#fbbf24" strokeWidth="2.5" />
          <circle cx="70" cy="74" r="44" stroke="#fde68a" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

          {/* Blind Countdown Swept Wedge (Arc from 12 o'clock to ~2 o'clock) */}
          <path
            d="M 70 74 L 70 30 A 44 44 0 0 1 106 48 Z"
            fill="url(#art-chrono-sweep)"
            stroke="#fbbf24"
            strokeWidth="1.4"
          />

          {/* Dial Hour / Second Ticks */}
          {/* 12, 3, 6, 9 o'clock */}
          <line x1="70" y1="30" x2="70" y2="36" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="114" y1="74" x2="108" y2="74" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="70" y1="118" x2="70" y2="112" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="26" y1="74" x2="32" y2="74" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />

          {/* Intermediate ticks */}
          <line x1="92" y1="36" x2="88" y2="42" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="108" y1="52" x2="102" y2="56" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="108" y1="96" x2="102" y2="92" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="92" y1="112" x2="88" y2="106" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="48" y1="112" x2="52" y2="106" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="32" y1="96" x2="38" y2="92" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="32" y1="52" x2="38" y2="56" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
          <line x1="48" y1="36" x2="52" y2="42" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />

          {/* Sub-Dial Timer */}
          <circle cx="70" cy="94" r="10" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
          <line x1="70" y1="94" x2="74" y2="89" stroke="#ffffff" strokeWidth="1.2" />

          {/* Center Hub & Precision Needle (Pointing at target strike ~2 o'clock) */}
          <circle cx="70" cy="74" r="5" fill="#d97706" stroke="#ffffff" strokeWidth="1.8" />
          <line x1="70" y1="74" x2="106" y2="48" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          {/* Needle counterweight */}
          <line x1="70" y1="74" x2="56" y2="84" stroke="#fbbf24" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="70" cy="74" r="2" fill="#ffffff" />
        </svg>
      );

    default:
      return null;
  }
};
