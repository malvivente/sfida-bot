export const GAMES_CONFIG = {
  roulette: {
    name: 'Russian Roulette',
    description: '8-chamber cylinder, 1 live bullet. Shoot yourself for defense or aim at opponent.',
    totalChambers: 8,
    turnTimeoutSeconds: 15,
  },
  blackjack: {
    name: 'Blackjack Face-Up',
    description: 'Shared common deck, all cards dealt face-up. Closest to 21 without busting wins.',
    turnTimeoutSeconds: 20,
    decksCount: 1,
  },
  bridge: {
    name: 'Glass Bridge',
    description: '6 perilous steps over the abyss. Choose tempered glass or shatter and lose a life.',
    totalSteps: 6,
    initialLives: 2,
    turnTimeoutSeconds: 20,
  },
  chrono: {
    name: 'Chrono Blind',
    description: 'Countdown plunges into darkness. Hit STOP closest to 0.00 without overshooting.',
    minDurationSeconds: 5.0,
    maxDurationSeconds: 8.0,
    minBlindThresholdSeconds: 2.0,
    maxBlindThresholdSeconds: 4.0,
    roundsToWin: 2,
    maxRounds: 3,
  },
  split: {
    name: 'Split or Steal',
    description: 'Prisoner\'s dilemma casino showdown. Cooperate for peace & shared jackpot, or betray to steal it all.',
    choiceCountdownSeconds: 5,
    jackpotThresholdGram: 5.0,
    jackpotBonusPercent: 20,
  },
} as const;
