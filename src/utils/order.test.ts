/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSriLankanPhone,
  isValidSriLankanPhone,
  formatPhoneForDisplay,
  calculateItemLine,
  calculateOrderTotals,
  formatOrderNumber,
  buildWhatsAppTemplateBody,
  getSinhalaStatus,
} from './order.ts';
import type { OrderItem } from '../types/index.ts';

test('normalizeSriLankanPhone formats variations to 947XXXXXXXX', () => {
  assert.equal(normalizeSriLankanPhone('077 123 4567'), '94771234567');
  assert.equal(normalizeSriLankanPhone('+94 71 888 9999'), '94718889999');
  assert.equal(normalizeSriLankanPhone('077-456-7890'), '94774567890');
  assert.equal(normalizeSriLankanPhone('94765432100'), '94765432100');
  assert.equal(normalizeSriLankanPhone('771234567'), '94771234567');
});

test('isValidSriLankanPhone accepts valid Sri Lankan mobile numbers and rejects bad ones', () => {
  assert.equal(isValidSriLankanPhone('0771234567'), true);
  assert.equal(isValidSriLankanPhone('+94 71 234 5678'), true);
  assert.equal(isValidSriLankanPhone('070 999 8888'), true);
  assert.equal(isValidSriLankanPhone('074 555 1234'), true);
  // Invalid prefix or lengths
  assert.equal(isValidSriLankanPhone('011 234 5678'), false); // Colombo landline not mobile
  assert.equal(isValidSriLankanPhone('12345'), false);
  assert.equal(isValidSriLankanPhone('07712345'), false); // too short
  assert.equal(isValidSriLankanPhone('+1 555 123 4567'), false); // US number
});

test('formatPhoneForDisplay creates clean spaced format', () => {
  assert.equal(formatPhoneForDisplay('0771234567'), '+94 77 123 4567');
});

test('calculateItemLine computes discount and line totals correctly', () => {
  // 10% off of 500 LKR for 3 items
  const result = calculateItemLine(
    { sellingPrice: 500, discountPercent: 10 },
    3
  );
  assert.equal(result.unitPrice, 500);
  assert.equal(result.discountPercent, 10);
  assert.equal(result.effectivePrice, 450);
  assert.equal(result.lineTotal, 1350);
});

test('calculateOrderTotals applies free delivery threshold and delivery charge correctly', () => {
  const storeConfig = {
    baseDeliveryFee: 250,
    freeDeliveryThreshold: 3500,
  };

  const sampleItemsBelowThreshold: OrderItem[] = [
    {
      productId: 'p1',
      nameEn: 'Keeri Samba Rice',
      nameSi: 'කීරි සම්බා',
      unit: '5 kg',
      quantity: 1,
      unitPrice: 1500,
      discountPercent: 0,
      effectivePrice: 1500,
      lineTotal: 1500,
    },
    {
      productId: 'p2',
      nameEn: 'Red Dhal',
      nameSi: 'රතු පරිප්පු',
      unit: '1 kg',
      quantity: 2,
      unitPrice: 400,
      discountPercent: 10,
      effectivePrice: 360,
      lineTotal: 720,
    },
  ];

  // Net item total: 1500 + 720 = 2220 (Below 3500 threshold)
  const orderBelow = calculateOrderTotals(sampleItemsBelowThreshold, 'delivery', storeConfig);
  assert.equal(orderBelow.subtotal, 2300);
  assert.equal(orderBelow.discountTotal, 80);
  assert.equal(orderBelow.deliveryCharge, 250);
  assert.equal(orderBelow.total, 2470); // 2220 + 250

  // Pickup should waive delivery charge
  const pickupOrder = calculateOrderTotals(sampleItemsBelowThreshold, 'pickup', storeConfig);
  assert.equal(pickupOrder.deliveryCharge, 0);
  assert.equal(pickupOrder.total, 2220);

  // High total should get free delivery
  const highValueItem: OrderItem = {
    productId: 'p3',
    nameEn: 'Bulk Grocery Basket',
    nameSi: 'තොග මල්ල',
    unit: '1 Basket',
    quantity: 1,
    unitPrice: 4000,
    discountPercent: 0,
    effectivePrice: 4000,
    lineTotal: 4000,
  };
  const orderAbove = calculateOrderTotals([highValueItem], 'delivery', storeConfig);
  assert.equal(orderAbove.deliveryCharge, 0);
  assert.equal(orderAbove.total, 4000);
});

test('formatOrderNumber produces sequential human-readable code', () => {
  assert.equal(formatOrderNumber(1), 'FL-2026-000001');
  assert.equal(formatOrderNumber(42), 'FL-2026-000042');
  assert.equal(formatOrderNumber(10543), 'FL-2026-010543');
});

test('buildWhatsAppTemplateBody generates valid bilingual message copy', () => {
  const data = {
    customerName: 'Kamal Perera',
    orderNumber: 'FL-2026-000001',
    orderTotalLkr: 3250,
    status: 'Order Confirmed' as const,
    trackingUrl: 'https://ais-dev.example.com/track/abc123token',
  };

  const enText = buildWhatsAppTemplateBody(data, 'en');
  assert.match(enText, /Hello Kamal Perera/);
  assert.match(enText, /FL-2026-000001/);
  assert.match(enText, /LKR 3,250/);
  assert.match(enText, /Order Confirmed/);
  assert.match(enText, /abc123token/);

  const siText = buildWhatsAppTemplateBody(data, 'si');
  assert.match(siText, /ආයුබෝවන් Kamal Perera/);
  assert.match(siText, /FL-2026-000001/);
  assert.match(siText, /LKR 3,250/);
  assert.match(siText, /ඇණවුම තහවුරු විය/);
});

test('getSinhalaStatus maps all seven canonical statuses', () => {
  assert.equal(getSinhalaStatus('Order Received'), 'ඇණවුම ලැබිණි');
  assert.equal(getSinhalaStatus('Order Confirmed'), 'ඇණවුම තහවුරු විය');
  assert.equal(getSinhalaStatus('Preparing Order'), 'ඇසුරුම් කරමින් පවතී');
  assert.equal(getSinhalaStatus('Ready for Delivery'), 'බෙදාහැරීමට සූදානම්');
  assert.equal(getSinhalaStatus('Out for Delivery'), 'බෙදාහැරීමට රැගෙන යයි');
  assert.equal(getSinhalaStatus('Delivered'), 'භාණ්ඩ භාර දෙන ලදී');
  assert.equal(getSinhalaStatus('Cancelled'), 'අවලංගු කරන ලදී');
});

test('supported delivery areas contain all five requested locations', () => {
  const DELIVERY_AREAS = ['Katuloya', 'Thawalanthanne', 'Babaralla', 'Goomaraya', 'Thunisgala'];
  assert.equal(DELIVERY_AREAS.length, 5);
  assert.ok(DELIVERY_AREAS.includes('Katuloya'));
  assert.ok(DELIVERY_AREAS.includes('Thawalanthanne'));
  assert.ok(DELIVERY_AREAS.includes('Babaralla'));
  assert.ok(DELIVERY_AREAS.includes('Goomaraya'));
  assert.ok(DELIVERY_AREAS.includes('Thunisgala'));
});

