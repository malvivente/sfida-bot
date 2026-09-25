import { getTelegramWebApp } from '../utils/telegram.js';

export function useHaptics() {
  const triggerImpact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    try {
      const WebApp = getTelegramWebApp();
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch {
      // Fallback or browser preview
    }
  };

  const triggerNotification = (type: 'error' | 'success' | 'warning') => {
    try {
      const WebApp = getTelegramWebApp();
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred(type);
      }
    } catch {
      // Fallback
    }
  };

  const triggerSelection = () => {
    try {
      const WebApp = getTelegramWebApp();
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.selectionChanged();
      }
    } catch {
      // Fallback
    }
  };

  return {
    triggerImpact,
    triggerNotification,
    triggerSelection,
  };
}
