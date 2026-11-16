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
  isElderlyMode?: boolean;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  activeId,
  onSelect,
  isElderlyMode = false,
}) => {
  return (
    <aside
      className={`bg-[#F5EEDB] border-r border-[#E8DFC9] shrink-0 overflow-y-auto pt-0 pb-2 flex flex-col select-none scrollbar-none z-20 ${
        isElderlyMode ? 'w-[136px] sm:w-[164px] gap-0.5' : 'w-20 sm:w-24 md:w-32 gap-1'
      }`}
    >
      {CATEGORIES.map((cat) => {
        const isActive = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`w-full flex flex-col items-center justify-center text-center transition-all relative ${
              isElderlyMode ? 'py-1.5 px-1' : 'py-3 px-1 md:py-4 md:px-2'
            } ${
              isActive
                ? 'bg-white text-terracotta font-black shadow-xs'
                : 'text-navy/70 hover:bg-white/40 hover:text-navy font-semibold'
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-terracotta rounded-r-full" />
            )}
            <span className={`${isElderlyMode ? 'text-base mb-0' : 'text-xl md:text-2xl mb-0.5'} filter drop-shadow-xs`}>
              {cat.emoji}
            </span>
            <span className={`${isElderlyMode ? 'text-xs' : 'text-[11px] md:text-sm'} leading-tight font-extrabold`}>
              {cat.name}
            </span>
            <span className={`${isElderlyMode ? 'text-[10px]' : 'text-[9px] md:text-xs'} opacity-80 mt-0.5`}>
              {cat.chineseName}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
