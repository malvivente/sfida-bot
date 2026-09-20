import React from 'react';

export interface GramIconProps {
  className?: string;
  size?: number;
  variant?: 'branded' | 'mono';
}

/**
 * Scalable official vector logo for the GRAM cryptocurrency token (formerly Toncoin / TON).
 * Extracted directly from the official brand media kit at https://ton.org/media/
 *
 * - 'branded': Official Gram blue (#30A1F5) diamond with white (#FFFFFF) central star.
 * - 'mono': Single compound vector with evenodd cutout star that seamlessly inherits textColor.
 */
export const GramIcon: React.FC<GramIconProps> = ({
  className = 'w-3.5 h-3.5',
  size,
  variant,
}) => {
  // If variant is not explicitly set, auto-detect: if className provides custom text-color, use mono; otherwise use branded
  const isMono = variant ? variant === 'mono' : /\btext-/.test(className);

  if (isMono) {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="currentColor"
        width={size}
        height={size}
        className={`inline-block shrink-0 align-middle ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GRAM"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M52.017 12.097H27.984c-3.201 0-4.802 0-6.25.448a10 10 0 0 0-3.496 1.909c-1.159.975-2.024 2.322-3.755 5.014l-7.64 11.884c-1.144 1.78-1.716 2.668-1.87 3.605a4.6 4.6 0 0 0 .263 2.45c.35.882 1.098 1.63 2.593 3.125L36.217 68.92c1.325 1.324 1.987 1.986 2.75 2.234a3.34 3.34 0 0 0 2.067 0c.763-.248 1.425-.91 2.75-2.234l28.388-28.388c1.495-1.495 2.243-2.243 2.593-3.125.31-.778.4-1.625.263-2.45-.155-.937-.727-1.826-1.87-3.605l-7.64-11.884c-1.73-2.692-2.596-4.039-3.756-5.014a10 10 0 0 0-3.496-1.91c-1.448-.447-3.048-.447-6.249-.447z M47.465 21.472c.39-1.055 1.883-1.055 2.274 0l2.698 7.292a1.6 1.6 0 0 0 .945.946l7.293 2.698c1.055.39 1.055 1.883 0 2.274l-7.293 2.698a1.6 1.6 0 0 0-.945.945l-2.698 7.293c-.39 1.055-1.883 1.055-2.274 0l-2.698-7.293a1.6 1.6 0 0 0-.946-.945l-7.292-2.698c-1.055-.39-1.055-1.883 0-2.274l7.292-2.698a1.6 1.6 0 0 0 .946-.946z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      width={size}
      height={size}
      className={`inline-block shrink-0 align-middle ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GRAM"
    >
      <path
        fill="#30A1F5"
        d="M52.017 12.097H27.984c-3.201 0-4.802 0-6.25.448a10 10 0 0 0-3.496 1.909c-1.159.975-2.024 2.322-3.755 5.014l-7.64 11.884c-1.144 1.78-1.716 2.668-1.87 3.605a4.6 4.6 0 0 0 .263 2.45c.35.882 1.098 1.63 2.593 3.125L36.217 68.92c1.325 1.324 1.987 1.986 2.75 2.234a3.34 3.34 0 0 0 2.067 0c.763-.248 1.425-.91 2.75-2.234l28.388-28.388c1.495-1.495 2.243-2.243 2.593-3.125.31-.778.4-1.625.263-2.45-.155-.937-.727-1.826-1.87-3.605l-7.64-11.884c-1.73-2.692-2.596-4.039-3.756-5.014a10 10 0 0 0-3.496-1.91c-1.448-.447-3.048-.447-6.249-.447z"
      />
      <path
        fill="#FFFFFF"
        d="M47.465 21.472c.39-1.055 1.883-1.055 2.274 0l2.698 7.292a1.6 1.6 0 0 0 .945.946l7.293 2.698c1.055.39 1.055 1.883 0 2.274l-7.293 2.698a1.6 1.6 0 0 0-.945.945l-2.698 7.293c-.39 1.055-1.883 1.055-2.274 0l-2.698-7.293a1.6 1.6 0 0 0-.946-.945l-7.292-2.698c-1.055-.39-1.055-1.883 0-2.274l7.292-2.698a1.6 1.6 0 0 0 .946-.946z"
      />
    </svg>
  );
};
