import { Client, Account, Databases, ID, Query } from 'appwrite';
import {
  MenuItem,
  Order,
  StoreSettings,
  UserProfile,
  StampEvent,
  MilestoneStatus,
} from '../types/index.js';
import {
  INITIAL_MENU_ITEMS,
  DEFAULT_STORE_SETTINGS,
} from '../constants/index.js';

const APPWRITE_ENDPOINT = (typeof window !== 'undefined' && (window as any)._env_?.VITE_APPWRITE_ENDPOINT) ||
  (import.meta as any)?.env?.VITE_APPWRITE_ENDPOINT ||
  'https://cloud.appwrite.io/v1';

const APPWRITE_PROJECT_ID = (typeof window !== 'undefined' && (window as any)._env_?.VITE_APPWRITE_PROJECT_ID) ||
  (import.meta as any)?.env?.VITE_APPWRITE_PROJECT_ID ||
  '';

export const isCloudConnected = Boolean(APPWRITE_PROJECT_ID && APPWRITE_PROJECT_ID.trim().length > 0);

export const appwriteClient = new Client();
if (isCloudConnected) {
  appwriteClient.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
}

export const account = new Account(appwriteClient);
export const databases = new Databases(clientInstance());

function clientInstance() {
  return appwriteClient;
}

const DB_ID = 'nyopasta_db';

