import { useState, useEffect } from 'react';
import {
  MenuItem,
  MenuItemCategory,
  Order,
  INITIAL_MENU_ITEMS,
  api,
} from '@nyopasta/shared';
import { ShoppingBag, Award, Clock, ArrowRight } from 'lucide-react';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { StoreStatusBanner } from './components/StoreStatusBanner';
import { CategoryNav } from './components/CategoryNav';
import { MenuCard } from './components/MenuCard';
import { ItemModal } from './components/ItemModal';
import { CartDrawer } from './components/CartDrawer';
import { LoyaltyCard } from './components/LoyaltyCard';
import { MemberQrModal } from './components/MemberQrModal';
import { OrderHistoryView } from './components/OrderHistoryView';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { ReorderBanner } from './components/ReorderBanner';

function CustomerAppContent() {
  const [activeTab, setActiveTab] = useState<'menu' | 'loyalty' | 'orders'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<MenuItemCategory>('mains');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  const {
    isCartOpen,
    setIsCartOpen,
    totalItemCount,
    total,
    lastOrder,
    reorderOrder,
    storeSettings,
  } = useCart();

  // Real-time subscription to menu items (reflects admin sold-out toggles immediately)
  useEffect(() => {
    const unsub = api.subscribeToMenuItems((items) => {
      setMenuItems(items);
    });
    return () => unsub();
  }, []);

  // Filter menu items by category and subcategory
  const filteredItems = menuItems.filter((item) => {
    if (item.category !== selectedCategory) return false;
    if (selectedCategory === 'sides' && selectedSubcategory !== 'All') {
      return item.subcategory === selectedSubcategory;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-md mx-auto shadow-2xl relative pb-24 text-navy">
      {/* Sticky Brand Header */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Real-time Store Status Banner */}
      <StoreStatusBanner settings={storeSettings} />

      {/* Main View Area */}
      <main className="flex-1 p-4">
        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-3">
            {/* 1-Tap Reorder Quick Banner if last order exists */}
            {lastOrder && (
              <ReorderBanner
                lastOrder={lastOrder}
                onReorder={reorderOrder}
              />
            )}

            {/* Category Navigation Pills */}
            <CategoryNav
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedSubcategory('All');
              }}
              selectedSubcategory={selectedSubcategory}
              onSelectSubcategory={setSelectedSubcategory}
            />

            {/* Menu Items List */}
            <div className="space-y-3 pt-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-navy/50 text-xs">
                  No items available in this category.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    onSelect={(selected) => setSelectedItemForModal(selected)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Loyalty Tab */}
        {activeTab === 'loyalty' && (
          <LoyaltyCard
            onOpenQrModal={() => setIsQrModalOpen(true)}
          />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <OrderHistoryView
            onGoToMenu={() => setActiveTab('menu')}
          />
        )}
      </main>

      {/* Floating Bottom Cart Bar (visible on menu tab when cart has items) */}
      {activeTab === 'menu' && totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 z-20 pointer-events-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-navy text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between pointer-events-auto active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-terracotta text-white font-black text-xs flex items-center justify-center">
                {totalItemCount}
              </span>
              <span className="font-extrabold text-xs">View Current Cart</span>
            </div>
            <div className="flex items-center gap-2 font-black text-xs">
              <span>${total.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4 text-pasta-gold" />
            </div>
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-cream-dark flex items-center justify-around py-2.5 z-30 shadow-lg">
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center text-xs font-extrabold transition-colors ${
            activeTab === 'menu' ? 'text-terracotta' : 'text-navy/40 hover:text-navy/70'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>

        <button
          onClick={() => setActiveTab('loyalty')}
          className={`flex flex-col items-center text-xs font-extrabold transition-colors ${
            activeTab === 'loyalty' ? 'text-terracotta' : 'text-navy/40 hover:text-navy/70'
          }`}
        >
          <Award className="w-5 h-5 mb-0.5" />
          <span>Loyalty</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-extrabold transition-colors ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-navy/40 hover:text-navy/70'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>Orders</span>
        </button>
      </nav>

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <ItemModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={(order) => {
          setPlacedOrder(order);
        }}
      />

      {/* Member Cashier QR Modal */}
      <MemberQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Order Placement Success Receipt Modal */}
      {placedOrder && (
        <OrderSuccessModal
          order={placedOrder}
          onClose={() => setPlacedOrder(null)}
          onGoToLoyalty={() => {
            setPlacedOrder(null);
            setActiveTab('loyalty');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <CustomerAppContent />
    </CartProvider>
  );
}
