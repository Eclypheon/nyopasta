import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, api } from '@nyopasta/shared';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  ShoppingBag,
  Utensils,
  Trash2,
  Ban,
} from 'lucide-react';
import { playOrderChime, unlockAudioContext } from '../utils/audio';
import { UnpaidWarningModal } from './UnpaidWarningModal';

interface OrdersTabProps {
  orders: Order[];
  onOrderUpdated?: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onOrderUpdated }) => {
  const [filter, setFilter] = useState<'active' | 'fulfilled' | 'archived'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [animatingOrderIds, setAnimatingOrderIds] = useState<Set<string>>(new Set());
  const [unpaidModalOrder, setUnpaidModalOrder] = useState<Order | null>(null);

  // Customer No-Show & Blacklist reporting modal state
  const [noShowOrder, setNoShowOrder] = useState<Order | null>(null);
  const [noShowRemark, setNoShowRemark] = useState<string>('');
  const [blacklistCheckbox, setBlacklistCheckbox] = useState<boolean>(true);
  const [isSubmittingNoShow, setIsSubmittingNoShow] = useState<boolean>(false);

  // Track previous order IDs to detect newly arrived orders
  const prevOrderIdsRef = useRef<Set<string>>(new Set(orders.map((o) => o.id)));
  const initialLoadRef = useRef<boolean>(true);

  // Sort orders oldest first
  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [orders]);

  const activeOrders = useMemo(() => {
    return sortedOrders.filter((o) => ['received', 'preparing', 'ready', 'cancelled'].includes(o.fulfillmentStatus));
  }, [sortedOrders]);

  const fulfilledOrders = useMemo(() => {
    return sortedOrders.filter((o) => o.fulfillmentStatus === 'fulfilled');
  }, [sortedOrders]);

  const archivedOrders = useMemo(() => {
    return sortedOrders.filter((o) => o.fulfillmentStatus === 'archived');
  }, [sortedOrders]);

  // Set oldest active order expanded by default
  useEffect(() => {
    if (activeOrders.length > 0) {
      // If no order currently expanded or expanded order is no longer active, default to oldest active
      if (!expandedId || !activeOrders.some((o) => o.id === expandedId)) {
        setExpandedId(activeOrders[0].id);
      }
    } else {
      setExpandedId(null);
    }
  }, [activeOrders]);

  // Detect newly arrived orders for audio chime and visual animation
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevOrderIdsRef.current = new Set(orders.map((o) => o.id));
      return;
    }

    const currentIds = new Set(orders.map((o) => o.id));
    const newIds: string[] = [];

    currentIds.forEach((id) => {
      if (!prevOrderIdsRef.current.has(id)) {
        newIds.push(id);
      }
    });

    if (newIds.length > 0) {
      if (soundEnabled) {
        playOrderChime();
      }

      setAnimatingOrderIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });

      // Clear animation after 6 seconds
      const timer = setTimeout(() => {
        setAnimatingOrderIds((prev) => {
          const next = new Set(prev);
          newIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 6000);

      // Expand the first new order if user is on active tab
      if (filter === 'active' && newIds[0]) {
        setExpandedId(newIds[0]);
      }

      prevOrderIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    prevOrderIdsRef.current = currentIds;
  }, [orders, soundEnabled, filter]);

  const handleToggleSound = () => {
    unlockAudioContext();
    setSoundEnabled((prev) => !prev);
  };

  const handleToggleExpand = (id: string) => {
    unlockAudioContext();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleFulfillClick = (order: Order) => {
    unlockAudioContext();
    if (order.paymentStatus === 'unpaid') {
      setUnpaidModalOrder(order);
    } else {
      markOrderFulfilled(order.id, false);
    }
  };

  const markOrderFulfilled = async (orderId: string, markPaid: boolean) => {
    try {
      const updates: Partial<Pick<Order, 'fulfillmentStatus' | 'paymentStatus'>> = {
        fulfillmentStatus: 'fulfilled',
      };
      if (markPaid) {
        updates.paymentStatus = 'paid';
      }
      await api.updateOrderStatus(orderId, updates);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error fulfilling order:', err);
    } finally {
      setUnpaidModalOrder(null);
    }
  };

  const handleArchiveClick = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, { fulfillmentStatus: 'archived' });
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error archiving order:', err);
    }
  };

  const handleOpenNoShow = (order: Order) => {
    setNoShowOrder(order);
    setNoShowRemark(
      `Cancelled $${order.total.toFixed(2)} order #${order.orderNumber} after ${order.fulfillmentStatus} and did not collect/pay`
    );
    setBlacklistCheckbox(Boolean(order.customerId));
  };

  const handleConfirmNoShow = async () => {
    if (!noShowOrder) return;
    setIsSubmittingNoShow(true);
    try {
      await api.markOrderUncollected(
        noShowOrder.id,
        noShowRemark,
        blacklistCheckbox && noShowOrder.customerId ? noShowOrder.customerId : null
      );
      setNoShowOrder(null);
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error reporting no-show:', err);
    } finally {
      setIsSubmittingNoShow(false);
    }
  };

  const handleStatusStep = async (orderId: string, nextStatus: 'preparing' | 'ready') => {
    try {
      await api.updateOrderStatus(orderId, { fulfillmentStatus: nextStatus });
      onOrderUpdated?.();
    } catch (err) {
      console.error('Error advancing status:', err);
    }
  };

  const handleClearOrders = async () => {
    if (orders.length === 0) return;
    const ok = window.confirm('Are you sure you want to clear all kitchen orders?');
    if (!ok) return;
    try {
      await api.clearOrders();
      onOrderUpdated?.();
    } catch (err) {
      console.error('Failed to clear orders:', err);
    }
  };

  const displayedOrders =
    filter === 'active'
      ? activeOrders
      : filter === 'fulfilled'
      ? fulfilledOrders
      : archivedOrders;

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  const formatClockTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-gray-200/80 p-1 rounded-xl">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Queue ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('fulfilled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'fulfilled'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fulfilled ({fulfilledOrders.length})
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'archived'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Archived ({archivedOrders.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sound alert chime toggle */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Order sound alert enabled' : 'Order sound muted'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Chime On
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                Chime Off
              </>
            )}
          </button>

          {/* Clear orders button */}
          {orders.length > 0 && (
            <button
              onClick={handleClearOrders}
              title="Clear all kitchen orders"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-300 transition-all flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
            <Utensils className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-800 text-base">
            {filter === 'active'
              ? 'No active kitchen orders'
              : filter === 'fulfilled'
              ? 'No fulfilled orders yet'
              : 'No archived orders'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {filter === 'active'
              ? 'New orders placed on the customer app will appear here in real time with an audio chime.'
              : 'Orders moved to this status will be listed here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order, index) => {
            const isOldestActive = filter === 'active' && index === 0;
            const isExpanded = expandedId === order.id;
            const isNew = animatingOrderIds.has(order.id);
            const isUnpaid = order.paymentStatus === 'unpaid';
            const isCancelled = order.fulfillmentStatus === 'cancelled';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl transition-all duration-200 border-2 overflow-hidden shadow-xs ${
                  isCancelled
                    ? 'border-red-500 bg-red-50/40 ring-4 ring-red-400/20'
                    : isNew
                    ? 'border-terracotta ring-4 ring-terracotta/20 bg-amber-50/40 animate-pulse'
                    : isOldestActive
                    ? 'border-terracotta shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Compact Card Header: Click to Expand / Collapse */}
                <div
                  onClick={() => handleToggleExpand(order.id)}
                  className="p-3.5 cursor-pointer flex items-center justify-between select-none"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Order Number Badge */}
                    <span
                      className={`font-black text-sm px-2.5 py-0.5 rounded-lg text-white ${
                        isOldestActive ? 'bg-terracotta' : 'bg-navy'
                      }`}
                    >
                      {order.orderNumber}
                    </span>

                    {/* Oldest Active Indicator */}
                    {isOldestActive && (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                        Oldest in Queue
                      </span>
                    )}

                    {/* New Order Arrival Indicator */}
                    {isNew && (
                      <span className="text-[11px] font-bold bg-terracotta text-white px-2 py-0.5 rounded-md animate-bounce">
                        NEW ORDER
                      </span>
                    )}

                    {/* Relative and Clock Time */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatRelativeTime(order.createdAt)}</span>
                      <span className="text-gray-300">•</span>
                      <span>{formatClockTime(order.createdAt)}</span>
                    </div>

                    {/* Customer Name */}
                    <span className="text-xs text-gray-700 font-semibold">
                      {order.customerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fulfillment Type Badge */}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        order.fulfillmentType === 'takeaway'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {order.fulfillmentType === 'takeaway' ? 'Takeaway' : 'Dine-in'}
                    </span>

                    {/* Payment Status Badge */}
                    {isUnpaid ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        UNPAID
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Paid
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        order.fulfillmentStatus === 'cancelled'
                          ? 'bg-red-600 text-white font-black animate-pulse'
                          : order.fulfillmentStatus === 'received'
                          ? 'bg-blue-50 text-blue-700'
                          : order.fulfillmentStatus === 'preparing'
                          ? 'bg-amber-50 text-amber-700'
                          : order.fulfillmentStatus === 'ready'
                          ? 'bg-teal-50 text-teal-700'
                          : order.fulfillmentStatus === 'fulfilled'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {order.fulfillmentStatus === 'cancelled' ? 'CANCELLED' : order.fulfillmentStatus}
                    </span>

                    {/* Expand/Collapse Chevron */}
                    <div className="text-gray-400 p-0.5">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Card Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                    {/* Customer contact info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-2 border-b border-gray-200/60">
                      <div>
                        <span>Contact: </span>
                        <span className="font-semibold text-gray-800">
                          {order.customerContact || 'Walk-in / None'}
                        </span>
                        {order.isGuest && <span className="ml-1.5 text-gray-400">(Guest checkout)</span>}
                      </div>
                      <div>
                        <span>Payment Method: </span>
                        <span className="font-semibold text-gray-800 uppercase">
                          {order.paymentMethod === 'counter'
                            ? 'Pay at Counter'
                            : order.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2.5 mb-4">
                      {order.items.map((item, itemIdx) => (
                        <div
                          key={item.id || itemIdx}
                          className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-gray-900 text-sm">
                                  {item.quantity}x
                                </span>
                                <span className="font-bold text-gray-900 text-sm">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({item.chineseName})
                                </span>
                                {item.isKidPortion && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                    Kid Portion
                                  </span>
                                )}
                              </div>

                              {/* Custom Add-ons */}
                              {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                <div className="mt-1 pl-4 space-y-0.5 text-xs text-gray-600">
                                  {item.selectedAddOns.map((addon) => (
                                    <div key={addon.id} className="flex items-center gap-1">
                                      <span className="text-terracotta font-medium">+</span>
                                      <span>
                                        {addon.quantity > 1 ? `${addon.quantity}x ` : ''}
                                        {addon.name} ({addon.chineseName})
                                      </span>
                                      <span className="text-gray-400 font-medium">
                                        (${addon.price.toFixed(2)})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Special Instructions */}
                              {item.specialInstructions && (
                                <div className="mt-1.5 pl-4 text-xs italic text-amber-800 bg-amber-50/70 p-1 rounded border-l-2 border-amber-400">
                                  Note: {item.specialInstructions}
                                </div>
                              )}
                            </div>

                            <span className="font-bold text-gray-900 text-sm shrink-0">
                              ${item.itemTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary & Breakdown */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200/80 mb-4 text-xs space-y-1">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.takeawayFee > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Takeaway packaging fee</span>
                          <span>+${order.takeawayFee.toFixed(2)}</span>
                        </div>
                      )}
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount {order.discountDescription ? `(${order.discountDescription})` : ''}</span>
                          <span>-${order.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t font-black text-gray-900 text-base">
                        <span>Total Payable</span>
                        <span className="text-lg text-terracotta">${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                      {/* Kitchen workflow progression buttons */}
                      <div className="flex items-center gap-1.5">
                        {order.fulfillmentStatus === 'cancelled' ? (
                          <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>Customer cancelled before cooking started.</span>
                          </div>
                        ) : (
                          <>
                            {order.fulfillmentStatus === 'received' && (
                              <button
                                type="button"
                                onClick={() => handleStatusStep(order.id, 'preparing')}
                                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors"
                              >
                                Mark Preparing
                              </button>
                            )}
                            {order.fulfillmentStatus === 'preparing' && (
                              <button
                                type="button"
                                onClick={() => handleStatusStep(order.id, 'ready')}
                                className="px-3 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-bold rounded-lg transition-colors"
                              >
                                Mark Ready
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Primary fulfillment actions */}
                      <div className="flex items-center gap-2 ml-auto">
                        {order.fulfillmentStatus === 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleArchiveClick(order.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Acknowledge & Archive (确认并归档)</span>
                          </button>
                        )}

                        {isUnpaid && order.fulfillmentStatus !== 'cancelled' && order.fulfillmentStatus !== 'fulfilled' && order.fulfillmentStatus !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => handleOpenNoShow(order)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                            title="Report order as abandoned/uncollected"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>No-Show (弃单拉黑)</span>
                          </button>
                        )}

                        {order.fulfillmentStatus !== 'fulfilled' && order.fulfillmentStatus !== 'archived' && order.fulfillmentStatus !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleFulfillClick(order)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                          >
                            {isUnpaid && <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />}
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isUnpaid ? 'Collect Payment & Fulfill' : 'Mark Fulfilled'}
                          </button>
                        )}

                        {order.fulfillmentStatus === 'fulfilled' && (
                          <button
                            type="button"
                            onClick={() => handleArchiveClick(order.id)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Safeguard Warning Modal for Unpaid Orders */}
      {unpaidModalOrder && (
        <UnpaidWarningModal
          isOpen={Boolean(unpaidModalOrder)}
          orderNumber={unpaidModalOrder.orderNumber}
          totalAmount={unpaidModalOrder.total}
          onConfirm={() => markOrderFulfilled(unpaidModalOrder.id, true)}
          onCancel={() => setUnpaidModalOrder(null)}
        />
      )}

      {/* Customer No-Show & Blacklist Modal */}
      {noShowOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Report No-Show & Abandoned Order</h3>
                <p className="text-xs text-gray-500">Record uncollected meal and handle payment default</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>Order #{noShowOrder.orderNumber}</span>
                <span>${noShowOrder.total.toFixed(2)} UNPAID</span>
              </div>
              <p className="text-[11px] text-rose-800">
                Customer: <span className="font-bold">{noShowOrder.customerName}</span> ({noShowOrder.customerContact || 'No contact'})
              </p>
              <p className="text-[11px] text-rose-700">
                Status: Marked as {noShowOrder.fulfillmentStatus}. Marking as No-Show will cancel the ticket and move it off the kitchen line.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Audit / Blacklist Remark (原因备注):
              </label>
              <textarea
                rows={3}
                value={noShowRemark}
                onChange={(e) => setNoShowRemark(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {noShowOrder.customerId && (
              <label className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blacklistCheckbox}
                  onChange={(e) => setBlacklistCheckbox(e.target.checked)}
                  className="mt-0.5 accent-rose-600 rounded"
                />
                <span className="text-xs text-gray-800">
                  <strong className="block text-rose-700 font-bold">Blacklist Member Account (拉黑会员账号)</strong>
                  Blocks this account from submitting future orders online until resolved with counter staff.
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingNoShow}
                onClick={() => setNoShowOrder(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingNoShow}
                onClick={handleConfirmNoShow}
                className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isSubmittingNoShow ? 'Processing...' : 'Confirm No-Show & Archive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
