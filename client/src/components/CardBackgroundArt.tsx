import React from 'react';

export type CardArtType =
  | 'menu_split'
  | 'menu_quick'
  | 'menu_strategy'
  | 'menu_spectate'
  | 'shotgun'
  | 'connect4'
  | 'split'
  | 'cubecount'
  | 'roulette'
  | 'blackjack'
  | 'bridge'
  | 'chrono';

const CARD_IMAGE_MAP: Record<CardArtType, { webp: string; png: string }> = {
  menu_split: { webp: '/assets/cards/split_steal.webp', png: '/assets/cards/split_steal.png' },
  menu_quick: { webp: '/assets/cards/quick_match.webp', png: '/assets/cards/quick_match.png' },
  menu_strategy: { webp: '/assets/cards/strategy_duels.webp', png: '/assets/cards/strategy_duels.png' },
  menu_spectate: { webp: '/assets/cards/spectate_bet.webp', png: '/assets/cards/spectate_bet.png' },
  shotgun: { webp: '/assets/cards/shotgun.webp', png: '/assets/cards/shotgun.png' },
  connect4: { webp: '/assets/cards/forza4.webp', png: '/assets/cards/forza4.png' },
  split: { webp: '/assets/cards/split_steal.webp', png: '/assets/cards/split_steal.png' },
  cubecount: { webp: '/assets/cards/cubecount.webp', png: '/assets/cards/cubecount.png' },
  roulette: { webp: '/assets/cards/roulette.webp', png: '/assets/cards/roulette.png' },
  blackjack: { webp: '/assets/cards/blackjack.webp', png: '/assets/cards/blackjack.png' },
  bridge: { webp: '/assets/cards/glass_bridge.webp', png: '/assets/cards/glass_bridge.png' },
  chrono: { webp: '/assets/cards/chrono_blind.webp', png: '/assets/cards/chrono_blind.png' },
};

// Immediate background preloader so cards are instantly available from memory
if (typeof window !== 'undefined') {
  const preloadCardImages = () => {
    Object.values(CARD_IMAGE_MAP).forEach((item) => {
      const img = new Image();
      img.src = item.webp;
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadCardImages, { timeout: 800 });
  } else {
    setTimeout(preloadCardImages, 150);
  }
}

interface CardBackgroundArtProps {
  type: CardArtType;
  className?: string;
  alt?: string;
}

export const CardBackgroundArt: React.FC<CardBackgroundArtProps> = ({
  type,
  className = '',
  alt = '',
}) => {
  const item = CARD_IMAGE_MAP[type];
  if (!item) return null;

  return (
    <picture className="contents">
      <source srcSet={item.webp} type="image/webp" />
      <img
        src={item.png}
        alt={alt}
        loading="eager"
        decoding="async"
        className={`object-contain pointer-events-none select-none drop-shadow-md ${className}`}
      />
    </picture>
  );
};
