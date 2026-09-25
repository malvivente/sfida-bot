import { useState, useEffect } from 'react';

export interface TelegramViewportState {
  isFullscreen: boolean;
  topInset: number;
}

export function isDesktopPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = (window as any).Telegram?.WebApp;
  const platform = (tg?.platform || '').toLowerCase();
  const desktopPlatforms = ['tdesktop', 'macos', 'web', 'weba', 'webk'];
  if (desktopPlatforms.includes(platform)) return true;
  if (window.innerWidth > 1024) return true;
  return false;
}

export function isHorizontalScreen(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth === 0 || window.innerHeight === 0) return false;
  return window.innerWidth > window.innerHeight;
}

export function useTelegramViewport(): TelegramViewportState {
  const getViewportState = (): TelegramViewportState => {
    if (typeof window === 'undefined') {
      return { isFullscreen: false, topInset: 0 };
    }

    // Never enable fullscreen mode on desktop or horizontal / landscape screens
    if (isDesktopPlatform() || isHorizontalScreen()) {
      return { isFullscreen: false, topInset: 0 };
    }

    const tg = (window as any).Telegram?.WebApp;

    // Strict detection: ONLY genuine Telegram Fullscreen mode
    // (Never rely on URL params or ambiguous safe-area insets which exist in standard mode too)
    const isFullscreen = Boolean(tg?.isFullscreen);

    if (!isFullscreen) {
      return { isFullscreen: false, topInset: 0 };
    }

    let cssContentTop = 0;
    let cssSafeTop = 0;
    if (typeof document !== 'undefined') {
      const rootStyles = getComputedStyle(document.documentElement);
      const rawContentTop = rootStyles.getPropertyValue('--tg-content-safe-area-inset-top');
      if (rawContentTop) cssContentTop = parseFloat(rawContentTop) || 0;
      const rawSafeTop = rootStyles.getPropertyValue('--tg-safe-area-inset-top');
      if (rawSafeTop) cssSafeTop = parseFloat(rawSafeTop) || 0;
    }

    const contentTop = Number(tg?.contentSafeAreaInset?.top) || 0;
    const safeTop = Number(tg?.safeAreaInset?.top) || 0;

    // In fullscreen on mobile devices, Telegram renders floating buttons (Close on left, chevron + menu on right)
    // with a height of ~36px plus device status bar (~24px), totaling ~60-64px.
    // 80px provides comfortable vertical breathing room, matching the default Telegram titlebar height.
    const rawTop = Math.max(contentTop, safeTop, cssContentTop, cssSafeTop);
    const topInset = Math.max(rawTop, 80);

    return {
      isFullscreen: true,
      topInset,
    };
  };

  const [state, setState] = useState<TelegramViewportState>(getViewportState);

  useEffect(() => {
    const update = () => {
      setState(getViewportState());
    };

    update();

    // Catch asynchronous Telegram WebApp SDK initialization
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);
    const t3 = setTimeout(update, 500);
    const t4 = setTimeout(update, 1000);

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.onEvent?.('fullscreenChanged', update);
        tg.onEvent?.('fullscreen_changed', update);
        tg.onEvent?.('fullscreenFailed', update);
        tg.onEvent?.('fullscreen_failed', update);
        tg.onEvent?.('contentSafeAreaChanged', update);
        tg.onEvent?.('content_safe_area_changed', update);
        tg.onEvent?.('safeAreaChanged', update);
        tg.onEvent?.('safe_area_changed', update);
        tg.onEvent?.('viewportChanged', update);
      } catch {}
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);

      if (tg) {
        try {
          tg.offEvent?.('fullscreenChanged', update);
          tg.offEvent?.('fullscreen_changed', update);
          tg.offEvent?.('fullscreenFailed', update);
          tg.offEvent?.('fullscreen_failed', update);
          tg.offEvent?.('contentSafeAreaChanged', update);
          tg.offEvent?.('content_safe_area_changed', update);
          tg.offEvent?.('safeAreaChanged', update);
          tg.offEvent?.('safe_area_changed', update);
          tg.offEvent?.('viewportChanged', update);
        } catch {}
      }
    };
  }, []);

  return state;
}
