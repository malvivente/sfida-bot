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
  swords: { id: '', fallback: '⚔️', description: 'Crossed swords for duels and arena' },
  lightning: { id: '', fallback: '⚡️', description: 'Lightning for cyber speed / reflex' },
  fire: { id: '', fallback: '🔥', description: 'Flame for high-stakes and hot duels' },
  eye: { id: '', fallback: '👁', description: 'Eye for spectator mode & totalizer' },
  shield: { id: '', fallback: '🛡', description: 'Shield for security, anti-cheat & contracts' },
  trophy: { id: '', fallback: '🏆', description: 'Trophy for winner payout and leaderboard' },
  coin: { id: '', fallback: '🪙', description: 'Coin for GRAM currency' },
  moneyBag: { id: '', fallback: '💰', description: 'Money bag for pool and wager' },
  gem: { id: '', fallback: '💎', description: 'Gem for premium rewards' },
  handshake: { id: '', fallback: '🤝', description: 'Handshake for referral and affiliations' },
  megaphone: { id: '', fallback: '📢', description: 'Megaphone for official announcements' },
  star: { id: '', fallback: '⭐️', description: 'Star for ratings and premium' },
  sparkles: { id: '', fallback: '✨', description: 'Sparkles for bonuses and jackpots' },
  dice: { id: '', fallback: '🎲', description: 'Dice for casino games' },
  target: { id: '', fallback: '🎯', description: 'Target for quickdraw aim' },
  lock: { id: '', fallback: '🔒', description: 'Lock for private rooms' },
  unlock: { id: '', fallback: '🔓', description: 'Unlock for accessible duels' },
  gear: { id: '', fallback: '⚙️', description: 'Gear for settings and admin' },
  user: { id: '', fallback: '👤', description: 'User icon for duelist' },
  users: { id: '', fallback: '👥', description: 'Group of users / community' },
  warning: { id: '', fallback: '⚠️', description: 'Warning alert' },
  check: { id: '', fallback: '✅', description: 'Success checkmark' },
  cross: { id: '', fallback: '❌', description: 'Failure / error mark' },
  rocket: { id: '', fallback: '🚀', description: 'Rocket for broadcast launch' },
  crown: { id: '', fallback: '👑', description: 'Crown for arena champion' },
  bot: { id: '', fallback: '🤖', description: 'Bot icon' },
  chart: { id: '', fallback: '📊', description: 'Chart for stats and reports' },
  hourglass: { id: '', fallback: '⏳', description: 'Hourglass for pending action' },
  controller: { id: '', fallback: '🎮', description: 'Game controller' },
  clock: { id: '', fallback: '⏱', description: 'Timer for quick response' },
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
