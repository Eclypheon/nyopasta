import { useState, useEffect, useRef } from 'react';
import {
  MenuItem,
  Order,
  INITIAL_MENU_ITEMS,
  api,
} from '@nyopasta/shared';
import { ShoppingBag, Award, Clock, ArrowRight } from 'lucide-react';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { StoreStatusBanner } from './components/StoreStatusBanner';
import { CategorySidebar, CATEGORIES } from './components/CategorySidebar';
import { MenuCard } from './components/MenuCard';
import { ItemModal } from './components/ItemModal';
import { CartDrawer } from './components/CartDrawer';
import { LoyaltyCard } from './components/LoyaltyCard';
import { MemberQrModal } from './components/MemberQrModal';
import { OrderHistoryView } from './components/OrderHistoryView';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { ReorderBanner } from './components/ReorderBanner';
import { AuthModal } from './components/AuthModal';
import { PayNowModal } from './components/PayNowModal';

function CustomerAppContent() {
  const [activeTab, setActiveTab] = useState<'menu' | 'loyalty' | 'orders'>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('cat-mains');
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [reopenPayNowOrder, setReopenPayNowOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    isCartOpen,
    setIsCartOpen,
    totalItemCount,
    total,
    lastOrder,
    reorderOrder,
    storeSettings,
    isGuest,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginAsGuest,
    handleAuthSuccess,
  } = useCart();

  // Real-time subscription and active polling for live menu items & stock availability
  useEffect(() => {
    const unsub = api.subscribeToMenuItems((items) => {
      setMenuItems(items);
    });

    const pollTimer = setInterval(() => {
      api.getMenuItems().then((items) => {
        if (items && items.length > 0) setMenuItems(items);
      }).catch(() => {});
    }, 3500);

    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, []);

  // Smooth scroll to category
  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const target = document.getElementById(catId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // IntersectionObserver to sync active category on scroll
  useEffect(() => {
    if (activeTab !== 'menu') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
            break;
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      }
    );

    CATEGORIES.forEach((cat) => {
      const el = document.getElementById(cat.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeTab, menuItems]);

  // Group items by category / subcategory
  const mains = menuItems.filter((i) => i.category === 'mains');
  const soups = menuItems.filter((i) => i.category === 'soups');
  const kfc = menuItems.filter((i) => i.category === 'sides' && i.subcategory === 'Korean Fried Chicken');
  const breads = menuItems.filter((i) => i.category === 'sides' && i.subcategory === 'Bread');
  const fried = menuItems.filter((i) => i.category === 'sides' && i.subcategory === 'Fried Items');

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-lg mx-auto shadow-2xl relative text-navy h-[100dvh] overflow-hidden">
      {/* Solid Brand Header (Non-transparent to prevent overlapping bleed) */}
      <Header onOpenCart={() => setIsCartOpen(true)} />

      {/* Real-time Store Status Banner */}
      <StoreStatusBanner settings={storeSettings} />

      {/* Main Content Area */}
      {activeTab === 'menu' && (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Frozen Left Category Sidebar */}
          <CategorySidebar
            activeId={activeCategory}
            onSelect={scrollToCategory}
          />

          {/* Right Scrollable Content Pane with ALL Items */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-6 pb-28 scroll-smooth"
          >
            {/* 1-Tap Reorder Quick Banner if last order exists */}
            {lastOrder && (
              <ReorderBanner
                lastOrder={lastOrder}
                onReorder={reorderOrder}
              />
            )}

            {/* Mains Section */}
            <section id="cat-mains" className="space-y-3 scroll-mt-2">
              <div className="flex items-center justify-between border-b border-cream-dark pb-1 sticky top-0 bg-cream py-1 z-10">
                <div>
                  <h2 className="font-extrabold text-sm text-navy uppercase tracking-wide">Signature Mains 主食</h2>
                  <p className="text-[10px] text-gray-500 font-medium">Every main earns 1 loyalty stamp</p>
                </div>
                <span className="text-[10px] bg-terracotta/10 text-terracotta font-extrabold px-2 py-0.5 rounded-full">
                  {mains.length} dishes
                </span>
              </div>
              <div className="space-y-3">
                {mains.map((item) => (
                  <MenuCard key={item.id} item={item} onSelect={setSelectedItemForModal} />
                ))}
              </div>
            </section>

            {/* Artisanal Soups Section */}
            <section id="cat-soups" className="space-y-3 scroll-mt-2">
              <div className="flex items-center justify-between border-b border-cream-dark pb-1 sticky top-0 bg-cream py-1 z-10">
                <div>
                  <h2 className="font-extrabold text-sm text-navy uppercase tracking-wide">Artisanal Soups 意式浓汤</h2>
                  <p className="text-[10px] text-terracotta font-bold">Make it a set: Add $1 for garlic bread</p>
                </div>
                <span className="text-[10px] bg-cream-dark text-navy/70 font-extrabold px-2 py-0.5 rounded-full">
                  {soups.length} soups
                </span>
              </div>
              <div className="space-y-3">
                {soups.map((item) => (
                  <MenuCard key={item.id} item={item} onSelect={setSelectedItemForModal} />
                ))}
              </div>
            </section>

            {/* Korean Fried Chicken Section */}
            <section id="cat-kfc" className="space-y-3 scroll-mt-2">
              <div className="flex items-center justify-between border-b border-cream-dark pb-1 sticky top-0 bg-cream py-1 z-10">
                <div>
                  <h2 className="font-extrabold text-sm text-navy uppercase tracking-wide">Korean Fried Chicken 韩式炸鸡</h2>
                  <p className="text-[10px] text-gray-500 font-medium">Crispy whole cuts glazed fresh</p>
                </div>
                <span className="text-[10px] bg-cream-dark text-navy/70 font-extrabold px-2 py-0.5 rounded-full">
                  {kfc.length} items
                </span>
              </div>
              <div className="space-y-3">
                {kfc.map((item) => (
                  <MenuCard key={item.id} item={item} onSelect={setSelectedItemForModal} />
                ))}
              </div>
            </section>

            {/* Artisanal Breads Section */}
            <section id="cat-breads" className="space-y-3 scroll-mt-2">
              <div className="flex items-center justify-between border-b border-cream-dark pb-1 sticky top-0 bg-cream py-1 z-10">
                <div>
                  <h2 className="font-extrabold text-sm text-navy uppercase tracking-wide">Artisanal Breads 意式面包</h2>
                  <p className="text-[10px] text-gray-500 font-medium">Fresh toasted daily</p>
                </div>
                <span className="text-[10px] bg-cream-dark text-navy/70 font-extrabold px-2 py-0.5 rounded-full">
                  {breads.length} items
                </span>
              </div>
              <div className="space-y-3">
                {breads.map((item) => (
                  <MenuCard key={item.id} item={item} onSelect={setSelectedItemForModal} />
                ))}
              </div>
            </section>

            {/* Fried Items Section */}
            <section id="cat-fried" className="space-y-3 scroll-mt-2">
              <div className="flex items-center justify-between border-b border-cream-dark pb-1 sticky top-0 bg-cream py-1 z-10">
                <div>
                  <h2 className="font-extrabold text-sm text-navy uppercase tracking-wide">Fried Items 酥炸食品</h2>
                  <p className="text-[10px] text-gray-500 font-medium">Golden shoestring fries & onion rings</p>
                </div>
                <span className="text-[10px] bg-cream-dark text-navy/70 font-extrabold px-2 py-0.5 rounded-full">
                  {fried.length} items
                </span>
              </div>
              <div className="space-y-3">
                {fried.map((item) => (
                  <MenuCard key={item.id} item={item} onSelect={setSelectedItemForModal} />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Loyalty Tab */}
      {activeTab === 'loyalty' && (
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          <LoyaltyCard onOpenQrModal={() => setIsQrModalOpen(true)} />
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          <OrderHistoryView onGoToMenu={() => setActiveTab('menu')} />
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {activeTab === 'menu' && totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-[74px] left-0 right-0 max-w-lg mx-auto px-4 z-30 pointer-events-none animate-slide-up">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-navy text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between pointer-events-auto active:scale-[0.98] transition-transform border border-navy/50"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-terracotta text-white font-black text-xs flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
              <span className="font-extrabold text-xs tracking-wide">View Current Cart</span>
            </div>
            <div className="flex items-center gap-2 font-black text-xs">
              <span className="text-pasta-light font-extrabold">${total.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4 text-terracotta" />
            </div>
          </button>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-cream-dark flex items-center justify-around pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] z-30 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'menu' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          Menu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loyalty')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'loyalty' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <Award className="w-5 h-5 mb-0.5" />
          Loyalty Card
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-xs font-bold transition-colors ${
            activeTab === 'orders' ? 'text-terracotta' : 'text-gray-500 hover:text-navy'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          Past Orders
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
        onOrderSuccess={(order) => setPlacedOrder(order)}
      />

      {/* Member QR Code Modal */}
      <MemberQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Order Placed Success Confirmation Modal */}
      {placedOrder && (
        <OrderSuccessModal
          order={placedOrder}
          onClose={() => setPlacedOrder(null)}
          onGoToLoyalty={() => {
            setPlacedOrder(null);
            setActiveTab('loyalty');
          }}
          onReopenPayNow={() => {
            setReopenPayNowOrder(placedOrder);
          }}
        />
      )}

      {/* PayNow Reopen Modal */}
      {reopenPayNowOrder && (
        <PayNowModal
          isOpen={Boolean(reopenPayNowOrder)}
          order={reopenPayNowOrder}
          storeSettings={storeSettings}
          onClose={() => setReopenPayNowOrder(null)}
          onConfirmPaid={() => setReopenPayNowOrder(null)}
        />
      )}

      {/* Welcome / Auth Gate Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        canDismiss={isGuest}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onContinueAsGuest={loginAsGuest}
      />
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
