import { getTelegramWebApp } from '../utils/telegram.js';

export interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

/**
 * Custom hook to safely extract the real Telegram User profile from Telegram Mini App SDK.
 */
export function useTelegram() {
  let user: TelegramUser | undefined;
  const WebApp = getTelegramWebApp();

  try {
    if (WebApp?.initDataUnsafe?.user) {
      user = WebApp.initDataUnsafe.user;
    }
  } catch (err) {
    console.warn('Could not read WebApp.initDataUnsafe.user:', err);
  }

  const isTma = !!user?.id;
  const botUsername = (import.meta as any).env?.VITE_BOT_USERNAME || 'SfidaRobot';

  const userId = user?.id ? user.id.toString() : undefined;
  const username = user?.username;
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || (username ? username.replace(/^@/, '') : 'Warrior');
  const photoUrl = user?.photo_url;
  const isPremium = !!user?.is_premium;

  // Clean display name: real name (first_name + last_name), fallback to clean username, fallback to Telegram ID, fallback to Warrior
  const displayName = (() => {
    if (firstName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }
    if (username) {
      return username.replace(/^@/, '');
    }
    if (userId) {
      return `User #${userId}`;
    }
    return 'Warrior';
  })();

  const shortDisplayName = firstName || (username ? username.replace(/^@/, '') : (userId ? `ID:${userId}` : 'Warrior'));

  return {
    WebApp,
    user,
    userId,
    username,
    firstName,
    lastName,
    fullName,
    displayName,
    shortDisplayName,
    photoUrl,
    isPremium,
    isTma,
    botUsername,
  };
}
