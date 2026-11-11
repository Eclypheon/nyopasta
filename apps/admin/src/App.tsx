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
      setOrders(initialOrders || []);
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          Orders
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'inventory' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          Stock
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'scanner' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Scan QR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'customers' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          Users
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'settings' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          Settings
        </button>
      </nav>
    </div>
  );
}
