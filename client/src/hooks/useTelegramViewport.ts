import { useState, useEffect } from 'react';

export interface TelegramViewportState {
  isFullscreen: boolean;
  topInset: number;
}

export function useTelegramViewport(): TelegramViewportState {
  const getViewportState = (): TelegramViewportState => {
    if (typeof window === 'undefined') {
      return { isFullscreen: false, topInset: 0 };
    }

    const tg = (window as any).Telegram?.WebApp;
    const urlParams = new URLSearchParams(window.location.search);
    const urlFullscreen = urlParams.get('fullscreen') === 'true' || urlParams.get('fullscreen') === '1';

    let cssContentTop = 0;
    let cssSafeTop = 0;
    if (typeof document !== 'undefined') {
      const rootStyles = getComputedStyle(document.documentElement);
      const rawContentTop = rootStyles.getPropertyValue('--tg-content-safe-area-inset-top');
      if (rawContentTop) cssContentTop = parseFloat(rawContentTop) || 0;
      const rawSafeTop = rootStyles.getPropertyValue('--tg-safe-area-inset-top');
      if (rawSafeTop) cssSafeTop = parseFloat(rawSafeTop) || 0;
    }

    const tgIsFullscreen = Boolean(tg?.isFullscreen);
    const contentTop = Number(tg?.contentSafeAreaInset?.top) || 0;
    const safeTop = Number(tg?.safeAreaInset?.top) || 0;

    // Detect if Telegram WebApp is in fullscreen mode (Bot API 8.0+)
    const isFullscreen = Boolean(
      tgIsFullscreen ||
      urlFullscreen ||
      contentTop > 0 ||
      cssContentTop > 0
    );

    // In fullscreen on mobile devices, Telegram renders floating buttons (Close on left, chevron + menu on right)
    // with a height of ~36px plus device status bar (~20-24px), totaling ~56px.
    const rawTop = Math.max(contentTop, safeTop, cssContentTop, cssSafeTop);
    const topInset = isFullscreen ? Math.max(rawTop, 56) : rawTop;

    return {
      isFullscreen,
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
        tg.onEvent?.('contentSafeAreaChanged', update);
        tg.onEvent?.('content_safe_area_changed', update);
        tg.onEvent?.('safeAreaChanged', update);
        tg.onEvent?.('safe_area_changed', update);
        tg.onEvent?.('viewportChanged', update);
      } catch {}
    }

    window.addEventListener('resize', update);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', update);

      if (tg) {
        try {
          tg.offEvent?.('fullscreenChanged', update);
          tg.offEvent?.('fullscreen_changed', update);
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
