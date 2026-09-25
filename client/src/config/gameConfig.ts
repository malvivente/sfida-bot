/**
 * Global game and betting configuration for Sfida Arena.
 * Easily adjust wager limits and currency parameters here.
 */
export const GAME_CONFIG = {
  // Currency nomenclature
  CURRENCY_NAME: 'GRAM',
  CURRENCY_TICKER: 'GRAM',

  // Wager & stake limits
  MIN_WAGER: 0.1, // Minimum wager/bet: 0.1 GRAM
  MAX_WAGER: 100, // Maximum wager limit

  // Preset quick-selection amounts for duels and spectator bets
  PRESET_DUEL_WAGERS: ['0.1', '0.5', '1', '2', '5', '10', '25', '50'],
  PRESET_SPECTATOR_BETS: ['0.1', '0.5', '1', '2', '5', '10', '25', '50'],

  // Platform economics
  DUEL_WINNER_SHARE: 1.0, // 100% to winner (0% platform rake)
  SPECTATOR_TOTALIZER_SHARE: 1.0, // 100% to winning spectators (0% platform rake)
  CREATION_FEE_GRAM: 0.05, // 0.05 GRAM room creation fee
  JOIN_FEE_GRAM: 0.05, // 0.05 GRAM player B participation fee
  SPECTATOR_FEE_GRAM: 0.05, // 0.05 GRAM spectator betting participation fee
  GAS_MICRO_FEE: 0.05,
  DEFAULT_BETTING_WINDOW_SECONDS: 30, // 30 seconds spectator betting window when duelists ready up
};
