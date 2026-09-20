/**
 * Safely triggers Telegram share dialog inside TMA without causing webview crashes.
 * Never uses window.open with _blank inside Telegram webviews.
 */
export const shareToTelegram = (url: string, text: string) => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  
  try {
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;
    if (tg && typeof tg.openTelegramLink === 'function') {
      tg.openTelegramLink(shareUrl);
      return;
    }
  } catch (e) {
    console.warn('Telegram SDK openTelegramLink failed, falling back:', e);
  }

  // Fallback for regular web browser preview
  window.location.href = shareUrl;
};
