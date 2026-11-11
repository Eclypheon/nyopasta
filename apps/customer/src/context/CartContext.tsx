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
  voucherSide350Count: 0,
  voucherSide450Count: 0,
  voucherMeal850Count: 0,
  isBlacklisted: false,
  blacklistReason: '',
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
  appliedVoucher: 'side350' | 'side450' | 'meal850' | null;
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
  setAppliedVoucher: (voucher: 'side350' | 'side450' | 'meal850' | null) => void;
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
  const [appliedVoucher, setAppliedVoucher] = useState<'side350' | 'side450' | 'meal850' | null>(null);

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
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        const map = new Map<string, Order>();
        parsed.forEach((o) => map.set(o.id, o));
        return Array.from(map.values());
      }
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

  // Live subscription and continuous background polling to menu items & store settings
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>([]);
  useEffect(() => {
    const unsub = api.subscribeToMenuItems((items) => {
      setLiveMenuItems(items);
    });

    // Constant 3.5s background polling so out-of-stock items update immediately even if WebSocket sleeping
    const pollTimer = setInterval(() => {
      api.getMenuItems().then((items) => {
        if (items && items.length > 0) setLiveMenuItems(items);
      }).catch(() => {});

      api.getStoreSettings().then((settings) => {
        if (settings) setStoreSettings(settings);
      }).catch(() => {});
    }, 3500);

    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, []);

  const storeStatus = isStoreCurrentlyOpen(storeSettings);
  const isStoreOpen = storeStatus.isOpen;
  const storeClosedReason = storeStatus.reason;

  // Check current session on mount (including OAuth token callback)
  useEffect(() => {
    (async () => {
      try {
        const oauthUser = await api.handleOAuthCallback();
        const user = oauthUser || (await api.getCurrentUser());
        if (user) {
          if (user.isGuest) {
            setIsGuest(true);
            setCurrentUser(user);
          } else {
            setCurrentUser(user);
            setIsGuest(false);
            setIsAuthModalOpen(false);
            setCustomerName(user.name);
            if (user.phone) setCustomerContact(user.phone);
            if (typeof window !== 'undefined') {
              localStorage.setItem('nyo_auth_user', JSON.stringify(user));
              localStorage.removeItem('nyo_guest_mode');
            }
            api.getUserProfile(user.id, user.name, user.email).then(setProfile).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Session check on mount notice:', err);
      }
    })();
  }, []);

  // Live subscription to user profile (stamps, milestones, history)
  useEffect(() => {
    if (isGuest || !currentUser?.id) return;
    const unsub = api.subscribeToProfile(currentUser.id, (serverProfile) => {
      if (serverProfile) {
        setProfile(serverProfile);
      }
    });

    // Load customer past orders from cloud
    api.getCustomerOrders(currentUser.id).then((custOrders) => {
      if (custOrders && custOrders.length > 0) {
        const map = new Map<string, Order>();
        custOrders.forEach((o) => map.set(o.id, o));
        const unique = Array.from(map.values());
        setOrders(unique);
        setLastOrder(unique[0]);
      }
    }).catch(() => {});

    return () => unsub();
  }, [isGuest, currentUser?.id]);

  // Live subscription to order statuses
  useEffect(() => {
    const unsub = api.subscribeToOrders((allOrders) => {
      setOrders((prev) => {
        if (currentUser?.id) {
          const userOrders = allOrders.filter((o) => o.customerId === currentUser.id);
          if (userOrders.length > 0) {
            const sorted = [...userOrders].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const map = new Map<string, Order>();
            sorted.forEach((o) => map.set(o.id, o));
            const unique = Array.from(map.values());
            setLastOrder(unique[0] || null);
            return unique;
          }
        }
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
        const map = new Map<string, Order>();
        (changed ? updated : prev).forEach((o) => map.set(o.id, o));
        return Array.from(map.values());
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
  }, [currentUser?.id]);

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
    setAppliedVoucher(null);
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
    setAppliedVoucher(null);
    setIsCartOpen(true);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const takeawayFeePerItem = storeSettings.takeawayFeePerItem ?? 0.3;
  const takeawayFee = fulfillmentType === 'takeaway' ? totalItemCount * takeawayFeePerItem : 0;

  let discountAmount = 0;
  if (appliedVoucher === 'side350' || appliedMilestoneReward === 4) {
    discountAmount = Math.min(3.5, subtotal);
  } else if (appliedVoucher === 'side450' || appliedMilestoneReward === 8) {
    discountAmount = Math.min(4.5, subtotal);
  } else if (appliedVoucher === 'meal850' || appliedMilestoneReward === 12) {
    discountAmount = Math.min(8.5, subtotal);
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

    // Blacklist enforcement safeguard
    if (isMember && profile.isBlacklisted) {
      throw new Error(
        profile.blacklistReason
          ? `Order suspended: Account flagged (${profile.blacklistReason}). Please approach counter staff to reactivate.`
          : 'Order suspended: Account flagged for an uncollected order default. Please approach counter staff.'
      );
    }

    const stampsEarned = isMember ? mainsCount : 0;

    const chosenVoucher =
      appliedVoucher ||
      (appliedMilestoneReward === 4
        ? 'side350'
        : appliedMilestoneReward === 8
        ? 'side450'
        : appliedMilestoneReward === 12
        ? 'meal850'
        : null);

    let discountDescription = '';
    if (chosenVoucher === 'side350' || appliedMilestoneReward === 4) {
      discountDescription = '$3.50 Side Voucher Redeemed';
    } else if (chosenVoucher === 'side450' || appliedMilestoneReward === 8) {
      discountDescription = '$4.50 Side Voucher Redeemed';
    } else if (chosenVoucher === 'meal850' || appliedMilestoneReward === 12) {
      discountDescription = '$8.50 Main Voucher Redeemed';
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
      paymentStatus: (paymentMethod === 'counter' || paymentMethod === 'paynow') ? ('unpaid' as const) : ('paid' as const),
      fulfillmentStatus: 'received' as const,
      mainsCount,
      stampsEarned,
      redeemedMilestone: appliedMilestoneReward,
      redeemedVoucher: chosenVoucher,
    };

    const newOrder = await api.createOrder(orderData);

    // Update stamps and voucher wallet if member
    if (isMember && currentUser?.id) {
      const voucherDeltas = chosenVoucher ? { [chosenVoucher]: -1 } : undefined;
      const historyDescription = stampsEarned > 0
        ? `Order ${newOrder.orderNumber}: purchased ${mainsCount} main${mainsCount > 1 ? 's' : ''}`
        : chosenVoucher
        ? `Order ${newOrder.orderNumber}: redeemed ${discountDescription}`
        : `Order ${newOrder.orderNumber} placed`;

      const updatedProfile = await api.updateUserStamps(
        currentUser.id,
        stampsEarned,
        {
          type: 'order',
          stamps: stampsEarned,
          description: historyDescription,
        },
        undefined,
        voucherDeltas
      );

      setProfile(updatedProfile);
    }

    // Update last order and history without duplicate entries
    setLastOrder(newOrder);
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);

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
        appliedVoucher,
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
        setAppliedVoucher,
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
