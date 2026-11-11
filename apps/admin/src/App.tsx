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
  ChevronDown,
  BarChart2,
} from 'lucide-react';
import { Header } from './components/Header';
import { OrdersTab } from './components/OrdersTab';
import { InventoryTab } from './components/InventoryTab';
import { SettingsTab } from './components/SettingsTab';
import { ScannerTab } from './components/ScannerTab';
import { CustomersTab } from './components/CustomersTab';
import { StatsTab } from './components/StatsTab';
import { AdminLogin } from './components/AdminLogin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { unlockAudioContext } from './utils/audio';

export default function App() {
  const [adminUser, setAdminUser] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nyo_admin_auth') : null;
  });
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'scanner' | 'customers' | 'stats' | 'settings'>('orders');
  const [scannerPrefillId, setScannerPrefillId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [showScannerScrollDown, setShowScannerScrollDown] = useState(false);

  // Check if admin scanner page has content below the fold
  const checkScannerScroll = useCallback(() => {
    if (activeTab !== 'scanner') {
      setShowScannerScrollDown(false);
      return;
    }
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const canScroll = scrollHeight > clientHeight + 30;
    const isAtTop = scrollTop < 40;
    setShowScannerScrollDown(canScroll && isAtTop);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'scanner') {
      const timer = setTimeout(checkScannerScroll, 250);
      window.addEventListener('scroll', checkScannerScroll, { passive: true });
      window.addEventListener('resize', checkScannerScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', checkScannerScroll);
        window.removeEventListener('resize', checkScannerScroll);
      };
    } else {
      setShowScannerScrollDown(false);
    }
  }, [activeTab, checkScannerScroll]);

  const scrollToMoreScanner = () => {
    window.scrollBy({ top: 320, behavior: 'smooth' });
  };

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

    // 3. Heartbeat polling: poll orders every 3.5s for bulletproof delivery
    const pollInterval = setInterval(() => {
      api.getOrders().then((latestOrders) => {
        if (latestOrders) setOrders(latestOrders);
      }).catch(() => {});
    }, 3500);

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
      clearInterval(pollInterval);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm('Log out from kitchen admin?')) {
      localStorage.removeItem('nyo_admin_auth');
      setAdminUser(null);
    }
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

  if (!adminUser) {
    return <AdminLogin onLoginSuccess={(u) => setAdminUser(u)} />;
  }

  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      style={{
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Top Header */}
      <Header
        storeSettings={storeSettings}
        adminUser={adminUser}
        onLogout={handleLogout}
        onQuickToggleShop={handleQuickToggleShop}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-2 sm:p-4 max-w-4xl mx-auto w-full">
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

        {activeTab === 'scanner' && (
          <ErrorBoundary fallbackTitle="QR Scanner could not start">
            <ScannerTab
              prefillUserId={scannerPrefillId}
              onClearPrefill={() => setScannerPrefillId(null)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'customers' && (
          <CustomersTab
            orders={orders}
            onSelectCustomerForCredit={(userId) => {
              setScannerPrefillId(userId);
              setActiveTab('scanner');
            }}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab orders={orders} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            storeSettings={storeSettings}
            onSettingsSaved={refreshSettings}
          />
        )}

        {/* Scroll Down Hint Button on Scanner Page */}
        {activeTab === 'scanner' && showScannerScrollDown && (
          <button
            type="button"
            onClick={scrollToMoreScanner}
            className="fixed right-4 z-20 bg-white/95 text-navy border border-gray-300 rounded-full p-2.5 shadow-xl flex items-center justify-center backdrop-blur-xs animate-bounce active:scale-95 transition-transform"
            style={{
              bottom: 'calc(4.8rem + env(safe-area-inset-bottom, 0px))',
            }}
            title="More below · Scroll down"
            aria-label="More below · Scroll down"
          >
            <ChevronDown className="w-5 h-5 text-terracotta" />
          </button>
        )}
      </main>

      {/* Admin Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around pt-2 z-30 shadow-lg"
        style={{
          paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
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
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'stats' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <BarChart2 className="w-5 h-5 mb-0.5" />
          Stats
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
