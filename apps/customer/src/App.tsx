import { useState } from 'react';
import {
  INITIAL_MENU_ITEMS,
  DEFAULT_STORE_SETTINGS,
  isStoreCurrentlyOpen,
  forceResetPwaCache,
  MenuItemCategory,
} from '@nyopasta/shared';
import { RefreshCw, ShoppingBag, Award, Clock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'menu' | 'loyalty' | 'orders'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<MenuItemCategory>('mains');
  const storeStatus = isStoreCurrentlyOpen(DEFAULT_STORE_SETTINGS);

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto shadow-xl relative pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-cream-dark px-4 py-3 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="NYO Pasta" className="w-10 h-10 rounded-full border border-terracotta object-cover" />
          <div>
            <h1 className="font-bold text-lg text-terracotta leading-tight">NYO PASTA</h1>
            <p className="text-xs text-gray-500 font-medium">Toa Payoh Palm Spring #01-54</p>
          </div>
        </div>

        {/* Force PWA Cache Reset Button */}
        <button
          onClick={() => {
            if (window.confirm('Reset application cache and reload fresh?')) {
              forceResetPwaCache();
            }
          }}
          title="Force update app and reset cache"
          className="p-2 text-gray-400 hover:text-terracotta active:rotate-180 transition-all rounded-full bg-cream-light border border-cream-dark"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Store Closed Banner if applicable */}
      {!storeStatus.isOpen && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 font-medium flex items-center justify-between">
          <span>{storeStatus.bannerMessage || storeStatus.reason}</span>
          <span className="bg-red-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Closed</span>
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 p-4">
        {activeTab === 'menu' && (
          <div>
            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none">
              {(['mains', 'soups', 'sides'] as MenuItemCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-terracotta text-white shadow-sm'
                      : 'bg-white text-navy border border-cream-dark'
                  }`}
                >
                  {cat === 'mains' ? 'Mains 主食' : cat === 'soups' ? 'Artisanal Soups 浓汤' : 'Sides 小菜'}
                </button>
              ))}
            </div>

            {/* Menu List */}
            <div className="space-y-3 mt-2">
              {INITIAL_MENU_ITEMS.filter((item) => item.category === selectedCategory).map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3 border border-cream-dark shadow-sm flex justify-between items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-navy text-sm leading-snug">{item.name}</h3>
                      {item.tag && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-terracotta font-medium mt-0.5">{item.chineseName}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-extrabold text-navy">${item.price.toFixed(2)}</span>
                      {item.isKidOption && item.kidPrice && (
                        <span className="text-[11px] text-gray-500">Kid portion: ${item.kidPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <button className="bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 mt-1">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-terracotta mx-auto mb-2" />
            <h2 className="text-lg font-bold text-navy">NYO Virtual Loyalty Card</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Earn 1 stamp for every main purchased. Redeem exclusive sides and pasta discounts!
            </p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-navy">Order History</h2>
            <p className="text-xs text-gray-500 mt-1">Track active orders or re-order your favorites in one tap.</p>
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-cream-dark flex items-center justify-around py-2 z-30 shadow-lg">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center text-xs font-semibold ${
            activeTab === 'menu' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          Menu
        </button>
        <button
          onClick={() => setActiveTab('loyalty')}
          className={`flex flex-col items-center text-xs font-semibold ${
            activeTab === 'loyalty' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <Award className="w-5 h-5 mb-0.5" />
          Loyalty
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-semibold ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-gray-400'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          Orders
        </button>
      </nav>
    </div>
  );
}
