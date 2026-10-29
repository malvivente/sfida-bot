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
  cubecount: {
    id: 'cubecount',
    title: 'Cube Count',
    badge: 'SURVIVAL IQ',
    tagline: 'Flash Perception · Survival Duel · 3 Lives',
    description: 'A 5x5 isometric structure of stacked cubes flashes on screen for mere fractions of a second before vanishing. Count the exact total and submit your answer on the virtual numpad. 3 lives survival duel.',
    spectatorAppeal: 'Spectators test their own flash memory alongside duelists as the flash duration tightens to sub-second speeds.',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    bgGradient: 'from-amber-950/30 via-orange-950/20 to-black/80',
  },
  headsoccer: {
    id: 'headsoccer',
    title: 'Head Soccer',
    badge: 'ARCADE 1V1',
    tagline: '60s Match · Super Shots · Golden Goal',
    description: 'Fast-paced 1v1 arcade soccer in a Cyber Retro handheld shell. Jump, header, kick and unleash fiery Super Shots to outscore your rival in 60 seconds.',
    spectatorAppeal: 'Real-time stadium broadcast view with explosive goals, crossbar hits and Golden Goal overtime!',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    bgGradient: 'from-emerald-950/35 via-teal-950/20 to-black/80',
  },
  poker: {
    id: 'poker',
    title: "Texas Hold'em",
    badge: 'POKER 2-5 MAX',
    tagline: 'Sit & Go 2-5 Giocatori · Bluff & All-In',
    description: 'Texas Hold\'em Poker multiplayer da 2 a 5 giocatori. Due carte coperte, puntate Pre-Flop, Flop, Turn e River con action clock da 15s. Vinci il montepremi con la miglior combinazione a 5 carte!',
    spectatorAppeal: 'Adrenalina pura su all-in e showdown a carte scoperte al tavolo cyber!',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    bgGradient: 'from-amber-950/30 via-emerald-950/25 to-black/80',
  },
  uno: {
    id: 'uno',
    title: 'UNO Card Duel',
    badge: 'F2P & WAGER',
    tagline: 'Cyber Card Duel · F2P o Scommessa · Salta, Inverti, +4',
    description: 'Duello 1v1 con il celebre mazzo a 4 colori. Scarta per colore o numero, usa carte azione (+2, Salta, Inverti, +4 Jolly) e dichiara UNO prima dell\'avversario per vincere. Giocabile 100% Free to Play oppure con scommessa in Gram!',
    spectatorAppeal: 'Suspense costante sui colori e colpi di scena con i +4 Jolly sul filo di lana!',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    bgGradient: 'from-amber-950/35 via-rose-950/20 to-black/80',
  },
  boxing: {
    id: 'boxing',
    title: 'Cyber Boxing',
    badge: 'F2P & WAGER',
    tagline: '1v1 Boxing Clash · Jab & Gancio · Parata & K.O.',
    description: 'Scontro arcade di pugilato cyberpunk sul ring! Schiva i pugni al millisecondo, assesta jab veloci e potenti ganci al corpo, gestisci la stamina e scatena il Super Uppercut per il K.O. finale!',
    spectatorAppeal: 'Scambi spettacolari sul ring, schivate al rallentatore e colpi da K.O. mozzafiato!',
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    bgGradient: 'from-rose-950/35 via-purple-950/20 to-black/80',
  },
};

export const F2P_GAMES: GameType[] = ['uno', 'headsoccer', 'boxing'];
export const QUICK_GAMES: GameType[] = ['roulette', 'blackjack', 'bridge', 'chrono', 'headsoccer', 'uno', 'boxing'];
export const STRATEGY_GAMES: GameType[] = ['split', 'shotgun', 'connect4', 'cubecount', 'poker'];



