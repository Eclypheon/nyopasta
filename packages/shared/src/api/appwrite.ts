import { Client, Account, Databases, ID, Query, OAuthProvider } from 'appwrite';
import {
  MenuItem,
  Order,
  StoreSettings,
  UserProfile,
  StampEvent,
  MilestoneStatus,
  AuthUser,
} from '../types/index.js';
import {
  INITIAL_MENU_ITEMS,
  DEFAULT_STORE_SETTINGS,
} from '../constants/index.js';

const APPWRITE_ENDPOINT = (typeof window !== 'undefined' && localStorage.getItem('nyo_appwrite_endpoint')) ||
  (typeof window !== 'undefined' && (window as any)._env_?.VITE_APPWRITE_ENDPOINT) ||
  (import.meta as any)?.env?.VITE_APPWRITE_ENDPOINT ||
  'https://sgp.cloud.appwrite.io/v1';

const APPWRITE_PROJECT_ID = (typeof window !== 'undefined' && localStorage.getItem('nyo_appwrite_project_id')) ||
  (typeof window !== 'undefined' && (window as any)._env_?.VITE_APPWRITE_PROJECT_ID) ||
  (import.meta as any)?.env?.VITE_APPWRITE_PROJECT_ID ||
  '6af42048001529dd4360';

export const isCloudConnected = Boolean(APPWRITE_PROJECT_ID && APPWRITE_PROJECT_ID.trim().length > 0);

