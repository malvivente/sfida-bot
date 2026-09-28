import React from 'react';
import { Home, Swords, Users, Trophy, User } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';

export type EpicTab = 'home' | 'duels' | 'referrals' | 'leaderboard' | 'profile';

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
      id: 'home',
      label: t('nav.home'),
      icon: Home,
    },
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#12151c]/95 backdrop-blur-xl border-t border-white/10 px-2 sm:px-3 py-2 flex items-center justify-around max-w-md mx-auto shadow-2xl select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`relative flex items-center justify-center transition-all duration-200 active:scale-95 ${
              isActive
                ? 'px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-epic-purple space-x-1.5'
                : 'px-2 py-1.5 text-slate-400 hover:text-white flex-col space-y-0.5'
            }`}
          >
            {/* Tab Icon */}
            <div className="relative">
              <Icon className={`${isActive ? 'w-4 h-4' : 'w-5 h-5'} transition-all`} />
              
              {/* Optional Red Notification Badge */}
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black leading-tight border border-[#12151c] animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>

            {/* Tab Label */}
            <span
              className={`${
                isActive
                  ? 'text-xs font-heading font-extrabold tracking-wide'
                  : 'text-[10px] font-medium tracking-tight block'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
