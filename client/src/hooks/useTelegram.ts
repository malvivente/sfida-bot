import WebApp from '@twa-dev/sdk';

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

  try {
    if (typeof window !== 'undefined' && WebApp?.initDataUnsafe?.user) {
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
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || (username ? `@${username}` : 'Cyber Duelist');
  const photoUrl = user?.photo_url;
  const isPremium = !!user?.is_premium;

  return {
    WebApp,
    user,
    userId,
    username,
    fullName,
    photoUrl,
    isPremium,
    isTma,
    botUsername,
  };
}
