import React from 'react';
import { motion } from 'framer-motion';
import { Home, Swords, Users, Trophy, User } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

export type EpicTab = 'duels' | 'referrals' | 'home' | 'leaderboard' | 'profile';

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
      id: 'duels',
      label: t('nav.duels'),
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

  const activeIndex = Math.max(0, navItems.findIndex((item) => item.id === activeTab));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-2 px-2.5 max-w-md mx-auto pointer-events-none select-none">
      <nav className="pointer-events-auto rounded-[26px] bg-[#111422]/95 backdrop-blur-2xl border border-white/15 px-1.5 py-1.5 flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.85)] relative overflow-hidden">
        {/* Horizontal sliding jewel highlight pill (purely horizontal, zero vertical scroll jump) */}
        <motion.div
          animate={{ x: `${activeIndex * 100}%` }}
          transition={{
            type: 'spring',
            stiffness: 480,
            damping: 34,
            mass: 0.6,
          }}
          style={{ width: `${100 / navItems.length}%` }}
          className="absolute top-1.5 bottom-1.5 left-0 px-1 pointer-events-none z-0"
        >
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#7059e2] via-[#5b3dd4] to-[#4527a0] border border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_6px_22px_rgba(112,89,226,0.55)]" />
        </motion.div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className="flex-1 h-13 flex flex-col items-center justify-center relative touch-manipulation group active:scale-95 transition-transform z-10"
            >
              <div
                className={`relative z-10 flex flex-col items-center justify-center w-full py-0.5 pointer-events-none transition-all duration-200 ${
                  isActive ? 'scale-105' : 'scale-100 opacity-70 group-hover:opacity-100'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]' : 'text-slate-400 group-hover:text-slate-200'
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
                  className={`text-[10px] font-heading font-extrabold tracking-wide uppercase mt-0.5 transition-colors duration-200 ${
                    isActive ? 'text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
