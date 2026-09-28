import React from 'react';
import { motion } from 'framer-motion';
import { Home, Swords, Users, Trophy, User } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

export type EpicTab = 'home' | 'activity' | 'referrals' | 'leaderboard' | 'profile';

interface EpicBottomNavProps {
  activeTab: EpicTab;
  onTabChange: (tab: EpicTab) => void;
  openRoomsCount?: number;
}

export const EpicBottomNav: React.FC<EpicBottomNavProps> = ({
  activeTab,
  onTabChange,
  openRoomsCount = 0,
}) => {
  const { triggerSelection } = useHaptics();
  const { t } = useI18n();

  const handleSelect = (tab: EpicTab) => {
    if (tab === activeTab) return;
    triggerSelection();
    onTabChange(tab);
  };

  const navItems: Array<{
    id: EpicTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }> = [
    {
      id: 'activity',
      label: t('nav.activity'),
      icon: Swords,
      badge: openRoomsCount > 0 ? openRoomsCount : undefined,
    },
    {
      id: 'referrals',
      label: t('nav.invite'),
      icon: Users,
    },
    {
      id: 'home',
      label: t('nav.home'),
      icon: Home,
    },
    {
      id: 'leaderboard',
      label: t('nav.leaderboardShort'),
      icon: Trophy,
    },
    {
      id: 'profile',
      label: t('nav.profile'),
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#10131a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around max-w-md mx-auto shadow-2xl select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className="flex-1 h-13 flex flex-col items-center justify-center relative touch-manipulation group active:scale-95 transition-transform"
          >
            {/* Smooth hardware-accelerated magnetic sliding bubble */}
            {isActive && (
              <motion.div
                layoutId="activeNavBubble"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 35,
                  mass: 0.8,
                }}
                className="absolute inset-0 mx-1 my-0.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 shadow-epic-purple z-0 pointer-events-none"
              />
            )}

            <div className="relative z-10 flex flex-col items-center justify-center w-full py-0.5 pointer-events-none">
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {/* Badge indicator */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black leading-tight border border-[#10131a] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-heading font-extrabold tracking-tight transition-colors duration-150 mt-0.5 whitespace-nowrap ${
                  isActive ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
