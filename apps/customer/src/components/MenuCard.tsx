import React from 'react';
import { MenuItem } from '@nyopasta/shared';
import { Plus, Ban, Sparkles, Award } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onSelect }) => {
  const isSoldOut = item.isSoldOut;
  const imageSrc = item.imageUrl ? `${import.meta.env.BASE_URL}${item.imageUrl}` : undefined;

  return (
    <div
      onClick={() => {
        if (!isSoldOut) onSelect(item);
      }}
      className={`bg-white rounded-2xl p-3 sm:p-4 border transition-all duration-200 relative overflow-hidden flex gap-3 sm:gap-4 items-center ${
        isSoldOut
          ? 'opacity-60 border-gray-200 cursor-not-allowed bg-gray-50/70'
          : 'border-cream-dark hover:border-terracotta/40 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]'
      }`}
    >
      {/* Dish Photo */}
      <div
        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-cream-dark/20 border border-cream-dark relative shadow-2xs"
        style={{ width: 96, height: 96, minWidth: 96, minHeight: 96 }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${!isSoldOut && 'hover:scale-105'}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-navy/20 font-bold text-xs">
            NYO PASTA
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-red-600 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <Ban className="w-2.5 h-2.5" /> Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-extrabold text-navy text-sm leading-tight line-clamp-2">{item.name}</h3>
            {item.tag && (
              <span className="text-[9px] bg-pasta-gold/20 text-amber-900 border border-pasta-gold/40 font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                <Sparkles className="w-2 h-2 text-amber-700" />
                {item.tag}
              </span>
            )}
          </div>
          <p className="text-xs text-[#B03620] font-semibold mt-0.5">{item.chineseName}</p>

          <p className="text-[11px] text-navy/70 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Pricing and Add Action */}
        <div className="mt-2 pt-2 border-t border-cream-dark/50 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-navy text-sm sm:text-base tracking-tight">
                ${item.price.toFixed(2)}
              </span>
              {item.isKidOption && item.kidPrice && (
                <span className="text-[10px] font-semibold text-terracotta/90">
                  (Kid: ${item.kidPrice.toFixed(2)})
                </span>
              )}
            </div>
            {item.category === 'mains' && !isSoldOut && (
              <span className="text-[9px] text-emerald-700 font-extrabold flex items-center gap-0.5">
                <Award className="w-2.5 h-2.5" /> +1 Stamp
              </span>
            )}
          </div>

          {isSoldOut ? (
            <button
              type="button"
              disabled
              className="bg-gray-200 text-gray-500 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className="bg-terracotta hover:bg-terracotta-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
