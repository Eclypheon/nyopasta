import React from 'react';
import { MenuItem } from '@nyopasta/shared';
import { Plus, Ban, Sparkles } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onSelect }) => {
  const isSoldOut = item.isSoldOut;

  return (
    <div
      onClick={() => {
        if (!isSoldOut) onSelect(item);
      }}
      className={`bg-white rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
        isSoldOut
          ? 'opacity-65 border-gray-200 cursor-not-allowed bg-gray-50/50'
          : 'border-cream-dark hover:border-terracotta/40 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]'
      }`}
    >
      <div>
        {/* Top Header: Title, Tags, Sold Out badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-navy text-sm leading-tight">{item.name}</h3>
              {item.tag && (
                <span className="text-[10px] bg-pasta-gold/20 text-amber-900 border border-pasta-gold/40 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                  {item.tag}
                </span>
              )}
            </div>
            <p className="text-xs text-terracotta font-semibold mt-0.5">{item.chineseName}</p>
          </div>

          {isSoldOut && (
            <span className="bg-red-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs shrink-0">
              <Ban className="w-2.5 h-2.5" />
              Sold Out
            </span>
          )}
        </div>

        {/* Descriptions */}
        <p className="text-xs text-navy/70 mt-2 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
        {item.chineseDescription && (
          <p className="text-[11px] text-navy/50 mt-0.5 line-clamp-1">
            {item.chineseDescription}
          </p>
        )}
      </div>

      {/* Footer: Price & Add Button */}
      <div className="mt-4 pt-2 border-t border-cream-dark/60 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-navy text-base tracking-tight">
              ${item.price.toFixed(2)}
            </span>
            {item.isKidOption && item.kidPrice && (
              <span className="text-[11px] font-semibold text-terracotta/90">
                (Kid: ${item.kidPrice.toFixed(2)})
              </span>
            )}
          </div>
          {item.category === 'mains' && !isSoldOut && (
            <span className="text-[10px] text-emerald-700 font-semibold block">
              ⭐ Earns 1 Loyalty Stamp
            </span>
          )}
        </div>

        {isSoldOut ? (
          <button
            disabled
            className="bg-gray-200 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-not-allowed"
          >
            Sold Out
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="bg-terracotta hover:bg-terracotta-600 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>
    </div>
  );
};