export const appwriteClient = new Client();
export const client = appwriteClient;
if (isCloudConnected) {
  appwriteClient.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  if (typeof window !== 'undefined') {
    appwriteClient.ping().then((res) => {
      console.log('Appwrite Cloud connected:', res);
    }).catch((err) => {
      console.warn('Appwrite Cloud ping notice:', err);
    });
  }
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

  clearOrders(): void {
    this.orders = [];
    this.save();
    this.notifyOrders();
  }

  archiveAllFulfilled(): void {
    let changed = false;
    this.orders = this.orders.map((o) => {
      if (o.fulfillmentStatus === 'fulfilled') {
        changed = true;
        return { ...o, fulfillmentStatus: 'archived', updatedAt: new Date().toISOString() };
      }
      return o;
    });
    if (changed) {
      this.save();
      this.notifyOrders();
    }
  }

  deleteArchivedOrders(): void {
    const beforeLen = this.orders.length;
    this.orders = this.orders.filter((o) => o.fulfillmentStatus !== 'archived');
    if (this.orders.length !== beforeLen) {
      this.save();
      this.notifyOrders();
    }
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
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

  updateOrderStatus(
    orderId: string,
    updates: Partial<Pick<Order, 'fulfillmentStatus' | 'paymentStatus' | 'isUncollected' | 'uncollectedRemark'>>
  ): Order {
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

  getProfile(userId: string, defaultName?: string, defaultEmail?: string): UserProfile {
    if (!this.profiles.has(userId)) {
      const newProfile: UserProfile = {
        id: `prof_${userId}`,
        authUserId: userId,
        name: defaultName || 'Member',
        email: defaultEmail || '',
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
      this.profiles.set(userId, newProfile);
      this.save();
    }
    const prof = this.profiles.get(userId)!;
    if (defaultName && prof.name === 'Member') prof.name = defaultName;
    if (defaultEmail && !prof.email) prof.email = defaultEmail;
    if (prof.voucherSide350Count === undefined) prof.voucherSide350Count = 0;
    if (prof.voucherSide450Count === undefined) prof.voucherSide450Count = 0;
    if (prof.voucherMeal850Count === undefined) prof.voucherMeal850Count = 0;
    if (prof.isBlacklisted === undefined) prof.isBlacklisted = false;
    return prof;
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  deleteProfile(userId: string): void {
    let deleted = this.profiles.delete(userId);
    for (const [key, p] of this.profiles.entries()) {
      if (p.id === userId || p.authUserId === userId) {
        this.profiles.delete(key);
        deleted = true;
      }
    }
    if (deleted) {
      this.save();
    }
  }

  updateUserStamps(
    userId: string,
    newStampCount: number,
    historyEntry: Omit<StampEvent, 'id' | 'timestamp' | 'balanceAfter'>,
    milestoneUpdates?: Partial<MilestoneStatus>,
    voucherDeltas?: { side350?: number; side450?: number; meal850?: number }
  ): UserProfile {
    const profile = this.getProfile(userId);
    const oldLifetime = (profile.completedCardsCount * 12) + profile.currentStampCount;

    let stampsEarned = historyEntry.stamps || 0;
    if (historyEntry.type === 'manual_migration') {
      stampsEarned = newStampCount;
    }

    let newLifetime = historyEntry.type === 'manual_migration' ? stampsEarned : (oldLifetime + stampsEarned);
    if (newLifetime < 0) newLifetime = 0;

    let newSide350 = profile.voucherSide350Count || 0;
    let newSide450 = profile.voucherSide450Count || 0;
    let newMeal850 = profile.voucherMeal850Count || 0;

    if (stampsEarned > 0) {
      const start = historyEntry.type === 'manual_migration' ? 0 : oldLifetime;
      const end = newLifetime;
      const maxCycles = Math.ceil(end / 12) + 1;
      for (let k = 0; k < maxCycles; k++) {
        const t4 = k * 12 + 4;
        const t8 = k * 12 + 8;
        const t12 = k * 12 + 12;
        if (start < t4 && end >= t4) newSide350 += 1;
        if (start < t8 && end >= t8) newSide450 += 1;
        if (start < t12 && end >= t12) newMeal850 += 1;
      }
    }

    if (voucherDeltas) {
      if (voucherDeltas.side350) newSide350 = Math.max(0, newSide350 + voucherDeltas.side350);
      if (voucherDeltas.side450) newSide450 = Math.max(0, newSide450 + voucherDeltas.side450);
      if (voucherDeltas.meal850) newMeal850 = Math.max(0, newMeal850 + voucherDeltas.meal850);
    }

    const finalCompletedCards = newLifetime > 0 && newLifetime % 12 === 0
      ? (newLifetime / 12) - 1
      : Math.floor(newLifetime / 12);
    const finalStamps = newLifetime > 0 && newLifetime % 12 === 0
      ? 12
      : (newLifetime % 12);

    const event: StampEvent = {
      ...historyEntry,
      id: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      balanceAfter: finalStamps,
    };

    const updatedProfile: UserProfile = {
      ...profile,
      currentStampCount: finalStamps,
      completedCardsCount: finalCompletedCards,
      voucherSide350Count: newSide350,
      voucherSide450Count: newSide450,
      voucherMeal850Count: newMeal850,
      milestoneRedemptions: {
        stamp4: finalStamps >= 4,
        stamp8: finalStamps >= 8,
        stamp12: finalStamps >= 12,
      },
      stampHistory: [event, ...profile.stampHistory],
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(userId, updatedProfile);
    this.save();
    this.notifyProfiles(userId);
    return updatedProfile;
  }

  blacklistCustomer(userId: string, reason: string): UserProfile {
    const profile = this.getProfile(userId);
    profile.isBlacklisted = true;
    profile.blacklistReason = reason;
    profile.blacklistedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(userId, profile);
    this.save();
    this.notifyProfiles(userId);
    return profile;
  }

  unblacklistCustomer(userId: string): UserProfile {
    const profile = this.getProfile(userId);
    profile.isBlacklisted = false;
    profile.blacklistReason = '';
    profile.blacklistedAt = undefined;
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(userId, profile);
    this.save();
    this.notifyProfiles(userId);
    return profile;
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
      const p = this.profiles.get(userId);
      const set = this.profileListeners.get(userId);
      if (set && p) set.forEach((fn) => fn(p));
    } else {
      this.profileListeners.forEach((set, uid) => {
        const p = this.profiles.get(uid);
        if (p) set.forEach((fn) => fn(p));
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

  async setAllMenuItemsSoldOut(isSoldOut: boolean): Promise<void> {
    if (!isCloudConnected) {
      localStore.setAllSoldOut(isSoldOut);
      return;
    }
    try {
      const items = await this.getMenuItems();
      await Promise.all(
        items.map((item) => databases.updateDocument(DB_ID, 'menu_items', item.id, { isSoldOut }))
      );
    } catch {
      localStore.setAllSoldOut(isSoldOut);
    }
  },

  async getStoreSettings(): Promise<StoreSettings> {
    if (!isCloudConnected) return localStore.getStoreSettings();
    try {
      const doc: any = await databases.getDocument(DB_ID, 'store_settings', 'current_store_settings');
      const remoteSettings: StoreSettings = {
        id: doc.$id,
        isManuallyClosed: Boolean(doc.isManuallyClosed),
        manualCloseReason: doc.manualCloseReason || '',
        bannerMessage: doc.bannerMessage || '',
        schedule: JSON.parse(doc.scheduleJson),
        enablePayNow: typeof doc.enablePayNow === 'boolean' ? doc.enablePayNow : true,
        enableStripe: typeof doc.enableStripe === 'boolean' ? doc.enableStripe : false,
        enableCounter: true,
        payNowType: doc.payNowType || (doc.payNowMobile ? 'mobile' : 'uen'),
        payNowUen: doc.payNowUen || '202300000A',
        payNowRecipientName: doc.payNowRecipientName || 'NYO PASTA',
        payNowMobile: doc.payNowMobile || '92258003',
        payNowQrUrl: doc.payNowQrUrl || '',
        takeawayFeePerItem: typeof doc.takeawayFeePerItem === 'number' ? doc.takeawayFeePerItem : 0.3,
        updatedAt: doc.$updatedAt,
      };
      localStore.updateStoreSettings(remoteSettings);
      return remoteSettings;
    } catch (err) {
      console.warn('Appwrite getStoreSettings failed, falling back:', err);
      return localStore.getStoreSettings();
    }
  },

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const localUpdated = localStore.updateStoreSettings(settings);
    if (!isCloudConnected) return localUpdated;
    try {
      const payload: any = {};
      if (settings.isManuallyClosed !== undefined) payload.isManuallyClosed = Boolean(settings.isManuallyClosed);
      if (settings.manualCloseReason !== undefined) payload.manualCloseReason = settings.manualCloseReason;
      if (settings.bannerMessage !== undefined) payload.bannerMessage = settings.bannerMessage;
      if (settings.schedule !== undefined) payload.scheduleJson = JSON.stringify(settings.schedule);
      if (settings.enablePayNow !== undefined) payload.enablePayNow = Boolean(settings.enablePayNow);
      if (settings.enableStripe !== undefined) payload.enableStripe = Boolean(settings.enableStripe);
      if (settings.enableCounter !== undefined) payload.enableCounter = Boolean(settings.enableCounter);
      if (settings.payNowType !== undefined) payload.payNowType = settings.payNowType;
      if (settings.payNowUen !== undefined) payload.payNowUen = settings.payNowUen;
      if (settings.payNowRecipientName !== undefined) payload.payNowRecipientName = settings.payNowRecipientName;
      if (settings.payNowMobile !== undefined) payload.payNowMobile = settings.payNowMobile;
      if (settings.payNowQrUrl !== undefined) payload.payNowQrUrl = settings.payNowQrUrl;
      if (settings.takeawayFeePerItem !== undefined) payload.takeawayFeePerItem = Number(settings.takeawayFeePerItem) || 0.3;

      const doc: any = await databases.updateDocument(DB_ID, 'store_settings', 'current_store_settings', payload);
      const remoteSettings: StoreSettings = {
        id: doc.$id,
        isManuallyClosed: Boolean(doc.isManuallyClosed),
        manualCloseReason: doc.manualCloseReason || '',
        bannerMessage: doc.bannerMessage || '',
        schedule: JSON.parse(doc.scheduleJson),
        enablePayNow: typeof doc.enablePayNow === 'boolean' ? doc.enablePayNow : true,
        enableStripe: typeof doc.enableStripe === 'boolean' ? doc.enableStripe : false,
        enableCounter: true,
        payNowType: doc.payNowType || (doc.payNowMobile ? 'mobile' : 'uen'),
        payNowUen: doc.payNowUen || '202300000A',
        payNowRecipientName: doc.payNowRecipientName || 'NYO PASTA',
        payNowMobile: doc.payNowMobile || '92258003',
        payNowQrUrl: doc.payNowQrUrl || '',
        takeawayFeePerItem: typeof doc.takeawayFeePerItem === 'number' ? doc.takeawayFeePerItem : 0.3,
        updatedAt: doc.$updatedAt,
      };
      localStore.updateStoreSettings(remoteSettings);
      return remoteSettings;
    } catch (err) {
      console.warn('Appwrite updateStoreSettings failed, falling back:', err);
      return localUpdated;
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

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    if (!isCloudConnected) {
      return localStore.getOrders().filter((o) => o.customerId === customerId);
    }
    try {
      const res = await databases.listDocuments(DB_ID, 'orders', [
        Query.equal('customerId', customerId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
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
      console.warn('Appwrite getCustomerOrders failed:', err);
      return localStore.getOrders().filter((o) => o.customerId === customerId);
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

      // Update customer profile analytics on cloud DB
      if (orderData.customerId) {
        try {
          const profile = await this.getUserProfile(orderData.customerId);
          const itemsSummary = orderData.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
          const now = new Date().toISOString();
          await databases.updateDocument(DB_ID, 'profiles', profile.id, {
            totalOrdersCount: (profile.totalOrdersCount || 0) + 1,
            lastOrderId: orderNumber,
            lastOrderSummary: itemsSummary,
            lastOrderDate: now,
          });
        } catch (profileUpdateErr) {
          console.warn('Could not update customer profile analytics on order creation:', profileUpdateErr);
        }
      }

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
    updates: Partial<Pick<Order, 'fulfillmentStatus' | 'paymentStatus' | 'isUncollected' | 'uncollectedRemark'>>
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

  async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, { fulfillmentStatus: 'cancelled' });
  },

  async archiveAllFulfilledOrders(): Promise<void> {
    if (!isCloudConnected) {
      localStore.archiveAllFulfilled();
      return;
    }
    try {
      const orders = await this.getOrders();
      const fulfilled = orders.filter((o) => o.fulfillmentStatus === 'fulfilled');
      await Promise.all(
        fulfilled.map((o) =>
          databases.updateDocument(DB_ID, 'orders', o.id, {
            fulfillmentStatus: 'archived',
          })
        )
      );
    } catch {
      localStore.archiveAllFulfilled();
    }
  },

  async deleteArchivedOrders(): Promise<void> {
    if (!isCloudConnected) {
      localStore.deleteArchivedOrders();
      return;
    }
    try {
      const orders = await this.getOrders();
      const archived = orders.filter((o) => o.fulfillmentStatus === 'archived');
      await Promise.all(archived.map((o) => databases.deleteDocument(DB_ID, 'orders', o.id)));
    } catch {
      localStore.deleteArchivedOrders();
    }
  },

  async clearOrders(): Promise<void> {
    if (!isCloudConnected) {
      localStore.clearOrders();
      return;
    }
    try {
      const orders = await this.getOrders();
      await Promise.all(orders.map((o) => databases.deleteDocument(DB_ID, 'orders', o.id)));
    } catch {
      localStore.clearOrders();
    }
  },

  async getUserProfile(userId: string, defaultName?: string, defaultEmail?: string): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.getProfile(userId, defaultName, defaultEmail);
    try {
      const res = await databases.listDocuments(DB_ID, 'profiles', [Query.equal('userId', userId)]);
      if (res.documents.length === 0) {
        // Create initial profile
        const initialMeta = {
          stamp4: false,
          stamp8: false,
          stamp12: false,
          voucherSide350Count: 0,
          voucherSide450Count: 0,
          voucherMeal850Count: 0,
          isBlacklisted: false,
          blacklistReason: '',
        };
        const doc: any = await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
          userId,
          name: defaultName || 'Member',
          email: defaultEmail || '',
          role: 'customer',
          currentStampCount: 0,
          completedCardsCount: 0,
          milestonesRedeemedJson: JSON.stringify(initialMeta),
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
          milestoneRedemptions: { stamp4: false, stamp8: false, stamp12: false },
          voucherSide350Count: 0,
          voucherSide450Count: 0,
          voucherMeal850Count: 0,
          isBlacklisted: false,
          blacklistReason: '',
          stampHistory: JSON.parse(doc.stampHistoryJson),
          totalOrdersCount: doc.totalOrdersCount,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt,
        };
      }
      const doc: any = res.documents[0];
      const meta = (() => {
        try {
          return JSON.parse(doc.milestonesRedeemedJson || '{}');
        } catch {
          return {};
        }
      })();
      return {
        id: doc.$id,
        authUserId: doc.userId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        currentStampCount: doc.currentStampCount,
        completedCardsCount: doc.completedCardsCount,
        milestoneRedemptions: {
          stamp4: Boolean(meta.stamp4),
          stamp8: Boolean(meta.stamp8),
          stamp12: Boolean(meta.stamp12),
        },
        voucherSide350Count: doc.voucherSide350Count !== undefined ? doc.voucherSide350Count : (meta.voucherSide350Count || 0),
        voucherSide450Count: doc.voucherSide450Count !== undefined ? doc.voucherSide450Count : (meta.voucherSide450Count || 0),
        voucherMeal850Count: doc.voucherMeal850Count !== undefined ? doc.voucherMeal850Count : (meta.voucherMeal850Count || 0),
        isBlacklisted: doc.isBlacklisted !== undefined ? Boolean(doc.isBlacklisted) : Boolean(meta.isBlacklisted),
        blacklistReason: doc.blacklistReason || meta.blacklistReason || '',
        blacklistedAt: doc.blacklistedAt || meta.blacklistedAt,
        stampHistory: JSON.parse(doc.stampHistoryJson || '[]'),
        totalOrdersCount: doc.totalOrdersCount || 0,
        lastOrderId: doc.lastOrderId,
        lastOrderSummary: doc.lastOrderSummary,
        lastOrderDate: doc.lastOrderDate,
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
      return res.documents.map((doc: any) => {
        const meta = (() => {
          try {
            return JSON.parse(doc.milestonesRedeemedJson || '{}');
          } catch {
            return {};
          }
        })();
        return {
          id: doc.$id,
          authUserId: doc.userId,
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          role: doc.role,
          currentStampCount: doc.currentStampCount,
          completedCardsCount: doc.completedCardsCount,
          milestoneRedemptions: {
            stamp4: Boolean(meta.stamp4),
            stamp8: Boolean(meta.stamp8),
            stamp12: Boolean(meta.stamp12),
          },
          voucherSide350Count: doc.voucherSide350Count !== undefined ? doc.voucherSide350Count : (meta.voucherSide350Count || 0),
          voucherSide450Count: doc.voucherSide450Count !== undefined ? doc.voucherSide450Count : (meta.voucherSide450Count || 0),
          voucherMeal850Count: doc.voucherMeal850Count !== undefined ? doc.voucherMeal850Count : (meta.voucherMeal850Count || 0),
          isBlacklisted: doc.isBlacklisted !== undefined ? Boolean(doc.isBlacklisted) : Boolean(meta.isBlacklisted),
          blacklistReason: doc.blacklistReason || meta.blacklistReason || '',
          blacklistedAt: doc.blacklistedAt || meta.blacklistedAt,
          stampHistory: JSON.parse(doc.stampHistoryJson || '[]'),
          totalOrdersCount: doc.totalOrdersCount || 0,
          lastOrderId: doc.lastOrderId,
          lastOrderSummary: doc.lastOrderSummary,
          lastOrderDate: doc.lastOrderDate,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt,
        };
      });
    } catch (err) {
      return localStore.getAllProfiles();
    }
  },

  async deleteCustomerProfile(userId: string): Promise<void> {
    if (!isCloudConnected) {
      localStore.deleteProfile(userId);
      return;
    }
    try {
      const prof = await this.getUserProfile(userId);
      await databases.deleteDocument(DB_ID, 'profiles', prof.id);
    } catch {
      try {
        await databases.deleteDocument(DB_ID, 'profiles', userId);
      } catch {
        // ignore
      }
    }
    localStore.deleteProfile(userId);
  },

  async updateUserStamps(
    userId: string,
    newStampCount: number,
    historyEntry: Omit<StampEvent, 'id' | 'timestamp' | 'balanceAfter'>,
    milestoneUpdates?: Partial<MilestoneStatus>,
    voucherDeltas?: { side350?: number; side450?: number; meal850?: number }
  ): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.updateUserStamps(userId, newStampCount, historyEntry, milestoneUpdates, voucherDeltas);
    try {
      const profile = await this.getUserProfile(userId);
      const oldLifetime = (profile.completedCardsCount * 12) + profile.currentStampCount;

      let stampsEarned = historyEntry.stamps || 0;
      if (historyEntry.type === 'manual_migration') {
        stampsEarned = newStampCount;
      }

      let newLifetime = historyEntry.type === 'manual_migration' ? stampsEarned : (oldLifetime + stampsEarned);
      if (newLifetime < 0) newLifetime = 0;

      let newSide350 = profile.voucherSide350Count || 0;
      let newSide450 = profile.voucherSide450Count || 0;
      let newMeal850 = profile.voucherMeal850Count || 0;

      if (stampsEarned > 0) {
        const start = historyEntry.type === 'manual_migration' ? 0 : oldLifetime;
        const end = newLifetime;
        const maxCycles = Math.ceil(end / 12) + 1;
        for (let k = 0; k < maxCycles; k++) {
          const t4 = k * 12 + 4;
          const t8 = k * 12 + 8;
          const t12 = k * 12 + 12;
          if (start < t4 && end >= t4) newSide350 += 1;
          if (start < t8 && end >= t8) newSide450 += 1;
          if (start < t12 && end >= t12) newMeal850 += 1;
        }
      }

      if (voucherDeltas) {
        if (voucherDeltas.side350) newSide350 = Math.max(0, newSide350 + voucherDeltas.side350);
        if (voucherDeltas.side450) newSide450 = Math.max(0, newSide450 + voucherDeltas.side450);
        if (voucherDeltas.meal850) newMeal850 = Math.max(0, newMeal850 + voucherDeltas.meal850);
      }

      const finalCompletedCards = newLifetime > 0 && newLifetime % 12 === 0
        ? (newLifetime / 12) - 1
        : Math.floor(newLifetime / 12);
      const finalStamps = newLifetime > 0 && newLifetime % 12 === 0
        ? 12
        : (newLifetime % 12);

      const event: StampEvent = {
        ...historyEntry,
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        balanceAfter: finalStamps,
      };

      const metaPayload = {
        stamp4: finalStamps >= 4,
        stamp8: finalStamps >= 8,
        stamp12: finalStamps >= 12,
        voucherSide350Count: newSide350,
        voucherSide450Count: newSide450,
        voucherMeal850Count: newMeal850,
        isBlacklisted: profile.isBlacklisted || false,
        blacklistReason: profile.blacklistReason || '',
        blacklistedAt: profile.blacklistedAt,
      };

      const payload: any = {
        currentStampCount: finalStamps,
        completedCardsCount: finalCompletedCards,
        milestonesRedeemedJson: JSON.stringify(metaPayload),
        stampHistoryJson: JSON.stringify([event, ...profile.stampHistory]),
      };

      const doc: any = await databases.updateDocument(DB_ID, 'profiles', profile.id, payload);

      return {
        id: doc.$id,
        authUserId: doc.userId,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        role: doc.role,
        currentStampCount: finalStamps,
        completedCardsCount: finalCompletedCards,
        milestoneRedemptions: {
          stamp4: finalStamps >= 4,
          stamp8: finalStamps >= 8,
          stamp12: finalStamps >= 12,
        },
        voucherSide350Count: newSide350,
        voucherSide450Count: newSide450,
        voucherMeal850Count: newMeal850,
        isBlacklisted: profile.isBlacklisted || false,
        blacklistReason: profile.blacklistReason || '',
        blacklistedAt: profile.blacklistedAt,
        stampHistory: [event, ...profile.stampHistory],
        totalOrdersCount: doc.totalOrdersCount,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
      };
    } catch (err) {
      console.warn('Appwrite updateUserStamps failed, falling back:', err);
      return localStore.updateUserStamps(userId, newStampCount, historyEntry, milestoneUpdates, voucherDeltas);
    }
  },

  async blacklistCustomer(userId: string, reason: string): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.blacklistCustomer(userId, reason);
    try {
      const profile = await this.getUserProfile(userId);
      const metaPayload = {
        ...profile.milestoneRedemptions,
        voucherSide350Count: profile.voucherSide350Count,
        voucherSide450Count: profile.voucherSide450Count,
        voucherMeal850Count: profile.voucherMeal850Count,
        isBlacklisted: true,
        blacklistReason: reason,
        blacklistedAt: new Date().toISOString(),
      };
      await databases.updateDocument(DB_ID, 'profiles', profile.id, {
        milestonesRedeemedJson: JSON.stringify(metaPayload),
      });
      return {
        ...profile,
        isBlacklisted: true,
        blacklistReason: reason,
        blacklistedAt: metaPayload.blacklistedAt,
      };
    } catch (err) {
      console.warn('Appwrite blacklistCustomer failed, falling back:', err);
      return localStore.blacklistCustomer(userId, reason);
    }
  },

  async unblacklistCustomer(userId: string): Promise<UserProfile> {
    if (!isCloudConnected) return localStore.unblacklistCustomer(userId);
    try {
      const profile = await this.getUserProfile(userId);
      const metaPayload = {
        ...profile.milestoneRedemptions,
        voucherSide350Count: profile.voucherSide350Count,
        voucherSide450Count: profile.voucherSide450Count,
        voucherMeal850Count: profile.voucherMeal850Count,
        isBlacklisted: false,
        blacklistReason: '',
        blacklistedAt: undefined,
      };
      await databases.updateDocument(DB_ID, 'profiles', profile.id, {
        milestonesRedeemedJson: JSON.stringify(metaPayload),
      });
      return {
        ...profile,
        isBlacklisted: false,
        blacklistReason: '',
        blacklistedAt: undefined,
      };
    } catch (err) {
      console.warn('Appwrite unblacklistCustomer failed, falling back:', err);
      return localStore.unblacklistCustomer(userId);
    }
  },

  async markOrderUncollected(orderId: string, remark: string, customerId?: string | null): Promise<Order> {
    if (customerId) {
      await this.blacklistCustomer(customerId, remark);
    }
    return this.updateOrderStatus(orderId, {
      fulfillmentStatus: 'cancelled',
      paymentStatus: 'unpaid',
      isUncollected: true,
      uncollectedRemark: remark,
    });
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

  // --- Auth Methods ---
  async loginWithGoogle(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nyo_guest_mode');
    }

    if (!isCloudConnected) {
      const mockUser: AuthUser = {
        id: `google_${Date.now().toString().slice(-6)}`,
        name: 'Google Member',
        email: 'member@gmail.com',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyo_auth_user', JSON.stringify(mockUser));
      }
      localStore.getProfile(mockUser.id, mockUser.name, mockUser.email);
      return;
    }

    const redirectUrl = window.location.href.split('?')[0].split('#')[0];
    await account.createOAuth2Token(OAuthProvider.Google, redirectUrl, redirectUrl);
  },

  async handleOAuthCallback(): Promise<AuthUser | null> {
    if (typeof window === 'undefined' || !isCloudConnected) return null;
    const url = new URL(window.location.href);
    const userId = url.searchParams.get('userId');
    const secret = url.searchParams.get('secret');

    if (userId && secret) {
      try {
        await account.createSession(userId, secret);
        url.searchParams.delete('userId');
        url.searchParams.delete('secret');
        window.history.replaceState({}, '', url.toString());

        const acc = await account.get();
        const user: AuthUser = {
          id: acc.$id,
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
        };
        localStorage.setItem('nyo_auth_user', JSON.stringify(user));
        localStorage.removeItem('nyo_guest_mode');
        return user;
      } catch (err) {
        console.warn('Appwrite createSession from OAuth token failed:', err);
      }
    }
    return null;
  },

  async signupWithEmail(email: string, password: string, name: string, phone?: string): Promise<AuthUser> {
    if (!isCloudConnected) {
      const mockUser: AuthUser = {
        id: `user_${Date.now().toString().slice(-6)}`,
        name: name || 'Member',
        email,
        phone,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyo_auth_user', JSON.stringify(mockUser));
        localStorage.removeItem('nyo_guest_mode');
      }
      const prof = localStore.getProfile(mockUser.id);
      prof.name = mockUser.name;
      prof.email = mockUser.email;
      prof.phone = mockUser.phone;
      return mockUser;
    }

    const userId = ID.unique();
    await account.create(userId, email, password, name);
    await account.createEmailPasswordSession(email, password);

    // Create cloud profile record
    await databases.createDocument(DB_ID, 'profiles', ID.unique(), {
      userId,
      name,
      email,
      phone: phone || '',
      role: 'customer',
      currentStampCount: 0,
      completedCardsCount: 0,
      milestonesRedeemedJson: JSON.stringify({ stamp4: false, stamp8: false, stamp12: false }),
      stampHistoryJson: '[]',
      totalOrdersCount: 0,
    });

    const user: AuthUser = { id: userId, name, email, phone };
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyo_auth_user', JSON.stringify(user));
      localStorage.removeItem('nyo_guest_mode');
    }
    return user;
  },

  async loginWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!isCloudConnected) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('nyo_auth_user') : null;
      if (saved) {
        const u = JSON.parse(saved);
        localStorage.removeItem('nyo_guest_mode');
        return u;
      }
      const mockUser: AuthUser = {
        id: `user_${Date.now().toString().slice(-6)}`,
        name: email.split('@')[0],
        email,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nyo_auth_user', JSON.stringify(mockUser));
        localStorage.removeItem('nyo_guest_mode');
      }
      return mockUser;
    }

    await account.createEmailPasswordSession(email, password);
    const acc = await account.get();
    const user: AuthUser = { id: acc.$id, name: acc.name, email: acc.email, phone: acc.phone };
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyo_auth_user', JSON.stringify(user));
      localStorage.removeItem('nyo_guest_mode');
    }
    return user;
  },

  async loginWithPhone(phone: string, password: string, name?: string): Promise<AuthUser> {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneEmail = `${cleanPhone}@nyopasta.internal`;
    try {
      return await this.loginWithEmail(phoneEmail, password);
    } catch {
      return await this.signupWithEmail(phoneEmail, password, name || `Member ${cleanPhone.slice(-4)}`, phone);
    }
  },

  loginAsGuest(): AuthUser {
    const guestUser: AuthUser = {
      id: `guest_${Date.now().toString().slice(-6)}`,
      name: 'Guest Customer',
      isGuest: true,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('nyo_guest_mode', 'true');
      localStorage.removeItem('nyo_auth_user');
    }
    return guestUser;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (isCloudConnected) {
      try {
        const acc = await account.get();
        const user: AuthUser = {
          id: acc.$id,
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
        };
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nyo_guest_mode');
          localStorage.setItem('nyo_auth_user', JSON.stringify(user));
        }
        return user;
      } catch {
        // No active cloud session
      }
    }

    if (typeof window !== 'undefined' && localStorage.getItem('nyo_guest_mode') === 'true') {
      return { id: 'guest', name: 'Guest Customer', isGuest: true };
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nyo_auth_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  },

  async logout(): Promise<void> {
    if (isCloudConnected) {
      try {
        await account.deleteSession('current');
      } catch {}
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nyo_auth_user');
      localStorage.removeItem('nyo_guest_mode');
      localStorage.removeItem('nyo_customer_profile');
      localStorage.removeItem('nyo_cart_items');
      localStorage.removeItem('nyo_last_order');
    }
  },
};
