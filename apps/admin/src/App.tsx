import { useState, useEffect, useCallback } from 'react';
import {
  MenuItem,
  Order,
  StoreSettings,
  DEFAULT_STORE_SETTINGS,
  INITIAL_MENU_ITEMS,
  api,
} from '@nyopasta/shared';
import {
  ClipboardList,
  Package,
  QrCode,
  Users,
  Settings,
} from 'lucide-react';
import { Header } from './components/Header';
import { OrdersTab } from './components/OrdersTab';
import { InventoryTab } from './components/InventoryTab';
import { SettingsTab } from './components/SettingsTab';
import { ScannerTab } from './components/ScannerTab';
import { CustomersTab } from './components/CustomersTab';
import { unlockAudioContext } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'scanner' | 'customers' | 'settings'>('orders');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Load and subscribe to real-time updates
  useEffect(() => {
    // 1. Initial fetches
    api.getMenuItems().then((items) => {
      if (items && items.length > 0) setMenuItems(items);
    });

    api.getStoreSettings().then((settings) => {
      if (settings) setStoreSettings(settings);
    });

    api.getOrders().then((initialOrders) => {
      if (initialOrders && initialOrders.length > 0) {
        setOrders(initialOrders);
      } else {
        // Seed default starter orders for kitchen queue demonstration
        seedInitialSampleOrders();
      }
    });

    // 2. Realtime subscriptions
    const unsubMenu = api.subscribeToMenuItems((items) => {
      setMenuItems(items);
    });

    const unsubOrders = api.subscribeToOrders((newOrders) => {
      setOrders(newOrders);
    });

    const unsubSettings = api.subscribeToStoreSettings((settings) => {
      setStoreSettings(settings);
    });

    // Unlock Web Audio context on any first touch or click
    const handleFirstInteraction = () => {
      unlockAudioContext();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      unsubMenu();
      unsubOrders();
      unsubSettings();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Seed sample kitchen orders if fresh database has no orders yet
  const seedInitialSampleOrders = async () => {
    const existing = await api.getOrders();
    if (existing.length > 0) return;

    // Order 1: Oldest active, UNPAID (Pay at Counter), Dine-in
    await api.createOrder({
      customerName: 'Marcus Lim',
      customerContact: '91234567',
      isGuest: false,
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 14.5,
      discountAmount: 0,
      total: 14.5,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 1,
      stampsEarned: 1,
      items: [
        {
          id: 'item_seed_1a',
          menuItemId: 'main-1',
          name: 'Prawn Cream Pasta',
          chineseName: '奶油虾面',
          category: 'mains',
          isKidPortion: false,
          unitPrice: 8.5,
          quantity: 1,
          selectedAddOns: [
            {
              id: 'addon-scrambled-egg',
              name: 'Scrambled Egg',
              chineseName: '滑蛋',
              price: 1.0,
              quantity: 1,
            },
            {
              id: 'addon-sauce-mentaiko',
              name: 'Extra Sauce (Mentaiko)',
              chineseName: '加酱 (明太子)',
              price: 0.5,
              quantity: 1,
            },
          ],
          specialInstructions: 'Less spicy please',
          itemTotal: 10.0,
        },
        {
          id: 'item_seed_1b',
          menuItemId: 'side-10',
          name: 'Soy Garlic Korean Fried Chicken',
          chineseName: '酱油蒜香炸鸡',
          category: 'sides',
          isKidPortion: false,
          unitPrice: 4.5,
          quantity: 1,
          selectedAddOns: [],
          itemTotal: 4.5,
        },
      ],
    });

    // Order 2: Newer, PAID (PayNow), Takeaway
    await api.createOrder({
      customerName: 'Sarah Tan',
      customerContact: '98765432',
      isGuest: true,
      fulfillmentType: 'takeaway',
      takeawayFee: 0.3,
      subtotal: 11.0,
      discountAmount: 0,
      total: 11.3,
      paymentMethod: 'paynow',
      paymentStatus: 'paid',
      fulfillmentStatus: 'preparing',
      mainsCount: 1,
      stampsEarned: 1,
      items: [
        {
          id: 'item_seed_2a',
          menuItemId: 'main-2',
          name: 'Bacon Mushroom Aglio Olio',
          chineseName: '培根蘑菇蒜香面',
          category: 'mains',
          isKidPortion: false,
          unitPrice: 7.5,
          quantity: 1,
          selectedAddOns: [],
          itemTotal: 7.5,
        },
        {
          id: 'item_seed_2b',
          menuItemId: 'side-14',
          name: 'Truffle Mushroom Focaccia',
          chineseName: '松露蘑菇佛卡夏',
          category: 'sides',
          isKidPortion: false,
          unitPrice: 3.5,
          quantity: 1,
          selectedAddOns: [],
          itemTotal: 3.5,
        },
      ],
    });

    // Refresh state
    const refreshed = await api.getOrders();
    setOrders(refreshed);
  };

  const refreshMenu = useCallback(async () => {
    const items = await api.getMenuItems();
    setMenuItems(items);
  }, []);

  const refreshOrders = useCallback(async () => {
    const list = await api.getOrders();
    setOrders(list);
  }, []);

  const refreshSettings = useCallback(async () => {
    const current = await api.getStoreSettings();
    setStoreSettings(current);
  }, []);

  // Quick toggle shop from header
  const handleQuickToggleShop = async () => {
    if (storeSettings.isManuallyClosed) {
      if (window.confirm('Open shop for the day? Normal stock availability will be restored.')) {
        await api.updateStoreSettings({
          isManuallyClosed: false,
          manualCloseReason: '',
          bannerMessage: '',
        });
        await Promise.all(menuItems.map((item) => api.updateMenuItemSoldOut(item.id, false)));
        await refreshSettings();
        await refreshMenu();
      }
    } else {
      if (window.confirm('Close shop for the day? All items will be marked sold out and customer app will display closed notice.')) {
        await api.updateStoreSettings({
          isManuallyClosed: true,
          manualCloseReason: 'Closed for the day',
          bannerMessage: 'Notice: Shop is closed for the day. Online ordering is paused.',
        });
        await Promise.all(menuItems.map((item) => api.updateMenuItemSoldOut(item.id, true)));
        await refreshSettings();
        await refreshMenu();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-20">
      {/* Top Header */}
      <Header
        storeSettings={storeSettings}
        onQuickToggleShop={handleQuickToggleShop}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {activeTab === 'orders' && (
          <OrdersTab orders={orders} onOrderUpdated={refreshOrders} />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            menuItems={menuItems}
            storeSettings={storeSettings}
            onMenuUpdated={refreshMenu}
            onSettingsUpdated={refreshSettings}
          />
        )}

        {activeTab === 'scanner' && <ScannerTab />}

        {activeTab === 'customers' && (
          <CustomersTab onSelectCustomerForCredit={() => setActiveTab('scanner')} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            storeSettings={storeSettings}
            onSettingsSaved={refreshSettings}
          />
        )}
      </main>

      {/* Admin Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around py-2 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          Orders
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'inventory' ? 'text-terracotta' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          Stock
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'scanner' ? 'text-terracotta' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Scan QR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'customers' ? 'text-terracotta' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          Users
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'settings' ? 'text-terracotta' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          Settings
        </button>
      </nav>
    </div>
  );
}
