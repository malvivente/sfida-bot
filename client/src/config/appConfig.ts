/**
 * Global App Configuration for Sfida Cyber Arena
 * You can modify the administrator username or other parameters here directly.
 */
export const APP_CONFIG = {
  // Administrator Telegram username (without @) and direct contact link
  ADMIN_TELEGRAM_USERNAME: (import.meta as any).env?.VITE_ADMIN_TELEGRAM_USERNAME || 'balestra',

  get ADMIN_TELEGRAM_LINK(): string {
    return `https://t.me/${this.ADMIN_TELEGRAM_USERNAME}`;
  },

  // Official Channel & Community links
  OFFICIAL_CHANNEL_LINK: (import.meta as any).env?.VITE_OFFICIAL_CHANNEL_LINK || 'https://t.me/sfida',
  BOT_USERNAME: (import.meta as any).env?.VITE_BOT_USERNAME || 'sfida_bot',
};
