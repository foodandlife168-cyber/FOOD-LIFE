/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';
import type { Product } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { language, t } = useLanguage();
  const { items, addItem, updateQuantity } = useCart();

  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const isOutOfStock = product.availableStock <= 0;
  const isLowStock = product.availableStock > 0 && product.availableStock <= 5;

  const title = language === 'si' && product.nameSi ? product.nameSi : product.nameEn;
  const secondaryTitle = language === 'si' ? product.nameEn : product.nameSi;
  const unit = language === 'si' && product.unitSi ? product.unitSi : product.unit;

  const discountedPrice =
    product.discountPercent > 0
      ? Math.round(product.sellingPrice * (1 - product.discountPercent / 100))
      : product.sellingPrice;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Product Image & Badges */}
      <div
        className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetails(product)}
      >
        <img
          src={product.imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.badge && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-700 text-white shadow-xs">
              {product.badge}
            </span>
          )}
          {product.discountPercent > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500 text-slate-950 shadow-xs">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Unit badge */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <span className="px-2 py-1 text-[11px] font-bold rounded-lg bg-black/60 backdrop-blur-xs text-white">
            {unit}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs text-emerald-800 font-semibold mb-1">
            {language === 'si' && product.categorySi ? product.categorySi : product.category}
          </div>

          <h3
            className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-emerald-700 cursor-pointer transition-colors"
            onClick={() => onOpenDetails(product)}
          >
            {title}
          </h3>

          {secondaryTitle && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{secondaryTitle}</p>
          )}

          {/* Stock indicator */}
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {t('outOfStock')}
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <span>⚠️</span> Only {product.availableStock} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {t('inStock')} ({product.availableStock})
              </span>
            )}
          </div>
        </div>

        {/* Price & Add to Cart Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-slate-600 font-medium">LKR</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-950">
                {discountedPrice.toLocaleString()}
              </span>
              {product.discountPercent > 0 && (
                <span className="text-xs text-slate-600 line-through">
                  {product.sellingPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Quantity selector or Add Button */}
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
            >
              {t('outOfStock')}
            </button>
          ) : currentQuantity > 0 ? (
            <div className="flex items-center bg-emerald-50 rounded-xl p-1 border border-emerald-200">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, currentQuantity - 1)}
                aria-label={`Decrease quantity of ${title}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-emerald-950">
                {currentQuantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, currentQuantity + 1)}
                aria-label={`Increase quantity of ${title}`}
                disabled={currentQuantity >= product.availableStock}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addItem(product, 1)}
              aria-label={`Add ${title} to cart`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addToCart')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
