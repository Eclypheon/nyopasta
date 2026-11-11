import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  Package,
  Award,
  CreditCard,
  QrCode,
  DollarSign,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PaymentMethod, Order, formatPayNowPhone } from '@nyopasta/shared';
import { PayNowModal } from './PayNowModal';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const {
    items,
    fulfillmentType,
    setFulfillmentType,
    customerName,
    customerContact,
    isGuest,
    setCustomerInfo,
    appliedMilestoneReward,
    setAppliedMilestoneReward,
    appliedVoucher,
    setAppliedVoucher,
    profile,
    updateItemQuantity,
    removeItem,
    clearCart,
    subtotal,
    takeawayFee,
    discountAmount,
    total,
    totalItemCount,
    lastOrder,
    reorderOrder,
    placeOrder,
    liveMenuItems,
    isStoreOpen,
    storeClosedReason,
    storeSettings,
    setIsAuthModalOpen,
  } = useCart();

  const isPayNowAllowed = storeSettings.enablePayNow === true || (typeof storeSettings.enablePayNow !== 'boolean' && storeSettings.enablePayNow !== false);
  const isStripeAllowed = Boolean(storeSettings.enableStripe);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (storeSettings.enablePayNow === true || (typeof storeSettings.enablePayNow !== 'boolean' && storeSettings.enablePayNow !== false)) return 'paynow';
    return 'counter';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingPayNowOrder, setPendingPayNowOrder] = useState<Order | null>(null);

  // Auto-switch payment method if currently selected option becomes disabled in settings
  React.useEffect(() => {
    if (paymentMethod === 'paynow' && !isPayNowAllowed) {
      setPaymentMethod('counter');
    } else if (paymentMethod === 'stripe' && !isStripeAllowed) {
      setPaymentMethod(isPayNowAllowed ? 'paynow' : 'counter');
    }
  }, [isPayNowAllowed, isStripeAllowed, paymentMethod]);

  if (!isOpen && !pendingPayNowOrder) return null;

  const hasSoldOutItems = items.some(
    (item) => liveMenuItems.find((m) => m.id === item.menuItemId)?.isSoldOut
  );

  // Available rewards to claim from voucher wallet OR milestone progress
  const canClaim4 = !isGuest && ((profile.voucherSide350Count || 0) > 0 || (profile.currentStampCount >= 4 && !profile.milestoneRedemptions.stamp4));
  const canClaim8 = !isGuest && ((profile.voucherSide450Count || 0) > 0 || (profile.currentStampCount >= 8 && !profile.milestoneRedemptions.stamp8));
  const canClaim12 = !isGuest && ((profile.voucherMeal850Count || 0) > 0 || (profile.currentStampCount >= 12 && !profile.milestoneRedemptions.stamp12));
  const hasAvailableReward = canClaim4 || canClaim8 || canClaim12;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!isStoreOpen) {
      setErrorMsg(storeClosedReason || 'The shop is currently closed. Ordering is temporarily paused.');
      return;
    }
    if (hasSoldOutItems) {
      setErrorMsg('Some items in your cart are sold out. Please remove them to proceed.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const order = await placeOrder(paymentMethod);
      if (paymentMethod === 'paynow') {
        setPendingPayNowOrder(order);
      } else {
        onOrderSuccess(order);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="bg-cream-light w-full max-w-md h-full flex flex-col shadow-2xl border-l border-cream-dark overflow-hidden animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-cream-dark flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-navy">Your Order Cart</h2>
            <span className="text-xs bg-terracotta/10 text-terracotta font-extrabold px-2 py-0.5 rounded-full">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-bold text-navy/50 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-navy/50 hover:text-navy hover:bg-cream transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-navy">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-cream mx-auto flex items-center justify-center text-navy/30">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <div>
                <p className="font-extrabold text-navy text-sm">Your cart is empty</p>
                <p className="text-navy/60 text-xs mt-1">Browse our mains, soups and artisanal sides!</p>
              </div>

              {lastOrder && (
                <div className="pt-4 border-t border-cream-dark max-w-xs mx-auto">
                  <p className="text-xs font-bold text-terracotta mb-2">Want to repeat your last feast?</p>
                  <button
                    onClick={() => reorderOrder(lastOrder)}
                    className="w-full bg-white border border-terracotta/40 hover:border-terracotta p-3 rounded-xl flex items-center justify-between text-left shadow-xs hover:shadow-sm"
                  >
                    <div>
                      <span className="font-extrabold text-navy block text-xs">{lastOrder.orderNumber}</span>
                      <span className="text-[11px] text-navy/60 block">
                        {lastOrder.items.length} items • ${lastOrder.total.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-terracotta flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      1-Tap Reorder
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Fulfillment Type Toggle */}
              <div>
                <label className="font-extrabold text-xs text-navy block mb-2 uppercase tracking-wide">
                  Dining Option 就餐方式
                </label>
                <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-2xl border border-cream-dark">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('dine_in')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      fulfillmentType === 'dine_in'
                        ? 'bg-terracotta text-white shadow-xs'
                        : 'text-navy/70 hover:text-navy hover:bg-cream-light'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Dine-in 堂食</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('takeaway')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      fulfillmentType === 'takeaway'
                        ? 'bg-terracotta text-white shadow-xs'
                        : 'text-navy/70 hover:text-navy hover:bg-cream-light'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Takeaway 外卖</span>
                  </button>
                </div>
                {fulfillmentType === 'takeaway' && (
                  <p className="text-[11px] text-navy/60 mt-1.5 flex items-center gap-1">
                    <span>🥡 Eco takeaway box: +$0.30 per item included.</span>
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="font-extrabold text-xs text-navy uppercase tracking-wide block">
                  Items ({items.length})
                </label>
                {items.map((item) => {
                  const isItemSoldOut = liveMenuItems.find((m) => m.id === item.menuItemId)?.isSoldOut;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border shadow-2xs space-y-2 transition-colors ${
                        isItemSoldOut
                          ? 'bg-red-50/50 border-red-300 ring-1 ring-red-400/30'
                          : 'bg-white border-cream-dark'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-navy text-xs leading-snug">{item.name}</h4>
                            {isItemSoldOut && (
                              <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                Sold Out
                              </span>
                            )}
                            {item.isKidPortion && (
                              <span className="text-[10px] bg-terracotta-50 text-terracotta font-bold px-1.5 py-0.5 rounded">
                                Kid Portion
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#B03620] font-medium">{item.chineseName}</p>

                        {/* Selected Add-ons */}
                        {item.selectedAddOns.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.selectedAddOns.map((addon) => (
                              <p key={addon.id} className="text-[11px] text-navy/60 font-medium">
                                + {addon.name} ({addon.chineseName}) x{addon.quantity} (${(addon.price * addon.quantity).toFixed(2)})
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Special Instructions */}
                        {item.specialInstructions && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 mt-1 italic inline-block">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>

                      <span className="font-black text-navy text-xs shrink-0">
                        ${item.itemTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-cream-dark/50">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-navy/40 hover:text-red-500 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1 bg-cream-light border border-cream-dark rounded-lg p-0.5">
                        <button
                          onClick={() => updateItemQuantity(item.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-cream text-navy"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-cream text-navy"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Loyalty Milestone Reward Selector (if applicable) */}
              {!isGuest && (
                <div className="bg-white p-3 rounded-2xl border border-cream-dark space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-navy flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-terracotta" />
                      Virtual Loyalty Stamp Reward
                    </span>
                    <span className="text-[11px] font-bold text-terracotta">
                      {profile.currentStampCount} / 12 Stamps
                    </span>
                  </div>

                  {hasAvailableReward ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-navy/70">
                        You have earned vouchers! Select one to redeem on this order:
                      </p>

                      <div className="space-y-1">
                        {canClaim4 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = appliedVoucher === 'side350' || appliedMilestoneReward === 4 ? null : 'side350';
                              setAppliedVoucher(next);
                              setAppliedMilestoneReward(next ? 4 : null);
                            }}
                            className={`w-full p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                              appliedVoucher === 'side350' || appliedMilestoneReward === 4
                                ? 'border-terracotta bg-terracotta-50 font-bold text-terracotta'
                                : 'border-cream-dark hover:bg-cream-light text-navy'
                            }`}
                          >
                            <div>
                              <span className="block font-bold">Free Side Voucher</span>
                              <span className="block text-[10px] text-navy/50">
                                Max $3.50 ({profile.voucherSide350Count || 1} in wallet)
                              </span>
                            </div>
                            <span className="font-extrabold text-sm">-$3.50</span>
                          </button>
                        )}

                        {canClaim8 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = appliedVoucher === 'side450' || appliedMilestoneReward === 8 ? null : 'side450';
                              setAppliedVoucher(next);
                              setAppliedMilestoneReward(next ? 8 : null);
                            }}
                            className={`w-full p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                              appliedVoucher === 'side450' || appliedMilestoneReward === 8
                                ? 'border-terracotta bg-terracotta-50 font-bold text-terracotta'
                                : 'border-cream-dark hover:bg-cream-light text-navy'
                            }`}
                          >
                            <div>
                              <span className="block font-bold">Free Side Voucher</span>
                              <span className="block text-[10px] text-navy/50">
                                Max $4.50 ({profile.voucherSide450Count || 1} in wallet)
                              </span>
                            </div>
                            <span className="font-extrabold text-sm">-$4.50</span>
                          </button>
                        )}

                        {canClaim12 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = appliedVoucher === 'meal850' || appliedMilestoneReward === 12 ? null : 'meal850';
                              setAppliedVoucher(next);
                              setAppliedMilestoneReward(next ? 12 : null);
                            }}
                            className={`w-full p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                              appliedVoucher === 'meal850' || appliedMilestoneReward === 12
                                ? 'border-terracotta bg-terracotta-50 font-bold text-terracotta'
                                : 'border-cream-dark hover:bg-cream-light text-navy'
                            }`}
                          >
                            <div>
                              <span className="block font-bold">Free Main Voucher</span>
                              <span className="block text-[10px] text-navy/50">
                                Max $8.50 ({profile.voucherMeal850Count || 1} in wallet)
                              </span>
                            </div>
                            <span className="font-extrabold text-sm">-$8.50</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-navy/60">
                      Earn 1 stamp per main purchased. Reach 4 stamps for a free $3.50 side!
                    </p>
                  )}
                </div>
              )}

              {/* Customer Details */}
              <div className="bg-white p-3 rounded-2xl border border-cream-dark space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-xs text-navy uppercase tracking-wide">
                    Customer Details 顾客信息
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (isGuest) {
                        setIsAuthModalOpen(true);
                      } else {
                        setCustomerInfo(customerName, customerContact, true);
                      }
                    }}
                    className="text-[11px] font-bold text-terracotta hover:underline"
                  >
                    {isGuest ? 'Sign up / Sign in as Member' : 'Ordering as Guest'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-navy/60 font-semibold uppercase block">Name 姓名</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerInfo(e.target.value, customerContact, isGuest)}
                      placeholder="Alex Tan"
                      className="w-full p-2 rounded-lg border border-cream-dark bg-cream-light text-xs font-semibold focus:outline-hidden focus:border-terracotta"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-navy/60 font-semibold uppercase block">Mobile 电话</label>
                    <input
                      type="tel"
                      value={customerContact}
                      onChange={(e) => setCustomerInfo(customerName, e.target.value, isGuest)}
                      placeholder="91234567"
                      className="w-full p-2 rounded-lg border border-cream-dark bg-cream-light text-xs font-semibold focus:outline-hidden focus:border-terracotta"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white p-3 rounded-2xl border border-cream-dark space-y-2">
                <label className="font-extrabold text-xs text-navy uppercase tracking-wide block">
                  Payment Method 支付方式
                </label>
                <div className={`grid gap-1.5 ${
                  (isPayNowAllowed && isStripeAllowed)
                    ? 'grid-cols-3'
                    : (isPayNowAllowed || isStripeAllowed)
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}>
                  {isPayNowAllowed && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paynow')}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === 'paynow'
                          ? 'border-terracotta bg-terracotta-50 text-terracotta font-extrabold'
                          : 'border-cream-dark hover:bg-cream-light text-navy font-semibold'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span className="text-[11px]">PayNow</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('counter')}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'counter'
                        ? 'border-terracotta bg-terracotta-50 text-terracotta font-extrabold'
                        : 'border-cream-dark hover:bg-cream-light text-navy font-semibold'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[11px]">At Counter</span>
                  </button>

                  {isStripeAllowed && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('stripe')}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === 'stripe'
                          ? 'border-terracotta bg-terracotta-50 text-terracotta font-extrabold'
                          : 'border-cream-dark hover:bg-cream-light text-navy font-semibold'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[11px]">Card</span>
                    </button>
                  )}
                </div>

                {paymentMethod === 'paynow' && (
                  <div className="bg-[#7A1A74]/10 p-2.5 rounded-xl border border-[#7A1A74]/20 text-[11px] space-y-0.5">
                    <p className="font-bold text-[#7A1A74]">
                      PayNow to: {storeSettings.payNowMobile ? formatPayNowPhone(storeSettings.payNowMobile) : '92258003'} ({storeSettings.payNowRecipientName || 'NYO PASTA'})
                    </p>
                    <p className="text-navy/70">Dynamic QR code with exact amount and order reference generated on checkout.</p>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-white p-3 rounded-2xl border border-cream-dark space-y-1.5">
                <div className="flex justify-between text-navy/70">
                  <span>Subtotal 小计</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {fulfillmentType === 'takeaway' && (
                  <div className="flex justify-between text-navy/70">
                    <span>Takeaway Packaging Fee (${(storeSettings.takeawayFeePerItem ?? 0.3).toFixed(2)} x {totalItemCount})</span>
                    <span>+${takeawayFee.toFixed(2)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Loyalty Reward Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-cream-dark flex justify-between items-baseline">
                  <span className="font-extrabold text-sm text-navy">Total Payable 应付总额</span>
                  <span className="font-black text-lg text-terracotta">${total.toFixed(2)}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Checkout Button */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-cream-dark">
            {!isStoreOpen ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center font-bold">
                  {storeClosedReason || 'The shop is currently closed. Ordering is temporarily paused.'}
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full bg-gray-300 text-gray-500 font-black text-sm py-3.5 px-4 rounded-2xl cursor-not-allowed"
                >
                  Shop Closed · Ordering Paused
                </button>
              </div>
            ) : hasSoldOutItems ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center font-bold">
                  Some items in your cart are currently sold out. Please remove them to proceed.
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full bg-gray-300 text-gray-500 font-black text-sm py-3.5 px-4 rounded-2xl cursor-not-allowed"
                >
                  Remove Sold-Out Items to Order
                </button>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full bg-terracotta hover:bg-terracotta-600 active:scale-[0.98] text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-md shadow-terracotta/25 flex items-center justify-between transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Placing Order...' : 'Confirm & Place Order'}</span>
                <span>${total.toFixed(2)}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {pendingPayNowOrder && (
        <PayNowModal
          isOpen={Boolean(pendingPayNowOrder)}
          order={pendingPayNowOrder}
          storeSettings={storeSettings}
          onClose={() => {
            const completed = pendingPayNowOrder;
            setPendingPayNowOrder(null);
            onOrderSuccess(completed);
          }}
          onConfirmPaid={() => {
            const completed = pendingPayNowOrder;
            setPendingPayNowOrder(null);
            onOrderSuccess(completed);
          }}
        />
      )}
    </div>
  );
};
