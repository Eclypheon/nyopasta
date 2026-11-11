import React from 'react';
import { RefreshCw, ShoppingBag, UserCheck, UserX } from 'lucide-react';
import { forceResetPwaCache } from '@nyopasta/shared';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenProfileModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const { totalItemCount, isGuest, setCustomerInfo, customerName, customerContact } = useCart();

  const handleResetCache = () => {
    if (window.confirm('Reset application cache, clear stale service workers, and reload fresh?')) {
      forceResetPwaCache();
    }
  };

  const toggleGuestMode = () => {
    setCustomerInfo(customerName, customerContact, !isGuest);
  };

  return (
    <header className="bg-white border-b border-cream-dark px-4 py-3 sticky top-0 z-30 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/logo.jpg"
          alt="NYO Pasta Logo"
          className="w-10 h-10 rounded-full border border-terracotta object-cover shadow-xs"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg text-terracotta tracking-tight leading-none">NYO PASTA</h1>
            <button
              onClick={toggleGuestMode}
              title={isGuest ? 'Switch to Member Mode' : 'Switch to Guest Mode'}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                isGuest ? 'bg-gray-100 text-gray-600' : 'bg-terracotta-50 text-terracotta border border-terracotta/20'
              }`}
            >
              {isGuest ? (
                <>
                  <UserX className="w-2.5 h-2.5" /> Guest
                </>
              ) : (
                <>
                  <UserCheck className="w-2.5 h-2.5" /> Member
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
          onClick={handleResetCache}
          title="Force update app and reset cache"
          className="p-2 text-navy/60 hover:text-terracotta active:rotate-180 transition-all rounded-full bg-cream-light border border-cream-dark shadow-2xs"
          aria-label="Force reset PWA cache"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Cart Drawer Trigger */}
        <button
          onClick={onOpenCart}
          className="relative p-2 text-white bg-terracotta hover:bg-terracotta-600 active:scale-95 transition-all rounded-full shadow-sm flex items-center justify-center"
          aria-label="Open cart drawer"
        >
          <ShoppingBag className="w-4 h-4" />
          {totalItemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-navy text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white animate-scale-in">
              {totalItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