// Reactive local memory store fallback when running without cloud keys
class LocalReactiveStore {
  private menuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];
  private storeSettings: StoreSettings = { ...DEFAULT_STORE_SETTINGS };
  private orders: Order[] = [];
  private profiles: Map<string, UserProfile> = new Map();
  private menuListeners: Set<(items: MenuItem[]) => void> = new Set();
  private orderListeners: Set<(orders: Order[]) => void> = new Set();
  private settingsListeners: Set<(settings: StoreSettings) => void> = new Set();
  private profileListeners: Map<string, Set<(profile: UserProfile) => void>> = new Map();

  constructor() {
    // Load persisted mock state if available
    if (typeof window !== 'undefined') {
      try {
        const savedMenu = localStorage.getItem('nyo_local_menu');
        if (savedMenu) {
          try {
            const parsed: MenuItem[] = JSON.parse(savedMenu);
            this.menuItems = INITIAL_MENU_ITEMS.map((init) => {
              const saved = parsed.find((p) => p.id === init.id);
              return saved ? { ...init, isSoldOut: saved.isSoldOut } : init;
            });
          } catch {
            this.menuItems = [...INITIAL_MENU_ITEMS];
          }
        }

        const savedSettings = localStorage.getItem('nyo_local_settings');
        if (savedSettings) this.storeSettings = JSON.parse(savedSettings);

        const savedOrders = localStorage.getItem('nyo_local_orders');
        if (savedOrders) this.orders = JSON.parse(savedOrders);

        const savedProfiles = localStorage.getItem('nyo_local_profiles');
        if (savedProfiles) {
          const parsed = JSON.parse(savedProfiles);
          this.profiles = new Map(Object.entries(parsed));
        }
      } catch (e) {
        console.warn('Could not parse local store state', e);
      }

      // Sync across browser tabs via storage events
      window.addEventListener('storage', (event) => {
        if (event.key === 'nyo_local_menu' && event.newValue) {
          this.menuItems = JSON.parse(event.newValue);
          this.notifyMenu();
        } else if (event.key === 'nyo_local_orders' && event.newValue) {
          this.orders = JSON.parse(event.newValue);
          this.notifyOrders();
        } else if (event.key === 'nyo_local_settings' && event.newValue) {
          this.storeSettings = JSON.parse(event.newValue);
          this.notifySettings();
        } else if (event.key === 'nyo_local_profiles' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            this.profiles = new Map(Object.entries(parsed));
            this.notifyProfiles();
          } catch {}
        }
      });
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyo_local_menu', JSON.stringify(this.menuItems));
      localStorage.setItem('nyo_local_settings', JSON.stringify(this.storeSettings));
      localStorage.setItem('nyo_local_orders', JSON.stringify(this.orders));
      const profilesObj = Object.fromEntries(this.profiles);
      localStorage.setItem('nyo_local_profiles', JSON.stringify(profilesObj));
    }
  }

  getMenuItems(): MenuItem[] {
    return [...this.menuItems];
  }

  updateMenuItemSoldOut(id: string, isSoldOut: boolean): MenuItem {
    this.menuItems = this.menuItems.map((item) => (item.id === id ? { ...item, isSoldOut } : item));
    this.save();
    this.notifyMenu();
    const updated = this.menuItems.find((i) => i.id === id);
    if (!updated) throw new Error('Item not found');
    return updated;
  }

  setAllSoldOut(isSoldOut: boolean) {
    this.menuItems = this.menuItems.map((item) => ({ ...item, isSoldOut }));
    this.save();
    this.notifyMenu();
  }

  getStoreSettings(): StoreSettings {
    return { ...this.storeSettings };
  }

  updateStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
    this.storeSettings = { ...this.storeSettings, ...settings, updatedAt: new Date().toISOString() };
    if (settings.isManuallyClosed) {
      this.setAllSoldOut(true);
    }
    this.save();
    this.notifySettings();
    return { ...this.storeSettings };
  }

  getOrders(): Order[] {
    return [...this.orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Order {
    const count = this.orders.length + 1;
    const orderNumber = `NYO-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: now,
      updatedAt: now,
    };
    this.orders.push(newOrder);

    // Update customer analytics profile if registered
    if (orderData.customerId) {
      const prof = this.getProfile(orderData.customerId);
      const itemsSummary = orderData.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      prof.totalOrdersCount = (prof.totalOrdersCount || 0) + 1;
      prof.lastOrderId = orderNumber;
      prof.lastOrderSummary = itemsSummary;
      prof.lastOrderDate = now;
      prof.updatedAt = now;
      this.profiles.set(orderData.customerId, prof);
      this.notifyProfiles(orderData.customerId);
    }

    this.save();
    this.notifyOrders();
    return newOrder;
  }

  updateOrderStatus(orderId: string, updates: Partial<Pick<Order, 'fulfillmentStatus' | 'paymentStatus'>>): Order {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');
    this.orders[idx] = {
      ...this.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    this.notifyOrders();
    return this.orders[idx];
  }

  getProfile(userId: string): UserProfile {
    if (!this.profiles.has(userId)) {
      const isAlex = userId === 'user_alex_7729';
      const newProfile: UserProfile = {
        id: `prof_${userId}`,
        authUserId: userId,
        name: isAlex ? 'Alex Tan' : 'Loyal Customer',
        phone: isAlex ? '91234567' : undefined,
        role: 'customer',
        currentStampCount: isAlex ? 5 : 0,
        completedCardsCount: 0,
        milestoneRedemptions: { stamp4: false, stamp8: false, stamp12: false },
        stampHistory: isAlex
          ? [
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
            ]
          : [],
        totalOrdersCount: isAlex ? 2 : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.profiles.set(userId, newProfile);
      this.save();
    }
    return this.profiles.get(userId)!;
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  updateUserStamps(
    userId: string,
    newStampCount: number,
    historyEntry: Omit<StampEvent, 'id' | 'timestamp' | 'balanceAfter'>,
    milestoneUpdates?: Partial<MilestoneStatus>
  ): UserProfile {
    const profile = this.getProfile(userId);
    const balanceAfter = newStampCount;
    const event: StampEvent = {
      ...historyEntry,
      id: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      balanceAfter,
    };

    let updatedMilestones = { ...profile.milestoneRedemptions, ...milestoneUpdates };
    let completedCards = profile.completedCardsCount;
    let finalStamps = newStampCount;

    // Rollover check if reaches 12 and completed
    if (finalStamps >= 12 && updatedMilestones.stamp12) {
      completedCards += 1;
      finalStamps = Math.max(0, finalStamps - 12);
      updatedMilestones = { stamp4: false, stamp8: false, stamp12: false };
    }

    const updatedProfile: UserProfile = {
      ...profile,
      currentStampCount: finalStamps,
      completedCardsCount: completedCards,
      milestoneRedemptions: updatedMilestones,
      stampHistory: [event, ...profile.stampHistory],
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(userId, updatedProfile);
    this.save();
    this.notifyProfiles(userId);
    return updatedProfile;
  }

  onProfileChange(userId: string, fn: (profile: UserProfile) => void): () => void {
    if (!this.profileListeners.has(userId)) {
      this.profileListeners.set(userId, new Set());
    }
    this.profileListeners.get(userId)!.add(fn);
    fn(this.getProfile(userId));
    return () => {
      this.profileListeners.get(userId)?.delete(fn);
    };
  }

  private notifyProfiles(userId?: string) {
    if (userId) {
      const p = this.getProfile(userId);
      const set = this.profileListeners.get(userId);
      if (set) set.forEach((fn) => fn(p));
    } else {
      this.profileListeners.forEach((set, uid) => {
        const p = this.getProfile(uid);
        set.forEach((fn) => fn(p));
      });
    }
  }

  onMenuChange(fn: (items: MenuItem[]) => void): () => void {
    this.menuListeners.add(fn);
    fn(this.getMenuItems());
    return () => this.menuListeners.delete(fn);
  }

  onOrdersChange(fn: (orders: Order[]) => void): () => void {
    this.orderListeners.add(fn);
    fn(this.getOrders());
    return () => this.orderListeners.delete(fn);
  }

  onSettingsChange(fn: (settings: StoreSettings) => void): () => void {
    this.settingsListeners.add(fn);
    fn(this.getStoreSettings());
    return () => this.settingsListeners.delete(fn);
  }

  private notifyMenu() {
    const items = this.getMenuItems();
    this.menuListeners.forEach((fn) => fn(items));
  }

  private notifyOrders() {
    const orders = this.getOrders();
    this.orderListeners.forEach((fn) => fn(orders));
  }

  private notifySettings() {
    const settings = this.getStoreSettings();
    this.settingsListeners.forEach((fn) => fn(settings));
  }
}

export const localStore = new LocalReactiveStore();

// Universal API Service
export const api = {
  async getMenuItems(): Promise<MenuItem[]> {
    if (!isCloudConnected) return localStore.getMenuItems();
    try {
      const res = await databases.listDocuments(DB_ID, 'menu_items', [Query.limit(100)]);
      return res.documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        chineseName: doc.chineseName,
        category: doc.category,
        subcategory: doc.subcategory,
        price: doc.price,
        isKidOption: doc.isKidOption,
        kidPrice: doc.kidPrice,
        description: doc.description,
        chineseDescription: doc.chineseDescription,
        tag: doc.tag,
        isSoldOut: doc.isSoldOut,
        imageUrl: doc.imageUrl,
      }));
    } catch (err) {
      console.warn('Appwrite getMenuItems failed, falling back to local store:', err);
      return localStore.getMenuItems();
    }
  },

  async updateMenuItemSoldOut(id: string, isSoldOut: boolean): Promise<MenuItem> {
    if (!isCloudConnected) return localStore.updateMenuItemSoldOut(id, isSoldOut);
    try {
      const doc: any = await databases.updateDocument(DB_ID, 'menu_items', id, { isSoldOut });
      return {
        id: doc.$id,
        name: doc.name,
        chineseName: doc.chineseName,
        category: doc.category,
        subcategory: doc.subcategory,
        price: doc.price,
        isKidOption: doc.isKidOption,
        kidPrice: doc.kidPrice,
        description: doc.description,
        chineseDescription: doc.chineseDescription,
        tag: doc.tag,
        isSoldOut: doc.isSoldOut,
        imageUrl: doc.imageUrl,
      };
    } catch (err) {
      console.warn('Appwrite updateMenuItemSoldOut failed, falling back:', err);
      return localStore.updateMenuItemSoldOut(id, isSoldOut);
    }
  },

  async getStoreSettings(): Promise<StoreSettings> {
    if (!isCloudConnected) return localStore.getStoreSettings();
    try {
      const doc: any = await databases.getDocument(DB_ID, 'store_settings', 'current_store_settings');
      return {
        id: doc.$id,
        isManuallyClosed: doc.isManuallyClosed,
        manualCloseReason: doc.manualCloseReason,
        bannerMessage: doc.bannerMessage,
        schedule: JSON.parse(doc.scheduleJson),
        payNowUen: doc.payNowUen,
        payNowRecipientName: doc.payNowRecipientName,
        takeawayFeePerItem: doc.takeawayFeePerItem,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite getStoreSettings failed, falling back:', err);
      return localStore.getStoreSettings();
    }
  },

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    if (!isCloudConnected) return localStore.updateStoreSettings(settings);
    try {
      const payload: any = {};
      if (settings.isManuallyClosed !== undefined) payload.isManuallyClosed = settings.isManuallyClosed;
      if (settings.manualCloseReason !== undefined) payload.manualCloseReason = settings.manualCloseReason;
      if (settings.bannerMessage !== undefined) payload.bannerMessage = settings.bannerMessage;
      if (settings.schedule !== undefined) payload.scheduleJson = JSON.stringify(settings.schedule);
      if (settings.payNowUen !== undefined) payload.payNowUen = settings.payNowUen;
      if (settings.payNowRecipientName !== undefined) payload.payNowRecipientName = settings.payNowRecipientName;
      if (settings.takeawayFeePerItem !== undefined) payload.takeawayFeePerItem = settings.takeawayFeePerItem;

      const doc: any = await databases.updateDocument(DB_ID, 'store_settings', 'current_store_settings', payload);
      return {
        id: doc.$id,
        isManuallyClosed: doc.isManuallyClosed,
        manualCloseReason: doc.manualCloseReason,
        bannerMessage: doc.bannerMessage,
        schedule: JSON.parse(doc.scheduleJson),
        payNowUen: doc.payNowUen,
        payNowRecipientName: doc.payNowRecipientName,
        takeawayFeePerItem: doc.takeawayFeePerItem,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite updateStoreSettings failed, falling back:', err);
      return localStore.updateStoreSettings(settings);
    }
  },

  async getOrders(): Promise<Order[]> {
    if (!isCloudConnected) return localStore.getOrders();
    try {
      const res = await databases.listDocuments(DB_ID, 'orders', [
        Query.orderAsc('$createdAt'),
        Query.limit(100),
      ]);
      return res.documents.map((doc: any) => ({
        id: doc.$id,
        orderNumber: doc.orderNumber,
        customerId: doc.customerId,
        customerName: doc.customerName,
        customerContact: doc.customerContact,
        isGuest: doc.isGuest,
        items: JSON.parse(doc.itemsJson),
        fulfillmentType: doc.fulfillmentType,
        takeawayFee: doc.takeawayFee,
        subtotal: doc.subtotal,
        discountAmount: doc.discountAmount,
        discountDescription: doc.discountDescription,
        total: doc.total,
        paymentMethod: doc.paymentMethod,
        paymentStatus: doc.paymentStatus,
        fulfillmentStatus: doc.fulfillmentStatus,
        mainsCount: doc.mainsCount,
        stampsEarned: doc.stampsEarned,
        redeemedMilestone: doc.redeemedMilestone,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      }));
    } catch (err) {
      console.warn('Appwrite getOrders failed, falling back:', err);
      return localStore.getOrders();
    }
  },

  async createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    if (!isCloudConnected) return localStore.createOrder(orderData);
    try {
      const orderNumber = `NYO-${Date.now().toString().slice(-4)}`;
      const doc: any = await databases.createDocument(DB_ID, 'orders', ID.unique(), {
        orderNumber,
        customerId: orderData.customerId || null,
        customerName: orderData.customerName,
        customerContact: orderData.customerContact,
        isGuest: orderData.isGuest,
        itemsJson: JSON.stringify(orderData.items),
        fulfillmentType: orderData.fulfillmentType,
        takeawayFee: orderData.takeawayFee,
        subtotal: orderData.subtotal,
        discountAmount: orderData.discountAmount,
        discountDescription: orderData.discountDescription || '',
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        fulfillmentStatus: orderData.fulfillmentStatus,
        mainsCount: orderData.mainsCount,
        stampsEarned: orderData.stampsEarned,
        redeemedMilestone: orderData.redeemedMilestone || null,
      });

      return {
        id: doc.$id,
        orderNumber: doc.orderNumber,
        customerId: doc.customerId,
        customerName: doc.customerName,
        customerContact: doc.customerContact,
        isGuest: doc.isGuest,
        items: JSON.parse(doc.itemsJson),
        fulfillmentType: doc.fulfillmentType,
        takeawayFee: doc.takeawayFee,
        subtotal: doc.subtotal,
        discountAmount: doc.discountAmount,
        discountDescription: doc.discountDescription,
        total: doc.total,
        paymentMethod: doc.paymentMethod,
        paymentStatus: doc.paymentStatus,
        fulfillmentStatus: doc.fulfillmentStatus,
        mainsCount: doc.mainsCount,
        stampsEarned: doc.stampsEarned,
        redeemedMilestone: doc.redeemedMilestone,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite createOrder failed, falling back:', err);
      return localStore.createOrder(orderData);
    }
  },

  async updateOrderStatus(
    orderId: string,
    updates: Partial<Pick<Order, 'fulfillmentStatus' | 'paymentStatus'>>
  ): Promise<Order> {
    if (!isCloudConnected) return localStore.updateOrderStatus(orderId, updates);
    try {
      const doc: any = await databases.updateDocument(DB_ID, 'orders', orderId, updates);
      return {
        id: doc.$id,
        orderNumber: doc.orderNumber,
        customerId: doc.customerId,
        customerName: doc.customerName,
        customerContact: doc.customerContact,
        isGuest: doc.isGuest,
        items: JSON.parse(doc.itemsJson),
        fulfillmentType: doc.fulfillmentType,
        takeawayFee: doc.takeawayFee,
        subtotal: doc.subtotal,
        discountAmount: doc.discountAmount,
        discountDescription: doc.discountDescription,
        total: doc.total,
        paymentMethod: doc.paymentMethod,
        paymentStatus: doc.paymentStatus,
        fulfillmentStatus: doc.fulfillmentStatus,
        mainsCount: doc.mainsCount,
        stampsEarned: doc.stampsEarned,
        redeemedMilestone: doc.redeemedMilestone,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite updateOrderStatus failed, falling back:', err);
      return localStore.updateOrderStatus(orderId, updates);
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.getProfile(userId);
    try {
      const res = await databases.listDocuments(DB_ID, 'profiles', [Query.equal('userId', userId)]);
      if (res.documents.length === 0) {
        // Create initial profile
        const doc: any = await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
          userId,
          name: 'Member',
          role: 'customer',
          currentStampCount: 0,
          completedCardsCount: 0,
          milestonesRedeemedJson: JSON.stringify({ stamp4: false, stamp8: false, stamp12: false }),
          stampHistoryJson: '[]',
          totalOrdersCount: 0,
        });
        return {
          id: doc.$id,
          authUserId: doc.userId,
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          role: doc.role,
          currentStampCount: doc.currentStampCount,
          completedCardsCount: doc.completedCardsCount,
          milestoneRedemptions: JSON.parse(doc.milestonesRedeemedJson),
          stampHistory: JSON.parse(doc.stampHistoryJson),
          totalOrdersCount: doc.totalOrdersCount,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt,
        };
      }
      const doc: any = res.documents[0];
      return {
        id: doc.$id,
        authUserId: doc.userId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        currentStampCount: doc.currentStampCount,
        completedCardsCount: doc.completedCardsCount,
        milestoneRedemptions: JSON.parse(doc.milestonesRedeemedJson),
        stampHistory: JSON.parse(doc.stampHistoryJson),
        totalOrdersCount: doc.totalOrdersCount,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite getUserProfile failed, falling back:', err);
      return localStore.getProfile(userId);
    }
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    if (!isCloudConnected) return localStore.getAllProfiles();
    try {
      const res = await databases.listDocuments(DB_ID, 'profiles', [Query.limit(100)]);
      return res.documents.map((doc: any) => ({
        id: doc.$id,
        authUserId: doc.userId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        currentStampCount: doc.currentStampCount,
        completedCardsCount: doc.completedCardsCount,
        milestoneRedemptions: JSON.parse(doc.milestonesRedeemedJson),
        stampHistory: JSON.parse(doc.stampHistoryJson),
        totalOrdersCount: doc.totalOrdersCount,
        lastOrderId: doc.lastOrderId,
        lastOrderSummary: doc.lastOrderSummary,
        lastOrderDate: doc.lastOrderDate,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      }));
    } catch (err) {
      return localStore.getAllProfiles();
    }
  },

  async updateUserStamps(
    userId: string,
    newStampCount: number,
    historyEntry: Omit<StampEvent, 'id' | 'timestamp' | 'balanceAfter'>,
    milestoneUpdates?: Partial<MilestoneStatus>
  ): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.updateUserStamps(userId, newStampCount, historyEntry, milestoneUpdates);
    try {
      const profile = await this.getUserProfile(userId);
      const balanceAfter = newStampCount;
      const event: StampEvent = {
        ...historyEntry,
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        balanceAfter,
      };

      let updatedMilestones = { ...profile.milestoneRedemptions, ...milestoneUpdates };
      let completedCards = profile.completedCardsCount;
      let finalStamps = newStampCount;

      if (finalStamps >= 12 && updatedMilestones.stamp12) {
        completedCards += 1;
        finalStamps = Math.max(0, finalStamps - 12);
        updatedMilestones = { stamp4: false, stamp8: false, stamp12: false };
      }

      const doc: any = await databases.updateDocument(DB_ID, 'profiles', profile.id, {
        currentStampCount: finalStamps,
        completedCardsCount: completedCards,
        milestonesRedeemedJson: JSON.stringify(updatedMilestones),
        stampHistoryJson: JSON.stringify([event, ...profile.stampHistory]),
      });

      return {
        id: doc.$id,
        authUserId: doc.userId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        currentStampCount: doc.currentStampCount,
        completedCardsCount: doc.completedCardsCount,
        milestoneRedemptions: JSON.parse(doc.milestonesRedeemedJson),
        stampHistory: JSON.parse(doc.stampHistoryJson),
        totalOrdersCount: doc.totalOrdersCount,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite updateUserStamps failed, falling back:', err);
      return localStore.updateUserStamps(userId, newStampCount, historyEntry, milestoneUpdates);
    }
  },

  // Realtime subscriptions
  subscribeToMenuItems(callback: (items: MenuItem[]) => void): () => void {
    if (!isCloudConnected) return localStore.onMenuChange(callback);
    try {
      this.getMenuItems().then(callback);
      return appwriteClient.subscribe(`databases.${DB_ID}.collections.menu_items.documents`, () => {
        this.getMenuItems().then(callback);
      });
    } catch (e) {
      return localStore.onMenuChange(callback);
    }
  },

  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    if (!isCloudConnected) return localStore.onOrdersChange(callback);
    try {
      this.getOrders().then(callback);
      return appwriteClient.subscribe(`databases.${DB_ID}.collections.orders.documents`, () => {
        this.getOrders().then(callback);
      });
    } catch (e) {
      return localStore.onOrdersChange(callback);
    }
  },

  subscribeToStoreSettings(callback: (settings: StoreSettings) => void): () => void {
    if (!isCloudConnected) return localStore.onSettingsChange(callback);
    try {
      this.getStoreSettings().then(callback);
      return appwriteClient.subscribe(`databases.${DB_ID}.collections.store_settings.documents`, () => {
        this.getStoreSettings().then(callback);
      });
    } catch (e) {
      return localStore.onSettingsChange(callback);
    }
  },

  subscribeToProfile(userId: string, callback: (profile: UserProfile) => void): () => void {
    if (!isCloudConnected) return localStore.onProfileChange(userId, callback);
    try {
      this.getUserProfile(userId).then(callback);
      return appwriteClient.subscribe(`databases.${DB_ID}.collections.profiles.documents`, () => {
        this.getUserProfile(userId).then(callback);
      });
    } catch (e) {
      return localStore.onProfileChange(userId, callback);
    }
  },
};
