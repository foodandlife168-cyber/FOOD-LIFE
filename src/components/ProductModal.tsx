/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Minus, Check, MapPin, Sparkles } from 'lucide-react';
import type { Product } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { language, t } = useLanguage();
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const title = language === 'si' && product.nameSi ? product.nameSi : product.nameEn;
  const secondaryTitle = language === 'si' ? product.nameEn : product.nameSi;
  const unit = language === 'si' && product.unitSi ? product.unitSi : product.unit;
  const desc = language === 'si' && product.descriptionSi ? product.descriptionSi : product.descriptionEn;

  const discountedPrice =
    product.discountPercent > 0
      ? Math.round(product.sellingPrice * (1 - product.discountPercent / 100))
      : product.sellingPrice;

  const isOutOfStock = product.availableStock <= 0;

  const handleAddToCart = () => {
    addItem(product, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Image */}
        <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div className="absolute top-4 left-4 flex gap-2">
            {product.badge && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-700 text-white">
                {product.badge}
              </span>
            )}
            {product.discountPercent > 0 && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-400 text-slate-900">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Modal Details */}
        <div className="p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              {language === 'si' && product.categorySi ? product.categorySi : product.category}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{title}</h2>
            {secondaryTitle && <p className="text-sm text-slate-500">{secondaryTitle}</p>}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>

          <div className="flex items-center gap-3 py-3 border-y border-slate-100 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Katuloya / Thawalanthanne Stock
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              Available: {product.availableStock} {unit}
            </span>
          </div>

          {/* Pricing & Add Controls */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs text-slate-400">Price per {unit}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  LKR {discountedPrice.toLocaleString()}
                </span>
                {product.discountPercent > 0 && (
                  <span className="text-sm text-slate-400 line-through">
                    LKR {product.sellingPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Stepper & Add */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-xs text-slate-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-slate-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(Math.min(product.availableStock, qty + 1))}
                  disabled={qty >= product.availableStock}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-xs text-slate-700 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white font-bold text-sm shadow-md transition-colors"
              >
                {t('addToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
