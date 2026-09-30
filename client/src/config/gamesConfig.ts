import { GameType } from '../types/index.js';

export interface GameMetadata {
  id: GameType;
  title: string;
  badge: string;
  tagline: string;
  description: string;
  spectatorAppeal: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
}

export const GAMES_METADATA: Record<GameType, GameMetadata> = {
  roulette: {
    id: 'roulette',
    title: 'Russian Roulette',
    badge: 'HIGH RISK',
    tagline: '8 Chambers • 1 Bullet',
    description: 'Turn-based Russian Roulette. Shoot yourself to gain defensive shields or fire at your rival with escalating lethal odds.',
    spectatorAppeal: 'Exponential suspense as empty clicks narrow down the fatal chamber.',
    accentColor: 'text-cyber-pink',
    borderColor: 'border-cyber-pink/50 hover:border-cyber-pink',
    bgGradient: 'from-cyber-pink/15 via-black/40 to-black/80',
  },
  blackjack: {
    id: 'blackjack',
    title: 'Blackjack Face-Up',
    badge: '21 DUELLIST',
    tagline: 'Face-Up Cards • Pure Strategy',
    description: 'All cards drawn face-up from a shared common shoe. Hit or Stand—closest to 21 without busting takes the pot.',
    spectatorAppeal: '100% transparent table where spectators watch the exact pressure on every hit.',
    accentColor: 'text-cyber-cyan',
    borderColor: 'border-cyber-cyan/50 hover:border-cyber-cyan',
    bgGradient: 'from-cyber-cyan/15 via-black/40 to-black/80',
  },
  bridge: {
    id: 'bridge',
    title: 'Glass Bridge',
    badge: 'SQUID RUN',
    tagline: 'Endless Bridge • Tempered or Shatter',
    description: 'Traverse an endless bridge of perilous steps. One pane holds your weight, the other shatters. Push your luck or pass the lead to your rival.',
    spectatorAppeal: 'Breathtaking leap-of-faith moments where the leader can fall on any unknown tile.',
    accentColor: 'text-cyber-green',
    borderColor: 'border-cyber-green/50 hover:border-cyber-green',
    bgGradient: 'from-cyber-green/15 via-black/40 to-black/80',
  },
  chrono: {
    id: 'chrono',
    title: 'Chrono Blind',
    badge: 'BLIND STOP',
    tagline: 'Millisecond Duel in the Dark',
    description: 'The clock counts down to 0.00 and suddenly blacks out at an unpredictable instant! Hit STOP as close to zero as possible without busting.',
    spectatorAppeal: 'Spectator view stays illuminated! Spectators scream watching players panic-press in the dark.',
    accentColor: 'text-cyber-amber',
    borderColor: 'border-cyber-amber/50 hover:border-cyber-amber',
    bgGradient: 'from-cyber-amber/15 via-black/40 to-black/80',
  },
  split: {
    id: 'split',
    title: 'Split or Steal',
    badge: 'MIND GAME',
    tagline: 'Cooperate or Betray · Shared Jackpot',
    description: 'Two duelists choose in secret: SPLIT to cooperate (refund + 12.5% bonus each) or STEAL to betray (full pot + 20% Temptation Bounty). Both steal loses all and feeds the Jackpot.',
    spectatorAppeal: '3-way 1-X-2 betting: P1 Steal, P2 Steal, or mutual Peace! If both steal, the house and the Trust Jackpot take all!',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/60 hover:border-purple-400',
    bgGradient: 'from-purple-950/40 via-amber-950/20 to-black/80',
  },
  shotgun: {
    id: 'shotgun',
    title: 'Cyber Shotgun',
    badge: 'BUCKSHOT TACTICS',
    tagline: 'Live & Blank Shells · Tactical Items',
    description: '3 HP each. Shotgun loaded with live and blank shells in random order. Shoot yourself with a blank to gain an extra turn, or utilize tactical items (Saw, Ejector, Handcuffs, Inverter) to eliminate your rival.',
    spectatorAppeal: 'Pure probability counting! Watch duelists calculate odds and gamble their turn by shooting themselves.',
    accentColor: 'text-red-500',
    borderColor: 'border-red-500/50 hover:border-red-500',
    bgGradient: 'from-red-950/30 via-black/40 to-black/80',
  },
  connect4: {
    id: 'connect4',
    title: 'Forza 4',
    badge: 'CONNECT 4',
    tagline: '7x6 Vertical Grid · Pure Strategy',
    description: '10-second turns on a 7x6 vertical grid. Drop chips by gravity and outthink your opponent. Connect 4 chips in any direction to win.',
    spectatorAppeal: 'Pure mental skill with zero luck. Spectators anticipate traps, forks, and game-ending blunders.',
    accentColor: 'text-blue-400',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    bgGradient: 'from-blue-950/30 via-indigo-950/20 to-black/80',
  },
};

