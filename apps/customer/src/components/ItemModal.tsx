import React, { useState } from 'react';
import { MenuItem, INITIAL_ADDONS, SelectedAddOn, CartItem } from '@nyopasta/shared';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ItemModalProps {
  item: MenuItem;
  onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  const { addItem } = useCart();
  const [isKidPortion, setIsKidPortion] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Available add-ons (excluding packaging fee which is auto-handled during takeaway)
  const availableAddons = INITIAL_ADDONS.filter((a) => a.category !== 'packaging');

  // Calculate current unit base price
  const baseUnitPrice = isKidPortion && item.kidPrice !== undefined ? item.kidPrice : item.price;

  // Addons total per unit
  const addonsTotalPerUnit = availableAddons.reduce((sum, addon) => {
    const qty = selectedAddons[addon.id] || 0;
    return sum + addon.price * qty;
  }, 0);

  const unitTotal = baseUnitPrice + addonsTotalPerUnit;
  const lineTotal = unitTotal * quantity;

  const handleAddonDelta = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, Math.min(5, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[addonId];
        return copy;
      }
      return { ...prev, [addonId]: next };
    });
  };

  const handleAddToCart = () => {
    if (item.isSoldOut) return;
    const chosenAddOns: SelectedAddOn[] = availableAddons
      .filter((a) => (selectedAddons[a.id] || 0) > 0)
      .map((a) => ({
        id: a.id,
        name: a.name,
        chineseName: a.chineseName,
        price: a.price,
        quantity: selectedAddons[a.id],
      }));

    const cartItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: item.id,
      name: item.name,
      chineseName: item.chineseName,
      category: item.category,
      isKidPortion,
      unitPrice: baseUnitPrice,
      quantity,
      selectedAddOns: chosenAddOns,
      specialInstructions: specialInstructions.trim() || undefined,
      itemTotal: lineTotal,
    };

    addItem(cartItem);
    onClose();
  };

  // Group add-ons for clean presentation
  const proteinAddons = availableAddons.filter((a) => a.category === 'protein');
  const stapleAddons = availableAddons.filter((a) => a.category === 'staple');
  const sauceAddons = availableAddons.filter((a) => a.category === 'sauce');

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div
        className="bg-cream-light w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-cream-dark overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-cream-dark flex items-start justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base font-extrabold text-navy leading-tight">{item.name}</h2>
              {item.tag && (
                <span className="text-[10px] bg-pasta-gold/20 text-amber-900 border border-pasta-gold/40 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                  {item.tag}
                </span>
              )}
            </div>
            <p className="text-xs text-terracotta font-semibold mt-0.5">{item.chineseName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-navy/50 hover:text-navy hover:bg-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 text-navy text-xs">
          {/* Description */}
          <div className="bg-cream/60 p-3 rounded-xl border border-cream-dark/60">
            <p className="text-xs leading-relaxed text-navy/80">{item.description}</p>
            {item.chineseDescription && (
              <p className="text-[11px] text-navy/60 mt-1">{item.chineseDescription}</p>
            )}
          </div>

          {/* Portion Selection (if kid option available) */}
          {item.isKidOption && item.kidPrice !== undefined && (
            <div>
              <label className="font-extrabold text-xs text-navy block mb-2 uppercase tracking-wide">
                Portion Size 分量选择
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsKidPortion(false)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !isKidPortion
                      ? 'border-terracotta bg-terracotta-50/70 shadow-xs'
                      : 'border-cream-dark bg-white hover:bg-white/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Regular Portion</span>
                    {!isKidPortion && <Check className="w-4 h-4 text-terracotta" />}
                  </div>
                  <span className="font-extrabold text-terracotta text-sm mt-1">
                    ${item.price.toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsKidPortion(true)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isKidPortion
                      ? 'border-terracotta bg-terracotta-50/70 shadow-xs'
                      : 'border-cream-dark bg-white hover:bg-white/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Kid Portion 儿童份</span>
                    {isKidPortion && <Check className="w-4 h-4 text-terracotta" />}
                  </div>
                  <span className="font-extrabold text-terracotta text-sm mt-1">
                    ${item.kidPrice.toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Add-ons Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-extrabold text-xs text-navy uppercase tracking-wide">
                Customise & Add-Ons 加料配菜
              </label>
              <span className="text-[11px] text-navy/50 font-medium">Optional</span>
            </div>

            {/* Protein Group */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[11px] font-bold text-navy/60 uppercase">Proteins & Eggs 蛋与肉类</p>
              <div className="space-y-1.5">
                {proteinAddons.map((addon) => {
                  const qty = selectedAddons[addon.id] || 0;
                  return (
                    <div
                      key={addon.id}
                      className="bg-white p-2.5 rounded-xl border border-cream-dark flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs">{addon.name}</span>
                        <span className="text-[11px] text-terracotta ml-1.5 font-medium">
                          {addon.chineseName}
                        </span>
                        <span className="text-xs font-semibold text-navy/70 block">
                          +${addon.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAddonDelta(addon.id, -1)}
                              className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center text-navy font-bold hover:bg-cream-dark"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-4 text-center font-extrabold text-xs">{qty}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddonDelta(addon.id, 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-colors ${
                            qty > 0
                              ? 'bg-terracotta text-white hover:bg-terracotta-600'
                              : 'bg-cream text-navy hover:bg-cream-dark'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staples & Veg Group */}
            <div className="space-y-1.5 mb-3">
              <p className="text-[11px] font-bold text-navy/60 uppercase">Staples & Greens 配菜主食</p>
              <div className="space-y-1.5">
                {stapleAddons.map((addon) => {
                  const qty = selectedAddons[addon.id] || 0;
                  return (
                    <div
                      key={addon.id}
                      className="bg-white p-2.5 rounded-xl border border-cream-dark flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs">{addon.name}</span>
                        <span className="text-[11px] text-terracotta ml-1.5 font-medium">
                          {addon.chineseName}
                        </span>
                        <span className="text-xs font-semibold text-navy/70 block">
                          +${addon.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAddonDelta(addon.id, -1)}
                              className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center text-navy font-bold hover:bg-cream-dark"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-4 text-center font-extrabold text-xs">{qty}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddonDelta(addon.id, 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-colors ${
                            qty > 0
                              ? 'bg-terracotta text-white hover:bg-terracotta-600'
                              : 'bg-cream text-navy hover:bg-cream-dark'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sauce Group */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-navy/60 uppercase">Extra Sauces 特调酱汁</p>
              <div className="space-y-1.5">
                {sauceAddons.map((addon) => {
                  const qty = selectedAddons[addon.id] || 0;
                  return (
                    <div
                      key={addon.id}
                      className="bg-white p-2.5 rounded-xl border border-cream-dark flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs">{addon.name}</span>
                        <span className="text-[11px] text-terracotta ml-1.5 font-medium">
                          {addon.chineseName}
                        </span>
                        <span className="text-xs font-semibold text-navy/70 block">
                          +${addon.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAddonDelta(addon.id, -1)}
                              className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center text-navy font-bold hover:bg-cream-dark"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-4 text-center font-extrabold text-xs">{qty}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddonDelta(addon.id, 1)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-colors ${
                            qty > 0
                              ? 'bg-terracotta text-white hover:bg-terracotta-600'
                              : 'bg-cream text-navy hover:bg-cream-dark'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="font-extrabold text-xs text-navy block mb-1 uppercase tracking-wide">
              Special Instructions 特殊要求
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Less spicy, no spring onion, pasta firmer..."
              rows={2}
              className="w-full p-2.5 rounded-xl border border-cream-dark bg-white text-xs text-navy focus:outline-hidden focus:border-terracotta placeholder:text-navy/40"
            />
          </div>
        </div>

        {/* Footer with Quantity Stepper and Add Button */}
        <div
          className="px-4 pt-3 bg-white border-t border-cream-dark flex items-center gap-3"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Quantity Controls */}
          <div className="flex items-center border border-cream-dark rounded-xl bg-cream-light p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-navy hover:bg-cream disabled:opacity-30"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-black text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-navy hover:bg-cream"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          {item.isSoldOut ? (
            <button
              type="button"
              disabled
              className="flex-1 bg-gray-200 text-gray-500 font-extrabold text-sm py-3 px-4 rounded-xl cursor-not-allowed text-center"
            >
              Sold Out 已售罄
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-terracotta hover:bg-terracotta-600 active:scale-[0.98] text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md shadow-terracotta/25 flex items-center justify-between transition-all"
            >
              <span>Add to Cart</span>
              <span>${lineTotal.toFixed(2)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
