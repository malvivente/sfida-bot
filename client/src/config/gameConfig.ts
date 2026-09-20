/**
 * Global game and betting configuration for Sfida Arena.
 * Easily adjust wager limits and currency parameters here.
 */
export const GAME_CONFIG = {
  // Currency nomenclature
  CURRENCY_NAME: 'GRAM',
  CURRENCY_TICKER: 'GRAM',

  // Wager & stake limits
  MIN_WAGER: 0.1,
  MAX_WAGER: 100, // Maximum wager limit (currently set to 100 GRAM as requested, easily configurable)

  // Preset quick-selection amounts for duels and spectator bets
  PRESET_DUEL_WAGERS: ['1', '2', '5', '10', '25', '50', '100'],
  PRESET_SPECTATOR_BETS: ['1', '2', '5', '10', '25', '50', '100'],

  // Platform economics
  DUEL_WINNER_SHARE: 0.96, // 96% to winner (4% rake)
  SPECTATOR_TOTALIZER_SHARE: 0.94, // 94% to spectator totalizer (6% rake)
  GAS_MICRO_FEE: 0.02, // 0.02 gas subsidy
};
