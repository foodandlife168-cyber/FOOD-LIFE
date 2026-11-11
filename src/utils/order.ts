/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OrderItem, OrderStatus, Product, StoreConfig } from '../types/index.ts';

/**
 * Normalizes Sri Lankan telephone number into international E.164 format without '+' for Meta WhatsApp API.
 * Example: '077 123 4567' -> '94771234567'
 */
export function normalizeSriLankanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Remove all non-digits
  const digits = rawPhone.replace(/\D/g, '');

  // Case 1: Starts with 0 (e.g. 0771234567 -> 10 digits)
  if (digits.startsWith('0') && digits.length === 10) {
    return '94' + digits.substring(1);
  }

  // Case 2: Already starts with 94 (e.g. 94771234567 -> 11 digits)
  if (digits.startsWith('94') && digits.length === 11) {
    return digits;
  }

  // Case 3: 9 digits without leading 0 (e.g. 771234567)
  if (digits.length === 9) {
    return '94' + digits;
  }

  return digits;
}

/**
 * Validates whether a phone number is a valid Sri Lankan mobile number.
 */
export function isValidSriLankanPhone(rawPhone: string): boolean {
  const normalized = normalizeSriLankanPhone(rawPhone);
  // Sri Lankan numbers formatted for WhatsApp must start with 947 and be 11 digits long
  // Valid mobile prefixes: 9470, 9471, 9472, 9474, 9475, 9476, 9477, 9478
  return /^947[01245678]\d{7}$/.test(normalized);
}

/**
 * Formats normalized phone into human-readable format: +94 77 123 4567
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeSriLankanPhone(phone);
  if (normalized.length === 11 && normalized.startsWith('94')) {
    return `+94 ${normalized.substring(2, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
  }
  return phone;
}

/**
 * Pure calculation for an individual item line
 */
export function calculateItemLine(
  product: Pick<Product, 'sellingPrice' | 'discountPercent'>,
  quantity: number
): { unitPrice: number; discountPercent: number; effectivePrice: number; lineTotal: number } {
  const validQty = Math.max(1, Math.floor(quantity));
  const unitPrice = Math.max(0, product.sellingPrice);
  const discountPercent = Math.min(100, Math.max(0, product.discountPercent || 0));

  const effectivePrice = Math.round(unitPrice * (1 - discountPercent / 100));
  const lineTotal = effectivePrice * validQty;

  return {
    unitPrice,
    discountPercent,
    effectivePrice,
    lineTotal,
  };
}

/**
 * Pure calculation for order totals with server validation
 */
export function calculateOrderTotals(
  items: OrderItem[],
  deliveryType: 'delivery' | 'pickup',
  config: Pick<StoreConfig, 'baseDeliveryFee' | 'freeDeliveryThreshold'>
): {
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  total: number;
} {
  let subtotal = 0;
  let discountTotal = 0;

  for (const item of items) {
    const rawLineTotal = item.unitPrice * item.quantity;
    const finalLineTotal = item.effectivePrice * item.quantity;
    subtotal += rawLineTotal;
    discountTotal += rawLineTotal - finalLineTotal;
  }

  const netItemsTotal = subtotal - discountTotal;

  let deliveryCharge = 0;
  if (deliveryType === 'delivery') {
    if (netItemsTotal >= config.freeDeliveryThreshold) {
      deliveryCharge = 0;
    } else {
      deliveryCharge = config.baseDeliveryFee;
    }
  }

  const total = Math.max(0, netItemsTotal + deliveryCharge);

  return {
    subtotal,
    discountTotal,
    deliveryCharge,
    total,
  };
}

/**
 * Formats sequential order number: FL-2026-000001
 */
export function formatOrderNumber(sequenceIndex: number, year = 2026): string {
  const padded = String(sequenceIndex).padStart(6, '0');
  return `FL-${year}-${padded}`;
}

/**
 * WhatsApp Template Message Parameter Builders (Matching Meta approved specifications)
 */
export interface WhatsAppTemplateData {
  customerName: string;
  orderNumber: string;
  orderTotalLkr: number;
  status: OrderStatus;
  trackingUrl: string;
}

export function buildWhatsAppTemplateBody(
  data: WhatsAppTemplateData,
  lang: 'en' | 'si' = 'en'
): string {
  if (lang === 'si') {
    return (
      `ආයුබෝවන් ${data.customerName}, FOOD & LIFE GROCERY සමඟ ගනුදෙනු කිරීම ගැන ස්තූතියි!\n\n` +
      `ඇණවුම් අංකය: ${data.orderNumber}\n` +
      `මුළු මුදල: LKR ${data.orderTotalLkr.toLocaleString()}\n` +
      `වත්මන් තත්ත්වය: ${getSinhalaStatus(data.status)}\n\n` +
      `ඔබේ ඇණවුම නිරීක්ෂණය කරන්න:\n${data.trackingUrl}\n\n` +
      `ස්තූතියි! FOOD & LIFE GROCERY - 929, මහනුවර පාර, ක්‍රොස් වත්තේගම, කැටුලෝය, තවලන්තැන්න.`
    );
  }

  return (
    `Hello ${data.customerName}, thank you for shopping with FOOD & LIFE GROCERY!\n\n` +
    `Order No: ${data.orderNumber}\n` +
    `Order Total: LKR ${data.orderTotalLkr.toLocaleString()}\n` +
    `Current Status: ${data.status}\n\n` +
    `Track your order:\n${data.trackingUrl}\n\n` +
    `Thank you for choosing FOOD & LIFE GROCERY (929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne).`
  );
}

export function getSinhalaStatus(status: OrderStatus): string {
  switch (status) {
    case 'Order Received':
      return 'ඇණවුම ලැබිණි';
    case 'Order Confirmed':
      return 'ඇණවුම තහවුරු විය';
    case 'Preparing Order':
      return 'ඇසුරුම් කරමින් පවතී';
    case 'Ready for Delivery':
      return 'බෙදාහැරීමට සූදානම්';
    case 'Out for Delivery':
      return 'බෙදාහැරීමට රැගෙන යයි';
    case 'Delivered':
      return 'භාණ්ඩ භාර දෙන ලදී';
    case 'Cancelled':
      return 'අවලංගු කරන ලදී';
    default:
      return status;
  }
}
