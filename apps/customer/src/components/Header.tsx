import React from 'react';
import { RefreshCw, ShoppingBag, UserCheck, UserX } from 'lucide-react';
import { forceResetPwaCache } from '@nyopasta/shared';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const {
    totalItemCount,
    isGuest,
    currentUser,
    setIsAuthModalOpen,
    logout,
  } = useCart();
  const logoUrl = `${import.meta.env.BASE_URL}logo.jpg`;

  const handleResetCache = () => {
    if (window.confirm('Reset application cache, clear stale service workers, and reload fresh?')) {
      forceResetPwaCache();
    }
  };

  const handleAuthPillClick = () => {
    if (isGuest) {
      setIsAuthModalOpen(true);
    } else {
      if (window.confirm(`Logged in as ${currentUser?.name || 'Member'}. Do you want to sign out?`)) {
        logout();
      }
    }
  };

  return (
    <header className="bg-white border-b border-cream-dark px-4 py-3 sticky top-0 z-40 shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-terracotta overflow-hidden shadow-xs shrink-0 bg-cream flex items-center justify-center"
          style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, maxWidth: 40, maxHeight: 40 }}
        >
          <img
            src={logoUrl}
            alt="NYO Pasta Logo"
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              // Fallback to dark-blue stamp if logo.jpg fails
              (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}stamp-darkblue.png`;
            }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base sm:text-lg text-terracotta tracking-tight leading-none">NYO PASTA</h1>
            <button
              type="button"
              onClick={handleAuthPillClick}
              title={isGuest ? 'Sign in or create account to collect loyalty stamps' : 'Click to sign out'}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                isGuest
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-terracotta/10 text-terracotta border border-terracotta/20 hover:bg-terracotta/20'
              }`}
            >
              {isGuest ? (
                <>
                  <UserX className="w-2.5 h-2.5" /> Guest · Sign In
                </>
              ) : (
                <>
                  <UserCheck className="w-2.5 h-2.5" /> {currentUser?.name ? currentUser.name.split(' ')[0] : 'Member'}
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-navy/70 font-medium mt-0.5">Toa Payoh Palm Spring #01-54</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* PWA Cache Reset Button */}
        <button
          type="button"
          onClick={handleResetCache}
          title="Force update application cache"
          className="p-2 text-navy/40 hover:text-terracotta hover:bg-cream rounded-full transition-colors active:rotate-180"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Cart Trigger */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative bg-terracotta hover:bg-terracotta-600 text-white p-2 sm:px-3 sm:py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="hidden sm:inline">Cart</span>
          {totalItemCount > 0 && (
            <span className="bg-white text-terracotta text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
              {totalItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
