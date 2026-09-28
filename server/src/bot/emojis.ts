/**
 * Bot Custom Emoji Configuration
 * 
 * To use Telegram Custom Emojis in bot messages:
 * 1. Find the custom_emoji_id of the custom emoji you want (e.g. via @ShowJsonBot or Telegram Bot API).
 * 2. Paste the custom_emoji_id into the `id` field below.
 * 
 * If `id` is empty (''), the bot will automatically fall back to the standard Unicode emoji.
 * 
 * In HTML parse_mode, Telegram formats custom emojis as:
 * <tg-emoji emoji-id="5368324170671202286">🔥</tg-emoji>
 */

export interface CustomEmojiConfig {
  id: string; // Telegram Custom Emoji ID (e.g. '5368324170671202286' or '')
  fallback: string; // Standard Unicode emoji fallback
  description?: string;
}

export const BOT_EMOJIS: Record<string, CustomEmojiConfig> = {
  swords: { id: '5408935401442267103', fallback: '⚔️', description: 'Crossed swords for duels and arena' },
  lightning: { id: '5438539112070002676', fallback: '⚡️', description: 'Lightning for cyber speed / reflex' },
  fire: { id: '5289722755871162900', fallback: '🔥', description: 'Flame for high-stakes and hot duels' },
  eye: { id: '5305584572606466086', fallback: '👁', description: 'Eye for spectator mode & totalizer' },
  shield: { id: '5902016123972358349', fallback: '🛡', description: 'Shield for security, anti-cheat & contracts' },
  trophy: { id: '5469967260380612012', fallback: '🏆', description: 'Trophy for winner payout and leaderboard' },
  coin: { id: '5298988357538328017', fallback: '🪙', description: 'Coin for GRAM currency' },
  moneyBag: { id: '5039789890133296083', fallback: '💰', description: 'Money bag for pool and wager' },
  gem: { id: '5343636681473935403', fallback: '💎', description: 'Gem for premium rewards' },
  handshake: { id: '5357080225463149588', fallback: '🤝', description: 'Handshake for referral and affiliations' },
  megaphone: { id: '6008220984346152956', fallback: '📢', description: 'Megaphone for official announcements' },
  star: { id: '5472092560522511055', fallback: '⭐️', description: 'Star for ratings and premium' },
  sparkles: { id: '4958489311726011319', fallback: '✨', description: 'Sparkles for bonuses and jackpots' },
  dice: { id: '5890885351152553528', fallback: '🎲', description: 'Dice for casino games' },
  target: { id: '5310278924616356636', fallback: '🎯', description: 'Target for quickdraw aim' },
  lock: { id: '5310278924616356636', fallback: '🔒', description: 'Lock for private rooms' },
  unlock: { id: '6034962180875490251', fallback: '🔓', description: 'Unlock for accessible duels' },
  gear: { id: '5258096772776991776', fallback: '⚙️', description: 'Gear for settings and admin' },
  user: { id: '5258011929993026890', fallback: '👤', description: 'User icon for duelist' },
  users: { id: '6032609071373226027', fallback: '👥', description: 'Group of users / community' },
  warning: { id: '6107092162292224018', fallback: '⚠️', description: 'Warning alert' },
  check: { id: '5039793437776282663', fallback: '✅', description: 'Success checkmark' },
  cross: { id: '5042112436648281096', fallback: '❌', description: 'Failure / error mark' },
  rocket: { id: '6041705726206808304', fallback: '🚀', description: 'Rocket for broadcast launch' },
  crown: { id: '5958712578497581603', fallback: '👑', description: 'Crown for arena champion' },
  bot: { id: '5255883984151276991', fallback: '🤖', description: 'Bot icon' },
  chart: { id: '6105005233388130882', fallback: '📊', description: 'Chart for stats and reports' },
  hourglass: { id: '5339357992103983304', fallback: '⏳', description: 'Hourglass for pending action' },
  controller: { id: '5258508428212445001', fallback: '🎮', description: 'Game controller' },
  clock: { id: '5258258882022612173', fallback: '⏱', description: 'Timer for quick response' },
};

/**
 * Returns the HTML string for the custom emoji (or standard fallback).
 * Example: `<tg-emoji emoji-id="12345">⚔️</tg-emoji>` or `⚔️`
 */
export function tgEmoji(name: string): string {
  const item = BOT_EMOJIS[name];
  if (!item) return '';
  if (item.id && item.id.trim()) {
    return `<tg-emoji emoji-id="${item.id.trim()}">${item.fallback}</tg-emoji>`;
  }
  return item.fallback;
}

/**
 * Replaces all occurrences of `{{emoji.<name>}}` in a string with the appropriate custom emoji or fallback.
 */
export function renderCustomEmojis(text: string): string {
  return text.replace(/\{\{emoji\.([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    return tgEmoji(key);
  });
}
