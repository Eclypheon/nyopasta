import React, { useState } from 'react';
import { Clock, RotateCcw, Utensils, Package, CheckCircle, ChefHat, QrCode as QrIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FulfillmentStatus, Order } from '@nyopasta/shared';
import { PayNowModal } from './PayNowModal';

interface OrderHistoryViewProps {
  onGoToMenu: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({ onGoToMenu }) => {
  const { orders, lastOrder, reorderOrder, storeSettings } = useCart();
  const [selectedPayNowOrder, setSelectedPayNowOrder] = useState<Order | null>(null);

  const getStatusBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'received':
        return (
          <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Order Received
          </span>
        );
      case 'preparing':
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
            <ChefHat className="w-2.5 h-2.5" /> Preparing in Kitchen
          </span>
        );
      case 'ready':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            <CheckCircle className="w-2.5 h-2.5" /> Ready for Collection!
          </span>
        );
      case 'fulfilled':
      case 'archived':
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            Completed
          </span>
        );
    }
  };

  if (orders.length === 0 && !lastOrder) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-cream mx-auto flex items-center justify-center text-navy/30">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-navy">No past orders yet</h3>
          <p className="text-xs text-navy/60 mt-1 max-w-xs mx-auto">
            Your completed orders and fast 1-tap reordering will appear here after you place your first order.
          </p>
        </div>
        <button
          onClick={onGoToMenu}
          className="bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all"
        >
          Explore Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1-Tap Reorder Feature Card for Last Order */}
      {lastOrder && (
        <div className="bg-gradient-to-r from-terracotta-50 to-cream-light border-2 border-terracotta/40 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-black tracking-wider text-terracotta flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Quick Reorder
            </span>
            <span className="text-[11px] font-mono font-bold text-navy/60">{lastOrder.orderNumber}</span>
          </div>

          <h4 className="font-extrabold text-sm text-navy mb-1">Repeat Your Previous Order</h4>
          <p className="text-xs text-navy/70 line-clamp-2">
            {lastOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
          </p>

          <div className="mt-3 pt-2 border-t border-terracotta/20 flex items-center justify-between">
            <span className="font-black text-sm text-navy">${lastOrder.total.toFixed(2)}</span>
            <button
              onClick={() => reorderOrder(lastOrder)}
              className="bg-terracotta hover:bg-terracotta-600 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>1-Tap Reorder</span>
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs text-navy uppercase tracking-wider">
          Order History ({orders.length})
        </h3>

        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-4 border border-cream-dark shadow-xs space-y-2.5"
          >
            {/* Header: Order Number, Date, Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono font-black text-sm text-navy block">{order.orderNumber}</span>
                <span className="text-[10px] text-navy/50 block">
                  {new Date(order.createdAt).toLocaleString('en-SG', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>{getStatusBadge(order.fulfillmentStatus)}</div>
            </div>

            {/* Order Items Summary */}
            <div className="space-y-1 py-1 border-t border-b border-cream-dark/60 text-xs text-navy/80">
              {order.items.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {i.quantity}x {i.name}
                    {i.isKidPortion && ' (Kid)'}
                  </span>
                  <span className="font-semibold">${i.itemTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Footer: Fulfillment, Total, Reorder Action */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-navy/70">
                <span className="flex items-center gap-1 font-semibold">
                  {order.fulfillmentType === 'takeaway' ? (
                    <>
                      <Package className="w-3.5 h-3.5 text-terracotta" /> Takeaway
                    </>
                  ) : (
                    <>
                      <Utensils className="w-3.5 h-3.5 text-terracotta" /> Dine-in
                    </>
                  )}
                </span>
                <span>•</span>
                <span className="font-black text-navy text-sm">${order.total.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                {order.paymentMethod === 'paynow' && order.paymentStatus === 'unpaid' && (
                  <button
                    type="button"
                    onClick={() => setSelectedPayNowOrder(order)}
                    className="bg-[#7A1A74]/10 hover:bg-[#7A1A74]/20 text-[#7A1A74] font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-[#7A1A74]/30 flex items-center gap-1 transition-colors"
                  >
                    <QrIcon className="w-3 h-3" />
                    <span>PayNow QR</span>
                  </button>
                )}

                <button
                  onClick={() => reorderOrder(order)}
                  className="bg-cream hover:bg-cream-dark text-navy font-extrabold text-xs px-3 py-1.5 rounded-xl border border-cream-dark flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-terracotta" />
                  <span>Reorder</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPayNowOrder && (
        <PayNowModal
          isOpen={Boolean(selectedPayNowOrder)}
          order={selectedPayNowOrder}
          storeSettings={storeSettings}
          onClose={() => setSelectedPayNowOrder(null)}
          onConfirmPaid={() => setSelectedPayNowOrder(null)}
        />
      )}
    </div>
  );
};
