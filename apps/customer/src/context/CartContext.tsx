import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CartItem,
  MenuItem,
  Order,
  UserProfile,
  FulfillmentType,
  PaymentMethod,
  StoreSettings,
  AuthUser,
  DEFAULT_STORE_SETTINGS,
  LOYALTY_MILESTONES,
  isStoreCurrentlyOpen,
  api,
} from '@nyopasta/shared';

const EMPTY_PROFILE: UserProfile = {
  id: '',
  authUserId: '',
  name: 'Guest Customer',
  role: 'customer',
  currentStampCount: 0,
  completedCardsCount: 0,
  milestoneRedemptions: { stamp4: false, stamp8: false, stamp12: false },
  stampHistory: [],
  totalOrdersCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface CartContextValue {
  items: CartItem[];
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerContact: string;
  isGuest: boolean;
  currentUser: AuthUser | null;
  isAuthModalOpen: boolean;
  appliedMilestoneReward: 4 | 8 | 12 | null;
  profile: UserProfile;
  orders: Order[];
  lastOrder: Order | null;
  isCartOpen: boolean;
  storeSettings: StoreSettings;
  liveMenuItems: MenuItem[];
  isStoreOpen: boolean;
  storeClosedReason?: string;
  subtotal: number;
  takeawayFee: number;
  discountAmount: number;
  total: number;
  totalItemCount: number;
  setIsCartOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  addItem: (item: CartItem) => void;
  updateItemQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setFulfillmentType: (type: FulfillmentType) => void;
  setAppliedMilestoneReward: (reward: 4 | 8 | 12 | null) => void;
  setCustomerInfo: (name: string, contact: string, isGuest: boolean) => void;
  loginAsGuest: () => void;
  handleAuthSuccess: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
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

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('nyo_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('nyo_guest_mode') === 'true';
  });

  // If user is neither logged in nor a guest, display the entry login/oauth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const hasUser = Boolean(localStorage.getItem('nyo_auth_user'));
    const guestActive = localStorage.getItem('nyo_guest_mode') === 'true';
    return !hasUser && !guestActive;
  });

  const [customerName, setCustomerName] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nyo_auth_user');
      if (savedUser) return JSON.parse(savedUser).name || 'Member';
    } catch {}
    return 'Guest Customer';
  });

  const [customerContact, setCustomerContact] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nyo_auth_user');
      if (savedUser) return JSON.parse(savedUser).phone || '';
    } catch {}
    return '';
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('nyo_customer_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return EMPTY_PROFILE;
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
    if (profile.id) {
      localStorage.setItem('nyo_customer_profile', JSON.stringify(profile));
    }
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

  // Live subscription to menu items
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>([]);
  useEffect(() => {
    const unsub = api.subscribeToMenuItems((items) => {
      setLiveMenuItems(items);
    });
    return () => unsub();
  }, []);

  const storeStatus = isStoreCurrentlyOpen(storeSettings);
  const isStoreOpen = storeStatus.isOpen;
  const storeClosedReason = storeStatus.reason;

  // Check current session on mount
  useEffect(() => {
    api.getCurrentUser().then((user) => {
      if (user) {
        if (user.isGuest) {
          setIsGuest(true);
          setCurrentUser(user);
        } else {
          setCurrentUser(user);
          setIsGuest(false);
          setCustomerName(user.name);
          if (user.phone) setCustomerContact(user.phone);
          api.getUserProfile(user.id).then(setProfile).catch(() => {});
        }
      }
    });
  }, []);

  // Live subscription to user profile (stamps, milestones, history)
  useEffect(() => {
    if (isGuest || !currentUser?.id) return;
    const unsub = api.subscribeToProfile(currentUser.id, (serverProfile) => {
      if (serverProfile) {
        setProfile(serverProfile);
      }
    });
    return () => unsub();
  }, [isGuest, currentUser?.id]);

  // Live subscription to order statuses
  useEffect(() => {
    const unsub = api.subscribeToOrders((allOrders) => {
      setOrders((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const updated = prev.map((localOrder) => {
          const matched = allOrders.find((o) => o.id === localOrder.id);
          if (matched && (matched.fulfillmentStatus !== localOrder.fulfillmentStatus || matched.paymentStatus !== localOrder.paymentStatus)) {
            changed = true;
            return matched;
          }
          return localOrder;
        });
        return changed ? updated : prev;
      });

      setLastOrder((prev) => {
        if (!prev) return prev;
        const matched = allOrders.find((o) => o.id === prev.id);
        if (matched && (matched.fulfillmentStatus !== prev.fulfillmentStatus || matched.paymentStatus !== prev.paymentStatus)) {
          return matched;
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  const loginAsGuest = () => {
    const guestUser = api.loginAsGuest();
    setIsGuest(true);
    setCurrentUser(guestUser);
    setCustomerName('Guest Customer');
    setIsAuthModalOpen(false);
  };

  const handleAuthSuccess = async (authUser: AuthUser) => {
    setCurrentUser(authUser);
    setIsGuest(false);
    setCustomerName(authUser.name || 'Member');
    if (authUser.phone) setCustomerContact(authUser.phone);
    setIsAuthModalOpen(false);
    try {
      const p = await api.getUserProfile(authUser.id);
      setProfile(p);
    } catch (e) {
      console.warn('Failed to load profile on login:', e);
    }
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsGuest(false);
    setProfile(EMPTY_PROFILE);
    setCustomerName('Guest Customer');
    setCustomerContact('');
    setIsAuthModalOpen(true);
  };

  const refreshProfile = async () => {
    if (!currentUser?.id || isGuest) return;
    try {
      const p = await api.getUserProfile(currentUser.id);
      if (p) setProfile(p);
    } catch (err) {
      console.warn('refreshProfile error:', err);
    }
  };

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
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
    if (!isStoreOpen) {
      alert(`Cannot reorder: ${storeClosedReason || 'The shop is currently closed.'}`);
      return;
    }
    const availableItems = orderToReorder.items.filter((item) => {
      const live = liveMenuItems.find((m) => m.id === item.menuItemId);
      return live && !live.isSoldOut;
    });
    if (availableItems.length === 0) {
      alert('All items from this past order are currently sold out.');
      return;
    }
    if (availableItems.length < orderToReorder.items.length) {
      alert('Some items from this past order are currently sold out and were skipped.');
    }
    setItems(availableItems);
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

  // Manual stamp modification
  const updateStampsDelta = async (delta: number, description: string) => {
    if (!currentUser?.id || isGuest) return;
    const newCount = Math.max(0, profile.currentStampCount + delta);
    const updated = await api.updateUserStamps(
      currentUser.id,
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
    if (!currentUser?.id || isGuest) return;
    const key = `stamp${milestone}` as keyof typeof profile.milestoneRedemptions;
    const milestoneUpdates = { [key]: true };
    const label = LOYALTY_MILESTONES[key].label;
    const updated = await api.updateUserStamps(
      currentUser.id,
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
    if (!currentUser?.id || isGuest) return;
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

    const currentStatus = isStoreCurrentlyOpen(storeSettings);
    if (!currentStatus.isOpen) {
      throw new Error(`Cannot place order: ${currentStatus.reason || 'The shop is currently closed.'}`);
    }

    const currentMenu = await api.getMenuItems();
    const soldOutItemInCart = items.find((cartItem) => {
      const liveItem = currentMenu.find((m) => m.id === cartItem.menuItemId);
      return liveItem?.isSoldOut;
    });
    if (soldOutItemInCart) {
      throw new Error(`"${soldOutItemInCart.name}" is currently sold out. Please remove it from your cart to proceed.`);
    }

    const mainsCount = items
      .filter((i) => i.category === 'mains')
      .reduce((sum, i) => sum + i.quantity, 0);

    const isMember = !isGuest && Boolean(currentUser?.id);
    const stampsEarned = isMember ? mainsCount : 0;

    let discountDescription = '';
    if (appliedMilestoneReward) {
      const milestoneKey = `stamp${appliedMilestoneReward}` as keyof typeof LOYALTY_MILESTONES;
      discountDescription = `${LOYALTY_MILESTONES[milestoneKey].label} Reward Redemption`;
    }

    const orderData = {
      customerId: isMember ? currentUser!.id : null,
      customerName: customerName || (isMember ? currentUser!.name : 'Guest Customer'),
      customerContact: customerContact || 'N/A',
      isGuest: !isMember,
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

    // Update stamps and milestone redemptions if member
    if (isMember && currentUser?.id) {
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
        currentUser.id,
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
        currentUser,
        isAuthModalOpen,
        appliedMilestoneReward,
        profile,
        orders,
        lastOrder,
        isCartOpen,
        storeSettings,
        liveMenuItems,
        isStoreOpen,
        storeClosedReason,
        subtotal,
        takeawayFee,
        discountAmount,
        total,
        totalItemCount,
        setIsCartOpen,
        setIsAuthModalOpen,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        setFulfillmentType,
        setAppliedMilestoneReward,
        setCustomerInfo,
        loginAsGuest,
        handleAuthSuccess,
        logout,
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
