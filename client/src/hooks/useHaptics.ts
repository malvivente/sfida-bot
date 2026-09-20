import WebApp from '@twa-dev/sdk';

export function useHaptics() {
  const triggerImpact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    try {
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred(style);
      }
    } catch {
      // Fallback or browser preview
    }
  };

  const triggerNotification = (type: 'error' | 'success' | 'warning') => {
    try {
      if (WebApp && WebApp.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred(type);
      }
    } catch {
      // Fallback
    }
  };

  const triggerSelection = () => {
    try {
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
