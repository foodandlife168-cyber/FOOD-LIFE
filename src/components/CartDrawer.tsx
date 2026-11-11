/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Truck, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discountTotal,
    deliveryCharge,
    grandTotal,
    deliveryType,
    setDeliveryType,
    freeDeliveryThreshold,
    freeDeliveryShortfall,
    isFreeDelivery,
  } = useCart();
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const netItemsTotal = subtotal - discountTotal;
  const progressPercent = Math.min(100, Math.round((netItemsTotal / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">{t('yourCart')}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {items.length} items
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Bar */}
          {deliveryType === 'delivery' && (
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  {isFreeDelivery
                    ? t('freeDeliveryUnlocked')
                    : t('addMoreForFreeDelivery', { amount: freeDeliveryShortfall.toLocaleString() })}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Delivery vs Pickup Selector */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/60 flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryType('delivery')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                deliveryType === 'delivery'
                  ? 'bg-white border-emerald-600 text-emerald-800 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🚀 {language === 'si' ? 'බෙදාහැරීම (කැටුලෝය, තවලන්තැන්න, බඹරැල්ල, ගෝමරය, තුන්හිස්ගල)' : 'Delivery (Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala)'}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType('pickup')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                deliveryType === 'pickup'
                  ? 'bg-white border-emerald-600 text-emerald-800 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🏪 {language === 'si' ? 'වෙළඳසැලෙන් ලබාගැනීම' : 'Store Pickup'}
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-700 text-base mb-1">{t('emptyCart')}</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  {language === 'si'
                    ? 'කැටුලෝය සහ තවලන්තැන්න වෙත නැවුම් එළවළු සහ සිල්ලර බඩු තෝරන්න.'
                    : 'Explore our fresh highland vegetables, Keeri samba, spices, and groceries.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {t('startShopping')}
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => {
                const title = language === 'si' && product.nameSi ? product.nameSi : product.nameEn;
                const unit = language === 'si' && product.unitSi ? product.unitSi : product.unit;
                const effPrice =
                  product.discountPercent > 0
                    ? Math.round(product.sellingPrice * (1 - product.discountPercent / 100))
                    : product.sellingPrice;
                const lineTotal = effPrice * quantity;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70"
                  >
                    <img
                      src={product.imageUrl}
                      alt={title}
                      className="w-16 h-16 rounded-xl object-cover bg-white"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {title}
                      </h4>
                      <div className="text-[11px] text-slate-500">
                        {unit} &bull; LKR {effPrice.toLocaleString()}
                      </div>
                      <div className="text-xs font-extrabold text-emerald-800 mt-0.5">
                        LKR {lineTotal.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                        aria-label={`Decrease ${title}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.availableStock}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        aria-label={`Increase ${title}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label={`Remove ${title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{t('subtotal')}</span>
                  <span className="font-semibold text-slate-900">
                    LKR {subtotal.toLocaleString()}
                  </span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{t('discount')}</span>
                    <span>- LKR {discountTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>{t('deliveryFee')}</span>
                  {deliveryType === 'pickup' ? (
                    <span className="font-bold text-emerald-700">STORE PICKUP (LKR 0)</span>
                  ) : deliveryCharge === 0 ? (
                    <span className="font-bold text-emerald-700">{t('free')}</span>
                  ) : (
                    <span className="font-semibold text-slate-900">
                      LKR {deliveryCharge.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                  <span>{t('total')}</span>
                  <span className="text-emerald-800">LKR {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-3 py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md transition-all transform active:scale-98"
                >
                  <span>{t('checkout')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
