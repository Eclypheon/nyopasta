import React, { useMemo } from 'react';
import { StoreSettings, forceResetPwaCache, isStoreCurrentlyOpen } from '@nyopasta/shared';
import { Power, RefreshCw, Sparkles, LogOut } from 'lucide-react';

interface HeaderProps {
  storeSettings: StoreSettings;
  adminUser?: string;
  onLogout?: () => void;
  onQuickToggleShop?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storeSettings,
  adminUser,
  onLogout,
  onQuickToggleShop,
}) => {
  const currentStatus = useMemo(() => isStoreCurrentlyOpen(storeSettings), [storeSettings]);
  const isEffectiveOpen = currentStatus.isOpen;
  const isOverridden = Boolean(currentStatus.isOverridden);

  const handleResetCache = async () => {
    const ok = window.confirm(
      'Force reset PWA cache and reload fresh? This will unregister service workers, clear CacheStorage, and reload the latest build.'
    );
    if (ok) {
      await forceResetPwaCache();
    }
  };

  return (
    <header
      className="bg-navy text-white px-3 sm:px-4 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-navy-900"
      style={{
        paddingTop: 'calc(0.6rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.6rem',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Left: Brand Logo & Title in single line with Status Pill */}
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={`${import.meta.env.BASE_URL}admin-icon.png`}
          alt="NYO Pasta"
          className="w-8 h-8 rounded-full object-contain shadow-xs shrink-0"
          style={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logo.jpg`;
          }}
        />
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-black text-sm tracking-wide leading-tight whitespace-nowrap text-white">
            NYOPASTA ADMIN
          </h1>
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 whitespace-nowrap shadow-xs ${
              isEffectiveOpen
                ? isOverridden
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-500 text-white'
                : isOverridden
                ? 'bg-rose-600 text-white'
                : 'bg-gray-600 text-gray-200'
            }`}
            title={
              isOverridden
                ? `Manual operating hours override in place (${isEffectiveOpen ? 'Forced Open' : 'Forced Closed'})`
                : currentStatus.reason
            }
          >
            {isEffectiveOpen
              ? isOverridden
                ? 'Open (Override)'
                : 'Live'
              : isOverridden
              ? 'Closed (Override)'
              : 'Closed'}
          </span>
        </div>
      </div>

      {/* Spacer to provide breathing room between title pill and buttons */}
      <div className="flex-1 min-w-[12px] sm:min-w-[20px]" />

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Quick Shop Open/Close Toggle Button */}
        <button
          type="button"
          onClick={onQuickToggleShop}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 ${
            isEffectiveOpen
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title={
            isEffectiveOpen
              ? 'Click to close shop (manual override)'
              : 'Click to open shop (manual override)'
          }
        >
          {isEffectiveOpen ? (
            <>
              <Power className="w-3.5 h-3.5" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open</span>
            </>
          )}
        </button>

        {/* PWA On-Device Cache Reset Button */}
        <button
          type="button"
          onClick={handleResetCache}
          title="Force reset PWA cache and reload"
          className="p-1.5 text-gray-300 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors shrink-0"
          aria-label="Force reset PWA cache"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Staff User & Logout */}
        {adminUser && onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={`Logged in as ${adminUser}. Click to logout.`}
            className="p-1.5 text-gray-300 hover:text-red-300 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-1 shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
