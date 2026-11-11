import React from 'react';

export interface CategoryItem {
  id: string;
  name: string;
  chineseName: string;
  emoji: string;
}

export const CATEGORIES: CategoryItem[] = [
  { id: 'cat-mains', name: 'Mains', chineseName: '主食', emoji: '🍝' },
  { id: 'cat-soups', name: 'Soups', chineseName: '浓汤', emoji: '🥣' },
  { id: 'cat-kfc', name: 'Chicken', chineseName: '炸鸡', emoji: '🍗' },
  { id: 'cat-breads', name: 'Breads', chineseName: '面包', emoji: '🥖' },
  { id: 'cat-fried', name: 'Sides', chineseName: '炸物', emoji: '🍟' },
];

interface CategorySidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ activeId, onSelect }) => {
  return (
    <aside className="w-20 sm:w-24 bg-[#F5EEDB] border-r border-[#E8DFC9] shrink-0 overflow-y-auto pt-0 pb-2 flex flex-col gap-1 select-none scrollbar-none z-20">
      {CATEGORIES.map((cat) => {
        const isActive = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`w-full py-3 px-1 flex flex-col items-center justify-center text-center transition-all relative ${
              isActive
                ? 'bg-white text-terracotta font-black shadow-xs'
                : 'text-navy/70 hover:bg-white/40 hover:text-navy font-semibold'
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-terracotta rounded-r-full" />
            )}
            <span className="text-xl mb-0.5 filter drop-shadow-xs">{cat.emoji}</span>
            <span className="text-[11px] leading-tight font-extrabold">{cat.name}</span>
            <span className="text-[9px] opacity-80 mt-0.5">{cat.chineseName}</span>
          </button>
        );
      })}
    </aside>
  );
};
