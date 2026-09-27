import React, { useState } from 'react';

const AVATAR_GRADIENTS = [
  'from-blue-600 to-cyan-500 text-white',
  'from-purple-600 to-pink-500 text-white',
  'from-emerald-600 to-teal-400 text-white',
  'from-amber-500 to-orange-500 text-white',
  'from-rose-600 to-red-500 text-white',
  'from-indigo-600 to-violet-500 text-white',
  'from-cyan-600 to-blue-500 text-white',
  'from-fuchsia-600 to-purple-500 text-white',
  'from-teal-600 to-emerald-500 text-white',
  'from-violet-600 to-purple-400 text-white',
];

export function getAvatarGradient(nameOrId: string = ''): string {
  let hash = 0;
  const clean = (nameOrId || '').trim();
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function getInitial(name: string = ''): string {
  const clean = name.replace(/^@/, '').trim();
  return (clean[0] || 'W').toUpperCase();
}

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  sizeClass?: string;
  textClass?: string;
  roundedClass?: string;
  className?: string;
  children?: React.ReactNode;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name = '',
  sizeClass = 'w-8 h-8',
  textClass = 'text-xs',
  roundedClass = 'rounded-full',
  className = '',
  children,
}) => {
  const [hasError, setHasError] = useState(false);
  const initial = getInitial(name);
  const gradient = getAvatarGradient(name);

  // If real profile picture is available and has not failed to load
  if (photoUrl && photoUrl.trim() && !hasError) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} border border-slate-600/80 bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-md ${className}`}
      >
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
        {children}
      </div>
    );
  }

  // Fallback: colorful deterministic background with initial letter (NO letter on top of photos)
  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-gradient-to-br ${gradient} border border-white/20 flex items-center justify-center shrink-0 font-orbitron font-bold ${textClass} shadow-md select-none relative overflow-hidden ${className}`}
    >
      {initial}
      {children}
    </div>
  );
};
