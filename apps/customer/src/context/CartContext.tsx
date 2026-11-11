import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CartItem,
  Order,
  UserProfile,
  FulfillmentType,
  PaymentMethod,
  StoreSettings,
  DEFAULT_STORE_SETTINGS,
  LOYALTY_MILESTONES,
  api,
} from '@nyopasta/shared';

const DEFAULT_USER_ID = 'user_alex_7729';

interface CartContextValue {
  items: CartItem[];
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerContact: string;
  isGuest: boolean;
  appliedMilestoneReward: 4 | 8 | 12 | null;
  profile: UserProfile;
  orders: Order[];
  lastOrder: Order | null;
  isCartOpen: boolean;
  storeSettings: StoreSettings;
  subtotal: number;
  takeawayFee: number;
  discountAmount: number;
  total: number;
  totalItemCount: number;
  setIsCartOpen: (open: boolean) => void;
  addItem: (item: CartItem) => void;
  updateItemQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setFulfillmentType: (type: FulfillmentType) => void;
  setAppliedMilestoneReward: (reward: 4 | 8 | 12 | null) => void;
  setCustomerInfo: (name: string, contact: string, isGuest: boolean) => void;
  reorderOrder: (order: Order) => void;
  refreshProfile: () => Promise<void>;
  updateStampsDelta: (delta: number, description: string) => Promise<void>;
  redeemMilestoneDirect: (milestone: 4 | 8 | 12) => Promise<void>;
  resetLoyaltyCard: () => Promise<void>;
  placeOrder: (paymentMethod: PaymentMethod) => Promise<Order>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('nyo_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('dine_in');
  const [appliedMilestoneReward, setAppliedMilestoneReward] = useState<4 | 8 | 12 | null>(null);
  const [customerName, setCustomerName] = useState('Alex Tan');
  const [customerContact, setCustomerContact] = useState('91234567');
  const [isGuest, setIsGuest] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('nyo_customer_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: `prof_${DEFAULT_USER_ID}`,
      authUserId: DEFAULT_USER_ID,
      name: 'Alex Tan',
      phone: '91234567',
      role: 'customer',
      currentStampCount: 5,
      completedCardsCount: 0,
      milestoneRedemptions: { stamp4: false, stamp8: false, stamp12: false },
      stampHistory: [
        {
          id: 'evt_init_1',
          type: 'order',
          stamps: 3,
          balanceAfter: 3,
          description: 'Purchased 3 mains (Order NYO-001)',
          timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: 'evt_init_2',
          type: 'order',
          stamps: 2,
          balanceAfter: 5,
          description: 'Purchased 2 mains (Order NYO-005)',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      totalOrdersCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('nyo_device_orders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [lastOrder, setLastOrder] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem('nyo_last_order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Save cart changes
  useEffect(() => {
    localStorage.setItem('nyo_cart_items', JSON.stringify(items));
  }, [items]);

  // Save profile changes
  useEffect(() => {
    localStorage.setItem('nyo_customer_profile', JSON.stringify(profile));
  }, [profile]);

  // Save orders list
  useEffect(() => {
    localStorage.setItem('nyo_device_orders', JSON.stringify(orders));
  }, [orders]);

  // Save last order
  useEffect(() => {
    if (lastOrder) {
      localStorage.setItem('nyo_last_order', JSON.stringify(lastOrder));
    }
  }, [lastOrder]);

  // Subscribe to store settings
  useEffect(() => {
    const unsub = api.subscribeToStoreSettings((settings) => {
      setStoreSettings(settings);
    });
    return () => unsub();
  }, []);

  // Fetch / Sync initial profile from api
  useEffect(() => {
    let isMounted = true;
    api.getUserProfile(DEFAULT_USER_ID).then((serverProfile) => {
      if (!isMounted) return;
      // If server profile has higher stamps or has data, sync it
      if (serverProfile) {
        setProfile((prev) => {
          // If local has initial demo state with 5 stamps and server is empty 0 stamps, keep local or merge
          if (serverProfile.currentStampCount === 0 && prev.currentStampCount > 0) {
            return prev;
          }
          return { ...prev, ...serverProfile };
        });
      }
    }).catch(console.warn);

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const p = await api.getUserProfile(DEFAULT_USER_ID);
      if (p) setProfile(p);
    } catch (err) {
      console.warn('refreshProfile error:', err);
    }
  };

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      // Find if an identical item exists (same menuItemId, isKidPortion, same add-ons, same special instructions)
      const existingIdx = prev.findIndex((i) => {
        if (i.menuItemId !== newItem.menuItemId) return false;
        if (i.isKidPortion !== newItem.isKidPortion) return false;
        if ((i.specialInstructions || '') !== (newItem.specialInstructions || '')) return false;
        const addOnsA = JSON.stringify(i.selectedAddOns.sort((a, b) => a.id.localeCompare(b.id)));
        const addOnsB = JSON.stringify(newItem.selectedAddOns.sort((a, b) => a.id.localeCompare(b.id)));
        return addOnsA === addOnsB;
      });

      if (existingIdx > -1) {
        const copy = [...prev];
        const current = copy[existingIdx];
        const newQty = current.quantity + newItem.quantity;
        const unitAddons = current.selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
        copy[existingIdx] = {
          ...current,
          quantity: newQty,
          itemTotal: (current.unitPrice + unitAddons) * newQty,
        };
        return copy;
      }

      return [...prev, newItem];
    });
  };

  const updateItemQuantity = (id: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const unitAddons = item.selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
            return {
              ...item,
              quantity: newQty,
              itemTotal: (item.unitPrice + unitAddons) * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedMilestoneReward(null);
  };

  const setCustomerInfo = (name: string, contact: string, guest: boolean) => {
    setCustomerName(name);
    setCustomerContact(contact);
    setIsGuest(guest);
  };

  const reorderOrder = (orderToReorder: Order) => {
    if (!orderToReorder.items || orderToReorder.items.length === 0) return;
    setItems(orderToReorder.items);
    setFulfillmentType(orderToReorder.fulfillmentType);
    setAppliedMilestoneReward(null);
    setIsCartOpen(true);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const takeawayFeePerItem = storeSettings.takeawayFeePerItem ?? 0.3;
  const takeawayFee = fulfillmentType === 'takeaway' ? totalItemCount * takeawayFeePerItem : 0;

  let discountAmount = 0;
  if (appliedMilestoneReward === 4) {
    discountAmount = Math.min(LOYALTY_MILESTONES.stamp4.maxRewardValue, subtotal);
  } else if (appliedMilestoneReward === 8) {
    discountAmount = Math.min(LOYALTY_MILESTONES.stamp8.maxRewardValue, subtotal);
  } else if (appliedMilestoneReward === 12) {
    discountAmount = Math.min(LOYALTY_MILESTONES.stamp12.maxRewardValue, subtotal);
  }

  const total = Math.max(0, subtotal + takeawayFee - discountAmount);

  // Manual stamp modification (for testing/demo)
  const updateStampsDelta = async (delta: number, description: string) => {
    const newCount = Math.max(0, profile.currentStampCount + delta);
    const updated = await api.updateUserStamps(
      DEFAULT_USER_ID,
      newCount,
      {
        type: 'manual_migration',
        stamps: delta,
        description,
      }
    );
    setProfile(updated);
  };

  // Direct milestone redemption
  const redeemMilestoneDirect = async (milestone: 4 | 8 | 12) => {
    const key = `stamp${milestone}` as keyof typeof profile.milestoneRedemptions;
    const milestoneUpdates = { [key]: true };
    const label = LOYALTY_MILESTONES[key].label;
    const updated = await api.updateUserStamps(
      DEFAULT_USER_ID,
      profile.currentStampCount,
      {
        type: 'redemption',
        stamps: 0,
        description: `Redeemed ${label}`,
      },
      milestoneUpdates
    );
    setProfile(updated);
  };

  // Reset loyalty card
  const resetLoyaltyCard = async () => {
    const resetProfile: UserProfile = {
      ...profile,
      currentStampCount: 0,
      completedCardsCount: 0,
      milestoneRedemptions: { stamp4: false, stamp8: false, stamp12: false },
      stampHistory: [
        {
          id: `evt_${Date.now()}`,
          type: 'manual_migration',
          stamps: 0,
          balanceAfter: 0,
          description: 'Loyalty card reset',
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setProfile(resetProfile);
    localStorage.setItem('nyo_customer_profile', JSON.stringify(resetProfile));
  };

  // Place order
  const placeOrder = async (paymentMethod: PaymentMethod): Promise<Order> => {
    if (items.length === 0) throw new Error('Cart is empty');

    const mainsCount = items
      .filter((i) => i.category === 'mains')
      .reduce((sum, i) => sum + i.quantity, 0);

    const stampsEarned = isGuest ? 0 : mainsCount;

    let discountDescription = '';
    if (appliedMilestoneReward) {
      const milestoneKey = `stamp${appliedMilestoneReward}` as keyof typeof LOYALTY_MILESTONES;
      discountDescription = `${LOYALTY_MILESTONES[milestoneKey].label} Reward Redemption`;
    }

    const orderData = {
      customerId: isGuest ? null : DEFAULT_USER_ID,
      customerName: customerName || 'Guest Customer',
      customerContact: customerContact || 'N/A',
      isGuest,
      items,
      fulfillmentType,
      takeawayFee,
      subtotal,
      discountAmount,
      discountDescription,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'counter' ? ('unpaid' as const) : ('paid' as const),
      fulfillmentStatus: 'received' as const,
      mainsCount,
      stampsEarned,
      redeemedMilestone: appliedMilestoneReward,
    };

    const newOrder = await api.createOrder(orderData);

    // Update stamps and milestone redemptions if applicable
    if (!isGuest) {
      let milestoneUpdates: Partial<typeof profile.milestoneRedemptions> | undefined;
      if (appliedMilestoneReward) {
        const key = `stamp${appliedMilestoneReward}` as keyof typeof profile.milestoneRedemptions;
        milestoneUpdates = { [key]: true };
      }

      const newStampCount = profile.currentStampCount + stampsEarned;
      const historyDescription = stampsEarned > 0
        ? `Order ${newOrder.orderNumber}: purchased ${mainsCount} mains`
        : `Order ${newOrder.orderNumber} placed`;

      const updatedProfile = await api.updateUserStamps(
        DEFAULT_USER_ID,
        newStampCount,
        {
          type: 'order',
          stamps: stampsEarned,
          description: historyDescription,
        },
        milestoneUpdates
      );

      setProfile(updatedProfile);
    }

    // Update last order and history
    setLastOrder(newOrder);
    setOrders((prev) => [newOrder, ...prev]);

    // Clear cart and close drawer
    clearCart();
    setIsCartOpen(false);

    return newOrder;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        fulfillmentType,
        customerName,
        customerContact,
        isGuest,
        appliedMilestoneReward,
        profile,
        orders,
        lastOrder,
        isCartOpen,
        storeSettings,
        subtotal,
        takeawayFee,
        discountAmount,
        total,
        totalItemCount,
        setIsCartOpen,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        setFulfillmentType,
        setAppliedMilestoneReward,
        setCustomerInfo,
        reorderOrder,
        refreshProfile,
        updateStampsDelta,
        redeemMilestoneDirect,
        resetLoyaltyCard,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
