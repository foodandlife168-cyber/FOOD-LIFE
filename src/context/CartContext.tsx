/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, StoreConfig } from '../types/index.ts';
import { calculateItemLine, calculateOrderTotals } from '../utils/order.ts';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  syncLatestProducts: (products: Product[]) => void;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  deliveryType: 'delivery' | 'pickup';
  setDeliveryType: (type: 'delivery' | 'pickup') => void;
  storeConfig: StoreConfig;
  freeDeliveryThreshold: number;
  freeDeliveryShortfall: number;
  isFreeDelivery: boolean;
}

const DEFAULT_CONFIG: StoreConfig = {
  storeName: 'FOOD & LIFE GROCERY',
  location: 'Katuloya, Thawalanthanne, Sri Lanka',
  address: '929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne',
  phone: '+94 71 259 5683',
  whatsappNumber: '+94 71 259 5683',
  logoUrl: '/logo.jpg',
  tagline: 'Everything For Your Choices',
  taglineSi: 'ඔබගේ සියලු තේරීම් සඳහා',
  deliveryRadiusKm: 5,
  deliveryAreas: [
    'Katuloya',
    'Thawalanthanne',
    'Babaralla',
    'Goomaraya',
    'Thunisgala',
  ],
  baseDeliveryFee: 250,
  freeDeliveryThreshold: 3500,
  currency: 'LKR',
  isOpen: true,
  openingHours: '6:30 AM - 9:30 PM (Daily)',
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('foodlife_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_CONFIG);

  // Sync store config from API
  useEffect(() => {
    fetch('/api/store-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStoreConfig(data);
      })
      .catch((err) => console.log('Using default store config:', err));
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('foodlife_cart', JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart:', e);
    }
  }, [items]);

  // Revalidate and synchronize cart items with live catalog
  const syncLatestProducts = (latestProducts: Product[]) => {
    if (!latestProducts || latestProducts.length === 0) return;
    setItems((prevItems) => {
      let hasChanges = false;
      const updated = prevItems.map((cartItem) => {
        const fresh = latestProducts.find((p) => p.id === cartItem.product.id);
        if (fresh) {
          if (
            fresh.sellingPrice !== cartItem.product.sellingPrice ||
            fresh.discountPercent !== cartItem.product.discountPercent ||
            fresh.availableStock !== cartItem.product.availableStock ||
            fresh.isActive !== cartItem.product.isActive ||
            fresh.nameEn !== cartItem.product.nameEn ||
            fresh.unit !== cartItem.product.unit
          ) {
            hasChanges = true;
            return {
              product: fresh,
              quantity: Math.min(cartItem.quantity, Math.max(1, fresh.availableStock || 1)),
            };
          }
        }
        return cartItem;
      });
      return hasChanges ? updated : prevItems;
    });
  };

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = Math.min(product.availableStock, next[existingIndex].quantity + quantity);
        // CRITICAL: Always use the latest product object with up-to-date price
        next[existingIndex] = { product, quantity: Math.max(1, newQty) };
        return next;
      }
      return [...prev, { product, quantity: Math.min(product.availableStock, Math.max(1, quantity)) }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(item.product.availableStock, quantity);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  // Convert cart items to order items for calculation
  const orderItems = items.map((i) => {
    const line = calculateItemLine(i.product, i.quantity);
    return {
      productId: i.product.id,
      nameEn: i.product.nameEn,
      nameSi: i.product.nameSi,
      unit: i.product.unit,
      quantity: i.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      effectivePrice: line.effectivePrice,
      lineTotal: line.lineTotal,
    };
  });

  const totals = calculateOrderTotals(orderItems, deliveryType, storeConfig);
  const netSubtotal = totals.subtotal - totals.discountTotal;
  const freeDeliveryThreshold = storeConfig.freeDeliveryThreshold || 3500;
  const freeDeliveryShortfall = Math.max(0, freeDeliveryThreshold - netSubtotal);
  const isFreeDelivery = deliveryType === 'pickup' || freeDeliveryShortfall === 0;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        syncLatestProducts,
        itemCount,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        deliveryCharge: totals.deliveryCharge,
        grandTotal: totals.total,
        deliveryType,
        setDeliveryType,
        storeConfig,
        freeDeliveryThreshold,
        freeDeliveryShortfall,
        isFreeDelivery,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
