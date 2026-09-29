import React from 'react';
import { Wallet, HelpCircle, Globe, Shield } from 'lucide-react';
import { GramIcon } from './GramIcon.js';
import { UserAvatar } from './UserAvatar.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useI18n } from '../i18n/index.js';
import { TonConnectButton } from '@tonconnect/ui-react';

interface EpicHeaderProps {
  userBalanceGram?: string;
  onOpenDeposit?: () => void;
  photoUrl?: string | null;
  displayName?: string;
  username?: string;
  onOpenRules: () => void;
  onOpenProfile?: () => void;
  hideBalanceRow?: boolean;
}

export const EpicHeader: React.FC<EpicHeaderProps> = ({
  userBalanceGram = '0.00',
  onOpenDeposit,
  photoUrl,
  displayName,
  username,
  onOpenRules,
  onOpenProfile,
  hideBalanceRow = false,
}) => {
  const { triggerImpact } = useHaptics();
  const { language, toggleLanguage, t } = useI18n();

  const formattedBal = parseFloat(userBalanceGram || '0').toFixed(2);

  return (
    <header className="w-full max-w-md mx-auto pt-1 pb-3 px-1">
      {/* Top Utility Row (Language & Rules on Left, TonConnect on Right) */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px]">
        {/* Left: Language Toggle & Rules / ToS Button */}
        <div className="flex items-center space-x-1.5">
          {/* Language Toggle */}
          <button
            onClick={() => {
              triggerImpact('light');
              toggleLanguage();
            }}
            title="Switch Language"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-[10px] flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Rules / ToS Button */}
          <button
            onClick={() => {
              triggerImpact('light');
              onOpenRules();
            }}
            title="Rules & Terms"
            className="p-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        {/* Right: TonConnect UI */}
        <div className="scale-90 origin-right">
          <TonConnectButton />
        </div>
      </div>

      {/* Main Epic-Style Balance Row (Hidden when on Profile tab to avoid duplicate avatar & balance) */}
      {!hideBalanceRow && (
        <div className="flex items-center justify-between">
          {/* Left: User Avatar & Balance */}
          <div 
            onClick={onOpenProfile}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            {/* Avatar with subtle glow ring and VIP gem badge */}
            <div className="relative">
              <UserAvatar
                photoUrl={photoUrl}
                name={displayName || username || 'Player'}
                sizeClass="w-11 h-11"
                roundedClass="rounded-2xl"
                className="ring-2 ring-white/10 group-hover:ring-purple-500/50 transition-all shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-[#0e1015] flex items-center justify-center shadow-sm">
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            {/* Balance info */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                {t('epic.yourBalance')}
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <div className="w-5 h-5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                  <GramIcon className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-xl font-heading font-extrabold text-white tracking-tight leading-none">
                  {formattedBal}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Vibrant Epic Deposit Button */}
          {onOpenDeposit && (
            <button
              onClick={() => {
                triggerImpact('medium');
                onOpenDeposit();
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-epic-purple flex items-center space-x-1.5 active:scale-95 transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-white/90" />
              <span>{t('epic.deposit')}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
