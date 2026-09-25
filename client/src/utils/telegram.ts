/**
 * Telegram WebApp Helpers & Utilities
 * Provides direct, robust access to official Telegram WebApp SDK (Bot API 8.0+)
 * without relying on outdated bundled packages.
 */

export function getTelegramWebApp(): any {
  if (typeof window !== 'undefined') {
    return (window as any).Telegram?.WebApp;
  }
  return undefined;
}

/**
 * Requests Telegram Mini App Fullscreen mode (Bot API 8.0+).
 * Invokes native WebApp.requestFullscreen() with direct bridge fallbacks
 * (WebView.postEvent, TelegramWebviewProxy) to ensure instant conversion across all mobile clients.
 */
export function requestTelegramFullscreen(): void {
  if (typeof window === 'undefined') return;

  const tg = (window as any).Telegram?.WebApp;
  const webView = (window as any).Telegram?.WebView;

  // 1. Official WebApp method (Telegram Bot API 8.0+)
  if (tg && typeof tg.requestFullscreen === 'function') {
    try {
      tg.requestFullscreen();
    } catch (e) {
      console.warn('[Telegram] tg.requestFullscreen call:', e);
    }
  }

  // 2. Direct Telegram.WebView postEvent bridge call
  if (webView && typeof webView.postEvent === 'function') {
    try {
      webView.postEvent('web_app_request_fullscreen');
    } catch (e) {
      console.warn('[Telegram] webView.postEvent error:', e);
    }
  }

  // 3. Android TelegramWebviewProxy direct bridge
  if ((window as any).TelegramWebviewProxy?.postEvent) {
    try {
      (window as any).TelegramWebviewProxy.postEvent('web_app_request_fullscreen', JSON.stringify(''));
    } catch {}
  }

  // 4. Windows Telegram client external notify
  if ((window as any).external && 'notify' in (window as any).external) {
    try {
      (window as any).external.notify(JSON.stringify({ eventType: 'web_app_request_fullscreen', eventData: '' }));
    } catch {}
  }

  // 5. Parent iframe postMessage (Telegram Web A/K)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(JSON.stringify({ eventType: 'web_app_request_fullscreen', eventData: '' }), '*');
    }
  } catch {}
}

/**
 * Exits Telegram Fullscreen mode.
 */
export function exitTelegramFullscreen(): void {
  if (typeof window === 'undefined') return;

  const tg = (window as any).Telegram?.WebApp;
  const webView = (window as any).Telegram?.WebView;

  if (tg && typeof tg.exitFullscreen === 'function') {
    try {
      tg.exitFullscreen();
    } catch {}
  }

  if (webView && typeof webView.postEvent === 'function') {
    try {
      webView.postEvent('web_app_exit_fullscreen');
    } catch {}
  }

  if ((window as any).TelegramWebviewProxy?.postEvent) {
    try {
      (window as any).TelegramWebviewProxy.postEvent('web_app_exit_fullscreen', JSON.stringify(''));
    } catch {}
  }
}

/**
 * Safely triggers Telegram share dialog inside TMA without causing webview crashes.
 * Never uses window.open with _blank inside Telegram webviews.
 */
export const shareToTelegram = (url: string, text: string) => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  
  try {
    const tg = getTelegramWebApp();
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
