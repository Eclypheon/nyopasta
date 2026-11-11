import React from 'react';
import { StoreSettings, forceResetPwaCache } from '@nyopasta/shared';
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
  const isClosed = storeSettings.isManuallyClosed;

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
      className="bg-navy text-white px-4 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-navy-900"
      style={{
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.75rem',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}stamp-darkblue.png`}
          alt="NYO Pasta"
          className="w-9 h-9 rounded-full bg-white p-0.5 object-contain shadow-xs shrink-0"
          style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}logo.jpg`;
          }}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-sm tracking-wide leading-tight">NYO KITCHEN & ADMIN</h1>
            <span
              className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider ${
                isClosed ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
              }`}
            >
              {isClosed ? 'Shop Closed' : 'Live'}
            </span>
          </div>
          <p className="text-[11px] text-gray-300">Toa Payoh Palm Spring</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Shop Open/Close Toggle */}
        <button
          type="button"
          onClick={onQuickToggleShop}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors ${
            isClosed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isClosed ? 'Open shop for the day' : 'Close shop for the day'}
        >
          {isClosed ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open</span>
            </>
          ) : (
            <>
              <Power className="w-3.5 h-3.5" />
              <span>Close</span>
            </>
          )}
        </button>

        {/* PWA On-Device Cache Reset Button */}
        <button
          type="button"
          onClick={handleResetCache}
          title="Force reset PWA cache and reload"
          className="p-1.5 text-gray-300 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
          aria-label="Force reset PWA cache"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Staff User & Logout */}
        {adminUser && onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={`Logged in as ${adminUser}. Click to logout.`}
            className="p-1.5 text-gray-300 hover:text-red-300 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center gap-1"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
