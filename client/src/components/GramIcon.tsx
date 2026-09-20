import React from 'react';

interface GramIconProps {
  className?: string;
  size?: number;
}

/**
 * Scalable vector logo for the GRAM cryptocurrency token (Telegram diamond crystal).
 * Uses currentColor to adapt seamlessly to button text, icons, and badges.
 */
export const GramIcon: React.FC<GramIconProps> = ({ className = 'w-3.5 h-3.5', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={`inline-block shrink-0 align-middle ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Upper-Left Facet */}
    <path d="M12 2.5L3.5 8.8H12V2.5Z" fill="currentColor" opacity="0.82" />
    {/* Upper-Right Facet */}
    <path d="M12 2.5L20.5 8.8H12V2.5Z" fill="currentColor" opacity="1" />
    {/* Lower-Left Facet */}
    <path d="M3.5 8.8L12 21.5V8.8H3.5Z" fill="currentColor" opacity="0.68" />
    {/* Lower-Right Facet */}
    <path d="M20.5 8.8L12 21.5V8.8H20.5Z" fill="currentColor" opacity="0.9" />
  </svg>
);
