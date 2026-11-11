import React from 'react';
import { CheckCircle2, Award, Utensils, Package, QrCode as QrIcon } from 'lucide-react';
import { Order, api } from '@nyopasta/shared';

interface OrderSuccessModalProps {
  order: Order;
  onClose: () => void;
  onGoToLoyalty: () => void;
  onReopenPayNow?: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onGoToLoyalty,
  onReopenPayNow,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-cream-dark text-center relative overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="font-black text-xl text-navy">Order Placed!</h3>
        <p className="text-xs text-navy/60 mt-0.5">
          Your order has been transmitted directly to the kitchen queue.
        </p>

        {/* Order Details Card */}
        <div className="my-4 bg-cream-light p-4 rounded-2xl border border-cream-dark text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-navy/50">Order Number</span>
            <span className="font-mono font-black text-base text-terracotta">{order.orderNumber}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-navy/60 font-medium">Fulfillment</span>
            <span className="font-extrabold text-navy flex items-center gap-1">
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
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-navy/60 font-medium">Estimated Pickup</span>
            <span className="font-extrabold text-navy">~10 - 15 mins</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-cream-dark/60">
            <span className="text-navy/60 font-medium">
              {order.paymentMethod === 'counter' ? 'Pay at Counter' : 'Total Paid'}
            </span>
            <span className="font-black text-sm text-navy">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Loyalty Stamps Earned Callout */}
        {order.stampsEarned > 0 ? (
          <div className="bg-pasta-gold/15 border border-pasta-gold/40 rounded-2xl p-3 mb-4 text-left flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-pasta-gold/30 flex items-center justify-center shrink-0 text-amber-900">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-amber-900 leading-tight">
                +{order.stampsEarned} Loyalty {order.stampsEarned === 1 ? 'Stamp' : 'Stamps'} Earned!
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Added to your virtual loyalty card for purchasing {order.mainsCount} main dishes.
              </p>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="space-y-2">
          {order.paymentMethod === 'paynow' && order.paymentStatus === 'unpaid' && onReopenPayNow && (
            <button
              onClick={onReopenPayNow}
              className="w-full bg-[#7A1A74] hover:bg-[#63145e] active:scale-98 text-white font-extrabold text-xs py-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <QrIcon className="w-4 h-4" />
              <span>View PayNow QR Code Again</span>
            </button>
          )}

          {order.stampsEarned > 0 && (
            <button
              onClick={() => {
                onClose();
                onGoToLoyalty();
              }}
              className="w-full bg-terracotta hover:bg-terracotta-600 active:scale-98 text-white font-extrabold text-xs py-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Award className="w-4 h-4" />
              <span>View Virtual Loyalty Card</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-navy hover:bg-navy-900 active:scale-98 text-white font-bold text-xs py-3 rounded-xl transition-all"
          >
            Back to Menu
          </button>

          {order.fulfillmentStatus === 'received' && (
            <button
              onClick={async () => {
                if (window.confirm(`Cancel order ${order.orderNumber}? The kitchen will be alerted immediately.`)) {
                  await api.cancelOrder(order.id);
                  onClose();
                }
              }}
              className="w-full text-red-500 hover:text-red-700 text-xs font-bold py-1 transition-colors"
            >
              Cancel Order (取消订单)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
