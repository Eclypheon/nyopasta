import React, { useState, useMemo } from 'react';
import { MenuItem, StoreSettings, api } from '@nyopasta/shared';
import {
  Power,
  Search,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';

interface InventoryTabProps {
  menuItems: MenuItem[];
  storeSettings: StoreSettings;
  onMenuUpdated?: () => void;
  onSettingsUpdated?: () => void;
  onOpenMenuEditor?: () => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  menuItems,
  storeSettings,
  onMenuUpdated,
  onSettingsUpdated,
  onOpenMenuEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1-tap sold out toggle per menu item
  const handleToggleSoldOut = async (item: MenuItem) => {
    const nextSoldOut = !item.isSoldOut;
    try {
      await api.updateMenuItemSoldOut(item.id, nextSoldOut);
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to toggle sold out status:', err);
    }
  };

  // Close shop for the day action
  const handleCloseShopForDay = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to close shop for the day? All items will be marked SOLD OUT and the customer app will display the closed notice banner.'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // 1. Update store settings with closed banner
      await api.updateStoreSettings({
        isManuallyClosed: true,
        manualCloseReason: 'Shop is closed for the day by management.',
        bannerMessage: 'Notice: NYO Pasta is closed for the day. Online ordering is paused.',
      });

      // 2. Mark all items sold out atomically
      await api.setAllMenuItemsSoldOut(true);

      onSettingsUpdated?.();
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to close shop for the day:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open shop for the day action
  const handleOpenShopForDay = async () => {
    const confirmed = window.confirm(
      'Open shop for the day? Normal stock availability will be restored for all items.'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // 1. Update store settings to remove closed banner
      await api.updateStoreSettings({
        isManuallyClosed: false,
        manualCloseReason: '',
        bannerMessage: '',
      });

      // 2. Restore all items to in-stock atomically
      await api.setAllMenuItemsSoldOut(false);

      onSettingsUpdated?.();
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to open shop for the day:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.isArchived) return false;
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.chineseName.includes(q) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const soldOutCount = menuItems.filter((i) => i.isSoldOut && !i.isArchived).length;
  const liveItemCount = menuItems.filter((i) => !i.isArchived).length;
  const inStockCount = liveItemCount - soldOutCount;

  return (
    <div className="space-y-4">
      {/* Top Shop Control Actions Banner */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">Store Stock Controls</h2>
              {storeSettings.isManuallyClosed ? (
                <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  Shop Closed Today
                </span>
              ) : (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Shop Open
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tap any item card to toggle 1-tap stock availability instantly on the customer app.
            </p>
          </div>

          {/* Action Buttons: Close / Open Shop For The Day */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCloseShopForDay}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              Close shop for the day
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleOpenShopForDay}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open shop for the day
            </button>
          </div>
        </div>

        {/* Stock counters summary bar */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
          <div className="bg-gray-50 p-2 rounded-xl">
            <span className="text-[11px] text-gray-500 font-medium">Total Items</span>
            <p className="text-base font-black text-gray-900">{liveItemCount}</p>
          </div>
          <div className="bg-emerald-50/70 p-2 rounded-xl">
            <span className="text-[11px] text-emerald-700 font-medium">In Stock</span>
            <p className="text-base font-black text-emerald-800">{inStockCount}</p>
          </div>
          <div className="bg-red-50/70 p-2 rounded-xl">
            <span className="text-[11px] text-red-700 font-medium">Sold Out</span>
            <p className="text-base font-black text-red-800">{soldOutCount}</p>
          </div>
        </div>

        {/* Rarely used: opens the full menu editor page */}
        <button
          type="button"
          onClick={onOpenMenuEditor}
          className="mt-3 w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-navy border border-navy/25 hover:bg-navy/5 flex items-center justify-center gap-1.5 transition-colors"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          Change menu (add, edit or archive dishes)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or Chinese..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-terracotta"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'mains', label: 'Mains' },
            { id: 'soups', label: 'Soups' },
            { id: 'sides', label: 'Sides' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleToggleSoldOut(item)}
            className={`p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all duration-150 flex items-center justify-between ${
              item.isSoldOut
                ? 'bg-red-50/70 border-red-200 hover:border-red-300'
                : 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-xs'
            }`}
          >
            <div className="pr-3">
              <div className="flex items-center gap-1.5">
                <h3
                  className={`font-bold text-sm leading-tight ${
                    item.isSoldOut ? 'line-through text-red-900/70' : 'text-gray-900'
                  }`}
                >
                  {item.name}
                </h3>
                {item.tag && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                    {item.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{item.chineseName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-gray-800">
                  ${item.price.toFixed(2)}
                </span>
                {item.subcategory && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded">
                    {item.subcategory}
                  </span>
                )}
              </div>
            </div>

            {/* 1-Tap Toggle Pill */}
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSoldOut(item);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black shadow-2xs flex items-center gap-1 transition-all ${
                  item.isSoldOut
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                }`}
              >
                {item.isSoldOut ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Sold Out
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    In Stock
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
