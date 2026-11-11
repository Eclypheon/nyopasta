import React from 'react';
import { RotateCcw, ChevronRight } from 'lucide-react';
import { Order } from '@nyopasta/shared';

interface ReorderBannerProps {
  lastOrder: Order;
  onReorder: (order: Order) => void;
}

export const ReorderBanner: React.FC<ReorderBannerProps> = ({ lastOrder, onReorder }) => {
  const itemsSummary = lastOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');

  return (
    <div className="bg-gradient-to-r from-terracotta-50 to-cream-light border border-terracotta/30 rounded-2xl p-3 shadow-xs mb-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-terracotta font-extrabold text-xs">
          <RotateCcw className="w-3.5 h-3.5 animate-spin-reverse" />
          <span>Craving your usual?</span>
        </div>
        <p className="text-xs font-bold text-navy truncate mt-0.5">
          {lastOrder.orderNumber} • {lastOrder.fulfillmentType === 'takeaway' ? '🥡 Takeaway' : '🍽️ Dine-in'}
        </p>
        <p className="text-[11px] text-navy/60 truncate">{itemsSummary}</p>
      </div>

      <button
        onClick={() => onReorder(lastOrder)}
        className="bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs px-3 py-2 rounded-xl shrink-0 shadow-sm flex items-center gap-1 active:scale-95 transition-transform"
      >
        <span>Reorder</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
