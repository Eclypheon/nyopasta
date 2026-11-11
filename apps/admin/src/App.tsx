import { useState } from 'react';
import {
  INITIAL_MENU_ITEMS,
  DEFAULT_STORE_SETTINGS,
  forceResetPwaCache,
} from '@nyopasta/shared';
import {
  ClipboardList,
  Package,
  QrCode,
  Users,
  Settings,
  RefreshCw,
  Power,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'scanner' | 'customers' | 'settings'>('orders');
  const [menuItems, setMenuItems] = useState(INITIAL_MENU_ITEMS);
  const [isStoreClosed, setIsStoreClosed] = useState(DEFAULT_STORE_SETTINGS.isManuallyClosed);

  // Toggle sold out in 1 tap
  const toggleSoldOut = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSoldOut: !item.isSoldOut } : item))
    );
  };

  // Close shop for the day
  const handleCloseShop = () => {
    if (window.confirm('Close shop for the day? All items will be marked sold out and customer app will display closed banner.')) {
      setIsStoreClosed(true);
      setMenuItems((prev) => prev.map((item) => ({ ...item, isSoldOut: true })));
    }
  };

  // Open shop for the day
  const handleOpenShop = () => {
    if (window.confirm('Open shop for the day? Normal stock availability will be restored.')) {
      setIsStoreClosed(false);
      setMenuItems((prev) => prev.map((item) => ({ ...item, isSoldOut: false })));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-20">
      {/* Admin Top Header */}
      <header className="bg-navy text-white px-4 py-3 sticky top-0 z-30 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/stamp-darkblue.png" alt="Admin" className="w-8 h-8 rounded-full bg-white p-0.5 object-contain" />
          <div>
            <h1 className="font-bold text-base leading-tight">NYO KITCHEN & ADMIN</h1>
            <p className="text-[11px] text-gray-300">Toa Payoh Palm Spring</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Shop open/close quick toggle */}
          {isStoreClosed ? (
            <button
              onClick={handleOpenShop}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm"
            >
              <Power className="w-3.5 h-3.5" />
              Open Shop
            </button>
          ) : (
            <button
              onClick={handleCloseShop}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm"
            >
              <Power className="w-3.5 h-3.5" />
              Close Shop
            </button>
          )}

          {/* Force PWA Cache Reset Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset admin app cache and reload fresh?')) {
                forceResetPwaCache();
              }
            }}
            title="Reset PWA cache"
            className="p-1.5 text-gray-300 hover:text-white rounded bg-navy-900 border border-navy"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-lg">Active Orders (Oldest First)</h2>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                Live Kitchen Queue
              </span>
            </div>

            {/* Sample Oldest Order Expanded Card */}
            <div className="bg-white rounded-xl border-2 border-terracotta p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-terracotta text-white font-black text-sm px-2.5 py-0.5 rounded">
                    #NYO-101
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Placed 4 mins ago (Oldest Active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded">
                    Pay at Counter (Unpaid)
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">
                    Dine-in
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-bold text-gray-900">1x Prawn Cream Pasta (奶油虾面)</span>
                    <p className="text-xs text-gray-500">+ Scrambled Egg ($1.00), Extra Sauce Mentaiko ($0.50)</p>
                  </div>
                  <span className="font-bold text-gray-900">$10.00</span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-bold text-gray-900">1x Soy Garlic Fried Chicken (酱油蒜香炸鸡)</span>
                  </div>
                  <span className="font-bold text-gray-900">$4.50</span>
                </div>
              </div>

              <div className="border-t pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">Total payable:</span>
                  <p className="text-lg font-black text-gray-900">$14.50</p>
                </div>
                <button
                  onClick={() => {
                    // Warning safeguard for unpaid orders
                    alert('Warning: Order is marked UNPAID (Pay at Counter). Please remember to collect $14.50 payment from the customer before fulfilling.');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  Collect & Fulfill Order
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Menu Stock & Availability</h2>
                <p className="text-xs text-gray-500">Tap any item to instantly toggle sold out state on customer app.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleSoldOut(item.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    item.isSoldOut
                      ? 'bg-red-50 border-red-200 opacity-75'
                      : 'bg-white border-gray-200 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    <h3 className={`font-bold text-sm ${item.isSoldOut ? 'line-through text-red-700' : 'text-gray-900'}`}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500">{item.chineseName}</p>
                    <span className="text-xs font-semibold text-gray-700">${item.price.toFixed(2)}</span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.isSoldOut ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.isSoldOut ? 'Sold Out' : 'In Stock'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="bg-white rounded-xl p-6 border text-center max-w-md mx-auto">
            <QrCode className="w-12 h-12 text-navy mx-auto mb-3" />
            <h2 className="font-bold text-lg text-gray-900">Loyalty Stamp Migration Scanner</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Scan customer member QR code to credit stamps from their physical card into their account.
            </p>
            <div className="w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center text-white text-xs">
              Camera preview container
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-xl p-4 border">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Customer Loyalty Analytics</h2>
            <p className="text-xs text-gray-500">Track customer stamp counts, order counts, and last activity.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-4 border">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Store Operating Hours & Settings</h2>
            <p className="text-xs text-gray-500">Configure weekly automated schedule and PayNow details.</p>
          </div>
        )}
      </main>

      {/* Admin Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around py-2 z-30 shadow-lg">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-bold ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center text-xs font-bold ${
            activeTab === 'inventory' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          Stock
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center text-xs font-bold ${
            activeTab === 'scanner' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          Scan QR
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center text-xs font-bold ${
            activeTab === 'customers' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center text-xs font-bold ${
            activeTab === 'settings' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          Settings
        </button>
      </nav>
    </div>
  );
}
