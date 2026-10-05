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

const CARD_IMAGE_MAP: Record<CardArtType, string> = {
  menu_split: '/assets/cards/split_steal.png',
  menu_quick: '/assets/cards/quick_match.png',
  menu_strategy: '/assets/cards/strategy_duels.png',
  menu_spectate: '/assets/cards/spectate_bet.png',
  shotgun: '/assets/cards/shotgun.png',
  connect4: '/assets/cards/forza4.png',
  split: '/assets/cards/split_steal.png',
  cubecount: '/assets/cards/cubecount.png',
  roulette: '/assets/cards/roulette.png',
  blackjack: '/assets/cards/blackjack.png',
  bridge: '/assets/cards/glass_bridge.png',
  chrono: '/assets/cards/chrono_blind.png',
};

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
  const src = CARD_IMAGE_MAP[type];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`object-contain pointer-events-none select-none drop-shadow-md ${className}`}
    />
  );
};
