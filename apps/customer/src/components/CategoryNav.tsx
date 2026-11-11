import React from 'react';
import { MenuItemCategory } from '@nyopasta/shared';

interface CategoryNavProps {
  selectedCategory: MenuItemCategory;
  onSelectCategory: (category: MenuItemCategory) => void;
  selectedSubcategory?: string;
  onSelectSubcategory?: (sub: string) => void;
}

const CATEGORIES: { id: MenuItemCategory; label: string; chinese: string }[] = [
  { id: 'mains', label: 'Mains', chinese: '主食' },
  { id: 'soups', label: 'Artisanal Soups', chinese: '浓汤' },
  { id: 'sides', label: 'Sides', chinese: '小菜' },
];

const SIDES_SUBCATEGORIES = [
  'All',
  'Korean Fried Chicken',
  'Bread',
  'Fried Items',
];

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSubcategory = 'All',
  onSelectSubcategory,
}) => {
  return (
    <div className="sticky top-[57px] z-20 bg-cream/95 backdrop-blur-sm pt-2 pb-2 -mx-4 px-4 border-b border-cream-dark">
      {/* Primary Category Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-terracotta text-white shadow-terracotta/20 shadow-md scale-102'
                  : 'bg-white text-navy hover:bg-white/80 border border-cream-dark'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-terracotta'}`}>
                {cat.chinese}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subcategory Pills (Only visible when Sides is selected) */}
      {selectedCategory === 'sides' && onSelectSubcategory && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mt-2 pt-1 border-t border-cream-dark/60">
          {SIDES_SUBCATEGORIES.map((sub) => {
            const isSubSelected = selectedSubcategory === sub;
            return (
              <button
                key={sub}
                onClick={() => onSelectSubcategory(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isSubSelected
                    ? 'bg-navy text-white'
                    : 'bg-white/70 text-navy/70 border border-cream-dark hover:bg-white'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
