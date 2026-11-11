import React, { useState } from 'react';
import { Clock, RotateCcw, Utensils, Package, CheckCircle, ChefHat, QrCode as QrIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FulfillmentStatus, Order, api } from '@nyopasta/shared';
import { PayNowModal } from './PayNowModal';

interface OrderHistoryViewProps {
  onGoToMenu: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({ onGoToMenu }) => {
  const { orders, reorderOrder, storeSettings } = useCart();
  const [selectedPayNowOrder, setSelectedPayNowOrder] = useState<Order | null>(null);

  // Deduplicate orders by ID to prevent duplicate items from ever appearing
  const uniqueOrders = Array.from(
    new Map(orders.map((o) => [o.id, o])).values()
  );

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
      case 'cancelled':
        return (
          <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
            Cancelled 已取消
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

  if (uniqueOrders.length === 0) {
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
      {/* Orders List */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs text-navy uppercase tracking-wider">
          Order History ({uniqueOrders.length})
        </h3>

        {uniqueOrders.map((order, index) => {
          const isLatest = index === 0;
          return (
            <div
              key={order.id}
              className={`bg-white rounded-2xl p-4 shadow-xs space-y-2.5 ${
                isLatest
                  ? 'border-2 border-terracotta/40 bg-gradient-to-b from-white to-cream-light/30'
                  : 'border border-cream-dark'
              }`}
            >
              {/* Header: Order Number, Date, Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-navy block">{order.orderNumber}</span>
                    {isLatest && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full">
                        Latest
                      </span>
                    )}
                  </div>
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
                {order.fulfillmentStatus === 'received' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Cancel order ${order.orderNumber}? The kitchen will be alerted immediately.`)) {
                        await api.cancelOrder(order.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {order.paymentMethod === 'paynow' && order.paymentStatus === 'unpaid' && order.fulfillmentStatus !== 'cancelled' && (
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
        );
      })}
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
